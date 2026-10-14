'use strict';
// Local counterexample fixture only; never consumed by a Hosted driver.
const {EXPECTED}=require('./setup-diagnostic.cjs');
function all(){return ['NONEMPTY_TARGET','EXISTING_INSTANCE','DESKTOP_SHORTCUT','STARTUP_SHORTCUT','OLD_BINDING','FRESH_ACCEPT','REGISTERED_REJECT'].map(call=>call==='FRESH_ACCEPT'?{call,exitStatus:'INNO_EXIT_SUCCESS',logState:'OBSERVED',markerState:'VALID',markers:['KSESSION_PREINSTALL_READY','KSESSION_FRESH_STARTUP_VERIFIED','KSESSION_INSTALLED_PAYLOAD_VERIFIED'],preInstall:'OBSERVED',copy:'VERIFIED',postInstall:'VERIFIED',outcome:'ACCEPTED'}:{call,exitStatus:'INNO_EXIT_PREPARE_REJECTED',logState:'OBSERVED',markerState:'VALID',markers:[EXPECTED[call]],preInstall:'REJECTED',copy:'NOT_OBSERVED',postInstall:'NOT_OBSERVED',outcome:'REJECTED'});}
module.exports={all};
