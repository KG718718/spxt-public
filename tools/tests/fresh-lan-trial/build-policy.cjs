'use strict';
const assert=require('node:assert/strict');
const EXPECTED=Object.freeze({FRESH_FIREWALL_POLICY:['TestFreshStrictBindingAndStandardSchemaIsolation','TestFreshFirewallBindingBeforeAnyMutation'],FRESH_LAUNCHER_POLICY:['TestFreshLogonPlanIsCurrentUserInstalledOnly','TestFreshEnvironmentAndNetworkBindingFailClosed']});
function validate(r,kind,sourceCommit){assert.deepEqual(Object.keys(r).sort(),['schema','kind','sourceCommit','status','expectedTests','pass','fail','skipped'].sort());assert.equal(r.schema,1);assert.equal(r.kind,kind);assert.ok(Object.hasOwn(EXPECTED,kind));assert.equal(r.sourceCommit,sourceCommit);assert.equal(r.status,'PASS');assert.deepEqual(r.expectedTests,EXPECTED[kind]);assert.equal(r.pass,2);assert.equal(r.fail,0);assert.equal(r.skipped,0);return r;}
module.exports={EXPECTED,validate};
