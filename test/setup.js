"use strict";
/**
 * setup.js — Shared helper for integration test suites.
 *
 * Provides a login singleton: the connection is established once
 * for the entire test session, avoiding N successive authentications.
 */
const ACC           = require('..');
const ACCLogManager  = ACC.ACCLogManager;

let _login = null;

/**
 * Returns the singleton login object (connected and ready).
 * Skips the current test if no connection is configured.
 *
 * @param  {Mocha.Context} ctx  Mocha context (this inside an it/before)
 * @returns {Promise<ACCLogin|ACCIMSLogin>}
 */
async function getLogin( ctx ) {
  const connections = ACCLogManager.listConnections();
  if ( connections.length === 0 ) {
    if ( ctx ) ctx.skip();
    throw new Error('No connection configured — integration tests skipped.');
  }

  if ( !_login ) {
    _login = await ACCLogManager.getLogin( connections[0] );
    await _login.getLoginPromise();
  }
  return _login;
}

/**
 * Returns the name of the first available connection.
 */
function connectionName() {
  const list = ACCLogManager.listConnections();
  return list.length > 0 ? list[0] : null;
}

module.exports = { getLogin, connectionName, ACC };
