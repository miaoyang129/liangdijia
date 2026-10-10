/* Minimal client for Supabase's documented Auth + PostgREST APIs.
   No service keys, no third-party CDN, no passwords stored in browser storage. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.LDJCloud=factory();})(globalThis,function(){
  'use strict';
  function configError(config) {
    if(!config||/YOUR_PROJECT|REPLACE_ME/.test((config.supabaseUrl||'')+(config.supabasePublishableKey||'')))return '请先按部署指南填写 config.js 中的项目地址和 Publishable key。';
    try {const u=new URL(config.supabaseUrl);if(u.protocol!=='https:'||!/^[-a-z0-9]+\.supabase\.co$/.test(u.hostname)||u.port||u.username||u.password||u.search||u.hash||(u.pathname&&u.pathname!=='/'))return '项目地址应为 https://项目编号.supabase.co，不是控制台网址。';}catch{return 'Supabase 项目地址格式不正确。';}
    if(!/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.supabasePublishableKey||''))return '这里只接受 sb_publishable_ 开头的公开密钥。不要填写密码或管理密钥。';
    return '';
  }
  class CloudError extends Error {constructor(message,status=0,code=''){super(message);this.status=status;this.code=code;}}
  function explain(data,status) {
    const code=data?.code||data?.error_code||'';
    const message=data?.msg||data?.message||data?.error_description||data?.error||'';
    if(code==='40001')return '另一台设备已更新云端。请先导出本机草稿，再载入云端，或合并后重试。';
    if(code==='42501')return '没有资料访问权限。请检查 02-authorize.sql 和数据库 RLS，不要关闭 RLS。';
    if(code==='42P01'||code==='PGRST202'||code==='PGRST205')return '尚未完成数据库初始化。请运行 01-schema.sql，并检查项目地址是否一致。';
    if(code==='invalid_credentials'||message==='Invalid login credentials')return '邮箱或密码不正确。这里使用在 Authentication → Users 创建的网站账号，不是数据库密码。';
    if(code==='email_not_confirmed')return '邮箱尚未确认。请检查控制台创建用户时的 Auto Confirm User 选项。';
    if(status===401)return '登录已失效或公开密钥不正确，请重新登录并核对配置。';
    if(status===429)return '请求过于频繁，请稍后手动重试。';
    return message ? String(message).slice(0,280) : '云端请求失败（'+status+'）。';
  }
  class Client {
    constructor(config,{fetcher=globalThis.fetch.bind(globalThis),local=globalThis.localStorage,session=globalThis.sessionStorage,locks=globalThis.navigator?.locks,onSignOut=()=>{}}={}) {
      const error=configError(config);if(error)throw new Error(error);
      this.url=config.supabaseUrl.replace(/\/$/,'');this.key=config.supabasePublishableKey;
      this.fetcher=fetcher;this.local=local;this.sessionStorage=session;this.locks=locks;this.onSignOut=onSignOut;
      this.authKey='ldj-auth-v2:'+new URL(this.url).hostname;this.auth=null;this.remember=false;this.refreshPromise=null;this.authEpoch=0;
      try {const own=session.getItem(this.authKey),raw=own||local.getItem(this.authKey);if(raw){const saved=JSON.parse(raw);if(saved?.access_token&&saved?.refresh_token&&saved?.user?.id){this.auth=saved;this.remember=!own&&!!local.getItem(this.authKey);}}}catch{}
    }
    storeAuth(data,remember=this.remember) {
      if(!data?.access_token||!data?.refresh_token||!data?.user?.id)throw new Error('登录返回格式不正确。');
      this.auth={access_token:data.access_token,refresh_token:data.refresh_token,user:{id:data.user.id,email:data.user.email||''},expires_at:data.expires_at||Math.floor(Date.now()/1000)+(data.expires_in||3600)};
      this.remember=!!remember&&!!this.locks;
      // Only ONE storage location, to avoid loading a stale session on next visit.
      try {(this.remember?this.sessionStorage:this.local).removeItem(this.authKey);(this.remember?this.local:this.sessionStorage).setItem(this.authKey,JSON.stringify(this.auth));}catch{this.remember=false;}
      return this.auth;
    }
    clearAuth() {this.authEpoch++;this.auth=null;try{this.local.removeItem(this.authKey);this.sessionStorage.removeItem(this.authKey);}catch{}this.onSignOut();}
    async request(path,{method='GET',body,token,timeout=25000}={}) {
      const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),timeout);
      try {
        const headers={apikey:this.key,'Content-Type':'application/json'};if(token)headers.Authorization='Bearer '+token;
        const r=await this.fetcher(this.url+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:ctl.signal,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
        const text=await r.text();let data;try{data=text?JSON.parse(text):null;}catch{throw new CloudError('云端未返回有效数据，请检查网络和项目是否暂停。',r.status);}
        if(!r.ok)throw new CloudError(explain(data,r.status),r.status,data?.code||data?.error_code||'');return data;
      } catch(e) {if(e instanceof CloudError)throw e;throw new CloudError(e.name==='AbortError'?'云端连接超时。本机草稿未删除，请检查网络或项目暂停状态。':'无法连接 Supabase。请检查网络、项目地址或免费项目是否暂停。');}
      finally {clearTimeout(timer);}
    }
    async signIn(email,password,remember=false) {
      const data=await this.request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});
      this.authEpoch++;return this.storeAuth(data,remember).user;
    }
    async token(force=false) {
      if(this.refreshPromise)return this.refreshPromise;
      const epoch=this.authEpoch;
      const run=async()=>{
        if(this.remember)try{const stored=JSON.parse(this.local.getItem(this.authKey)||'null');if(!stored){this.auth=null;throw new CloudError('登录已在另一个标签页退出，请重新登录。',401);}this.auth=stored;}catch(e){if(e instanceof CloudError)throw e;}
        if(!this.auth)throw new CloudError('请先登录。',401);
        if(!force&&this.auth.expires_at>Math.floor(Date.now()/1000)+60)return this.auth.access_token;
        let data;try{data=await this.request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:this.auth.refresh_token}});}catch(e){if(e.status===400||e.status===401){this.clearAuth();}throw e;}
        if(epoch!==this.authEpoch)throw new CloudError('登录状态已变化，请重新登录。',401);
        return this.storeAuth(data).access_token;
      };
      const task=this.remember&&this.locks?this.locks.request(this.authKey,run):run();this.refreshPromise=task;
      try{return await task;}finally{this.refreshPromise=null;}
    }
    async authed(path,opts={}) {
      const token=await this.token();
      try{return await this.request(path,{...opts,token});}catch(e){
        if(e.status===401){const fresh=await this.token(true);return this.request(path,{...opts,token:fresh});}throw e;
      }
    }
    async currentUser() {if(!this.auth)return null;const u=await this.authed('/auth/v1/user');if(!u?.id||u.id!==this.auth.user.id)throw new Error('登录身份核验失败，请退出后重新登录。');return u;}
    async load(uid) {
      const id=encodeURIComponent(uid);
      const allowed=await this.authed('/rest/v1/ldj_access?select=user_id&user_id=eq.'+id);
      if(!Array.isArray(allowed)||allowed.length!==1)throw new CloudError('此账号尚未授权。请在 SQL Editor 运行 02-authorize.sql，填入 Authentication → Users 中的 User UID。',403,'not_allowed');
      const rows=await this.authed('/rest/v1/ldj_workspaces?select=payload,version,updated_at,last_mutation_id&owner_id=eq.'+id);
      if(!Array.isArray(rows)||rows.length>1)throw new Error('云端资料格式异常，未覆盖本机资料。');return rows[0]||null;
    }
    async save(uid,payload,expectedVersion,mutationId) {
      if(uid!==this.auth?.user?.id)throw new Error('登录身份变化，请重新载入资料。');
      return this.authed('/rest/v1/rpc/ldj_save_workspace',{method:'POST',body:{p_payload:payload,p_expected_version:expectedVersion,p_mutation_id:mutationId}});
    }
    async signOut() {
      let failure=null;
      try{if(this.auth)await this.authed('/auth/v1/logout?scope=local',{method:'POST'});}catch(e){failure=e;}finally{this.clearAuth();}
      return failure;
    }
    async changePassword(password) {return this.authed('/auth/v1/user',{method:'PUT',body:{password}});}
  }
  return {Client,CloudError,configError};
});
