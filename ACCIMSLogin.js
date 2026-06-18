"use strict";
const https = require('https');
const soap = require('soap');
const xtkSessionWSDL = require.resolve('./wsdl/wsdl_xtksession.xml');

/**
 * ACCIMSLogin — IMS authentication (OAuth2 client credentials) for Adobe Campaign v8.
 *
 * Expected connection parameters:
 *   server             {string}  ACC instance URL (e.g. https://myinstance.campaign.adobe.com)
 *   imsEndpoint        {string}  Adobe IMS URL (default: https://ims-na1.adobelogin.com)
 *   clientId           {string}  Service Account Client ID (Adobe Developer Console)
 *   clientSecret       {string}  Service Account Client Secret
 *   orgId              {string}  IMS Org ID (e.g. XXXXXXXX@AdobeOrg)
 *   technicalAccountId {string}  Technical Account ID (e.g. XXXXXXXX@techacct.adobe.com)
 *   scope              {string}  OAuth2 scopes (default value provided below)
 *
 * Public API — identical to ACCLogin:
 *   login()            → Promise  Triggers the auth flow, returns tokens
 *   getLoginPromise()  → Promise  Returns the login promise (for chaining)
 *   isLoginRequested() → Boolean  Whether login() has already been called
 *   getTokens()        → Object   { sessionToken, securityToken, endpoint, imsToken }
 */
class ACCIMSLogin {

