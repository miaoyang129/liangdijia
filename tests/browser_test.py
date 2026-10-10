"""Browser DOM harness with simulated storage, REST and captured downloads; NOT a real Supabase project.
Runs without a web server. Needs the Python Playwright package and system Chromium.
"""
from pathlib import Path
import json, os, re
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'tests'/'browser-results';OUT.mkdir(exist_ok=True)
URL=os.environ.get('LDJ_TEST_URL','http://127.0.0.1:8765/')
UID='00000000-0000-4000-8000-000000000001'
CONFIG='window.LDJ_CONFIG={supabaseUrl:"https://testproject.supabase.co",supabasePublishableKey:"sb_publishable_LOCAL_TEST_ONLY"};'
row=None;writes=0;offline=False;deny=False;errors=[];checks=[]
def check(name,ok=True):
    assert ok,name
    checks.append({'name':name,'passed':True})
def api(url,options):
    global row,writes
    method=options.get('method','GET');headers=options.get('headers',{})
    def reply(data,status=200):return {'status':status,'data':data}
    if offline:return {'network_error':True}
    body=json.loads(options.get('body') or '{}')
    if '/auth/v1/token' in url:
        if 'grant_type=password' in url and (body.get('email')!='owner@example.test' or body.get('password')!='test-only-password'):
            return reply({'error_code':'invalid_credentials','msg':'Invalid login credentials'},400)
        return reply({'access_token':'TEST_ACCESS_ONLY','refresh_token':'TEST_REFRESH_ONLY','expires_in':3600,'user':{'id':UID,'email':'owner@example.test'}})
    if headers.get('Authorization')!='Bearer TEST_ACCESS_ONLY':return reply({'message':'not authenticated'},401)
    if '/auth/v1/user' in url:return reply({'id':UID,'email':'owner@example.test'})
    if '/auth/v1/logout' in url:return reply(None,204)
    if '/ldj_access?' in url:return reply([] if deny else [{'user_id':UID}])
    if '/ldj_workspaces?' in url:return reply([row] if row else [])
    if '/rpc/ldj_save_workspace' in url:
        if deny:return reply({'code':'42501','message':'denied'},403)
        if row and row['last_mutation_id']==body['p_mutation_id']:return reply(row)
        if (row['version'] if row else 0)!=body['p_expected_version']:return reply({'code':'40001','message':'conflict'},409)
        writes+=1;row={'payload':body['p_payload'],'version':body['p_expected_version']+1,'last_mutation_id':body['p_mutation_id'],'updated_at':'2026-10-10T06:00:00Z'}
        return reply(row)
    return reply({'message':'unexpected route '+url},404)
def prep(c):
    c.on('page',lambda p:p.on('pageerror',lambda e:errors.append(str(e))))
def mount(page,configured=True):
    # Render a local copy at about:blank. The environment blocks ALL navigation;
    # we do not change browser policies or contact a real external service.
    html=ROOT.joinpath('index.html').read_text()
    html=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>','',html)
    html=re.sub(r'<script[^>]*src=[^>]*></script>','',html)
    html=re.sub(r'<link[^>]*>','',html)
    page.set_content(html)
    for name in ['styles.css','cloud.css']:page.add_style_tag(content=ROOT.joinpath('assets',name).read_text())
    page.expose_function('local_mock_api',api)
    page.evaluate(r"""
      class MemStorage {
        get length(){return Object.keys(this).length;}
        key(i){return Object.keys(this)[i]||null;}
        getItem(k){return Object.hasOwn(this,k)?this[k]:null;}
        setItem(k,v){this[k]=String(v);}
        removeItem(k){delete this[k];}
      }
      Object.defineProperty(window,'localStorage',{value:new MemStorage(),configurable:true});
      Object.defineProperty(window,'sessionStorage',{value:new MemStorage(),configurable:true});
      window.fetch=async (u,o={})=>{let r=await window.local_mock_api(String(u),{method:o.method,headers:o.headers,body:o.body});if(r.network_error)throw new TypeError('mock offline');return new Response(r.data===null?null:JSON.stringify(r.data),{status:r.status,headers:{'Content-Type':'application/json'}});};
      let originalURL=URL.createObjectURL.bind(URL);
      URL.createObjectURL=function(blob){window.lastExportBlob=blob;return originalURL(blob);};
      const originalClick=HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click=function(){if(this.download){window.lastDownloadName=this.download;return;}return originalClick.call(this);};
      window.showSaveFilePicker=undefined;
    """)
    page.add_script_tag(content=CONFIG if configured else ROOT.joinpath('config.js').read_text())
    for name in ['empty-state.js','supabase-rest.js','cloud-sync.js','app.js']:page.add_script_tag(content=ROOT.joinpath('assets',name).read_text())
def login(page,password='test-only-password'):
    mount(page);page.locator('#auth-form').wait_for(state='visible');page.locator('#login-email').fill('owner@example.test');page.locator('#login-password').fill(password);page.locator('#login-button').click()
