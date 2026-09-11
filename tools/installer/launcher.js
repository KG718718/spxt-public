'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const C=require('./install-common');
function main(){
 const a=C.args(process.argv.slice(2),{'--port':true,'--lan':false,'--no-browser':false});
 const port=a['--port']===undefined?8080:Number(a['--port']);if(!Number.isInteger(port)||port<0||port>65535)throw Error('Port must be an integer from 0 to 65535');
 const root=__dirname;C.verifyRoot(root);
 const active=C.readJSON(C.inside(root,'active.json'));
 if(active.schema!==1||active.product!=='K-SESSION'||active.instanceSchema!==1||!/^[a-f0-9]{64}$/.test(active.release)||active.nodeVersion!=='24.21.0')throw Error('Invalid active program pointer');
 const version=C.inside(root,'versions/'+active.release),manifestFile=C.inside(version,'payload-manifest.json');
 if(C.sha(fs.readFileSync(manifestFile))!==active.release)throw Error('Active program manifest checksum mismatch');
 const app=C.inside(version,'app');C.verifyFiles(app,C.readJSON(manifestFile),true);
 const node=C.inside(root,'runtime/node.exe');if(C.sha(fs.readFileSync(node))!==active.nodeExeSha256)throw Error('Runtime checksum mismatch');
 const activeBytes=fs.readFileSync(C.inside(root,'active.json'),'utf8');const unlock=C.acquire(root,'application');
 let child,done=false;
 function release(){if(!done){done=true;unlock();}}
 try {
  if(fs.readFileSync(C.inside(root,'active.json'),'utf8')!==activeBytes||JSON.parse(activeBytes).release!==active.release)throw Error('Active program changed before lock; restart launcher');C.dependencies(version);
  const instance=C.inside(root,'instance');fs.mkdirSync(instance,{recursive:true});
  const env={...process.env};for(const k of Object.keys(env))if(k.startsWith('KSESSION_')&&k!=='KSESSION_SKIP_STARTUP_JOBS'&&k!=='KSESSION_SMTP_USER')delete env[k];
  Object.assign(env,{PORT:String(port),KSESSION_HOST:a['--lan']?'0.0.0.0':'127.0.0.1',
   KSESSION_DATA_FILE:C.inside(instance,'data.json'),KSESSION_CONFIG_FILE:C.inside(instance,'config.json'),
   KSESSION_ATTACHMENTS_DIR:C.inside(instance,'attachments'),KSESSION_BACKUPS_DIR:C.inside(instance,'backups'),
   KSESSION_MAIL_CONFIG_FILE:C.inside(instance,'mail-reminder.config.json'),KSESSION_MAIL_LOG_FILE:C.inside(instance,'logs/mail.log'),
   KSESSION_SMTP_SECRET_FILE:C.inside(instance,'runtime/secrets/smtp-pass.dpapi'),
   KSESSION_OCR_PYTHON:C.inside(instance,'runtime/ocr/ocr-env/Scripts/python.exe'),
   KSESSION_OCR_SCRIPT:C.inside(app,'tools/ocr/ocr_invoice.py')});
  if(a['--lan'])console.log('LAN bind explicitly requested. No firewall rule was added. First Admin setup still requires the host machine. This does not claim HTTPS or public-internet safety.');
  child=cp.spawn(node,[path.join(app,'server.js')],{cwd:app,env,windowsHide:true,stdio:['ignore','pipe','pipe']});
  let output='',opened=false;
  child.stdout.on('data',b=>{process.stdout.write(b);output+=b;const m=output.match(/running at http:\/\/(?:127\.0\.0\.1|0\.0\.0\.0):(\d+)/);
   if(m&&!opened){opened=true;if(!a['--no-browser']){const url='http://127.0.0.1:'+Number(m[1])+'/login.html';const browser=cp.spawn('cmd.exe',['/d','/c','start','',url],{windowsHide:true,stdio:'ignore'});browser.on('error',()=>console.log('Open '+url+' manually.'));}console.log('To stop safely: type stop and press Enter, or press Ctrl+C.');}
  });child.stderr.on('data',b=>process.stderr.write(b));
  child.on('error',e=>{console.error('Unable to launch: '+e.message);process.exitCode=1;release();process.stdin.pause();});
  child.on('exit',(code,signal)=>{release();process.exitCode=signal?0:(code||0);process.stdin.pause();});
  const stop=()=>{if(child&&child.exitCode===null)child.kill();};
  process.on('SIGINT',stop);process.on('SIGTERM',stop);
  let input='';process.stdin.setEncoding('utf8');process.stdin.on('data',b=>{input+=b;let n;while((n=input.indexOf('\n'))>=0){const line=input.slice(0,n).trim().toLowerCase();input=input.slice(n+1);if(line==='stop')stop();}});
 }catch(e){release();throw e;}
}
if(require.main===module){try{main();}catch(e){console.error('START FAILED: '+e.message);process.exitCode=1;}}
module.exports={main};
