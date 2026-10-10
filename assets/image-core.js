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
