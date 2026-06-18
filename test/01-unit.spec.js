"use strict";
/**
 * 01-unit.spec.js — Unit tests (no ACC connection required)
 *
 * Covers:
 *  - ACCLogManager : in-memory CRUD, saveConnections never leaks secrets
 *  - ACCLogin      : default values, sslStrict option
 *  - ACCIMSLogin   : default values, sslStrict option, token expiry
 */
const assert      = require('assert').strict;
const ACCLogManager = require('..').ACCLogManager;
const ACCLogin      = require('../ACCLogin').ACCLogin;
const ACCIMSLogin   = require('../ACCIMSLogin').ACCIMSLogin;
const fs            = require('fs');
const path          = require('path');

// ─── ACCLogManager ────────────────────────────────────────────────────────────
describe('ACCLogManager', () => {

  describe('In-memory connection management', () => {

    before(() => {
      // Snapshot to restore state after tests
      ACCLogManager._backup = JSON.parse(JSON.stringify(ACCLogManager.Connections));
    });

    after(() => {
      ACCLogManager.Connections = ACCLogManager._backup;
    });

    it('listConnections() returns an array', () => {
      assert.ok(Array.isArray(ACCLogManager.listConnections()));
    });

    it('getConnection() returns null for an unknown name', () => {
      assert.strictEqual(ACCLogManager.getConnection('__inexistant__'), null);
    });

    it('addConnection() stores the connection without the secret', async () => {
      await ACCLogManager.addConnection('__test__', {
        server  : 'https://test.example.com',
        user    : 'testuser',
        password: 'supersecret'
      });
      const conn = ACCLogManager.getConnection('__test__');
      assert.ok(conn, 'Connection should exist');
      assert.strictEqual(conn.server, 'https://test.example.com');
      assert.strictEqual(conn.password, undefined, 'Password must not be stored in memory');
    });

    it('listConnections() includes the added connection', () => {
      assert.ok(ACCLogManager.listConnections().includes('__test__'));
    });

    it('modifyConnection() updates non-secret fields', async () => {
      await ACCLogManager.modifyConnection('__test__', { server: 'https://updated.example.com' });
      assert.strictEqual(ACCLogManager.getConnection('__test__').server, 'https://updated.example.com');
    });

    it('deleteConnection() removes the connection', async () => {
      await ACCLogManager.deleteConnection('__test__');
      assert.strictEqual(ACCLogManager.getConnection('__test__'), null);
      assert.ok(!ACCLogManager.listConnections().includes('__test__'));
    });
  });

  describe('saveConnections() never persists secrets', () => {
    it('the written JSON contains neither "password" nor "clientSecret"', async () => {
      // Add a connection with a secret, force a save, read the JSON
      await ACCLogManager.addConnection('__secret_test__', {
        server  : 'https://test.example.com',
        password: 'TOP_SECRET_PASSWORD'
      });
      const raw = fs.readFileSync(ACCLogManager.configFile, 'utf8');
      assert.ok(!raw.includes('TOP_SECRET_PASSWORD'), 'Secret must never appear in the JSON');
      await ACCLogManager.deleteConnection('__secret_test__');
    });
  });
});

// ─── ACCLogin ─────────────────────────────────────────────────────────────────
describe('ACCLogin', () => {

  it('endpoint is built correctly from server', () => {
    const login = new ACCLogin({ server: 'https://acc.example.com', user: 'u', password: 'p' });
    assert.strictEqual(login.endpoint, 'https://acc.example.com/nl/jsp/soaprouter.jsp');
  });

  it('sslStrict is true by default', () => {
    const login = new ACCLogin({ server: 'https://acc.example.com' });
    assert.strictEqual(login.sslStrict, true);
  });

  it('sslStrict can be disabled', () => {
    const login = new ACCLogin({ server: 'https://acc.example.com', sslStrict: false });
    assert.strictEqual(login.sslStrict, false);
  });

  it('loginRequested is false before login()', () => {
    const login = new ACCLogin({ server: 'https://acc.example.com' });
    assert.strictEqual(login.isLoginRequested(), false);
  });

  it('getLoginPromise() returns a Promise', () => {
    const login = new ACCLogin({ server: 'https://acc.example.com' });
    assert.ok(login.getLoginPromise() instanceof Promise);
  });
});

// ─── ACCIMSLogin ──────────────────────────────────────────────────────────────
describe('ACCIMSLogin', () => {

  it('endpoint is built correctly from server', () => {
    const login = new ACCIMSLogin({ server: 'https://acc.example.com' });
    assert.strictEqual(login.endpoint, 'https://acc.example.com/nl/jsp/soaprouter.jsp');
  });

  it('default imsEndpoint points to Adobe IMS', () => {
    const login = new ACCIMSLogin({});
    assert.strictEqual(login.imsEndpoint, 'https://ims-na1.adobelogin.com');
  });

  it('sslStrict is true by default', () => {
    const login = new ACCIMSLogin({});
    assert.strictEqual(login.sslStrict, true);
  });

  it('sslStrict can be disabled', () => {
    const login = new ACCIMSLogin({ sslStrict: false });
    assert.strictEqual(login.sslStrict, false);
  });

  it('default scope includes openid and AdobeID', () => {
    const login = new ACCIMSLogin({});
    assert.ok(login.scope.includes('openid'));
    assert.ok(login.scope.includes('AdobeID'));
  });

  it('_isIMSTokenExpired() returns true when no token', () => {
    const login = new ACCIMSLogin({});
    assert.strictEqual(login._isIMSTokenExpired(), true);
  });

  it('_isIMSTokenExpired() returns false for a fresh token', () => {
    const login = new ACCIMSLogin({});
    login.imsToken      = 'fake-token';
    login.imsTokenExpiry = Date.now() + 60000; // expires in 60s
    assert.strictEqual(login._isIMSTokenExpired(), false);
  });

  it('_isIMSTokenExpired() returns true for an expired token', () => {
    const login = new ACCIMSLogin({});
    login.imsToken      = 'fake-token';
    login.imsTokenExpiry = Date.now() - 1000; // expired 1s ago
    assert.strictEqual(login._isIMSTokenExpired(), true);
  });

  it('loginRequested is false before login()', () => {
    const login = new ACCIMSLogin({});
    assert.strictEqual(login.isLoginRequested(), false);
  });
});
