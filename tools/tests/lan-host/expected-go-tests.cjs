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
const suites=Object.freeze({FIREWALL,LAUNCHER});
if(require.main===module){
  const suite=process.argv[2];assert.ok(Object.hasOwn(suites,suite));process.stdout.write(JSON.stringify(suites[suite]));
}
module.exports=suites;
