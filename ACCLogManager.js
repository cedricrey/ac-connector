"use strict";
const path   = require('path');
const fs     = require('fs');
const keytar = require('keytar');
const ACCLogin    = require('./ACCLogin').ACCLogin;
const ACCIMSLogin = require('./ACCIMSLogin').ACCIMSLogin;

// Service name in the system keychain (macOS Keychain, Windows Credential Manager, libsecret Linux)
const KEYTAR_SERVICE = 'ac-connector';

// Returns the name of the sensitive field based on auth type
function sensitiveField( connection ) {
  return ( connection.authType === 'ims' ) ? 'clientSecret' : 'password';
}

function ACCLogManager() {}

ACCLogManager.configPath = getUserHome() + path.sep + '.ac-connector';
ACCLogManager.configFile = ACCLogManager.configPath + path.sep + 'ACConnections.json';

// ─── JSON persistence (no secrets) ────────────────────────────────────────────

ACCLogManager.saveConnections = function() {
  if ( !fs.existsSync( ACCLogManager.configPath ) )
    fs.mkdirSync( ACCLogManager.configPath );

  // password and clientSecret are NEVER persisted in the JSON file.
  // These fields live exclusively in the system keychain.
  const sanitized = {};
  for ( const name in ACCLogManager.Connections ) {
    const conn = JSON.parse( JSON.stringify( ACCLogManager.Connections[name] ) );
    delete conn.password;
    delete conn.clientSecret;
    sanitized[name] = conn;
  }
  fs.writeFileSync(
    ACCLogManager.configFile,
    JSON.stringify({ connections: sanitized }, null, '\t')
  );
};

// ─── Connection CRUD ──────────────────────────────────────────────────────────

/**
 * Adds a connection. Stores the secret in the keychain, the rest in JSON.
 * @returns {Promise}
 */
ACCLogManager.addConnection = async function( name, object ) {
  const field = sensitiveField( object );
  if ( object[field] ) {
    await keytar.setPassword( KEYTAR_SERVICE, name, object[field] );
  }
  // Store without the secret
  const stored = Object.assign( {}, object );
  delete stored.password;
  delete stored.clientSecret;
  ACCLogManager.Connections[name] = stored;
  ACCLogManager.saveConnections();
};

/**
 * Updates an existing connection. Updates the keychain if the secret changes.
 * If the secret field is empty in the incoming object, the keychain is left unchanged.
 * @returns {Promise}
 */
ACCLogManager.modifyConnection = async function( name, object ) {
  const field = sensitiveField( object );
  if ( object[field] ) {
    await keytar.setPassword( KEYTAR_SERVICE, name, object[field] );
  }
  const conn = ACCLogManager.Connections[name];
  for ( const k in object ) {
    if ( k !== 'password' && k !== 'clientSecret' )
      conn[k] = object[k];
  }
  ACCLogManager.saveConnections();
};

/**
 * Deletes a connection from JSON and from the keychain.
 * @returns {Promise}
 */
ACCLogManager.deleteConnection = async function( name ) {
  delete ACCLogManager.Connections[name];
  await keytar.deletePassword( KEYTAR_SERVICE, name );
  ACCLogManager.saveConnections();
};

ACCLogManager.getConnection = function( name, secure ) {
  if ( !ACCLogManager.Connections[name] ) return null;
  const connection = JSON.parse( JSON.stringify( ACCLogManager.Connections[name] ) );
  connection.name = name;
  // The secret is never in the in-memory object — this parameter is kept
  // for compatibility but no longer affects sensitive fields.
  if ( secure ) delete connection.password;
  return connection;
};

ACCLogManager.listConnections = function() {
  return Object.keys( ACCLogManager.Connections );
};

/**
 * Creates and returns a ready-to-use login object.
 *
 * ASYNC — fetches the secret from the system keychain before creating the object.
 * Auto-migration: if a secret is still in the JSON (old format), it is moved to
 * the keychain and removed from JSON.
 *
 * @param  {string}  name  Connection name
 * @returns {Promise<ACCLogin|ACCIMSLogin>}
 */
ACCLogManager.getLogin = async function( name ) {
  const connection = ACCLogManager.getConnection( name );
  if ( !connection )
    throw new Error( `ACCLogManager: connection "${name}" not found.` );

  const field = sensitiveField( connection );

  // 1. Look up the secret in the keychain
  let secret = await keytar.getPassword( KEYTAR_SERVICE, name );

  // 2. Migrate from old JSON format (secret still stored in plain text)
  if ( !secret && ACCLogManager.Connections[name][field] ) {
    secret = ACCLogManager.Connections[name][field];
    await keytar.setPassword( KEYTAR_SERVICE, name, secret );
    // Clean up the JSON
    delete ACCLogManager.Connections[name].password;
    delete ACCLogManager.Connections[name].clientSecret;
    ACCLogManager.saveConnections();
    console.log( `[ac-connector] Secret for "${name}" migrated to system keychain.` );
  }

  if ( secret ) connection[field] = secret;

  const accLogin = ( connection.authType === 'ims' )
    ? new ACCIMSLogin( connection )
    : new ACCLogin( connection );

  accLogin.login();
  return accLogin;
};

// ─── Initial load ──────────────────────────────────────────────────────────────

try {
  ACCLogManager.Connections = require( ACCLogManager.configFile ).connections || {};
} catch (e) {
  ACCLogManager.Connections = {};
  ACCLogManager.saveConnections();
}

function getUserHome() {
  return process.env[ process.platform === 'win32' ? 'USERPROFILE' : 'HOME' ];
}

exports.ACCLogManager = ACCLogManager;
