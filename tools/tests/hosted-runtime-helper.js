'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
async function start(directory,{env={}}={}){
    fs.mkdirSync(directory,{recursive:true});
    let output='',port=0,child;
    const stopped=new Promise(resolve=>{
        child=spawn(process.execPath,[path.join(root,'server.js')],{cwd:root,windowsHide:true,
            env:{...process.env,PORT:'0',KSESSION_HOST:'127.0.0.1',
                KSESSION_DATA_FILE:path.join(directory,'data.json'),KSESSION_CONFIG_FILE:path.join(directory,'config.json'),
                KSESSION_ATTACHMENTS_DIR:path.join(directory,'attachments'),KSESSION_BACKUPS_DIR:path.join(directory,'backups'),
                KSESSION_MAIL_CONFIG_FILE:path.join(directory,'mail-reminder.config.json'),
                KSESSION_MAIL_LOG_FILE:path.join(directory,'logs','mail.log'),
                KSESSION_SMTP_SECRET_FILE:path.join(directory,'runtime','secrets','smtp-pass.dpapi'),
                KSESSION_MAIL_ENABLED:'0',KSESSION_MAIL_DRY_RUN:'1',KSESSION_MAIL_FORMAL_ENABLED:'0',
                KSESSION_SKIP_STARTUP_JOBS:'1',...env},
            stdio:['ignore','pipe','pipe']});
        child.on('exit',code=>resolve(code));
    });
    child.stdout.on('data',chunk=>{output+=chunk;const match=output.match(/running at http:\/\/127\.0\.0\.1:(\d+)/);if(match)port=Number(match[1]);});
    child.stderr.on('data',chunk=>output+=chunk);
    for(let i=0;i<160&&!port&&child.exitCode===null;i++)await new Promise(r=>setTimeout(r,50));
    return {directory,child,stopped,get output(){return output;},port,
        async stop(){if(child.exitCode===null)child.kill();await stopped;},
        async call(url,{method='GET',body,token,headers={}}={}){
            assert.ok(port,'Runtime did not start: '+output);
            const response=await fetch('http://127.0.0.1:'+port+url,{method,redirect:'manual',
                headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body!==undefined?{'Content-Type':'application/json',Origin:'http://127.0.0.1:'+port}:{}),...headers},
                ...(body!==undefined?{body:typeof body==='string'?body:JSON.stringify(body)}:{})});
            const text=await response.text();let data;try{data=JSON.parse(text);}catch{data=text;}
            return {status:response.status,data,headers:response.headers};
        }};
}
module.exports={start};
