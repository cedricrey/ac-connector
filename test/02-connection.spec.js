"use strict";
/**
 * 02-connection.spec.js — Integration tests: ACC connection
 *
 * Verifies that the configured connection responds correctly:
 *  - sessionToken is non-empty
 *  - securityToken or imsToken present depending on auth type
 *  - endpoint is built correctly
 *
 * Tests are automatically skipped if no connection is configured.
 */
const assert = require('assert').strict;
const { getLogin, connectionName, ACC } = require('./setup');

describe('ACC Connection', function () {
  // Generous timeout for network + IMS calls
  this.timeout(30000);

  let login;
  let tokens;

  before(async function () {
    login  = await getLogin(this);
    tokens = await login.getLoginPromise();
  });

  it('login() resolves with a tokens object', function () {
    assert.ok(tokens, 'The login promise should resolve with an object');
    assert.strictEqual(typeof tokens, 'object');
  });

  it('sessionToken is non-empty', function () {
    assert.ok(tokens.sessionToken, 'sessionToken must not be empty');
    assert.ok(tokens.sessionToken.length > 0);
  });

  it('securityToken is present (may be empty for IMS)', function () {
    // password v7 auth: securityToken = short ACC token
    // IMS v8 auth     : securityToken = imsToken (never null)
    assert.ok(tokens.securityToken !== undefined, 'securityToken must exist in tokens');
  });

  it('endpoint contains soaprouter.jsp', function () {
    assert.ok(tokens.endpoint, 'endpoint must be defined');
    assert.ok(
      tokens.endpoint.endsWith('/nl/jsp/soaprouter.jsp'),
      'endpoint must end with /nl/jsp/soaprouter.jsp'
    );
  });

  it('isLoginRequested() returns true after login()', function () {
    assert.strictEqual(login.isLoginRequested(), true);
  });

  it('getTokens() returns the same tokens as the promise', function () {
    const t = login.getTokens();
    assert.strictEqual(t.sessionToken,  tokens.sessionToken);
    assert.strictEqual(t.securityToken, tokens.securityToken);
    assert.strictEqual(t.endpoint,      tokens.endpoint);
  });

  describe('IMS connection (ACC v8 only)', function () {
    it('imsToken is present when authType is ims', function () {
      const conn = ACC.ACCLogManager.getConnection(connectionName());
      if (!conn || conn.authType !== 'ims') {
        this.skip();
        return;
      }
      assert.ok(tokens.imsToken, 'imsToken must be defined for an IMS connection');
      assert.ok(tokens.imsToken.length > 20, 'imsToken must be a non-trivial JWT');
    });
  });
});
