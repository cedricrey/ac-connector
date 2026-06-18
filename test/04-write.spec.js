"use strict";
/**
 * 04-write.spec.js — Integration tests: writing via xtkSession
 *
 * Tests the full Create → Read → Delete cycle on a temporary xtk:option.
 * The cleanup (delete) is guaranteed even if a read test fails, via the after() hook.
 *
 * Why xtk:option:
 *  - Simple configuration object (no functional impact)
 *  - Writable by any admin operator
 *  - Cleanly deletable with _operation="delete"
 *
 * Tests are automatically skipped if no connection is configured.
 */
const assert    = require('assert').strict;
const jxon      = require('jxon');
const { getLogin, ACC } = require('./setup');
const xtkSession  = ACC.xtkSession;
const xtkQueryDef = ACC.xtkQueryDef;

// Unique name to avoid collisions with real data
const TEST_OPTION_NAME  = '__ac_connector_test__';
const TEST_OPTION_VALUE = 'ac-connector-mocha-test-' + Date.now();

describe('xtkSession — write xtk:option', function () {
  this.timeout(30000);

  let login;

  before(async function () {
    login = await getLogin(this);
  });

  // Guaranteed cleanup: deletes the test option even if an it() failed
  after(async function () {
    if (!login) return;
    try {
      const sess = new xtkSession({ accLogin: login });
      const deleteXml = jxon.jsToString({
        option: {
          '$xtkschema'  : 'xtk:option',
          '$_operation' : 'delete',
          '$name'       : TEST_OPTION_NAME
        }
      });
      await sess.Write(deleteXml);
    } catch (e) {
      // Not a problem if the option didn't exist (creation test failed)
      console.warn('[after] Cleanup of test option:', e.message);
    }
  });

  // ─── Create ──────────────────────────────────────────────────────────────────
  it('Write creates a new xtk:option', async function () {
    const sess = new xtkSession({ accLogin: login });
    const xml  = jxon.jsToString({
      option: {
        '$xtkschema'  : 'xtk:option',
        '$_operation' : 'insertOrUpdate',
        '$name'       : TEST_OPTION_NAME,
        '$dataType'   : '6',            // 6 = String
        '$stringValue': TEST_OPTION_VALUE,
        '$label'      : 'Temporary option created by ac-connector Mocha tests'
      }
    });
    // Write must resolve without throwing = success
    const result = await sess.Write(xml);
    assert.ok(result !== undefined, 'Write must resolve without error');
  });

  // ─── Read verification ───────────────────────────────────────────────────────
  it('created option is readable via xtkQueryDef', async function () {
    const qd    = new xtkQueryDef({ accLogin: login });
    const query = jxon.jsToString({
      queryDef: {
        '$schema'   : 'xtk:option',
        '$operation': 'select',
        select      : {
          node: [
            { '$expr': '@name'        },
            { '$expr': '@stringValue' },
            { '$expr': '@dataType'    }
          ]
        },
        where: {
          condition: { '$expr': `@name='${TEST_OPTION_NAME}'` }
        }
      }
    });
    const result = await qd.ExecuteQuery(query);
    const option = result?.['option-collection']?.['option'];
    assert.ok(option, `Option "${TEST_OPTION_NAME}" must be found after creation`);
  });

  it('read value matches written value', async function () {
    const qd    = new xtkQueryDef({ accLogin: login });
    const query = jxon.jsToString({
      queryDef: {
        '$schema'   : 'xtk:option',
        '$operation': 'select',
        select      : {
          node: { '$expr': '@stringValue' }
        },
        where: {
          condition: { '$expr': `@name='${TEST_OPTION_NAME}'` }
        }
      }
    });
    const result = await qd.ExecuteQuery(query);
    const option = result?.['option-collection']?.['option'];
    assert.ok(option, 'Option must exist');
    // Supports different attribute encodings depending on node-soap version
    const val = option.attributes['$stringValue']
             || option.attributes['stringValue']
             || option.attributes['@stringValue'];
    assert.strictEqual(
      val,
      TEST_OPTION_VALUE,
      'Read value must match written value'
    );
  });

  // ─── Delete ──────────────────────────────────────────────────────────────────
  it('Write deletes the test option', async function () {
    const sess = new xtkSession({ accLogin: login });
    const xml  = jxon.jsToString({
      option: {
        '$xtkschema'  : 'xtk:option',
        '$_operation' : 'delete',
        '$name'       : TEST_OPTION_NAME
      }
    });
    const result = await sess.Write(xml);
    assert.ok(result !== undefined, 'Write delete must resolve without error');
  });

  it('deleted option is no longer visible', async function () {
    const qd    = new xtkQueryDef({ accLogin: login });
    const query = jxon.jsToString({
      queryDef: {
        '$schema'   : 'xtk:option',
        '$operation': 'select',
        select      : { node: { '$expr': '@name' } },
        where       : { condition: { '$expr': `@name='${TEST_OPTION_NAME}'` } }
      }
    });
    const result = await qd.ExecuteQuery(query);
    // After deletion, the collection must be empty (no option element)
    const option = result?.['option-collection']?.['option'];
    assert.ok(!option, `Option "${TEST_OPTION_NAME}" must no longer exist after deletion`);
  });
});
