'use strict';
const {loadStartupState,localSetupRequest,initializeFirstAdministrator}=require('./public-startup');
const MAX_BODY_BYTES=8192;
const BODY_TIMEOUT_MS=10000;
function createBootstrapHandler(options){
    if(typeof options?.getPort!=='function'||typeof options?.onInitialized!=='function')
        throw Error('Bootstrap requires a server port and state handoff callback.');
    function send(res,status,payload,headers={}){
        if(res.destroyed||res.writableEnded)return;
        res.statusCode=status;
        res.setHeader('Content-Type','application/json; charset=utf-8');
        res.setHeader('Cache-Control','no-store');
        res.setHeader('X-Content-Type-Options','nosniff');
        for(const [key,value] of Object.entries(headers))res.setHeader(key,value);
        res.end(JSON.stringify(payload));
    }
    function failure(res,error){
        const known=new Set(['STORE_UNREADABLE','STORE_INVALID','CONFIG_INVALID','ORPHANED_INSTALLATION','ALREADY_INITIALIZED','INVALID_ADMIN','INITIALIZATION_FAILED']);
        const recognized=known.has(error?.code);
        const status=recognized&&[400,409].includes(error?.statusCode)?error.statusCode:503;
        send(res,status,{success:false,code:recognized?error.code:'INITIALIZATION_UNAVAILABLE',
            error:recognized?error.message:'初始化暂不可用，请检查服务状态；不会覆盖已有数据。'});
    }
    return function handleBootstrap(req,res){
        if(String(req.url||'').split('?')[0]!=='/api/setup')return false;
        try{
            const port=options.getPort();
            if(!Number.isInteger(port)||port<1||port>65535)throw Error('Server port unavailable');
            if(!localSetupRequest(req,port,req.method==='POST')){
                send(res,403,{success:false,error:'首次安装仅允许在主机本机通过同源页面完成。'});
                req.resume?.();return true;
            }
            if(!['GET','POST'].includes(req.method)){
                send(res,405,{success:false,error:'不支持的初始化请求方法。'},{Allow:'GET, POST'});
                req.resume?.();return true;
            }
            const state=loadStartupState(options);
            if(req.method==='GET'){
                send(res,200,{initializationRequired:state.needsInitialization});return true;
            }
            if(!state.needsInitialization){
                send(res,409,{success:false,code:'ALREADY_INITIALIZED',error:'系统已初始化，请登录；不能重复创建管理员。'});
                req.resume?.();return true;
            }
            if(!/^application\/json(?:\s*;|$)/i.test(String(req.headers['content-type']||''))){
                send(res,415,{success:false,error:'初始化请求必须使用 JSON。'});req.resume?.();return true;
            }
            let length=0,chunks=[],settled=false;
            function finish(){settled=true;chunks=[];req.setTimeout(0);}
            function reject(status,message){
                if(settled)return;finish();
                send(res,status,{success:false,error:message},{Connection:'close'});
                req.resume?.();
            }
            req.setTimeout(BODY_TIMEOUT_MS,()=>reject(408,'初始化请求超时，请重试。'));
            req.on('aborted',()=>{if(!settled)finish();});
            req.on('error',()=>reject(400,'初始化请求未完整接收。'));
            req.on('data',chunk=>{
                if(settled)return;length+=chunk.length;
                if(length>MAX_BODY_BYTES){reject(413,'初始化请求过大。');return;}
                chunks.push(chunk);
            });
            req.on('end',()=>{
                if(settled)return;
                const source=Buffer.concat(chunks).toString('utf8');finish();
                let body;
                try{body=JSON.parse(source);}
                catch{send(res,400,{success:false,error:'初始化 JSON 格式错误。'});return;}
                if(!body||typeof body!=='object'||Array.isArray(body)||
                   Object.keys(body).some(key=>!['username','password'].includes(key))){
                    send(res,400,{success:false,error:'初始化只接受账号和密码。'});return;
                }
                try{
                    const data=initializeFirstAdministrator({...options,username:body.username,password:body.password});
                    try{options.onInitialized(data);}
                    catch{
                        send(res,503,{success:false,code:'INITIALIZATION_RELOAD_REQUIRED',
                            error:'初始化文件已保存，但服务加载未完成。请重启服务后登录，不要删除数据或重新初始化。'});
                        return;
                    }
                    send(res,201,{success:true,initializationRequired:false});
                }catch(error){failure(res,error);}
            });
        }catch(error){failure(res,error);req.resume?.();}
        return true;
    };
}
module.exports={createBootstrapHandler,MAX_BODY_BYTES,BODY_TIMEOUT_MS};
