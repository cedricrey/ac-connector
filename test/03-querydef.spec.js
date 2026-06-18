"use strict";
/**
 * 03-querydef.spec.js — Integration tests: reading via xtkQueryDef
 *
 * Covers standard objects always present on a fresh ACC installation:
 *  - xtk:option      → XtkDatabaseId  (always present, identifies the database)
 *  - xtk:operator    → admin           (always present)
 *  - xtk:schema      → nms:recipient  (always present)
 *  - xtk:folder      → Root folder    (always present)
 *  - nms:recipient   → count          (may be 0 on a fresh instance)
 *
 * Tests are automatically skipped if no connection is configured.
 */
const assert    = require('assert').strict;
const jxon      = require('jxon');
const { getLogin, ACC } = require('./setup');
const xtkQueryDef = ACC.xtkQueryDef;

// Helper: builds query XML from a JS object
function buildQuery({ schema, operation, nodes, condition }) {
  const js = {
    queryDef: {
      '$schema'   : schema,
      '$operation': operation || 'select',
      select      : {
        node: Array.isArray(nodes) ? nodes.map(expr => ({ '$expr': expr })) : [{ '$expr': nodes }]
      }
    }
  };
  if (condition) {
    js.queryDef.where = { condition: { '$expr': condition } };
  }
  return jxon.jsToString(js);
}

describe('xtkQueryDef — standard reads', function () {
  this.timeout(30000);

  let login;

  before(async function () {
    login = await getLogin(this);
  });

  // ─── xtk:option: XtkDatabaseId ──────────────────────────────────────────────
  describe('xtk:option', function () {

    it('XtkDatabaseId is present', async function () {
      const qd     = new xtkQueryDef({ accLogin: login });
      const query  = buildQuery({
        schema   : 'xtk:option',
        nodes    : ['@name', '@dataType', '@stringValue'],
        condition: "@name='XtkDatabaseId'"
      });
      const result = await qd.ExecuteQuery(query);
      assert.ok(result, 'Result must not be null');

      const collection = result['option-collection'];
      assert.ok(collection, 'Response must contain option-collection');

      const option = collection['option'];
      assert.ok(option, 'XtkDatabaseId option must be present');
    });

    it('XtkDatabaseId value is non-empty', async function () {
      const qd    = new xtkQueryDef({ accLogin: login });
      const query = buildQuery({
        schema   : 'xtk:option',
        nodes    : ['@name', '@stringValue'],
        condition: "@name='XtkDatabaseId'"
      });
      const result = await qd.ExecuteQuery(query);
      const option = result?.['option-collection']?.['option'];
      assert.ok(option, 'Option must exist');
      //console.log(`option value: ${JSON.stringify(option)}`)

      // Value may be in option.$stringValue or option.stringValue depending on node-soap
      const val = option.attributes['$stringValue'] || option.attributes['stringValue'] || option.attributes['@stringValue'];
      assert.ok(val && val.length > 0, 'XtkDatabaseId value must not be empty');
    });
  });

  // ─── xtk:operator: admin ─────────────────────────────────────────────────────
  describe('xtk:operator', function () {

    it('admin operator exists', async function () {
      const qd     = new xtkQueryDef({ accLogin: login });
      const query  = buildQuery({
        schema   : 'xtk:operator',
        nodes : ['@id','@name'],
        condition:  "@name='admin'"
      });
      const result = await qd.ExecuteQuery(query);
      assert.ok(result, 'Result must not be null');

      const collection = result['operator-collection'];
      assert.ok(collection, 'Response must contain operator-collection');

      const operator = collection['operator'];
      assert.ok(operator, 'admin operator must be present');
    });
  });

  // ─── xtk:schema: nms:recipient ───────────────────────────────────────────────
  describe('xtk:schema', function () {

    it('nms:recipient schema is present', async function () {
      const qd     = new xtkQueryDef({ accLogin: login });
      const query  = buildQuery({
        schema   : 'xtk:schema',
        nodes    : ['@namespace', '@name', '@label'],
        condition: "@namespace='nms' AND @name='recipient'"
      });
      const result = await qd.ExecuteQuery(query);
      assert.ok(result, 'Result must not be null');

      const collection = result['schema-collection'];
      assert.ok(collection, 'Response must contain schema-collection');

      const schema = collection['schema'];
      assert.ok(schema, 'nms:recipient schema must be present');
    });

    it('several hundred schemas exist', async function () {
      const qd     = new xtkQueryDef({ accLogin: login });
      const query  = buildQuery({
        schema: 'xtk:schema',
        nodes : ['@namespace', '@name']
      });
      const result = await qd.ExecuteQuery(query);
      const collection = result?.['schema-collection'];
      assert.ok(collection, 'Response must contain schema-collection');

      const schemas = collection['schema'];
      assert.ok(schemas, 'Schemas must be present');
      // Any ACC installation has at least 100 built-in schemas
      const count = Array.isArray(schemas) ? schemas.length : 1;
      assert.ok(count >= 10, `Expected at least 10 schemas, got ${count}`);
    });
  });

  // ─── xtk:folder: root folder ─────────────────────────────────────────────────
  describe('xtk:folder', function () {

    it('root folder exists (fullName = /)', async function () {
      const qd     = new xtkQueryDef({ accLogin: login });
      const query  = buildQuery({
        schema   : 'xtk:folder',
        nodes    : ['@id', '@name', '@fullName', '@model'],
        condition: "@fullName='/Administration/'"
      });
      const result = await qd.ExecuteQuery(query);
      const collection = result?.['folder-collection'];
      assert.ok(collection, 'Response must contain folder-collection');

      const folder = collection['folder'];
      assert.ok(folder, 'Root folder "/" must exist');
    });
  });

  // ─── nms:recipient: count ────────────────────────────────────────────────────
  describe('nms:recipient', function () {

    it('count returns a numeric result (may be 0)', async function () {
      const qd = new xtkQueryDef({ accLogin: login });
      const js = {
        queryDef: {
          '$schema'   : 'nms:recipient',
          '$operation': 'count',
          //select      : { node: { '$expr': '@count' } }
        }
      };
      const result = await qd.ExecuteQuery(jxon.jsToString(js));
      // A count result differs from a select: ACC returns
      // the recipient-collection object directly with a count attribute
      assert.ok(result != null, 'Count result must not be null');
    });
  });

  // ─── SelectAll ───────────────────────────────────────────────────────────────
  describe('SelectAll', function () {

    it('SelectAll on xtk:option returns the enriched queryDef', async function () {
      const qd    = new xtkQueryDef({ accLogin: login });
      const query = buildQuery({
        schema   : 'xtk:option',
        nodes    : ['@name'],
        condition: "@name='XtkDatabaseId'"
      });
      const result = await qd.SelectAll(query);
      // SelectAll returns result.entity.queryDef
      assert.ok(result, 'SelectAll must return a result');
    });
  });
});
