'use strict';
(() => {
const $ = (s,root=document) => root.querySelector(s);
const $$ = (s,root=document) => [...root.querySelectorAll(s)];
const clone = x => JSON.parse(JSON.stringify(x));
const esc = x => String(x ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const BRANDS=['MUJI','UNIQLO','DECATHLON'];
const REGIONS=['cn','hk'];
const CATEGORIES=['服饰','文具','旅行收纳','家居生活','运动户外','其他'];
const HOSTS={
 'www.muji.com.cn':['MUJI','cn'],'muji.com.cn':['MUJI','cn'],'onlineshop.muji.com.hk':['MUJI','hk'],
 'www.uniqlo.cn':['UNIQLO','cn'],'uniqlo.cn':['UNIQLO','cn'],'h.uniqlo.cn':['UNIQLO','cn'],'m.uniqlo.cn':['UNIQLO','cn'],
 'www.uniqlo.com.hk':['UNIQLO','hk'],'m.uniqlo.com.hk':['UNIQLO','hk'],
 'www.decathlon.com.cn':['DECATHLON','cn'],'decathlon.com.cn':['DECATHLON','cn'],
 'www.decathlon.com.hk':['DECATHLON','hk'],'decathlon.com.hk':['DECATHLON','hk']
};
const SOURCES={
 MUJI:{cn:'https://www.muji.com.cn/cn/store',hk:'https://onlineshop.muji.com.hk/'},
 UNIQLO:{cn:'https://www.uniqlo.cn/',hk:'https://www.uniqlo.com.hk/zh_HK/'},
 DECATHLON:{cn:'https://www.decathlon.com.cn/',hk:'https://www.decathlon.com.hk/'}
};
const ICONS={
 grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
 bag:'<path d="M5 7h14l1 14H4L5 7Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/>',
 link:'<path d="M10 13a5 5 0 0 0 7 .1l3-3a5 5 0 0 0-7-7l-1.6 1.5M14 11a5 5 0 0 0-7-.1l-3 3a5 5 0 0 0 7 7l1.5-1.5"/>',
 settings:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="currentColor" stroke="none"/><circle cx="15" cy="17" r="3" fill="currentColor" stroke="none"/>',
 search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
 arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
 external:'<path d="M14 3h7v7M10 14 21 3M10 3H4v17h17v-6"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',
 check:'<path d="m5 12 4 4L19 6"/>',
 refresh:'<path d="M20 11a8 8 0 0 0-14-5L3 9m0-6v6h6M4 13a8 8 0 0 0 14 5l3-3m0 6v-6h-6"/>',
 table:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M3 14h18M9 4v16"/>',
 plus:'<path d="M12 4v16M4 12h16"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M4 15v6h16v-6"/>',
 upload:'<path d="M12 16V4m-5 5 5-5 5 5M4 15v6h16v-6"/>',
 shirt:'<path d="m8 3-5 3-2 6 4 2 2-3v10h10V11l2 3 4-2-2-6-5-3c0 4-8 4-8 0Z"/>',
 pen:'<path d="m15 3 6 6M4 14 16 2l6 6L10 20l-8 2 2-8Zm0 0 6 6"/>',
 backpack:'<path d="M8 5V3h8v2M6 20H4v-8h2m12 0h2v8h-2"/><rect x="6" y="5" width="12" height="17" rx="4"/><path d="M6 15h12M9 9h6"/>',
 suitcase:'<rect x="5" y="5" width="14" height="15" rx="3"/><path d="M9 5V2h6v3M9 9v7m6-7v7M8 20v2m8-2v2"/>',
 box:'<path d="m3 7 9-5 9 5-9 5-9-5Zm0 0v10l9 5 9-5V7M12 12v10"/>',
 compare:'<path d="M3 7h17m-4-4 4 4-4 4M21 17H4m4-4-4 4 4 4"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 trash:'<path d="M3 6h18M8 6V3h8v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>'
};
const icon=(name,cls='')=>`<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]||ICONS.box}</svg>`;
const sym=p=>icon(p.category==='服饰'?'shirt':p.category==='文具'?'pen':p.category==='运动户外'?'backpack':p.category==='旅行收纳'?'suitcase':'box');
const number=(x,d=2)=>Number(x).toLocaleString('zh-CN',{minimumFractionDigits:d,maximumFractionDigits:d});
const money=x=>'¥'+number(x);
const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const dateOnly=d=> typeof d==='string' ? d.slice(0,10) : '';
const niceDate=d=>d?dateOnly(d).replaceAll('-','.'):'日期未记录';
const iso=()=>new Date().toISOString();
const newId=()=>{if(globalThis.crypto?.randomUUID)return crypto.randomUUID();if(!globalThis.crypto?.getRandomValues)throw new Error('此浏览器缺少安全随机数能力，请使用较新的浏览器。');const b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const h=[...b].map(x=>x.toString(16).padStart(2,'0')).join('');return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);};
const validPrice=p=>typeof p==='number'&&Number.isFinite(p)&&p>0&&p<=100000000;
const hasPrice=q=>q&&validPrice(q.price);
const isSnapshot=q=>q&&['page_snapshot','search_snapshot'].includes(q.provenance);
const priceRound=x=>Math.round((x+Number.EPSILON)*100)/100;
const ageDays=d=>{const n=Date.parse(dateOnly(d)+'T00:00:00+08:00');return Number.isFinite(n)?(Date.parse(today()+'T00:00:00+08:00')-n)/86400000:Infinity;};
function sourceFor(url){try{const u=new URL(url);if(u.protocol!=='https:'||u.username||u.password||(u.port&&u.port!=='443'))return null;if(u.hostname==='www.uniqlo.com'){if(u.pathname.startsWith('/hk/'))return ['UNIQLO','hk'];if(u.pathname.startsWith('/cn/'))return ['UNIQLO','cn'];}return HOSTS[u.hostname]||null;}catch{return null;}}
function officialLink(url,label='查看官网'){return sourceFor(url)?`<a href="${esc(url)}" class="source-link" target="_blank" rel="noopener noreferrer">${esc(label)} ${icon('external')}</a>`:'';}
function ageLabel(q){if(!q)return '未收录';if(isSnapshot(q))return q.provenance==='search_snapshot'?'官网检索快照':'官网页面快照';if(!q.reviewed)return '待人工核对';if(ageDays(q.observedAt)>state.settings.freshDays)return '报价已过期';return q.sourceType==='mini'?'小程序 · 用户录入':'官网 · 已核对';}
let state=clone(window.EMPTY_STATE);
let view='catalog',brand='all',search='',filter='all',sort='default',layout='grid';
let backend=false,dirty=false,conflict=false,version=null,saveMessage='登录后连接云端';
let editing=null,draftMeta={},candidateData={},toastTimer=null,editorStartVersion=0;
let client=null,syncer=null,activeUser=null,persistTimer=null,loginBusy=false,settingsDirty=false;
let activation=null,lastAutoSync=0;
let tabId=newId(),resumeTabId=null;
try {resumeTabId=sessionStorage.getItem('ldj-tab-v2');sessionStorage.setItem('ldj-tab-v2',tabId);}catch{}
function setStatus(text){saveMessage=text;for(const selector of ['#storage-status','#cloud-state-text','#settings-cloud-status']){const el=$(selector);if(el)el.textContent=text;}}
function notify(message){const t=$('#toast');t.textContent=message;t.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('visible'),6500);}
function cloudStatus(s){
 dirty=s.dirty;conflict=s.conflict;version=s.version;
 const messages={locked:'登录后连接云端',loading:'正在读取云端资料…',pending:'已留本机草稿 · 待同步',saving:'正在保存到云端…',synced:s.version?'已同步到云端 · v'+s.version:'云端已连接 · 清单为空',checking:'正在检查云端更新…',conflict:'版本冲突 · 本机草稿已保留','load-error':'云端读取失败 · 未覆盖资料','save-error':'云端保存失败 · 请重试','read-error':'检查更新失败 · 保留现有资料'};
 setStatus((s.storageOK?'':'本机备份不可用 · ')+(messages[s.status]||s.status));
 const banner=$('#cloud-banner');
 const warning=s.error||(s.status==='conflict'?'另一台设备已保存新版本。先导出本机草稿，再载入云端；此版不会自动合并两份清单。':'')||(!s.storageOK?'浏览器存储不可用，请保持页面打开，先导出备份。':'');
 if(banner){banner.hidden=!warning;$('#cloud-warning').textContent=warning;$('#cloud-reload-button').hidden=!s.conflict;}
 if(s.status==='pending'&&syncer?.ready&&!s.conflict){clearTimeout(persistTimer);persistTimer=setTimeout(()=>syncer.flush(),700);}
}
function persist(){
 if(!syncer?.ready)throw new Error('请先登录并成功载入云端。');
 try{syncer.edit(state);}catch(e){if(syncer.state)state=clone(syncer.state);throw e;}
}
function api(){throw new Error('此 GitHub Pages 版本没有运行本机采集后端，请手动核对并记录官方价格。');}
function gate(mode,message=''){
 document.body.classList.add('locked');
 $('#auth-loading').hidden=mode!=='loading';$('#auth-form').hidden=mode!=='login';$('#auth-setup').hidden=mode!=='setup';$('#auth-retry').hidden=mode!=='error';
 $('#auth-message').textContent=message;$('#auth-message').hidden=!message;
 if(mode==='loading')$('#auth-loading').textContent='正在核验登录并读取云端资料…';
 $('#auth-draft').hidden=!syncer?.state;
}
function unlock(){document.body.classList.remove('locked');$('#account-email').textContent=activeUser?.email||'个人账号';}
function resetApp(){
 clearTimeout(persistTimer);syncer?.deactivate();activeUser=null;state=clone(window.EMPTY_STATE);dirty=false;conflict=false;
 if($('#editor').open)$('#editor').close();editing=null;$('#main').innerHTML='';$('#navigation').innerHTML='';gate('login');setStatus('已退出 · 请登录');
}
async function enterAccount(user){
 if(activation)return activation;
 if(syncer?.ready&&activeUser?.id===user.id){unlock();return;}
 const task=(async()=>{
  activeUser=user;gate('loading');
  try{await syncer.activate(user.id);if(!syncer.ready)return;unlock();render();if(syncer.dirty&&!syncer.conflict)await syncer.flush();}
  catch(e){gate('error',e.message);}
 })();activation=task;try{await task;}finally{activation=null;}
}
async function connect(){
 const problem=LDJCloud.configError(window.LDJ_CONFIG);
 if(problem){gate('setup',problem);return;}
 if(location.protocol==='file:'){gate('setup','请上传 GitHub Pages 后打开 HTTPS 网站，或按部署指南启动本地预览；不要双击 index.html 直接登录。');return;}
 try{
  if(!client){
   client=new LDJCloud.Client(window.LDJ_CONFIG,{onSignOut:()=>resetApp()});
   syncer=new LDJSync.SyncEngine({transport:client,storage:localStorage,namespace:'ldj-cloud-v2:'+new URL(client.url).hostname,tabId,resumeTabId,validate:validateState,emptyState:window.EMPTY_STATE,
    onData:next=>{state=next;if(editing||settingsDirty)return;render();},onStatus:cloudStatus,idFactory:newId});
  }
  gate('loading');const user=await client.currentUser();
  if(!user){gate('login');return;}await enterAccount(user);
 }catch(e){gate(client?.auth?'error':'login',e.message);}
}
async function loginSubmit(event){
 event.preventDefault();if(loginBusy)return;loginBusy=true;$('#login-button').disabled=true;$('#auth-message').hidden=true;
 const password=$('#login-password').value;$('#login-password').value='';
 try{const user=await client.signIn($('#login-email').value.trim(),password,$('#login-remember').checked);await enterAccount(user);}
 catch(e){gate('login',e.message);}finally{loginBusy=false;$('#login-button').disabled=false;}
}
function formOpen(){return !!editing||settingsDirty;}
async function syncNow(automatic=false){
 if(!syncer?.ready)return;
 if(formOpen()){if(!automatic)notify('请先保存或关闭正在编辑的表单，再同步。');return;}
 if(automatic&&Date.now()-lastAutoSync<12000)return;lastAutoSync=Date.now();await syncer.sync();
}
async function logout(){
 if(formOpen()){notify('请先保存或关闭表单，再退出登录。');return;}
 if(syncer?.dirty){notify('还有未同步的修改。请先导出备份并处理同步，再退出；不会直接丢弃草稿。');return;}
 if(!(await confirmAction('退出当前账号？','已同步资料仍保存在云端。本标签页的已同步缓存会清除；下次用同一个账号登录即可。','退出登录')))return;
 syncer?.clearOwnCache();const failure=await client.signOut();if(failure)notify('已清除本机登录。网络问题导致云端会话撤销未确认，请保护你的设备。');
}
async function reloadCloud(){
 if(formOpen()){notify('请先保存或关闭表单。');return;}
 if(!(await confirmAction('先导出本机草稿？','接下来先导出当前完整清单；导出后还需要确认一次，才会载入云端资料。','先导出')))return;
 const exported=await exportBackup(true);if(!exported)return;
 if(!(await confirmAction('确认备份文件已保存？','只有在你已确认备份文件保存成功后才继续。载入云端会替换当前页面资料；冲突修改可以从备份找回并手动合并。','已确认，载入云端')))return;
 try{await syncer.discardLocalAndLoad();notify('已载入云端最新清单。原修改保留在刚才导出的文件中。');}catch(e){notify(e.message);}
}
function showDrafts(){
 const drafts=syncer?.getOtherDrafts()||[];
 const d=$('#draft-dialog');
 d.innerHTML=`<h3>其他标签页留下的草稿</h3><p class="hint">这些本机副本尚未确认已同步。先导出并检查，勿直接替换云端。仅显示当前账号在此浏览器的草稿。</p>${drafts.length?drafts.map((x,i)=>`<div class="draft-row"><span>${esc(x.savedAt)}<br>${x.state.products.length} 件商品</span><button class="button small" data-draft-export="${i}">导出这份</button></div>`).join(''):'<p>没有发现其他待恢复草稿。</p>'}<button class="button" id="close-drafts">关闭</button>`;
 $$('[data-draft-export]',d).forEach(b=>b.onclick=()=>download(drafts[Number(b.dataset.draftExport)].state,backupFilename('recovered')));
 $('#close-drafts').onclick=()=>d.close();d.showModal();
}
function validateState(s){
 if(!s||s.schemaVersion!==1||!s.settings||!Array.isArray(s.products)||s.products.length>3000)throw new Error('不是此工具支持的 JSON 备份。');
 const r=s.settings;
 if(typeof r.rate!=='number'||!Number.isFinite(r.rate)||r.rate<=0.05||r.rate>=5)throw new Error('汇率格式异常。');
 for(const [k,min,max] of [['feePct',0,100],['travelCost',0,100000],['freshDays',1,30]])if(typeof r[k]!=='number'||!Number.isFinite(r[k])||r[k]<min||r[k]>max)throw new Error('费用或有效期设置无效。');
 if(!['passing','dedicated'].includes(r.travelMode)||!['reference','manual'].includes(r.rateMode))throw new Error('设置格式无效。');
 if(!Number.isInteger(r.freshDays)||typeof r.rateDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(r.rateDate))throw new Error('汇率日期或有效天数无效。');
 const ids=new Set();
 for(const p of s.products){
  if(!p||typeof p.id!=='string'||!p.id||p.id.length>100||ids.has(p.id)||!BRANDS.includes(p.brand)||typeof p.name!=='string'||!p.name.trim()||p.name.length>200)throw new Error('商品标识、名称或品牌无效。');ids.add(p.id);
  if(!CATEGORIES.includes(p.category)||typeof p.favorite!=='boolean'||typeof p.trip!=='boolean')throw new Error('分类或清单标记无效。');
  if(!['candidate','confirmed','different'].includes(p.match)||typeof p.qty!=='number'||!Number.isInteger(p.qty)||p.qty<1||p.qty>999)throw new Error('商品数量或匹配状态无效。');
  for(const region of REGIONS){const q=p[region];if(q===null||q===undefined)continue;if(typeof q!=='object'||Array.isArray(q))throw new Error('报价格式不正确。');
   if(q.price!==null&&q.price!==undefined&&!validPrice(q.price))throw new Error('报价金额必须为正数，未知价格请留空。');
   if(q.currency!==(region==='hk'?'HKD':'CNY'))throw new Error('报价币种与地区不一致。');
   if(!['web','mini'].includes(q.sourceType))throw new Error('仅支持官网或官方小程序来源。');
   if(q.sourceType==='web'&&q.url){const src=sourceFor(q.url);if(!src||src[0]!==p.brand||src[1]!==region)throw new Error('官方链接与品牌／地区不一致。');}
   if(hasPrice(q)&&q.sourceType==='web'&&!q.url)throw new Error('官网报价缺少来源链接。');
   if(hasPrice(q)&&q.sourceType==='mini'&&!String(q.sourceName||'').trim())throw new Error('小程序报价缺少来源名称。');
   if(typeof q.reviewed!=='boolean'||!['page_snapshot','search_snapshot','structured','user_verified','browser_capture','manual_unverified'].includes(q.provenance)||!['unknown','in','limited','out','preorder'].includes(q.availability))throw new Error('报价核对状态或来源记录无效。');
   if(q.history!==undefined&&(!Array.isArray(q.history)||q.history.length>1000))throw new Error('历史记录格式或体积异常。');
   for(const k of ['sku','variant','conditions','shareText','sourceName','url','observedAt','provenance'])if(q[k]!==undefined&&q[k]!==null&&(typeof q[k]!=='string'||q[k].length>5000))throw new Error('报价文本格式异常。');
  }
 }
}
function compare(p){
 const cn=p.cn,hk=p.hk,both=hasPrice(cn)&&hasPrice(hk),rate=state.settings.rate;
 const hkCny=hasPrice(hk)?priceRound(hk.price*rate*(1+state.settings.feePct/100)):null;
 const delta=both?priceRound(cn.price-hkCny):null;
 if(!both)return {ready:false,delta,hkCny,kind:hasPrice(cn)||hasPrice(hk)?'single':'empty',message:hasPrice(hk)?'仅收录香港报价 · 不代表地区限定':hasPrice(cn)?'仅收录内地报价 · 不代表地区限定':'添加官方报价，开始比较'};
 if(p.match==='different')return {ready:false,delta,hkCny,kind:'different',message:'规格不同 · 不直接比较价差'};
 if(p.match!=='confirmed')return {ready:false,delta,hkCny,kind:'candidate',message:'同款候选 · 颜色、尺码与件数待核对'};
 if(REGIONS.some(r=>p[r].reviewed!==true||isSnapshot(p[r])||!p[r].sku?.trim()||!p[r].variant?.trim()))return {ready:false,delta,hkCny,kind:'pending',message:'请核对两地现价 · 快照不作购买结论'};
 if(REGIONS.some(r=>ageDays(p[r].observedAt)<0||ageDays(p[r].observedAt)>state.settings.freshDays))return {ready:false,delta,hkCny,kind:'old',message:'报价已过期 · 更新后再比较'};
 if(ageDays(state.settings.rateDate)>7||ageDays(state.settings.rateDate)<0)return {ready:false,delta,hkCny,kind:'old',message:'汇率日期需更新 · 暂不计算购买结论'};
 if(REGIONS.some(r=>['out','preorder'].includes(p[r].availability)))return {ready:false,delta,hkCny,kind:'stock',message:'存在售罄／预售记录 · 库存需重新核实'};
 return {ready:true,delta,hkCny,kind:delta>0?'hk':delta<0?'cn':'equal',message:delta>0?`香港报价低 ${money(delta)}`:delta<0?`内地报价低 ${money(-delta)}`:'两地换算后同价'};
}
const NAV=[['catalog','grid','商品对照'],['wishlist','heart','心愿单'],['trip','bag','香港清单'],['sources','link','数据与采集'],['settings','settings','设置与备份']];
function renderNav(){
 $('#navigation').innerHTML=NAV.map(([id,i,label])=>{const count=id==='wishlist'?state.products.filter(p=>p.favorite).length:id==='trip'?state.products.filter(p=>p.trip).length:id==='catalog'?state.products.length:null;return `<button class="nav-button ${view===id?'active':''}" data-action="nav" data-view="${id}" ${view===id?'aria-current="page"':''}>${icon(i)}<span>${label}</span>${count!==null?`<span class="nav-count">${count}</span>`:''}</button>`;}).join('');
 $('#page-label').textContent=NAV.find(n=>n[0]===view)?.[2]||'商品对照';
}
function render(){if(!syncer?.ready)return;settingsDirty=false;renderNav();$('#main').innerHTML=view==='catalog'||view==='wishlist'?catalogView():view==='trip'?tripView():view==='sources'?sourcesView():settingsView();bindCurrentView();setStatus(saveMessage);}
function renderOnlyResults(){const grid=$('#results');if(grid)grid.innerHTML=resultsView();const count=$('#result-count');if(count)count.textContent=filteredProducts().length+' 件';}
function rateCard(){const s=state.settings;return `<div class="rate-card"><div class="rate-head"><span>港币换算参考</span><button class="icon-button" aria-label="修改汇率" data-action="nav" data-view="settings">${icon('settings')}</button></div><div class="rate-main"><span>1 HKD =</span><b class="mono">¥${number(s.rate,4)}</b></div><div class="rate-foot">${s.rateMode==='reference'?'ECB 参考汇率':'手动支付汇率'} · ${niceDate(s.rateDate)}<br>${s.feePct?'另计 '+s.feePct+'% 支付费用':'参考换算，不等于最终扣款'}</div></div>`;}
function metrics(){const ps=state.products,both=ps.filter(p=>hasPrice(p.cn)&&hasPrice(p.hk)).length,ready=ps.filter(p=>compare(p).ready).length;return `<div class="metrics">${[['已收录商品',ps.length,'件','bag'],['两地都有报价',both,'件','compare'],['已核对可比较',ready,'件','check'],['仅收录单边报价',ps.filter(p=>!!hasPrice(p.cn)!==!!hasPrice(p.hk)).length,'件','clock']].map(([l,n,u,i])=>`<div class="metric"><div><label>${l}</label><b>${n}<span class="unit">${u}</span></b></div><span class="metric-icon">${icon(i)}</span></div>`).join('')}</div>`;}
function catalogView(){const isWish=view==='wishlist';return `
 <section class="hero"><div><div class="eyebrow">${isWish?'YOUR PERSONAL WISHLIST':'SHENZHEN ↔ HONG KONG'}</div><h1>${isWish?'只留下，真正想买的。':'同一件喜欢的东西，<br><em>两地看清楚再买。</em>'}</h1><p>${isWish?'没有促销信息流。把自己的目标商品放在这里，慢慢比较。':'MUJI · UNIQLO · DECATHLON<br>官方报价、港币换算与同款核对，放在一张购物清单里。'}</p></div>${rateCard()}</section>
 ${!isWish?metrics():''}
 <div class="notice">${icon('info')}<div><strong>只比较你已核对的官方报价；云端同步不等于自动抓价。</strong> 未核对的配对不计算购买结论；未收录不等于无货。<button class="text-button" data-action="nav" data-view="sources">查看来源与采集方式 ${icon('arrow')}</button></div></div>
 <div class="section-line"><h2>${isWish?'我的心愿单':'商品对照'}<span class="subtle-count" id="result-count">${filteredProducts().length} 件</span></h2><button class="text-button" data-action="export-csv">${icon('download')} 导出对照表</button></div>
 <div class="tools"><div class="brand-tabs" role="group" aria-label="品牌筛选">${['all',...BRANDS].map(b=>`<button class="brand-tab ${brand===b?'active':''}" data-action="brand" data-brand="${b}">${b==='all'?'全部品牌':b}</button>`).join('')}</div><div class="search-wrap">${icon('search')}<input id="search" type="search" value="${esc(search)}" aria-label="搜索商品名称或货号" placeholder="搜索商品名称、货号或备注"></div></div>
 <div class="filter-row"><div class="left"><select id="filter" aria-label="对照状态"><option value="all">所有对照状态</option><option value="both">两地都有报价</option><option value="single">仅收录单边</option><option value="ready">已核对可比</option><option value="hk">香港报价较低</option><option value="cn">内地报价较低</option></select><select id="sort" aria-label="排序方式"><option value="default">默认顺序</option><option value="saving">已核对价差优先</option><option value="name">按商品名称</option></select><span class="caption">价格仅指所注明的官方渠道</span></div><div class="view-switch"><button class="icon-button ${layout==='grid'?'active':''}" aria-label="卡片视图" data-action="layout" data-layout="grid">${icon('grid')}</button><button class="icon-button ${layout==='table'?'active':''}" aria-label="表格视图" data-action="layout" data-layout="table">${icon('table')}</button></div></div>
 <div id="results">${resultsView()}</div>`;}
function filteredProducts(){let ps=state.products.filter(p=>view!=='wishlist'||p.favorite).filter(p=>brand==='all'||p.brand===brand);const q=search.toLowerCase().trim();if(q)ps=ps.filter(p=>[p.name,p.notes,p.category,p.cn?.sku,p.hk?.sku,p.cn?.variant,p.hk?.variant].join(' ').toLowerCase().includes(q));ps=ps.filter(p=>{const c=compare(p);return filter==='all'||filter==='both'&&(hasPrice(p.cn)&&hasPrice(p.hk))||filter==='single'&&c.kind==='single'||filter==='ready'&&c.ready||filter==='hk'&&c.ready&&c.kind==='hk'||filter==='cn'&&c.ready&&c.kind==='cn';});if(sort==='name')ps.sort((a,b)=>a.name.localeCompare(b.name,'zh-CN'));if(sort==='saving')ps.sort((a,b)=>{const ac=compare(a),bc=compare(b);return Number(bc.ready)-Number(ac.ready)||(Math.abs(bc.delta||0)-Math.abs(ac.delta||0));});return ps;}
function priceCell(p,region){const q=p[region],hk=region==='hk';return `<div class="price-cell"><div class="region-label"><i class="region-dot"></i>${hk?'香港':'内地'}${q?.sourceType==='mini'?'小程序':'官网'}</div>${hasPrice(q)?`<div class="price-value"><span class="currency">${hk?'HK$':'¥'}</span>${number(q.price,q.price%1?2:0)}</div><div class="price-convert">${hk?'参考折合 '+money(q.price*state.settings.rate):'人民币报价'}</div><div class="price-meta ${isSnapshot(q)||!q.reviewed?'bad':''}">${ageLabel(q)}</div>`:`<div class="price-value missing">未收录价格</div><div class="price-convert"><button class="text-button" data-action="edit" data-id="${esc(p.id)}">补充官方报价</button></div><div class="price-meta">不推断售罄或地区限定</div>`}</div>`;}
function productCard(p){const c=compare(p),sku=[p.cn?.sku,p.hk?.sku].filter(Boolean);return `<article class="product-card" data-product="${esc(p.id)}"><div class="card-top"><span class="product-symbol">${sym(p)}</span><div><span class="brand-badge ${p.brand.toLowerCase()}">${p.brand}</span><span class="category-label">${esc(p.category)}</span></div><div class="card-actions"><button class="icon-button favorite ${p.favorite?'active':''}" aria-label="${p.favorite?'移出':'加入'}心愿单：${esc(p.name)}" data-action="wish" data-id="${esc(p.id)}" aria-pressed="${!!p.favorite}">${icon('heart')}</button><button class="icon-button ${p.trip?'active':''}" aria-label="${p.trip?'移出':'加入'}香港清单：${esc(p.name)}" data-action="trip-toggle" data-id="${esc(p.id)}" aria-pressed="${!!p.trip}">${icon('bag')}</button></div></div><h3>${esc(p.name)}</h3><div class="card-sku">${sku.length?'款号 '+esc([...new Set(sku)].join(' / ')):'货号待补充 · 不自动匹配相似款'}</div><div class="prices">${priceCell(p,'cn')}${priceCell(p,'hk')}</div><div class="comparison-note ${c.ready?'good':''}">${icon(c.ready?'check':'info')}<span>${esc(c.message)}</span></div><div class="card-bottom"><span>${c.ready?'仅比较报价，库存另查':isSnapshot(p.cn)||isSnapshot(p.hk)?'快照收录 '+niceDate([p.cn?.observedAt,p.hk?.observedAt].filter(Boolean).sort().pop()):'保留来源和核对日期'}</span><button class="text-button" data-action="edit" data-id="${esc(p.id)}">查看 / 编辑 ${icon('arrow')}</button></div></article>`;}
function emptyState(title,desc,action='new',label='添加商品'){return `<div class="empty-state">${icon(view==='wishlist'?'heart':'bag')}<h3>${title}</h3><p>${desc}</p><button class="button small" data-action="${action}">${label}</button></div>`;}
function resultsView(){const ps=filteredProducts();if(!ps.length)return emptyState(view==='wishlist'?'心愿单里还很安静':'没有符合筛选的商品',view==='wishlist'?'在商品卡片上点一下爱心，只追踪真正想买的东西。':'换个关键词、放宽筛选，或者添加一个官方商品链接。',view==='wishlist'?'go-catalog':'clear-filters',view==='wishlist'?'浏览商品对照':'清除筛选');if(layout==='grid')return `<div class="product-grid">${ps.map(productCard).join('')}</div>`;return `<div class="table-wrap"><table><thead><tr><th>商品 / 款号</th><th>内地报价</th><th>香港报价</th><th>参考折合人民币</th><th>比较状态</th><th>操作</th></tr></thead><tbody>${ps.map(p=>{const c=compare(p);return `<tr><td><b>${esc(p.name)}</b><div class="mini">${p.brand} · ${esc(p.cn?.sku||p.hk?.sku||'货号待补充')}</div></td><td class="mono">${hasPrice(p.cn)?money(p.cn.price):'—'}<div class="mini">${ageLabel(p.cn)}</div></td><td class="mono">${hasPrice(p.hk)?'HK$'+number(p.hk.price):'—'}<div class="mini">${ageLabel(p.hk)}</div></td><td class="mono">${hasPrice(p.hk)?money(p.hk.price*state.settings.rate):'—'}</td><td><span class="${c.ready?'green':'warning'}">${esc(c.message)}</span></td><td><button class="text-button" data-action="edit" data-id="${esc(p.id)}">编辑</button></td></tr>`;}).join('')}</tbody></table></div>`;}
function tripSummary(){const selected=state.products.filter(p=>p.trip),included=selected.filter(p=>compare(p).ready);let cn=0,hk=0;included.forEach(p=>{cn+=Math.round(p.cn.price*100)*p.qty;hk+=Math.round(compare(p).hkCny*100)*p.qty;});const travel=state.settings.travelMode==='dedicated'?state.settings.travelCost:0,delta=priceRound((cn-hk)/100-travel);return {selected,included,excluded:selected.length-included.length,cn:cn/100,hk:hk/100,travel,delta};}
function tripView(){const t=tripSummary();return `<div class="page-heading"><div class="eyebrow">A SMALL PLAN FOR HONG KONG</div><h1>这次去香港，买什么？</h1><p>只汇总已确认同款、已核对且未过期的报价。其余商品保留在清单里，不伪装成零元。</p></div><div class="trip-layout"><section>${t.selected.length?t.selected.map(p=>{const c=compare(p);return `<article class="trip-item"><span class="product-symbol">${sym(p)}</span><div class="item-info"><h3>${esc(p.name)}</h3><p>${p.brand} · ${esc(c.message)}</p><button class="text-button" data-action="edit" data-id="${esc(p.id)}">核对商品与报价</button></div><label><span class="muted" style="display:block;font-size:9px">数量</span><input class="qty-input" data-qty="${esc(p.id)}" type="number" min="1" max="999" step="1" value="${p.qty}" aria-label="${esc(p.name)}数量"></label><button class="icon-button" aria-label="从香港清单移除${esc(p.name)}" data-action="trip-toggle" data-id="${esc(p.id)}">${icon('close')}</button></article>`;}).join(''):emptyState('先挑几件真正想买的','在商品卡片上点购物袋，就会加入这次香港清单。','go-catalog','去挑选商品')}</section><aside class="panel trip-summary"><h3>本次购物试算</h3><p>已纳入 ${t.included.length} 款${t.excluded?' · '+t.excluded+' 款待核对':''}</p><div class="radio-row"><label><input type="radio" name="travelMode" value="passing" ${state.settings.travelMode==='passing'?'checked':''}>顺路购买</label><label><input type="radio" name="travelMode" value="dedicated" ${state.settings.travelMode==='dedicated'?'checked':''}>专程购物</label></div>${state.settings.travelMode==='dedicated'?`<div class="field"><label for="trip-cost">因购物增加的交通等费用（人民币）</label><input id="trip-cost" type="number" min="0" max="100000" step="0.01" value="${state.settings.travelCost}"></div>`:''}<div class="summary-line"><span>同批商品内地合计</span><strong>${t.included.length?money(t.cn):'待核对'}</strong></div><div class="summary-line"><span>香港换算合计</span><strong>${t.included.length?money(t.hk):'待核对'}</strong></div><div class="summary-line"><span>额外出行成本</span><strong>${money(t.travel)}</strong></div><div class="summary-line total-line"><span>${t.included.length&&t.delta<0?'专程成本高出':'预计可节省'}</span><strong>${t.included.length?money(Math.abs(t.delta)):'—'}</strong></div><p class="hint">香港合计已包含设置中的 ${state.settings.feePct}% 支付费用。仅按录入的单件报价试算，未自动套用满减、套装优惠、运费或其他费用。</p>${t.excluded?`<div class="notice" style="margin:15px 0 0">${icon('info')}<div>${t.excluded} 款未计入总额，请先补齐价格、核对同款和日期。</div></div>`:''}<div class="inline-actions"><button class="button small" data-action="export-trip">${icon('download')} 导出清单</button></div></aside></div>`;}
function sourcesView(){return `<div class="page-heading"><div class="eyebrow">OFFICIAL SOURCES ONLY</div><h1>有来源，才有可比较的价格。</h1><p>云端负责保存资料；官网与官方小程序负责提供你核对的原始报价。</p></div><div class="notice">${icon('info')}<div><strong>此版没有部署自动抓价后端。</strong>GitHub Pages 不运行旧版 Python 服务。不会把旧快照标成实时价格，也不会读取小程序的私人接口。</div></div><div class="source-grid">${BRANDS.map(b=>`<section class="source-card"><h3>${b}</h3>${REGIONS.map(r=>`<div class="source-region"><div class="source-top">${officialLink(SOURCES[b][r],r==='cn'?'内地官网':'香港官网')}<span class="status-tag">人工核对来源</span></div><p>打开官方渠道，核对货号、所选规格与适用优惠后录入。</p></div>`).join('')}</section>`).join('')}</div><section class="panel"><h3>三种录入方式</h3><div class="steps"><div class="step"><span>01 / 官方网站</span><h4>保存链接与真实报价</h4><p>在商品编辑页选择官网来源，粘贴官方商品链接，填写对应规格、货号、价格与核对日期。</p></div><div class="step"><span>02 / 浏览器书签</span><h4>从正在浏览的页面记录</h4><p>将下方按钮拖到电脑的书签栏。在官网选好规格后点击书签，按提示填价格，下载记录再导入。</p></div><div class="step"><span>03 / 官方小程序</span><h4>手动录入小程序价格</h4><p>填写官方小程序名称、商品货号、价格和日期，可附分享文字。未接入小程序登录或自动读取。</p></div></div><div class="inline-actions"><a id="bookmark-link" class="bookmark" href="#" draggable="true">${icon('plus')} 采集到两地价</a><button class="button small" data-action="import">导入采集记录</button><button class="button small" data-action="new">手动添加</button></div><p class="hint">书签仅在你点击时运行，不采集官网登录凭据。备份中的早期快照保留其原日期，不代表今天的商品价格。门店库存请去官方渠道另行确认。</p></section>`;}
function settingsView(){const s=state.settings;return `<div class="page-heading"><div class="eyebrow">YOUR RULES, YOUR DATA</div><h1>按自己的方式比较。</h1><p>个人资料保存在 Supabase。iCloud 只存备份，不充当第二份主数据。</p></div><div class="settings-grid"><form class="panel" id="settings-form"><h3>汇率与计算</h3><p style="margin-bottom:20px">1 港币对应多少人民币；请按实际支付渠道核对。</p><div class="field"><label for="set-rate">1 HKD = CNY</label><input id="set-rate" type="number" min="0.050001" max="4.999999" step="0.000001" required value="${s.rate.toFixed(6)}"><small>${esc(s.rateSource)} · ${niceDate(s.rateDate)}</small></div><div class="fields-two"><div class="field"><label for="set-rate-date">汇率日期</label><input type="date" id="set-rate-date" value="${esc(dateOnly(s.rateDate))}" max="${today()}" required></div><div class="field"><label for="set-fee">额外支付费用（%）</label><input id="set-fee" type="number" min="0" max="100" step="0.01" value="${s.feePct}" required></div></div><div class="field"><label for="set-fresh">已核对报价的有效天数</label><input id="set-fresh" type="number" min="1" max="30" step="1" value="${s.freshDays}" required><small>报价过期或汇率日期超过 7 天，暂停购买结论，不删除原价格。</small></div><button class="button primary" type="submit">保存设置</button><p class="hint">云同步版未部署汇率采集服务。请手动记录参考或支付汇率。默认汇率保留了旧版的日期，不表示实时值。</p><a class="source-link" href="https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html" target="_blank" rel="noopener noreferrer">打开 ECB 官方参考页 ${icon('external')}</a></form><div><section class="panel"><h3>云端账号与同步</h3><p>${esc(activeUser?.email||'')}</p><p id="settings-cloud-status">${esc(saveMessage)}</p><div class="inline-actions"><button class="button small" data-action="cloud-sync">立即同步</button><button class="button small" data-action="cloud-drafts">检查本机草稿</button><button class="button small" data-action="cloud-reload">备份后载入云端</button></div><p class="hint">保存后自动上传；回到页面时检查更新。冲突按整份清单阻止覆盖，不会自动合并。首次打开页面需要联网登录并读取云端。</p><div class="inline-actions"><button class="button small" data-action="password">修改网站密码</button><button class="button small" data-action="logout">退出登录</button></div></section><section class="panel"><h3>iCloud 备份与旧版迁移</h3><div class="inline-actions"><button class="button small" data-action="icloud-backup">${icon('download')} 导出到 iCloud / 文件</button><button class="button small" data-action="import">${icon('upload')} 导入旧版 / 备份</button></div><p class="hint">支持选择保存位置的浏览器会弹出文件选择器；否则先下载 JSON，再移入 iCloud Drive。网页不能检查 iCloud 上传是否完成，也不会自动写入你的 Apple 账号。</p><p class="hint">备份兼容 v0.1，不含密码或登录令牌。导入会询问是否替换，并为非空清单先生成备份；导入后的修改仍需等待“已同步到云端”。</p></section><section class="panel"><h3>整理清单</h3><p>清空也会同步到其他设备。先导出备份。</p><button class="button small danger" data-action="clear-all">清空商品清单</button></section></div></div>`;}
function quoteForm(p,r){const q=p[r]||{},hk=r==='hk',title=hk?'香港报价 · HKD':'内地报价 · CNY';const snapshot=isSnapshot(q);return `<section class="quote-panel" data-region="${r}"><h3>${title}<span class="status-tag">${hasPrice(q)?ageLabel(q):'等待录入'}</span></h3><div id="${r}-status" class="quote-status">${hasPrice(q)?`${esc(ageLabel(q))} · ${snapshot?'快照收录':'记录'} ${niceDate(q.observedAt)}。${snapshot?'原站报价时间未确认，请重新核对。':'请确认价格对应当前所选规格。'}`:'价格可以留空；没有数据时不推断无货。'}</div><div class="field"><label for="${r}-type">来源类型</label><select id="${r}-type"><option value="web" ${q.sourceType!=='mini'?'selected':''}>品牌官方网站</option><option value="mini" ${q.sourceType==='mini'?'selected':''}>品牌官方小程序（用户录入）</option></select></div><div class="${r}-web"><div class="field"><label for="${r}-url">官方商品链接</label><div class="input-with-button"><input id="${r}-url" type="text" inputmode="url" maxlength="2400" placeholder="https://… 商品详情页" value="${esc(q.url||'')}"><button type="button" class="button" data-action="read-quote" data-region="${r}">${icon('refresh')} 读取</button></div><small>${q.url?officialLink(q.url,'打开来源页')+' · ':''}${officialLink(SOURCES[p.brand][r],'去官方商城')}</small></div></div><div class="${r}-mini" ${q.sourceType==='mini'?'':'hidden'}><div class="field"><label for="${r}-source-name">已核实的官方小程序名称</label><input id="${r}-source-name" maxlength="100" value="${esc(q.sourceName||'')}" placeholder="填写微信内显示的完整名称"></div><div class="field"><label for="${r}-share">小程序分享文字 / 来源备注（可选）</label><textarea id="${r}-share" maxlength="1500" placeholder="只记录商品信息，不粘贴登录凭据、订单或个人信息。">${esc(q.shareText||'')}</textarea></div></div><div id="${r}-candidates" class="candidates"></div><div class="fields-two"><div class="field"><label for="${r}-price">当前单件价格（${hk?'港币':'人民币'}）</label><input type="number" id="${r}-price" min="0.01" max="100000000" step="0.01" inputmode="decimal" value="${hasPrice(q)?q.price:''}" placeholder="未知请留空"></div><div class="field"><label for="${r}-sku">完整货号 / 款号</label><input id="${r}-sku" maxlength="100" value="${esc(q.sku||'')}" placeholder="不要只写系列名"></div></div><div class="field"><label for="${r}-variant">所选规格（颜色 / 尺码 / 容量 / 件数）</label><input id="${r}-variant" maxlength="300" value="${esc(q.variant||'')}" placeholder="例如：黑色 / M / 单件"></div><div class="fields-two"><div class="field"><label for="${r}-date">本次核对日期</label><input id="${r}-date" type="date" max="${today()}" value="${q.reviewed&&!snapshot?dateOnly(q.observedAt):today()}"></div><div class="field"><label for="${r}-stock">所选规格的库存记录</label><select id="${r}-stock">${[['unknown','未确认'],['in','页面显示有货'],['limited','页面显示少量'],['out','页面显示售罄'],['preorder','预售 / 待补货']].map(([v,l])=>`<option value="${v}" ${q.availability===v?'selected':''}>${l}</option>`).join('')}</select></div></div><div class="field"><label for="${r}-conditions">价格条件 / 会员优惠备注</label><textarea id="${r}-conditions" maxlength="1500" placeholder="普通价、会员价、指定颜色优惠或需购买多件等条件。">${esc(q.conditions||'')}</textarea></div><div class="check-row review-box"><input type="checkbox" id="${r}-review"><label for="${r}-review">我已在官方页面核对上面的<strong>商品、规格、价格和适用条件</strong>；小程序来源也由我核实。勾选后才记为本次已核对。</label></div></section>`;}
function openEditor(id=null,capture=null){
 if(!syncer?.ready){notify('请先登录。');return;}editorStartVersion=syncer.version;
 const existing=id?state.products.find(p=>p.id===id):null;
 editing=clone(existing||{id:newId(),name:'',brand:'MUJI',category:'其他',cn:null,hk:null,match:'candidate',favorite:false,trip:false,qty:1,notes:'',createdAt:iso()});
 editing._isNew=!existing;draftMeta={cn:clone(editing.cn||{}),hk:clone(editing.hk||{})};candidateData={};
 if(capture){editing.brand=capture.brand;editing.name=capture.title||'';editing[capture.region]=clone(capture);draftMeta[capture.region]=clone(capture);}
 const p=editing;
 $('#editor').innerHTML=`<form id="editor-form"><div class="dialog-head"><div><h2 id="editor-title">${p._isNew?'添加商品':'核对商品与两地报价'}</h2><p>先确认是同一件，再决定去哪里买。价格随时可以留空。</p></div><button type="button" class="icon-button" data-action="close-editor" aria-label="关闭编辑">${icon('close')}</button></div><div class="dialog-body"><div id="form-error" class="form-error" role="alert"></div><div class="fields-three"><div class="field"><label for="edit-name">商品名称</label><input id="edit-name" required maxlength="200" value="${esc(p.name)}" placeholder="给自己一个容易认出的名字"></div><div class="field"><label for="edit-brand">品牌</label><select id="edit-brand">${BRANDS.map(b=>`<option ${p.brand===b?'selected':''}>${b}</option>`).join('')}</select></div><div class="field"><label for="edit-category">分类</label><select id="edit-category">${CATEGORIES.map(c=>`<option ${p.category===c?'selected':''}>${c}</option>`).join('')}</select></div></div><div class="quote-columns">${quoteForm(p,'cn')}${quoteForm(p,'hk')}</div><div class="match-panel"><h4>两地是否可以直接比较？</h4><p>“已确认”需要两边都有货号、明确规格与已核对的价格。不靠名称或图片相似自动确认。</p><label class="field" style="margin:0"><span class="sr-only" style="font-size:0">匹配状态</span><select id="edit-match" aria-label="两地同款匹配状态"><option value="candidate" ${p.match==='candidate'?'selected':''}>候选配对 · 我还没有核对完</option><option value="confirmed" ${p.match==='confirmed'?'selected':''}>我已确认两地同款同规格，单件数和价格条件均可比</option><option value="different" ${p.match==='different'?'selected':''}>规格 / 版本不同 · 不直接比较价差</option></select></label></div><div class="field" style="margin-top:19px"><label for="edit-notes">我的备注</label><textarea id="edit-notes" maxlength="3000" placeholder="例如：下次去香港时顺便看；只考虑黑色。">${esc(p.notes||'')}</textarea></div><div class="check-row"><input type="checkbox" id="edit-wish" ${p.favorite?'checked':''}><label for="edit-wish">加入我的心愿单</label><input type="checkbox" id="edit-trip" ${p.trip?'checked':''} style="margin-left:16px"><label for="edit-trip">加入本次香港清单</label></div>${historyView(p)}</div><div class="dialog-footer"><div>${p._isNew?'<span class="capture-inline">缺失价格不影响保存</span>':`<button type="button" class="button small danger" data-action="delete" data-id="${esc(p.id)}">${icon('trash')} 删除</button>`}</div><div class="right"><button type="button" class="button" data-action="close-editor">取消</button><button type="submit" class="button primary">保存商品</button></div></div></form>`;
 const dialog=$('#editor');if(!dialog.open)dialog.showModal();$('#editor-form').addEventListener('submit',saveEditor);
 for(const r of REGIONS){
  $(`#${r}-type`).addEventListener('change',()=>{showSourceFields(r);$(`#${r}-review`).checked=false;$('#edit-match').value='candidate';});showSourceFields(r);
  for(const k of ['url','sku','variant'])$(`#${r}-${k}`).addEventListener('input',()=>{$('#edit-match').value='candidate';$(`#${r}-review`).checked=false;});
  for(const k of ['price','conditions','stock'])$(`#${r}-${k}`).addEventListener('input',()=>{$(`#${r}-review`).checked=false;});
  $(`#${r}-url`).addEventListener('change',()=>{const src=sourceFor($(`#${r}-url`).value.trim());if(src&&editing._isNew&&!$(`#${r==='cn'?'hk':'cn'}-url`).value.trim()){$('#edit-brand').value=src[0];updateOfficialShortcuts();} });
 }
 $('#edit-brand').addEventListener('change',()=>{$('#edit-match').value='candidate';REGIONS.forEach(r=>$(`#${r}-review`).checked=false);updateOfficialShortcuts();});
 if(capture){notify('采集记录已载入编辑页；核对后保存，尚未自动加入商品库。');}
}
function updateOfficialShortcuts(){const b=$('#edit-brand').value;for(const r of REGIONS){const u=$(`#${r}-url`).value.trim();$(`.${r}-web small`).innerHTML=(u?officialLink(u,'打开来源页')+' · ':'')+officialLink(SOURCES[b][r],'去官方商城');}}
function showSourceFields(r){const mini=$(`#${r}-type`).value==='mini';$(`.${r}-web`).hidden=mini;$(`.${r}-mini`).hidden=!mini;}
function historyView(p){const rows=REGIONS.flatMap(r=>(p[r]?.history||[]).map(h=>({...h,region:r}))).sort((a,b)=>String(b.observedAt).localeCompare(String(a.observedAt))).slice(0,20);return `<details class="details-box"><summary>价格记录与来源说明 ${rows.length?'('+rows.length+')':''}</summary>${rows.length?`<div class="table-wrap" style="margin-top:10px"><table class="history-table"><thead><tr><th>记录日期</th><th>地区</th><th>价格</th><th>当时规格</th><th>来源方式</th></tr></thead><tbody>${rows.map(h=>`<tr><td>${niceDate(h.observedAt)}</td><td>${h.region==='hk'?'香港':'内地'}</td><td>${validPrice(h.price)?(h.region==='hk'?'HK$':'¥')+number(h.price):'—'}</td><td>${esc(h.variant||'未注明')}</td><td>${esc(h.provenance==='user_verified'?'用户核对':h.provenance||'手动记录')}</td></tr>`).join('')}</tbody></table></div>`:'<p class="hint">尚未积累连续价格记录。每次更新报价后才新增记录，不生成虚构的历史曲线。</p>'}<p class="hint">官网检索快照：从官方页面的检索摘要收录，可能滞后。官网页面快照：从官方页面文本收录，并未模拟选择颜色或尺码。两种快照均不是实时价格。用户核对／小程序录入代表你的记录，不表示已由品牌认证。</p></details>`;}
function showFormError(msg){const box=$('#form-error');box.textContent=msg;box.classList.add('visible');box.scrollIntoView({block:'nearest'});}
function collectQuote(r,p){const old=editing[r]||{},meta=draftMeta[r]||{};const read=k=>$(`#${r}-${k}`).value.trim();const priceText=read('price'),price=priceText===''?null:Number(priceText),sourceType=read('type');const q={...clone(old),sourceType,price,currency:r==='hk'?'HKD':'CNY',url:sourceType==='web'?read('url'):'',sourceName:sourceType==='mini'?read('source-name'):'',shareText:sourceType==='mini'?read('share'):'',sku:read('sku'),variant:read('variant'),conditions:read('conditions'),availability:read('stock'),history:clone(old.history||[])};
 if(!q.url&&!q.sourceName&&!q.sku&&!q.variant&&price===null&&!q.conditions&&!q.shareText)return null;
 if(price!==null&&!validPrice(price))throw new Error((r==='hk'?'香港':'内地')+'价格必须是正数；未知价格请留空。');
 if(sourceType==='web'&&q.url){const source=sourceFor(q.url);if(!source||source[0]!==p.brand||source[1]!==r)throw new Error((r==='hk'?'香港':'内地')+'栏的链接与所选品牌或地区不一致，请使用对应的官方链接。');}
 if(hasPrice(q)&&sourceType==='web'&&!q.url)throw new Error('官网价格必须附上官方来源链接。');
 if(hasPrice(q)&&sourceType==='mini'&&!q.sourceName)throw new Error('请填写已核实的官方小程序完整名称。');
 const review=$(`#${r}-review`).checked,changed=['price','sourceType','url','sourceName','shareText','sku','variant','conditions','availability'].some(k=>(old[k]??'')!==(q[k]??''));
 if(review&&!hasPrice(q))throw new Error('没有价格的记录不能标为已核对。');
 if(review||changed){const d=read('date');if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!Number.isFinite(ageDays(d))||ageDays(d)<0)throw new Error('请填写有效且不是未来的核对日期。');q.reviewed=review;q.observedAt=review?d:(meta.provenance==='structured'?meta.observedAt:d);q.priceDate=review?d:null;q.provenance=review?'user_verified':meta.provenance==='structured'?'structured':meta.provenance==='browser_capture'?'browser_capture':'manual_unverified';q.extractionKey=meta.extractionKey||'';q.lastError='';
  if(hasPrice(q)){const previous=q.history[q.history.length-1];if(!previous||previous.price!==q.price||previous.variant!==q.variant||previous.sku!==q.sku||previous.observedAt!==q.observedAt||previous.provenance!==q.provenance){q.history.push({price:q.price,currency:q.currency,url:q.url,sku:q.sku,variant:q.variant,observedAt:q.observedAt,provenance:q.provenance,conditions:q.conditions});q.history=q.history.slice(-300);}}
 }else{q.reviewed=!!old.reviewed;q.provenance=old.provenance||'manual_unverified';q.observedAt=old.observedAt||read('date');}
 return q;
}
function saveEditor(event){event.preventDefault();try{if(editorStartVersion!==syncer.version)throw new Error('编辑期间云端已更新。请先复制当前修改，再关闭编辑并核对新版本，防止覆盖其他设备。');const p=clone(editing);delete p._isNew;p.name=$('#edit-name').value.trim();p.brand=$('#edit-brand').value;p.category=$('#edit-category').value;p.notes=$('#edit-notes').value.trim();p.favorite=$('#edit-wish').checked;p.trip=$('#edit-trip').checked;p.match=$('#edit-match').value;p.cn=collectQuote('cn',p);p.hk=collectQuote('hk',p);if(!p.name)throw new Error('请先填写商品名称。');if(p.match==='confirmed'){
 for(const r of REGIONS){const q=p[r];if(!hasPrice(q)||!q.reviewed||isSnapshot(q)||!q.sku?.trim()||!q.variant?.trim())throw new Error('要标为同款已确认，请补齐两边货号、具体规格和价格，并分别勾选“已在官方页面核对”。否则可先保存为候选。');}}
 const test=clone(state);const index=test.products.findIndex(x=>x.id===p.id);if(index<0)test.products.unshift(p);else test.products[index]=p;validateState(test);state=test;persist();$('#editor').close();editing=null;render();notify('商品已保存。'+(p.match==='candidate'?'仍保留为待核对候选。':''));}catch(e){showFormError(e.message);}}
