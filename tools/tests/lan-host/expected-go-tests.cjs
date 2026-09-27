'use strict';
const assert=require('node:assert/strict');
const FIREWALL=Object.freeze(['TestRequestWhitelistAndCanonicalGUID','TestStrictDeploymentConfig',
  'TestStrictDeploymentConfigExactKeyCorpus','TestInstallIdentityAndTampering','TestReparseResolutionMismatchIsRejected',
  'TestCleanPathComparisonRejectsLexicalAliases','TestBoundConfigMustMatchRequest','TestRegistrationAndINIContracts',
  'TestRuleOwnershipAndIdempotencyPolicy','TestEmbeddedFirewallScriptIsClosed','TestEmbeddedFirewallScriptParses',
  'TestStatusOutputAllowlist','TestFirewallScriptBehaviorWithIsolatedCmdletHarness']);
const LAUNCHER=Object.freeze(['TestRelativePathSafety','TestEnvironmentAllowlist','TestInstanceOutsidePackage','TestRuntimeMissing',
  'TestJobOwnsOnlyChild','TestInstallDataSafety','TestLANReadyRequiresEveryGate','TestFixedServerStatusesMapToProductStates',
  'TestCandidateAndJSONAreStrict','TestEnvironmentLANModeIsExplicitAndAllowlisted','TestExactListenerOwnershipRejectsWildcardThirdNICPortAndPIDImpersonationRows',
  'TestCopyURLSourceIsOnlyCurrentPrivateEndpoint','TestPersistedPortNeverSilentlyFallsThroughRange','TestFirewallHelperFixedHashBeforeElevation',
  'TestFirewallHelperAbsentHashKeepsHistoricalLocalMode','TestFirewallEnvironmentFailureIsFailClosed','TestUACRejectionDoesNotStopLocalChildOrRetry',
  'TestLANSettingsTransitionDoesNotBlockUIThread','TestTransitionStartFailureRestoresOldConfigAndService','TestFirstTransitionStartFailureKeepsDeterminedPort',
  'TestTransitionRejectsUnexpectedFallbackPort','TestFailedRefreshRevokesStaleCopyURL','TestFreshDiscoveryMismatchRevokesCopyURL',
  'TestFreshDiscoveryMatchPublishesURLWhenFirewallBlocked','TestStrictLocalStatusAndActualPIDSocketOwnership']);
const INTEGRATION_IDS=Object.freeze(['L01','X03','L02','L03','L04','L05','L06','L15','L14','L12','L13','L16','X01',
  'L07','L08','L09','L10','L11','X02','X04','X05','X06','L17']);
const suites=Object.freeze({FIREWALL,LAUNCHER,INTEGRATION_IDS});
if(require.main===module){
  const suite=process.argv[2];assert.ok(Object.hasOwn(suites,suite));process.stdout.write(JSON.stringify(suites[suite]));
}
module.exports=suites;
