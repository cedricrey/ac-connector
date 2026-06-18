"use strict";
const https = require('https');
const soap  = require('soap');
const xtkQueryDefWSDL = require.resolve('./wsdl/wsdl_xtkquerydef.xml');

/**
 * ACCNLObject — Base class for all ACC SOAP services.
 *
 * Expected options:
 *   accLogin {ACCLogin|ACCIMSLogin}  Already-instantiated login object
 *   wsdl     {string}                Path to the service WSDL (overrides the default)
 *
 * clientPromise resolves when:
 *   1. Tokens are available (loginPromise resolved)
 *   2. The SOAP client for the service is created and auth headers are set
 */
class ACCNLObject {
  constructor( options ) {
    options = options || {};
    this.options   = options;
    this.accLogin  = options.accLogin || {};
    this.endpoint  = this.accLogin.endpoint || "";
    this.wsdl      = options.wsdl || xtkQueryDefWSDL;

    this.clientPromise = new Promise( (resolve, reject) => {
      this.resolveClientPromise = resolve;
      this.rejectClientPromise  = reject;
    });

    // Trigger login if not already done
    if ( !this.accLogin.isLoginRequested() )
      this.accLogin.login();

    // Once credentials are available, create the service SOAP client
    this.accLogin.getLoginPromise()
      .then( () => this.createClient() )
      .catch( (e) => this.rejectClientPromise(e) );
  }

  /**
   * Creates the service SOAP client.
   * Inherits sslStrict from accLogin to stay consistent.
   */
  createClient() {
    const soapOptions = { endpoint: this.endpoint };

    // Propagate SSL mode from the parent connection
    if ( this.accLogin.sslStrict === false ) {
      soapOptions.wsdl_options = {
        agent: new https.Agent({ rejectUnauthorized: false })
      };
    }

    soap.createClientAsync( this.wsdl, soapOptions )
      .then( (client) => {
        this.client = client;
        this.client.addHttpHeader('X-Security-Token', this.accLogin.securityToken);
        this.client.addHttpHeader('cookie', '__sessiontoken=' + this.accLogin.sessionToken);
        // For IMS connections (ACC v8): the Bearer token is also required
        // in the Authorization header for each SOAP call.
        if ( this.accLogin.imsToken ) {
          this.client.addHttpHeader('Authorization', 'Bearer ' + this.accLogin.imsToken);
        }
        this.resolveClientPromise( client );
      })
      .catch( (e) => this.rejectClientPromise(e) );
  }
}

exports.ACCNLObject = ACCNLObject;