async function readQuote(){notify('云同步版暂不提供自动抓价。请打开旁边的官方链接核对，再填写价格和日期；云同步不会让旧快照变成实时价格。');}
function applyCandidate(r,i){const c=candidateData[r]?.[i];if(!c||!validPrice(c.price))return;draftMeta[r]=clone(c);for(const [k,v] of Object.entries({url:c.url,price:c.price,sku:c.sku||'',variant:c.variant||'',stock:c.availability||'unknown',conditions:c.conditions||'',date:dateOnly(c.observedAt)||today()}))$(`#${r}-${k}`).value=v;$(`#${r}-review`).checked=false;$('#edit-match').value='candidate';if(!$('#edit-name').value.trim())$('#edit-name').value=c.title||'';$(`#${r}-candidates`).innerHTML='';const box=$(`#${r}-status`);box.className='quote-status success';box.textContent='已读取 '+(c.method||'官方页面报价')+'，尚未保存。请核对货号、规格与价格条件，再勾选确认。';}
function download(data,name,type='application/json'){const blob=new Blob([typeof data==='string'?data:JSON.stringify(data,null,2)],{type:type+';charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}
function backupFilename(tag='backup'){const clock=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Hong_Kong',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date()).replaceAll(':','');return `liangdijia-${tag}-${today()}-${clock}.json`;}
async function exportBackup(preferPicker=false){
 const data=syncer?.state?clone(syncer.state):clone(state),name=backupFilename(dirty?'unsynced':'backup');
 if(preferPicker&&typeof window.showSaveFilePicker==='function'){
  try{const handle=await window.showSaveFilePicker({suggestedName:name,types:[{description:'两地价 JSON 备份',accept:{'application/json':['.json']}}]});const w=await handle.createWritable();await w.write(JSON.stringify(data,null,2));await w.close();notify('已写入所选文件。iCloud 上传状态请在系统中确认。');return true;}
  catch(e){if(e.name==='AbortError')return false;notify('直接保存未完成，改为下载 JSON；请将下载文件移入 iCloud Drive。');}
 }
 download(data,name);notify('已发起 JSON 下载。请确认文件已保存，再移入 iCloud Drive；网页无法确认 iCloud 同步状态。');return true;
}
function csvCell(v){let s=String(v??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
function exportCSV(trip=false){const ps=trip?state.products.filter(p=>p.trip):filteredProducts(),rows=[['品牌','商品名称','内地货号','香港货号','内地价格_CNY','香港价格_HKD','香港参考折合_CNY','比较状态','已核对价差_CNY_正为香港低','数量','内地规格','香港规格','内地来源类型','香港来源类型','内地来源','香港来源','内地记录日期','香港记录日期','汇率','汇率日期']];for(const p of ps){const c=compare(p);rows.push([p.brand,p.name,p.cn?.sku,p.hk?.sku,hasPrice(p.cn)?p.cn.price:'',hasPrice(p.hk)?p.hk.price:'',hasPrice(p.hk)?priceRound(p.hk.price*state.settings.rate):'',c.message,c.ready?c.delta:'',p.qty,p.cn?.variant,p.hk?.variant,p.cn?.sourceType,p.hk?.sourceType,p.cn?.url||p.cn?.sourceName,p.hk?.url||p.hk?.sourceName,p.cn?.observedAt,p.hk?.observedAt,state.settings.rate,state.settings.rateDate]);}download('\ufeff'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n'),`liangdijia-${trip?'hongkong-trip':'comparison'}-${today()}.csv`,'text/csv');}
function confirmAction(title,message,label='确认'){return new Promise(resolve=>{const d=$('#confirm-dialog');d.innerHTML=`<h3 id="confirm-title">${esc(title)}</h3><p>${esc(message)}</p><div class="inline-actions"><button class="button" id="confirm-no">取消</button><button class="button primary" id="confirm-yes">${esc(label)}</button></div>`;let done=false;const finish=v=>{if(done)return;done=true;d.close();resolve(v);};$('#confirm-no').onclick=()=>finish(false);$('#confirm-yes').onclick=()=>finish(true);d.oncancel=e=>{e.preventDefault();finish(false);};d.showModal();});}
function captureBookmarklet(){const fn=function(hosts){try{
 const u=new URL(location.href);let src=hosts[u.hostname];if(u.hostname==='www.uniqlo.com'){if(u.pathname.startsWith('/hk/'))src=['UNIQLO','hk'];if(u.pathname.startsWith('/cn/'))src=['UNIQLO','cn'];}if(u.protocol!=='https:'||!src){alert('请在三个品牌的内地／香港官方商品页使用。');return;}
 const currency=src[1]==='hk'?'HKD':'CNY';const title=prompt('确认商品名称',document.querySelector('h1')?.textContent?.trim()||document.querySelector('meta[property="og:title"]')?.content||document.title);if(title===null)return;
 const amount=prompt('请输入当前已选规格在官网显示的价格（'+currency+'）。不要填原价、起售价或推荐商品价格。','');if(amount===null)return;const raw=amount.trim().replace(/,/g,'');const price=Number(raw);if(!/^\d+(\.\d+)?$/.test(raw)||!Number.isFinite(price)||price<=0){alert('请输入明确的正数价格。');return;}
 const sku=prompt('复制完整商品货号（没有找到可以留空）','');if(sku===null)return;const variant=prompt('记录所选颜色、尺码、容量、件数，例如：黑色 / M / 单件','');if(variant===null)return;
 for(const k of [...u.searchParams.keys()])if(/^(utm_|access_token$|token$|session$|sessionid$|authorization$)/i.test(k))u.searchParams.delete(k);u.hash='';
 const data={kind:'liangdijia.capture.v1',brand:src[0],region:src[1],title:title.trim(),url:u.href,sku:sku.trim(),variant:variant.trim(),price:Math.round(price*100)/100,currency,sourceType:'web',provenance:'browser_capture',reviewed:false,availability:'unknown',conditions:'由用户在官方页面手动采集；导入后仍需核对。',observedAt:new Date().toISOString()};
 const b=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const object=URL.createObjectURL(b),a=document.createElement('a');a.href=object;a.download='liangdijia-capture-'+Date.now()+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(object),2000);
 }catch(e){alert('采集未完成：'+e.message);}};return 'javascript:('+fn.toString()+')('+JSON.stringify(HOSTS)+');';}
async function importFile(file){if(!file)return;if(file.size>3000000){notify('文件超过 3 MB，未导入。');return;}try{const data=JSON.parse(await file.text());if(data.kind==='liangdijia.capture.v1'){
 const src=sourceFor(data.url);if(!src||src[0]!==data.brand||src[1]!==data.region||!validPrice(data.price)||data.currency!==(data.region==='hk'?'HKD':'CNY'))throw new Error('采集记录的官方来源、金额或币种不正确。');
 const cap={title:String(data.title||'').slice(0,200),brand:data.brand,region:data.region,url:data.url,sku:String(data.sku||'').slice(0,100),variant:String(data.variant||'').slice(0,300),price:data.price,currency:data.currency,sourceType:'web',provenance:'browser_capture',reviewed:false,availability:'unknown',conditions:'浏览器采集记录；请再次核对商品规格和适用价格。',observedAt:String(data.observedAt||iso()),history:[]};
 // No automatic merge: identical names / style codes are not sufficient evidence.
 openEditor(null,cap);return;
 }validateState(data);if(await confirmAction('导入整份备份？',`这会用备份中的 ${data.products.length} 件商品替换当前 ${state.products.length} 件商品。请先导出当前资料；采集文件不会触发整库替换。`,'替换并导入')){if(state.products.length){download(state,backupFilename('before-import'));}state=data;persist();render();notify('备份已导入，正在同步；请检查云端保存状态。');}}catch(e){notify('未导入：'+e.message);}}
function bindCurrentView(){
 if(view==='catalog'||view==='wishlist'){$('#search').addEventListener('input',e=>{search=e.target.value;renderOnlyResults();});$('#filter').value=filter;$('#sort').value=sort;$('#filter').addEventListener('change',e=>{filter=e.target.value;renderOnlyResults();});$('#sort').addEventListener('change',e=>{sort=e.target.value;renderOnlyResults();});}
 if(view==='sources'){const b=$('#bookmark-link');b.href=captureBookmarklet();b.addEventListener('click',e=>{e.preventDefault();notify('把这个按钮拖到浏览器书签栏，再到品牌官网商品页点击书签使用。');});}
 if(view==='trip'){
  $$('[data-qty]').forEach(el=>el.addEventListener('change',()=>{const n=Number(el.value);if(!Number.isInteger(n)||n<1||n>999){notify('数量应为 1–999 的整数。');render();return;}const p=state.products.find(x=>x.id===el.dataset.qty);p.qty=n;persist();render();}));
  $$('input[name="travelMode"]').forEach(el=>el.addEventListener('change',()=>{state.settings.travelMode=el.value;persist();render();}));
  $('#trip-cost')?.addEventListener('change',e=>{const v=Number(e.target.value);if(!Number.isFinite(v)||v<0||v>100000){notify('请填写有效的额外出行费用。');render();return;}state.settings.travelCost=priceRound(v);persist();render();});
 }
 if(view==='settings')$('#settings-form').addEventListener('submit',e=>{e.preventDefault();const s=state.settings,r=Number($('#set-rate').value),fee=Number($('#set-fee').value),days=Number($('#set-fresh').value),date=$('#set-rate-date').value;if(!(r>0.05&&r<5)||!(fee>=0&&fee<=100)||!Number.isInteger(days)||days<1||days>30||ageDays(date)<0||!Number.isFinite(ageDays(date))){notify('汇率、日期、费用或有效天数无效。');return;}if(r!==Number(s.rate.toFixed(6))||date!==s.rateDate){s.rate=r;s.rateDate=date;s.rateMode='manual';s.rateSource='用户填写的支付／参考汇率';s.rateUrl='';delete s.basis;}s.feePct=fee;s.freshDays=days;settingsDirty=false;persist();render();notify('设置已保存，价格换算已重新计算。');});
}
async function handleAction(e){const b=e.target.closest('[data-action]');if(!b)return;const action=b.dataset.action,id=b.dataset.id;if(b.tagName==='A')e.preventDefault();
 if(action==='nav'){view=b.dataset.view;render();window.scrollTo({top:0});return;}
 if(action==='new'){openEditor();return;}
 if(action==='edit'){openEditor(id);return;}
 if(action==='close-editor'){$('#editor').close();editing=null;return;}
 if(action==='brand'){brand=b.dataset.brand;render();return;}
 if(action==='layout'){layout=b.dataset.layout;render();return;}
 if(action==='clear-filters'){brand='all';search='';filter='all';sort='default';render();return;}
 if(action==='go-catalog'){view='catalog';brand='all';filter='all';search='';render();return;}
 if(action==='wish'||action==='trip-toggle'){const p=state.products.find(x=>x.id===id);if(!p)return;const key=action==='wish'?'favorite':'trip';p[key]=!p[key];persist();render();notify(p[key]?(key==='favorite'?'已加入心愿单。':'已加入本次香港清单。'):'已移出清单。');return;}
 if(action==='read-quote'){await readQuote(b.dataset.region,b);return;}
 if(action==='candidate'){applyCandidate(b.dataset.region,Number(b.dataset.index));return;}
 if(action==='delete'){if(await confirmAction('删除这件商品？','会同时删除它的报价与记录。其他商品不受影响。','删除')){state.products=state.products.filter(x=>x.id!==id);persist();$('#editor').close();editing=null;render();notify('商品已删除。');}return;}
 if(action==='export'||action==='icloud-backup'){await exportBackup(action==='icloud-backup');return;}
 if(action==='export-csv'||action==='export-trip'){exportCSV(action==='export-trip');return;}
 if(action==='import'){$('#import-file').click();return;}
 if(action==='clear-all'){if(await confirmAction('清空全部商品？','心愿单和本次香港清单也会清空。汇率设置保留。建议先导出备份。','清空')){state.products=[];persist();render();notify('商品清单已清空。');}return;}
 if(action==='fx'){notify('请手动填写并核对汇率。');return;}
 if(action==='cloud-sync'||action==='retry-save'){await syncNow();return;}
 if(action==='cloud-reload'||action==='reload-server'){await reloadCloud();return;}
 if(action==='logout'){await logout();return;}
 if(action==='cloud-drafts'){showDrafts();return;}
 if(action==='password'){showPasswordDialog();return;}

}
document.addEventListener('click',e=>{Promise.resolve(handleAction(e)).catch(err=>notify('操作未完成：'+err.message));});
$('#import-file').addEventListener('change',async e=>{await importFile(e.target.files[0]);e.target.value='';});
$('#editor').addEventListener('cancel',()=>{editing=null;});
window.addEventListener('beforeunload',e=>{if(dirty||formOpen()){e.preventDefault();e.returnValue='';}});
// Public diagnostic helpers expose no access token and perform no network request.
window.LiangDiJia=Object.freeze({version:'0.2-cloud',compare,validateState,sourceFor,state:()=>syncer?.ready?clone(state):null,tripSummary});

function showPasswordDialog(){
 const d=$('#password-dialog');d.innerHTML=`<form id="password-form"><h3>修改网站登录密码</h3><p class="hint">只修改两地价账号的密码，不是 Supabase 控制台或数据库密码。不会保存到配置文件或备份。</p><div class="field"><label for="new-password">新密码（至少 12 位）</label><input type="password" id="new-password" autocomplete="new-password" minlength="12" required></div><div class="field"><label for="confirm-password">再次输入</label><input type="password" id="confirm-password" autocomplete="new-password" minlength="12" required></div><p id="password-message" role="status"></p><div class="inline-actions"><button class="button primary" id="save-password">保存新密码</button><button class="button" type="button" id="cancel-password">取消</button></div></form>`;
 $('#cancel-password').onclick=()=>d.close();$('#password-form').onsubmit=async e=>{e.preventDefault();const a=$('#new-password').value,b=$('#confirm-password').value;if(a!==b){$('#password-message').textContent='两次密码不一致。';return;}$('#save-password').disabled=true;try{await client.changePassword(a);d.close();notify('网站账号密码已修改。请在其他设备使用新密码登录。');}catch(e){$('#password-message').textContent=e.message;}finally{$('#save-password').disabled=false;}};d.showModal();
}
$('#auth-form').addEventListener('submit',loginSubmit);
$('#retry-connection').onclick=()=>connect();
$('#return-login').onclick=async()=>{await client?.signOut();gate('login');};
$('#auth-draft').onclick=()=>exportBackup(true);
$('#login-remember').disabled=!navigator.locks;
$('#login-remember').checked=!!navigator.locks;
if(!navigator.locks)$('#remember-note').textContent='此浏览器将登录状态保留在当前标签页；重新打开时再登录，云端资料不会丢失。';
document.addEventListener('input',e=>{if(e.target.closest('#settings-form'))settingsDirty=true;});
window.addEventListener('online',()=>syncNow(true));
window.addEventListener('focus',()=>syncNow(true));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncNow(true);});
window.addEventListener('storage',e=>{if(client&&e.key===client.authKey&&e.newValue===null&&client.remember){resetApp();client.auth=null;}});
connect();

})();
