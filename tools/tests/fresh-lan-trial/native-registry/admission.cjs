'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');

const REPO = 'KG718718/spxt-public';
const BRANCH = 'codex/lan-fresh-trial-v1.1';
const WORKFLOW = '.github/workflows/native-registry-recovery.yml';
const TRIGGER = 'docs/tasks/windows-installer-v1.1/fresh-lan-trial/final-install-lan/native-registry-trigger.json';
const ENVIRONMENT = 'fresh-ab-exact-run-approval';
const REVIEWER = 268517677;
const ENVIRONMENT_ID = 25002534760;
const HEX = /^[a-f0-9]{40}$/;
let admissionFailure = 'SOURCE_BINDING_REJECTED';
function comment(runId, source, control) {
  assert.match(String(runId), /^[1-9][0-9]*$/);
  assert.match(source, HEX);
  assert.match(control, HEX);
  return ['NativeRegistryRecovery', runId, source, control, '1'].join('/');
}
function authorize(trigger, head, tree, changes, message) {
  assert.deepEqual(Object.keys(trigger).sort(), ['executionCommit','kind','schema','source','tree']);
  assert.equal(trigger.kind, 'NATIVE_REGISTRY_ONCE');
  assert.equal(trigger.schema, 1);
  for (const value of [trigger.source, trigger.tree, trigger.executionCommit]) assert.match(value, HEX);
  assert.equal(trigger.source, head);
  assert.equal(trigger.tree, tree);
  assert.deepEqual(changes, [TRIGGER]);
  assert.equal(message, 'NativeRegistryRecovery ' + head);
}
function checkRuns(list, run, jobs, expected) {
  const {id, control, source} = expected;
  assert.equal(list.total_count, 1);
  assert.equal(list.workflow_runs.length, 1);
  for (const value of [list.workflow_runs[0], run]) {
    assert.equal(String(value.id), String(id));
    assert.equal(value.workflow_id, run.workflow_id);
    assert.ok(Number.isSafeInteger(value.workflow_id) && value.workflow_id > 0);
    assert.equal(value.path, WORKFLOW);
    assert.equal(value.head_sha, control);
    assert.equal(value.head_branch, BRANCH);
    assert.equal(value.repository.full_name, REPO);
    assert.equal(value.head_repository.full_name, REPO);
    assert.equal(value.actor.id, REVIEWER);
    assert.equal(value.event, 'push');
    assert.equal(value.run_attempt, 1);
    assert.equal(value.display_title, 'NativeRegistryRecovery ' + source);
    assert.ok(value.status === 'in_progress' || value.status === 'waiting' || value.status === 'queued');
    assert.equal(value.conclusion, null);
  }
  assert.equal(jobs.total_count, 1);
  assert.equal(jobs.jobs.length, 1);
  const job = jobs.jobs[0];
  assert.equal(String(job.run_id), String(id));
  assert.equal(job.run_attempt, 1);
  assert.equal(job.head_sha, control);
  assert.equal(job.name, 'native-registry-recovery');
  assert.equal(job.status, 'in_progress');
  assert.equal(job.conclusion, null);
  assert.deepEqual(job.labels, ['windows-2025']);
  assert.equal(job.runner_group_name, 'GitHub Actions');
  assert.ok(Number.isSafeInteger(job.runner_id) && job.runner_id > 0);
}
function checkProtection(environment, policies, reviews, receipt) {
  assert.equal(environment.id, ENVIRONMENT_ID);
  assert.equal(environment.name, ENVIRONMENT);
  assert.equal(environment.can_admins_bypass, false);
  assert.deepEqual(environment.deployment_branch_policy, {protected_branches:false,custom_branch_policies:true});
  const required = environment.protection_rules.filter(v => v.type === 'required_reviewers');
  assert.equal(required.length, 1);
  assert.equal(required[0].prevent_self_review, false);
  assert.deepEqual(required[0].reviewers.map(v => [v.type,v.reviewer.id]), [['User',REVIEWER]]);
  assert.equal(policies.total_count, 1);
  assert.deepEqual(policies.branch_policies.map(v => [v.type,v.name]), [['branch',BRANCH]]);
  assert.equal(reviews.length, 1);
  assert.equal(reviews[0].state, 'approved');
  assert.deepEqual(reviews[0].environments.map(v => [v.id,v.name]), [[ENVIRONMENT_ID,ENVIRONMENT]]);
  assert.equal(reviews[0].user.id, REVIEWER);
  assert.equal(reviews[0].comment, receipt);
}
async function main() {
  const e = process.env;
  for (const [key, value] of Object.entries({GITHUB_ACTIONS:'true',RUNNER_ENVIRONMENT:'github-hosted',
    RUNNER_OS:'Windows',RUNNER_ARCH:'X64',GITHUB_REPOSITORY:REPO,GITHUB_REF:'refs/heads/'+BRANCH,
    GITHUB_JOB:'native_registry',GITHUB_EVENT_NAME:'push',GITHUB_RUN_ATTEMPT:'1'})) assert.equal(e[key], value);
  const git = (...args) => execFileSync('git',args,{cwd:e.GITHUB_WORKSPACE,encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}).trim();
  const control = e.GITHUB_SHA, id = e.GITHUB_RUN_ID;
  assert.match(control, HEX);
  assert.equal(e.GITHUB_WORKFLOW_SHA, control);
  assert.equal(e.GITHUB_WORKFLOW_REF, REPO+'/'+WORKFLOW+'@refs/heads/'+BRANCH);
  assert.equal(git('rev-parse','HEAD'),control);
  const [head, source, ...extra] = git('rev-list','--parents','-n','1',control).split(' ');
  assert.equal(head, control);
  assert.deepEqual(extra, []);
  assert.equal(git('status','--porcelain','--untracked-files=no'), '');
  const trigger = JSON.parse(fs.readFileSync(path.join(e.GITHUB_WORKSPACE,TRIGGER),'utf8'));
  authorize(trigger, source, git('rev-parse',source+'^{tree}'), git('diff','--name-only',source,control).split('\n'),git('log','-1','--format=%B'));
  const receipt = comment(id,source,control);
  async function api(route) {
    const r = await fetch('https://api.github.com/repos/'+REPO+'/'+route,{
      headers:{Authorization:'Bearer '+e.GH_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},
      signal:AbortSignal.timeout(30000)});
    assert.equal(r.status,200);
    return r.json();
  }
  const routes = ['actions/runs?head_sha='+control+'&per_page=100','actions/runs/'+id,
    'actions/runs/'+id+'/attempts/1/jobs?per_page=100','environments/'+ENVIRONMENT,
    'environments/'+ENVIRONMENT+'/deployment-branch-policies?per_page=100','actions/runs/'+id+'/approvals'];
  admissionFailure = 'ADMISSION_API_UNAVAILABLE';
  const [list, run, jobs, env, policies, reviews] = await Promise.all(routes.map(api));
  admissionFailure = 'RUN_COUNT_OR_IDENTITY_UNPROVEN';
  checkRuns(list,run,jobs,{id,control,source});
  admissionFailure = 'PROTECTED_APPROVAL_UNPROVEN';
  checkProtection(env,policies,reviews,receipt);
  admissionFailure = 'SOURCE_OUTPUT_UNPROVEN';
  fs.appendFileSync(e.GITHUB_ENV,'KSESSION_NATIVE_SOURCE='+source+'\n');
}
module.exports = {authorize, checkRuns, checkProtection, comment};
if (require.main === module) main().catch(() => {
  try {
    const file = path.join(process.env.NATIVE_JOB_ROOT,'result.json');
    const initial = JSON.parse(fs.readFileSync(file,'utf8'));
    assert.equal(initial.kind,'NATIVE_REGISTRY_JOB');
    assert.equal(initial.control,process.env.GITHUB_SHA);
    assert.equal(initial.runId,process.env.GITHUB_RUN_ID);
    assert.equal(initial.firstFailure,'SOURCE_NOT_PROVEN');
    initial.firstFailure = admissionFailure;
    fs.writeFileSync(file,JSON.stringify(initial)+'\n');
  } catch { /* The independent initialization still records SOURCE_NOT_PROVEN. */ }
  process.stderr.write(admissionFailure+'\n');
  process.exitCode = 1;
});
