"use strict";
const https = require('https');
const soap  = require('soap');
const xtkSessionWSDL = require.resolve('./wsdl/wsdl_xtksession.xml');

/**
 * ACCLogin — User/password authentication for Adobe Campaign Classic v7.
 *
 * Connection options:
 *   server    {string}  ACC instance URL
 *   user      {string}  ACC username
 *   password  {string}  ACC password
 *   sslStrict {boolean} SSL verification (default: true).
 *                       Set to false ONLY for dev environments
 *                       with self-signed certificates.
 */
function ACCLogin( options ) {
  options = options || {};
  this.server    = options.server   || "";
  this.user      = options.user     || "";
  this.password  = options.password || "";
  this.sslStrict = options.sslStrict !== false; // true by default
  this.endpoint  = this.server + "/nl/jsp/soaprouter.jsp";

  // Prevents duplicate login() calls
  this.loginRequested = false;

  this.loginPromise = new Promise( (resolve, reject) => {
    this.resolveLoginPromise = resolve;
    this.rejectLoginPromise  = reject;
  });

  this._writePromise = soap.createClientAsync( xtkSessionWSDL, this._soapOptions() );
}

// ─── Public API ───────────────────────────────────────────────────────────

ACCLogin.prototype.login = function() {
  this.loginRequested = true;

  this._writePromise.then( (client) => {
    this.soapWriterClient = client;
    this.soapWriterClient.Logon({
      sessiontoken  : "",
      strLogin      : this.user,
      strPassword   : this.password,
      elemParameters: ""
    }, this.onTokenLoaded.bind(this));
  })
  .catch( (err) => this.rejectLoginPromise(err) );

  return this.loginPromise;
};

ACCLogin.prototype.onTokenLoaded = function( err, result ) {
  if ( err ) {
    this.rejectLoginPromise( err );
    return;
  }
  try {
    this.securityToken = result.pstrSecurityToken.$value || "";
  } catch (e) {
    this.securityToken = "";
  }
  try {
    this.sessionToken = result.pstrSessionToken.$value;
  } catch (e) {
    this.rejectLoginPromise( new Error("ACCLogin: sessionToken missing from Logon response") );
    return;
  }
  this.resolveLoginPromise( this.getTokens() );
};

ACCLogin.prototype.getTokens = function() {
  return {
    securityToken : this.securityToken,
    sessionToken  : this.sessionToken,
    endpoint      : this.endpoint
  };
};

ACCLogin.prototype.getLoginPromise = function() {
  return this.loginPromise;
};

ACCLogin.prototype.isLoginRequested = function() {
  return this.loginRequested;
};

// ─── Internal ─────────────────────────────────────────────────────────────

/**
 * Builds the options object passed to soap.createClientAsync.
 * If sslStrict is false, an https.Agent with rejectUnauthorized:false
 * is injected via wsdl_options for SOAP calls to the ACC server.
 */
ACCLogin.prototype._soapOptions = function() {
  const options = { endpoint: this.endpoint };
  if ( !this.sslStrict ) {
    options.wsdl_options = {
      agent: new https.Agent({ rejectUnauthorized: false })
    };
  }
  return options;
};

exports.ACCLogin = ACCLogin;