  constructor(options) {
    options = options || {};
    this.server             = options.server             || "";
    this.imsEndpoint        = options.imsEndpoint        || "https://ims-na1.adobelogin.com";
    this.clientId           = options.clientId           || "";
    this.clientSecret       = options.clientSecret       || "";
    this.orgId              = options.orgId              || "";
    this.technicalAccountId = options.technicalAccountId || "";
    this.scope              = options.scope              || [
      "openid",
      "AdobeID",
      "read_organizations",
      "additional_info.projectedProductContext",
      "session"
    ].join(",");
    this.sslStrict = options.sslStrict !== false; // true by default

    this.endpoint          = this.server + "/nl/jsp/soaprouter.jsp";
    this.loginRequested    = false;

    // IMS tokens
    this.imsToken          = null;
    this.imsTokenExpiry    = null;

    // ACC tokens (obtained after SOAP Logon)
    this.sessionToken      = null;
    this.securityToken     = null;

    // Login promise exposed publicly (same contract as ACCLogin)
    this.loginPromise = new Promise((resolve, reject) => {
      this._resolveLogin = resolve;
      this._rejectLogin  = reject;
    });
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Starts the IMS → SOAP Logon authentication flow.
   * @returns {Promise} Resolves with { sessionToken, securityToken, endpoint, imsToken }
   */
  login() {
    this.loginRequested = true;
    this._doLogin()
      .then(tokens => this._resolveLogin(tokens))
      .catch(err   => this._rejectLogin(err));
    return this.loginPromise;
  }

  /** Returns the login promise for external chaining (used by ACCNLObject). */
  getLoginPromise() {
    return this.loginPromise;
  }

  /** Whether login() has already been called (prevents duplicate calls in ACCNLObject). */
  isLoginRequested() {
    return this.loginRequested;
  }

  /** Returns the current tokens. */
  getTokens() {
    return {
      sessionToken  : this.sessionToken,
      securityToken : this.securityToken,
      endpoint      : this.endpoint,
      imsToken      : this.imsToken
    };
  }

  // ─── Internals ────────────────────────────────────────────────────────────

  /**
   * Full flow: fetch IMS token → SOAP Logon → store ACC tokens.
   * @returns {Promise}
   */
  async _doLogin() {
    await this._fetchIMSToken();
    // In ACC v8, the IMS token is used directly as the session token.
    // No SOAP Logon — the token is used as-is in all subsequent calls.
    this.sessionToken  = this.imsToken;
    this.securityToken = this.imsToken;
    return this.getTokens();
  }

  /**
   * Fetches an IMS access_token via the client_credentials grant.
   * Stores the token and computes its expiry (with a 60s safety margin).
   */
  async _fetchIMSToken() {
    const body = [
      "grant_type=client_credentials",
      "client_id="     + encodeURIComponent(this.clientId),
      "client_secret=" + encodeURIComponent(this.clientSecret),
      "scope="         + encodeURIComponent(this.scope)
    ].join("&");

    const tokenUrl = this.imsEndpoint + "/ims/token/v3";
    const data = await this._httpsPost(tokenUrl, {
      "Content-Type"   : "application/x-www-form-urlencoded",
      "Content-Length" : Buffer.byteLength(body)
    }, body);

    if (!data.access_token) {
      throw new Error("ACCIMSLogin: IMS error, response: " + JSON.stringify(data));
    }

    this.imsToken      = data.access_token;
    // expires_in is in seconds; subtract 60s to renew before actual expiry
    this.imsTokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
  }

  /** Returns true if the IMS token is expired or missing. */
  _isIMSTokenExpired() {
    return !this.imsToken || Date.now() >= this.imsTokenExpiry;
  }

  /**
   * Refreshes the IMS token if needed.
   * Can be called by consumer code before a long SOAP operation.
   */
  async ensureFreshToken() {
    if (this._isIMSTokenExpired()) {
      await this._fetchIMSToken();
    }
    return this.imsToken;
  }

  /**
   * Calls xtk:session#Logon with the IMS Bearer token in the Authorization header.
   *
   * ACC v8 requires two things simultaneously:
   *   1. The IMS Bearer token in the Authorization header (proves identity to IMS)
   *   2. The technical account login in strLogin (identifies the associated ACC operator)
   *
   * Without strLogin, ACC responds XSV-350035 "You must provide a login"
   * even if the Bearer token is valid.
   */
  async _soapLogon() {
    const soapOptions = { endpoint: this.endpoint };
    if ( !this.sslStrict ) {
      soapOptions.wsdl_options = {
        agent: new https.Agent({ rejectUnauthorized: false })
      };
    }
    const client = await soap.createClientAsync(xtkSessionWSDL, soapOptions);

    // IMS Bearer token in the HTTP header (kept for compatibility)
    client.addHttpHeader("Authorization", "Bearer " + this.imsToken);

    await new Promise((resolve, reject) => {
      client.Logon({
        sessiontoken   : "",
        strLogin       : this.technicalAccountId,  // ACC operator identifier
        strPassword    : this.imsToken,             // IMS token used as password
        elemParameters : ""
      }, (err, result) => {
        if (err) {
          //console.log(err)
          reject(new Error("ACCIMSLogin: SOAP Logon failed — " + err.body));
          return;
        }
        try {
          this.securityToken = result.pstrSecurityToken.$value || "";
        } catch (e) {
          this.securityToken = "";
        }
        try {
          this.sessionToken = result.pstrSessionToken.$value;
          console.log("Got Session Token !" , this.sessionToken)
        } catch (e) {
          reject(new Error("ACCIMSLogin: sessionToken missing from Logon response"));
          return;
        }
        resolve();
      });
    });
  }

  /**
   * Minimal HTTPS POST wrapper (no external dependencies).
   * @param {string} url     Full URL (https://)
   * @param {Object} headers HTTP headers
   * @param {string} body    Request body (already encoded)
   * @returns {Promise<Object>} Parsed JSON response
   */
  _httpsPost(url, headers, body) {
    return new Promise((resolve, reject) => {
      const parsed = new URL(url);
      const reqOptions = {
        hostname          : parsed.hostname,
        port              : parsed.port || 443,
        path              : parsed.pathname + (parsed.search || ""),
        method            : "POST",
        headers           : headers,
        rejectUnauthorized: this.sslStrict !== false
      };

      const req = https.request(reqOptions, (res) => {
        let raw = "";
        res.on("data", chunk => raw += chunk);
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try   { resolve(JSON.parse(raw)); }
            catch (e) { resolve(raw); }
          } else {
            reject(new Error(
              "ACCIMSLogin: HTTP " + res.statusCode + " on " + url + " — " + raw
            ));
          }
        });
      });

      req.on("error", reject);
      req.write(body);
      req.end();
    });
  }
}

exports.ACCIMSLogin = ACCIMSLogin;
