'use strict';
const assert = require('node:assert/strict');
const gate = require('./admission.cjs');
const source = 'a'.repeat(40), control = 'b'.repeat(40), tree = 'c'.repeat(40), id = '74';
const triggerPath = 'docs/tasks/windows-installer-v1.1/fresh-lan-trial/final-install-lan/native-registry-trigger.json';
const branch = 'codex/lan-fresh-trial-v1.1', repo = 'KG718718/spxt-public';
const envId = 25002534760, reviewer = 268517677;
const trigger = {kind:'NATIVE_REGISTRY_ONCE',schema:1,source,tree,executionCommit:'d'.repeat(40)};
const run = {id:74,workflow_id:9,head_sha:control,head_branch:branch,repository:{full_name:repo},
  head_repository:{full_name:repo},actor:{id:reviewer},event:'push',run_attempt:1,
  path:'.github/workflows/native-registry-recovery.yml',display_title:'NativeRegistryRecovery '+source,
  status:'in_progress',conclusion:null};
const job = {run_id:74,run_attempt:1,head_sha:control,name:'native-registry-recovery',status:'in_progress',
  conclusion:null,labels:['windows-2025'],runner_group_name:'GitHub Actions',runner_id:12};
const receipt = gate.comment(id,source,control);
const baseline = {list:{total_count:1,workflow_runs:[run]},run,jobs:{total_count:1,jobs:[job]},
  env:{id:envId,name:'fresh-ab-exact-run-approval',can_admins_bypass:false,
    deployment_branch_policy:{protected_branches:false,custom_branch_policies:true},
    protection_rules:[{type:'required_reviewers',prevent_self_review:false,reviewers:[{type:'User',reviewer:{id:reviewer}}]}]},
  policies:{total_count:1,branch_policies:[{type:'branch',name:branch}]},
  reviews:[{state:'approved',environments:[{id:envId,name:'fresh-ab-exact-run-approval'}],user:{id:reviewer},comment:receipt}]};
function validate(data) {
  gate.checkRuns(data.list,data.run,data.jobs,{id,source,control});
  gate.checkProtection(data.env,data.policies,data.reviews,receipt);
}
gate.authorize(trigger,source,tree,[triggerPath],run.display_title);
validate(baseline);
assert.throws(()=>gate.authorize(trigger,source,tree,[triggerPath,'other'],run.display_title));
assert.throws(()=>gate.authorize(trigger,'f'.repeat(40),tree,[triggerPath],run.display_title));
const counterexamples = [
  data => data.list.workflow_runs.push({...run,id:75}),
  data => data.list.total_count++,
  data => data.run.run_attempt++,
  data => data.run.head_sha = source,
  data => data.jobs.jobs[0].runner_group_name = 'other',
  data => data.jobs.jobs[0].runner_id = 0,
  data => data.jobs.jobs[0].labels = ['self-hosted'],
  data => data.jobs.jobs.push({...job,name:'another'}),
  data => data.env.can_admins_bypass = true,
  data => data.reviews[0].comment = 'approved',
  data => data.reviews.length = 0,
  data => data.reviews[0].environments[0].id++,
  data => data.reviews[0].user.id++,
  data => data.policies.branch_policies[0].name = '*',
];
for (const change of counterexamples) {
  const data = structuredClone(baseline);
  change(data);
  assert.throws(()=>validate(data));
}
console.log(JSON.stringify({scope:'SYNTHETIC_ADMISSION_ONLY',cases:counterexamples.length+4,fail:0,skip:0}));
