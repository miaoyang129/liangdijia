// @ts-nocheck
// Tested shared JavaScript bundled for Deno; no image bytes or Storage writes.
/* Two-region shopping images: URL metadata only. No image bytes, no Storage. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.LDJImages=factory();})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const HOSTS={
 'www.muji.com.cn':['MUJI','cn'],'muji.com.cn':['MUJI','cn'],'onlineshop.muji.com.hk':['MUJI','hk'],
 'www.uniqlo.cn':['UNIQLO','cn'],'uniqlo.cn':['UNIQLO','cn'],'h.uniqlo.cn':['UNIQLO','cn'],'m.uniqlo.cn':['UNIQLO','cn'],
 'www.uniqlo.com.hk':['UNIQLO','hk'],'m.uniqlo.com.hk':['UNIQLO','hk'],
 'www.decathlon.com.cn':['DECATHLON','cn'],'decathlon.com.cn':['DECATHLON','cn'],
 'www.decathlon.com.hk':['DECATHLON','hk'],'decathlon.com.hk':['DECATHLON','hk']
};
function httpsURL(value,base){
 if(typeof value!=='string'||!value.trim()||value.length>4096||/[\u0000-\u001f\u007f]/.test(value))return null;
 try{const u=new URL(value.trim(),base);const h=u.hostname.toLowerCase();
  if(u.protocol!=='https:'||u.username||u.password||(u.port&&u.port!=='443')||!h.includes('.')||/^[\d.]+$/.test(h)||h.includes(':')||h.endsWith('.')||/(^|\.)(localhost|local|internal|test|invalid|example|lan|home|onion)$/.test(h)||/^metadata\./.test(h))return null;
  if([...u.searchParams.keys()].some(k=>/^(access_token|refresh_token|authorization|session|sessionid|password|jwt)$/i.test(k)))return null;
  u.hash='';return u;
 }catch{return null;}
}
function sourceFor(value){const u=httpsURL(value);if(!u)return null;if(u.hostname==='www.uniqlo.com'){if(u.pathname.startsWith('/hk/'))return ['UNIQLO','hk'];if(u.pathname.startsWith('/cn/'))return ['UNIQLO','cn'];}return HOSTS[u.hostname]||null;}
function imageURL(value,base){const u=httpsURL(value,base);return u?u.href:'';}
function pageURL(value){const u=httpsURL(value);if(!u||!sourceFor(u.href))return '';for(const k of [...u.searchParams.keys()])if(/^utm_|^(fbclid|gclid)$/i.test(k))u.searchParams.delete(k);return u.href;}
function detailPage(value){const u=httpsURL(value);if(!u||!sourceFor(u.href))return false;
 return /\/products\/[^/]+\/?$|\/commodity\/[^/]+\/?$|\/product-detail\.html$|\/p\/.+|\/product\/[^/]+|\/detail\/[^/]+|\/products\/[^/]+\/[^/]+/i.test(u.pathname) || (u.pathname.includes('detail')&&u.searchParams.has('productCode'));
}
function entities(value){return String(value||'').replace(/&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi,(m,k)=>{if(k[0]==='#'){const n=k[1].toLowerCase()==='x'?parseInt(k.slice(2),16):parseInt(k.slice(1),10);return n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):'';}return {amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' '}[k.toLowerCase()]||m;});}
function attrs(tag){const out={};const re=/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;let m;while((m=re.exec(tag)))out[m[1].toLowerCase()]=entities(m[2]??m[3]??m[4]??'');return out;}
function cleanTitle(s){return entities(String(s||'').replace(/<[^>]*>/g,'')).trim().slice(0,200);}
function normalizeImage(raw,brand){
 if(raw==null)return null;
 if(typeof raw!=='object'||Array.isArray(raw))throw new Error('图片信息格式不正确。');
 if(Object.keys(raw).some(k=>!['url','sourceUrl','method','updatedAt','reviewed'].includes(k)))throw new Error('图片记录只允许网址和来源信息，不保存图片文件或附加数据。');
 const url=imageURL(raw.url);if(!url)throw new Error('图片只能保存公开的 HTTPS 网址，不支持上传、Base64、data: 或本地文件。');
 const sourceUrl=raw.sourceUrl?pageURL(raw.sourceUrl):'';
 if(raw.sourceUrl&&!sourceUrl)throw new Error('图片来源页必须是支持的品牌官网。');
 const source=sourceUrl?sourceFor(sourceUrl):null;if(source&&brand&&source[0]!==brand)throw new Error('图片来源页与商品品牌不一致。');
 const methods=['manual','jsonld','og','twitter','browser'];
 const method=methods.includes(raw.method)?raw.method:'manual';
 if(method!=='manual'&&!sourceUrl)throw new Error('自动图片记录缺少官网来源页。');
 return {url,sourceUrl,method,updatedAt:typeof raw.updatedAt==='string'?raw.updatedAt.slice(0,40):'',reviewed:raw.reviewed===true};
}
function parseProductImages(html,page,now=new Date().toISOString()){
 const sourceUrl=pageURL(page),src=sourceFor(sourceUrl);if(!src)throw new Error('只接受三个品牌的内地／香港官网链接。');
 if(typeof html!=='string'||html.length>2200000)throw new Error('官网页面过大，未解析。');
 const meta={},links=[];for(const m of html.matchAll(/<meta\b[^>]{0,12000}>/gi)){const a=attrs(m[0]),k=(a.property||a.name||'').toLowerCase();if(k&&a.content&&!meta[k])meta[k]=a.content;}
 for(const m of html.matchAll(/<link\b[^>]{0,12000}>/gi)){const a=attrs(m[0]);if(a.rel?.toLowerCase()==='canonical'&&a.href)links.push(a.href);}
 const canon=links.length?pageURL(new URL(links[0],sourceUrl).href):sourceUrl;
 const products=[];let visited=0;
 // Deliberately avoid ItemList, recommendations, arbitrary nested products and JS execution.
 function walk(x,depth=0){if(!x||typeof x!=='object'||depth>8||visited++>1500)return;if(Array.isArray(x)){x.forEach(v=>walk(v,depth+1));return;}const type=[x['@type']].flat();if(type.includes('ItemList'))return;
  if(type.some(t=>t==='Product'||t==='ProductGroup'))products.push(x);
  if(x['@graph'])walk(x['@graph'],depth+1);
  if(x.mainEntity)walk(x.mainEntity,depth+1);
 }
 for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)){const a=attrs(m[1]);if(a.type?.toLowerCase()!=='application/ld+json'||m[2].length>1000000)continue;try{walk(JSON.parse(m[2]));}catch{/* Invalid structured data is not evaluated. */}}
 const byURL=products.filter(p=>{const v=typeof p.url==='string'?p.url:typeof p['@id']==='string'?p['@id']:'';if(!v)return false;try{const u=pageURL(new URL(v,sourceUrl).href);return u&&(u===sourceUrl||u===canon);}catch{return false;}});
 let selected=byURL.length===1?byURL[0]:products.length===1?products[0]:null;
 const listing=/\/(collections|categories|category|search|c)(\/|$)/i.test(new URL(sourceUrl).pathname)||/^(collection|website)$/i.test(meta['og:type']||'')&&!detailPage(sourceUrl);
 if(listing)selected=null;
 const result=[],seen=new Set();
 function add(value,method){const u=imageURL(entities(value),sourceUrl);if(!u||seen.has(u)||result.length>=6)return;const path=new URL(u).pathname;if(/(?:^|[\/_-])(logo|favicon|banner|sprite|pixel|placeholder)(?:[\/_\-.]|$)/i.test(path))return;seen.add(u);result.push({url:u,sourceUrl,method,updatedAt:now,reviewed:false});}
 function images(x,depth=0){if(!x||depth>4)return;if(typeof x==='string'){add(x,'jsonld');return;}if(Array.isArray(x)){x.slice(0,8).forEach(v=>images(v,depth+1));return;}if(typeof x==='object')images(x.contentUrl||x.url||x['@id'],depth+1);}
 if(selected)images(selected.image);
 const ambiguous=products.length>1&&!selected;
 if(!listing&&!ambiguous&&(selected||detailPage(sourceUrl))){if(!result.length){add(meta['og:image:secure_url']||meta['og:image']||'','og');add(meta['twitter:image']||meta['twitter:image:src']||'','twitter');}}
 return {sourceUrl,brand:src[0],region:src[1],title:cleanTitle(selected?.name||meta['og:title']||''),candidates:result,
  reason:result.length?'':listing?'链接是列表或分类页，请粘贴具体商品详情页。':ambiguous?'页面含多个商品，无法安全确定主商品图片。':'页面未提供可确认的商品图，可能需要网页脚本或登录；可手动粘贴图片地址。',
  note:'仅提取网址，未验证图片颜色、尺码或外链可用性；不会更新价格。'};
}
return {HOSTS,httpsURL,sourceFor,pageURL,imageURL,detailPage,entities,attrs,normalizeImage,parseProductImages};
});

