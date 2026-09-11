'use strict';
const {PARAMETERS} = require('./public-config-store');
const MAX_BODY_BYTES = 65536;
const BODY_TIMEOUT_MS = 10000;
function active(user) {
    return user && typeof user.username==='string' && user.username.trim() &&
        ['admin','approver','user'].includes(user.role) && !user.deletedAt &&
        (!user.accountStatus || user.accountStatus==='active');
}
function sameOrigin(req) {
    try {
        const origin=new URL(req.headers.origin);
        const protocol=req.socket.encrypted?'https:':'http:';
        return origin.protocol===protocol && origin.host===req.headers.host && origin.pathname==='/' &&
            !origin.username && !origin.password && !origin.search && !origin.hash;
    } catch {return false;}
}
function createConfigHandler(options) {
    if (!options?.store || typeof options.getCurrentUser!=='function' || typeof options.getLogs!=='function')
        throw Error('Config handler requires the authoritative store, live account lookup and legacy log reader.');
    const store=options.store;
    function send(res,status,payload,headers={}) {
        if (res.destroyed || res.writableEnded) return;
        try {
            res.statusCode=status;
            res.setHeader('Content-Type','application/json; charset=utf-8');
            res.setHeader('Cache-Control','no-store');
            res.setHeader('X-Content-Type-Options','nosniff');
            for (const [key,value] of Object.entries(headers)) res.setHeader(key,value);
            res.end(JSON.stringify(payload));
        } catch {res.destroy();}
    }
    function current(req,res,adminOnly=false) {
        const user=options.getCurrentUser(req);
        if (!active(user)) {send(res,401,{success:false,error:'请重新登录。'});return null;}
        if (adminOnly && user.role!=='admin') {send(res,403,{success:false,error:'仅 Admin 可访问此操作。'});return null;}
        return user;
    }
    function failed(res,error) {
        const known=new Set(['CONFIG_INVALID','CONFIG_FORBIDDEN','CONFIG_VERSION_INVALID','CONFIG_VERSION_CONFLICT',
            'CONFIG_EXTERNAL_CHANGE','CONFIG_SAVE_FAILED','CONFIG_UNREADABLE']);
        const allowed=known.has(error?.code);
        send(res,allowed?error.statusCode:503,{success:false,code:allowed?error.code:'CONFIG_UNAVAILABLE',
            error:allowed?error.message:'配置服务暂不可用，请刷新核对；不会自动重置配置。'});
    }
    return function handleConfig(req,res) {
        const route=String(req.url||'').split('?')[0];
        if (!['/api/config','/api/logs'].includes(route)) return false;
        try {
            const user=current(req,res,route==='/api/logs');
            if (!user) {req.resume();return true;}
            if (route==='/api/logs') {
                if (req.method!=='GET') {send(res,405,{error:'操作日志仅支持查看。'},{Allow:'GET'});req.resume();}
                else send(res,200,store.logs(options.getLogs()));
                return true;
            }
            if (!['GET','PUT'].includes(req.method)) {send(res,405,{error:'不支持的配置请求方法。'},{Allow:'GET, PUT'});req.resume();return true;}
            if (req.method==='GET') {send(res,200,store.view(user));return true;}
            if (user.role!=='admin') {send(res,403,{error:'仅 Admin 可以修改配置。'});req.resume();return true;}
            // Browser cookie writes must be same-origin; authenticated non-browser Bearer clients may omit Origin.
            if ((req.headers.origin && !sameOrigin(req)) || (!req.headers.origin &&
                (req.headers.cookie || !/^Bearer\s+\S+$/i.test(String(req.headers.authorization||''))))) {
                send(res,403,{error:'配置保存必须来自本系统页面。'});req.resume();return true;
            }
            if (!/^application\/json(?:\s*;|$)/i.test(String(req.headers['content-type']||''))) {
                send(res,415,{error:'配置保存必须使用 JSON。'});req.resume();return true;
            }
            let chunks=[],size=0,done=false;
            function finish() {done=true;chunks=[];req.setTimeout(0);}
            function reject(status,error) {
                if (done) return;finish();send(res,status,{success:false,error},{Connection:'close'});req.resume();
            }
            req.setTimeout(BODY_TIMEOUT_MS,()=>reject(408,'配置请求超时，未保存。'));
            req.on('aborted',()=>{if(!done)finish();});
            req.on('error',()=>reject(400,'配置请求未完整接收，未保存。'));
            req.on('data',chunk=>{
                if (done) return;size+=chunk.length;
                if (size>MAX_BODY_BYTES) {reject(413,'配置请求过大，未保存。');return;}
                chunks.push(chunk);
            });
            req.on('end',()=>{
                if (done) return;
                const source=Buffer.concat(chunks).toString('utf8');finish();
                try {
                    // Role/account status may have changed while the request body was arriving.
                    const actor=current(req,res,true);if(!actor)return;
                    let body;
                    try {body=JSON.parse(source);} catch {send(res,400,{error:'配置 JSON 格式错误，未保存。'});return;}
                    if (!body || typeof body!=='object' || Array.isArray(body) ||
                        Object.keys(body).some(key=>key!=='expectedVersion'&&!PARAMETERS.includes(key))) {
                        send(res,400,{error:'配置含未知或受保护字段，未保存。'});return;
                    }
                    const patch=Object.fromEntries(PARAMETERS.filter(key=>Object.hasOwn(body,key)).map(key=>[key,body[key]]));
                    const config=store.update({patch,expectedVersion:body.expectedVersion,actor});
                    // update is the only persistence step. A disconnected client re-reads the version; no audit side-write.
                    send(res,200,{success:true,config});
                } catch(error) {failed(res,error);}
            });
        } catch(error) {failed(res,error);req.resume();}
        return true;
    };
}
module.exports={createConfigHandler,MAX_BODY_BYTES,BODY_TIMEOUT_MS};