def synced(page):page.wait_for_function("document.querySelector('#cloud-state-text').textContent.includes('已同步到云端')")
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    raw=browser.new_context(viewport={'width':1440,'height':1000});r=raw.new_page();mount(r,False);r.locator('#auth-setup').wait_for(state='visible')
    check('unconfigured shows setup, no fabricated data',r.locator('body').evaluate("e=>e.classList.contains('locked')"));r.screenshot(path=str(OUT/'setup-desktop.png'),full_page=True);raw.close()
    ca=browser.new_context(viewport={'width':1440,'height':1080},accept_downloads=True);prep(ca);a=ca.new_page();login(a,'bad-password');a.locator('#auth-message').wait_for(state='visible')
    check('wrong login stays locked',a.locator('body').evaluate("e=>e.classList.contains('locked')"));a.locator('#login-password').fill('test-only-password');a.locator('#login-button').click();a.locator('.hero').wait_for()
    check('empty first login does not write seeds',writes==0 and a.evaluate('LiangDiJia.state().products.length')==0)
    a.locator('[data-action="new"]').first.click();a.locator('#edit-name').fill('临时测试商品');a.locator('#edit-wish').check();a.get_by_role('button',name='保存商品',exact=True).click();synced(a)
    check('new product auto saves',row['payload']['products'][0]['name']=='临时测试商品')
    a.locator('#import-file').set_input_files(str(ROOT/'tests'/'legacy-fixture.json'));a.locator('#confirm-yes').click();synced(a);a.wait_for_function('LiangDiJia.state().products.length===6')
    check('v0.1 import syncs six products',len(row['payload']['products'])==6)
    a.locator('[data-action="brand"][data-brand="DECATHLON"]').click();check('Decathlon filter',a.locator('#result-count').inner_text().startswith('2'));a.locator('[data-action="brand"][data-brand="all"]').click()
    a.locator('[data-action="wish"]').first.click();synced(a);check('wishlist sync',row['payload']['products'][0]['favorite'] is True)
    a.locator('[data-action="trip-toggle"]').first.click();synced(a);check('Hong Kong list sync',row['payload']['products'][0]['trip'] is True)
    cb=browser.new_context(viewport={'width':1440,'height':1080},accept_downloads=True);prep(cb);b=cb.new_page();login(b);b.locator('.hero').wait_for()
    check('second browser reads same wishlist and trip',b.evaluate('LiangDiJia.state().products[0].favorite&&LiangDiJia.state().products[0].trip'))
    check('old snapshots do not produce confident comparison',a.evaluate('LiangDiJia.state().products.every(p=>!LiangDiJia.compare(p).ready)'))
    a.screenshot(path=str(OUT/'cloud-desktop.png'),full_page=True)
    offline=True;a.locator('[data-action="wish"]').nth(1).click();a.wait_for_function("document.querySelector('#cloud-state-text').textContent.includes('保存失败')")
    check('offline draft retained',a.evaluate("Object.keys(localStorage).some(k=>k.includes(':draft:')&&JSON.parse(localStorage[k]).dirty)"))
    offline=False;a.locator('[data-action="cloud-sync"]').first.click();synced(a);check('retry saves draft',row['payload']['products'][1]['favorite'] is True)
    b.locator('[data-action="wish"]').nth(2).click();b.wait_for_function("document.querySelector('#cloud-state-text').textContent.includes('版本冲突')")
    check('stale device cannot overwrite remote',row['payload']['products'][2]['favorite'] is False)
    b.evaluate('window.showSaveFilePicker=undefined');b.locator('[data-action="cloud-reload"]').first.click();b.locator('#confirm-yes').click();b.locator('#confirm-yes').click();synced(b)
    check('explicit backup then reload resolves conflict',b.evaluate('LiangDiJia.state().products[1].favorite') is True)
    a.locator('[data-action="nav"][data-view="settings"]').first.click();a.evaluate('window.showSaveFilePicker=undefined')
    a.locator('[data-action="icloud-backup"]').click();a.wait_for_function('!!window.lastExportBlob');text=a.evaluate('window.lastExportBlob.text()');data=json.loads(text)
    check('export compatible with v0.1 and excludes credentials',data['schemaVersion']==1 and 'TEST_ACCESS' not in text and 'refresh_token' not in text)
    a.locator('[data-action="nav"][data-view="sources"]').first.click();check('auto extraction clearly marked unavailable','没有部署自动抓价后端' in a.locator('#main').inner_text())
    cm=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True);prep(cm);m=cm.new_page();login(m);m.locator('.hero').wait_for()
    check('390px mobile no horizontal overflow',m.evaluate('document.documentElement.scrollWidth<=innerWidth+1'));m.screenshot(path=str(OUT/'cloud-mobile.png'),full_page=True)
    m.locator('[data-action="new"]').first.click();m.locator('#edit-name').fill('手机测试');check('mobile editor fits screen',m.locator('#editor').evaluate('e=>e.getBoundingClientRect().width<=innerWidth'));m.screenshot(path=str(OUT/'mobile-editor.png'),full_page=True);m.locator('[data-action="close-editor"]').first.click()
    a.locator('[data-action="nav"][data-view="settings"]').first.click();a.locator('[data-action="logout"]').click();a.locator('#confirm-yes').click();a.locator('#auth-form').wait_for(state='visible')
    check('logout removes private UI',a.evaluate('LiangDiJia.state()===null') and a.locator('#main').inner_text()=='')
    deny=True;before=writes;cx=browser.new_context();prep(cx);x=cx.new_page();login(x);x.locator('#auth-retry').wait_for(state='visible');check('permission failure never creates empty cloud',writes==before and '尚未授权' in x.locator('#auth-message').inner_text())
    check('no unhandled browser exceptions',not errors);browser.close()
(OUT/'results.json').write_text(json.dumps({'checks':checks,'page_errors':errors,'scope':'about:blank DOM rendering with simulated storage/REST/download capture; NOT real network, native downloads, or live Supabase'},ensure_ascii=False,indent=2))
print(json.dumps({'passed':len(checks),'checks':checks,'errors':errors},ensure_ascii=False,indent=2))
