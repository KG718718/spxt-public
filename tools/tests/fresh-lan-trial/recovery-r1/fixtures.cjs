'use strict';
const smoke=require('./smoke-report.cjs'),trial=require('../report.cjs');
const source='a'.repeat(40),control='b'.repeat(40),hash='c'.repeat(64);
function smokePass(){const r=smoke.initial({sourceCommit:source,controlCommit:control,run:{id:'1',attempt:1},r1:{codeFingerprint:hash}});Object.assign(r,{status:'BUILD_SMOKE_PASS',reason:'PASS',setupSha256:hash,buildDiagnostic:{stage:'COMPLETE',classification:'PASS',script:null,line:null}});for(const k in r.checks)r.checks[k]=true;for(const k in r.cleanup)r.cleanup[k]=true;return r;}
function trialPass(){const r=trial.initial(source,'CANDIDATE',undefined,control,{id:'2',attempt:1});Object.assign(r,{status:'FRESH_TRIAL_AUTOMATION_PASS_HUMAN_PENDING',stage:'COMPLETE',reason:'PASS',setupSha256:hash,buildDiagnostic:{stage:'COMPLETE',classification:'PASS',script:null,line:null}});r.setupDiagnostics=require('../setup-diagnostic-fixture.cjs').all();r.checks=trial.IDS.map(id=>({id,method:trial.METHODS[id],pass:true,witnesses:Object.fromEntries(trial.WITNESSES[id].map(k=>[k,true]))}));for(const k in r.cleanup)r.cleanup[k]=true;return r;}

module.exports={smokePass,trialPass};