/* Runtime-independent handler, bundled with image-core.js for a single-file deployment.
   deps.env is a name => string function; deps.fetcher defaults to fetch.
   Never retrieves image bytes or forwards client credentials to retailers. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory;else root.createLDJImageHandler=factory;})(typeof globalThis==='object'?globalThis:this,function(Core,deps){
'use strict';
deps=deps||{};
const env=deps.env||(()=>''),fetcher=deps.fetcher||fetch;
const cache=new Map(),robotsCache=new Map(),limits=new Map();
const clock=deps.now||Date.now;
const allowed=(env('LDJ_ALLOWED_ORIGINS')||'').split(',').map(x=>x.trim()).filter(Boolean);
const root=(env('SUPABASE_URL')||'').replace(/\/$/,'');
let publicKey=env('LDJ_PUBLIC_KEY')||env('SUPABASE_ANON_KEY')||'';
try{const keys=JSON.parse(env('SUPABASE_PUBLISHABLE_KEYS')||'{}');publicKey=env('LDJ_PUBLIC_KEY')||keys.default||Object.values(keys)[0]||publicKey;}catch{}
class Failure extends Error{constructor(message,status=422,code='IMAGE_UNAVAILABLE'){super(message);this.status=status;this.code=code;}}
function headers(origin){return {'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Max-Age':'600','Vary':'Origin','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};}
function response(origin,data,status=200){return new Response(JSON.stringify(data),{status,headers:headers(origin)});}
async function textLimit(r,max){if(Number(r.headers.get('content-length')||0)>max){await r.body?.cancel();throw new Failure('响应体积过大，已停止读取。');}if(!r.body)return '';const reader=r.body.getReader(),chunks=[];let size=0;try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>max)throw new Failure('响应体积过大，已停止读取。');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}const bytes=new Uint8Array(size);let i=0;for(const c of chunks){bytes.set(c,i);i+=c.length;}return new TextDecoder().decode(bytes);}
async function retailerGet(url,brand,region,signal,checkRules=false){let current=url;for(let i=0;i<4;i++){
 const parsed=Core.httpsURL(current);const source=parsed&&parsed.hostname==='www.uniqlo.com'&&parsed.pathname==='/robots.txt'?[brand,region]:Core.sourceFor(current);if(!source||source[0]!==brand||source[1]!==region)throw new Failure('官网重定向到未经允许的站点，已停止读取。');
 if(checkRules)await robots(current,brand,region,signal);
 const r=await fetcher(current,{method:'GET',redirect:'manual',signal,credentials:'omit',headers:{'Accept':'text/html, text/plain;q=0.8','User-Agent':'LiangDiJiaImage/0.3 (personal URL metadata reader)'}});
 if([301,302,303,307,308].includes(r.status)){const loc=r.headers.get('location');await r.body?.cancel();if(!loc)throw new Failure('重定向缺少地址。');current=new URL(loc,current).href;continue;}
 return {r,url:current};
 }throw new Failure('官网重定向次数过多，已停止读取。');}
function robotAllowed(text,path){
 const groups=[];let agents=[],rules=[],hasRules=false;
 const finish=()=>{if(agents.length)groups.push({agents:[...agents],rules:[...rules]});agents=[];rules=[];hasRules=false;};
 for(const line of text.split(/\r?\n/)){const m=line.replace(/#.*/,'').trim().match(/^([^:]+):\s*(.*)$/);if(!m)continue;const k=m[1].trim().toLowerCase(),v=m[2].trim();if(k==='user-agent'){if(hasRules)finish();agents.push(v.toLowerCase());}else if((k==='allow'||k==='disallow')&&agents.length){hasRules=true;if(v)rules.push({allow:k==='allow',path:v});}}
 finish();const specific=groups.filter(g=>g.agents.some(a=>a!=='*'&&'liangdijiaimage'.includes(a)));const selected=specific.length?specific:groups.filter(g=>g.agents.includes('*'));
 let best={score:-1,allow:true};for(const g of selected)for(const r of g.rules){let end=r.path.endsWith('$');const p=end?r.path.slice(0,-1):r.path;const escaped=p.replace(/[.+?^${}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*');try{if(new RegExp('^'+escaped+(end?'$':'')).test(path)){const score=p.replace(/\*/g,'').length;if(score>best.score||(score===best.score&&r.allow))best={score,allow:r.allow};}}catch{/* malformed rule: ignore only that rule */}}
 return best.allow;
}
async function robots(url,brand,region,signal){const u=new URL(url),origin=u.origin;let cached=robotsCache.get(origin);
 if(!cached||cached.expires<clock()){
  const {r}=await retailerGet(origin+'/robots.txt',brand,region,signal);let text='';
  if(r.status===404){await r.body?.cancel();}else if(r.status===401||r.status===403){await r.body?.cancel();throw new Failure('官网限制自动访问，未继续读取。');}else if(!r.ok){await r.body?.cancel();throw new Failure('无法确认官网的自动访问规则，请稍后重试或手动录入。');}else{if(/html/i.test(r.headers.get('content-type')||'')){await r.body?.cancel();throw new Failure('官网的自动访问规则返回异常，未继续读取。');}text=await textLimit(r,300000);}
  cached={text,expires:clock()+3600000};robotsCache.set(origin,cached);
 }
 if(!robotAllowed(cached.text,u.pathname+u.search))throw new Failure('官网 robots.txt 不允许自动读取该路径；请手动核对并记录图片网址。',422,'ROBOTS_DISALLOWED');
}
async function auth(req,signal){const auth=req.headers.get('authorization')||'';if(!/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(auth))throw new Failure('请先登录两地价，再读取商品图片。',401,'AUTH_REQUIRED');
 const h={apikey:publicKey,Authorization:auth,'Accept':'application/json'};
 const r=await fetcher(root+'/auth/v1/user',{headers:h,signal,redirect:'error'});if(!r.ok){await r.body?.cancel();throw new Failure('登录已失效，请重新登录。',401,'AUTH_REQUIRED');}
 const user=JSON.parse(await textLimit(r,100000));if(typeof user.id!=='string'||!/^[-0-9a-f]{36}$/i.test(user.id))throw new Failure('登录身份无法核实。',401,'AUTH_REQUIRED');
 const grant=await fetcher(root+'/rest/v1/ldj_access?select=user_id&user_id=eq.'+encodeURIComponent(user.id),{headers:h,signal,redirect:'error'});
 if(!grant.ok){await grant.body?.cancel();throw new Failure('无法验证两地价账号权限，请检查已有授权。',403,'NOT_ALLOWED');}
 const rows=JSON.parse(await textLimit(grant,100000));if(!Array.isArray(rows)||rows.length!==1||rows[0].user_id!==user.id)throw new Failure('此账号没有两地价使用权限。',403,'NOT_ALLOWED');return user.id;
}
const handler=async req=>{
 const origin=req.headers.get('origin')||'';
 if(!allowed.length)return response(origin,{message:'请在函数 Secrets 设置 LDJ_ALLOWED_ORIGINS 为你的 GitHub Pages 来源（不含路径）。',code:'CONFIG_REQUIRED'},503);
 if(!allowed.includes(origin))return new Response('Origin not allowed',{status:403});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:headers(origin)});
 if(req.method!=='POST')return response(origin,{message:'只接受 POST 请求。'},405);
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(root)||!publicKey)return response(origin,{message:'函数缺少 Supabase 公开连接信息。',code:'CONFIG_REQUIRED'},503);
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),18000);
 try{
  const uid=await auth(req,ctl.signal);
  const body=JSON.parse(await textLimit(req,8000));const url=Core.pageURL(body.url);const src=Core.sourceFor(url);
  if(!url||!src)throw new Failure('只支持三个品牌的内地／香港官网公开链接。',400,'BAD_URL');
  if(body.brand&&body.brand!==src[0])throw new Failure('链接与所选商品品牌不一致。',400,'BAD_URL');
  let limit=limits.get(uid);if(!limit||limit.until<clock())limit={count:0,until:clock()+60000};limit.count++;limits.set(uid,limit);
  if(limit.count>20)throw new Failure('读取次数过多，请一分钟后再试。',429,'RATE_LIMIT');
  if(limits.size>200){for(const [k,v] of limits)if(v.until<clock())limits.delete(k);}
  const hit=cache.get(url);if(hit&&hit.expires>clock())return response(origin,{...hit.data,cached:true});
  await robots(url,...src,ctl.signal);
  const {r,url:finalURL}=await retailerGet(url,...src,ctl.signal,true);
  if(!r.ok){await r.body?.cancel();throw new Failure('官网返回 '+r.status+'，未读取图片地址；不会绕过访问限制。');}
  if(!/text\/html|application\/xhtml\+xml/i.test(r.headers.get('content-type')||'')){await r.body?.cancel();throw new Failure('来源不是 HTML 商品网页，未读取。');}
  const html=await textLimit(r,2200000);const data=Core.parseProductImages(html,finalURL,new Date(clock()).toISOString());
  if(!data.candidates.length)throw new Failure(data.reason);
  if(cache.size>=100)cache.delete(cache.keys().next().value);cache.set(url,{expires:clock()+3600000,data});
  return response(origin,{...data,cached:false});
 }catch(e){return response(origin,{message:e instanceof Failure?e.message:e?.name==='AbortError'?'官网读取超时，请稍后重试或手动粘贴图片网址。':'读取没有完成；未更改原图片、价格或清单。',code:e instanceof Failure?e.code:'FETCH_FAILED'},e instanceof Failure?e.status:502);}finally{clearTimeout(timer);}
};
handler.robotAllowed=robotAllowed;return handler;
});

Deno.serve(createLDJImageHandler(LDJImages,{env:name=>Deno.env.get(name)||""}));
