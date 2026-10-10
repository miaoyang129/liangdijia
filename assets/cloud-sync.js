/* 两地价 v0.2 — independent, versioned sync engine; no third-party dependencies. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LDJSync = factory();
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const copy = x => JSON.parse(JSON.stringify(x));
  const equal = (a,b) => JSON.stringify(a) === JSON.stringify(b);
  class SyncEngine {
    constructor({transport, storage, namespace, tabId, resumeTabId=null, validate, emptyState, onData=()=>{}, onStatus=()=>{}, idFactory=()=>crypto.randomUUID()}) {
      Object.assign(this, {transport, storage, namespace, tabId, resumeTabId, validate, emptyState, onData, onStatus, idFactory});
      this.epoch=0; this.deactivate();
    }
    deactivate() {
      this.epoch++; this.userId=null; this.key=null; this.state=null; this.version=0;
      this.dirty=false; this.conflict=false; this.pending=null; this.ready=false; this.seq=0;
      this.busy=null; this.storageOK=true; this.remoteAt=null; this.status='locked'; this.error='';
    }
    emit(status, error='') {
      this.status=status; this.error=error;
      this.onStatus({status,error,dirty:this.dirty,version:this.version,storageOK:this.storageOK,remoteAt:this.remoteAt,conflict:this.conflict});
    }
    persistCache() {
      if (!this.key || !this.state) return;
      try {
        this.storage.setItem(this.key, JSON.stringify({format:2, owner:this.userId, state:this.state,
          version:this.version, dirty:this.dirty, pending:this.pending, savedAt:new Date().toISOString()}));
        this.storageOK=true;
        // Remove only redundant/synced copies; different unsynced drafts are retained.
        const prefix=this.namespace+':draft:'+this.userId+':',remove=[];
        for(let i=0;i<this.storage.length;i++) {
          const k=this.storage.key(i);if(k===this.key||!k?.startsWith(prefix))continue;
          try {const old=JSON.parse(this.storage.getItem(k));if(old?.owner===this.userId&&(!old.dirty||(!this.dirty&&equal(old.state,this.state))))remove.push(k);}catch{}
        }
        for(const k of remove)this.storage.removeItem(k);
      } catch { this.storageOK=false; }
    }
    readCache(key=this.key) {
      try {
        const c=JSON.parse(this.storage.getItem(key)||'null');
        if (!c || c.format!==2 || c.owner!==this.userId || !Number.isSafeInteger(c.version) || c.version<0) return null;
        this.validate(c.state);
        if (c.pending) { this.validate(c.pending.payload); if(typeof c.pending.id!=='string'||!Number.isSafeInteger(c.pending.baseVersion))return null; }
        return c;
      } catch { return null; }
    }
    getOtherDrafts() {
      const result=[];
      if(!this.userId)return result;
      try {
        const prefix=this.namespace+':draft:'+this.userId+':';
        for(let i=0;i<this.storage.length;i++) {
          const k=this.storage.key(i); if(!k?.startsWith(prefix)||k===this.key)continue;
          try { const d=JSON.parse(this.storage.getItem(k)); if(d?.dirty&&d.owner===this.userId){this.validate(d.state);result.push({key:k,state:copy(d.state),savedAt:d.savedAt});} } catch {}
        }
      } catch {}
      return result.sort((a,b)=>String(b.savedAt).localeCompare(String(a.savedAt)));
    }
    async activate(userId) {
      this.deactivate(); this.userId=userId; this.key=this.namespace+':draft:'+userId+':'+this.tabId;
      const epoch=this.epoch, cached=this.readCache()||(this.resumeTabId?this.readCache(this.namespace+':draft:'+userId+':'+this.resumeTabId):null);
      if(cached) { this.state=copy(cached.state);this.version=cached.version;this.dirty=!!cached.dirty;this.pending=cached.pending||null; this.persistCache(); }
      this.emit('loading');
      try {
        const remote=await this.transport.load(userId);
        if(this.epoch!==epoch)return;
        this.acceptRemote(remote); this.ready=true; this.onData(copy(this.state));
        this.emit(this.conflict?'conflict':this.dirty?'pending':'synced');
      } catch(e) {
        if(this.epoch!==epoch)return;
        this.ready=false; this.emit('load-error',e.message); throw e;
      }
    }
    remoteValues(remote) {
      if(remote===null)return {payload:copy(this.emptyState),version:0,updated_at:null,last_mutation_id:null};
      this.validate(remote.payload);
      if(!Number.isSafeInteger(Number(remote.version))||Number(remote.version)<1)throw new Error('云端版本号格式异常。');
      return {...remote,version:Number(remote.version)};
    }
    acceptRemote(raw) {
      const remote=this.remoteValues(raw);
      if(this.dirty && this.state) {
        if(this.pending && remote.last_mutation_id===this.pending.id) {
          this.version=remote.version;
          this.dirty=!equal(this.state,this.pending.payload);this.pending=null;
        } else if(this.version!==remote.version) {
          this.conflict=true;
        }
      } else {
        this.state=copy(remote.payload);this.version=remote.version;this.pending=null;this.dirty=false;
      }
      this.remoteAt=remote.updated_at;this.persistCache();
    }
    edit(next) {
      if(!this.ready||!this.userId)throw new Error('尚未读入云端资料，不能保存。');
      this.validate(next);
      if(new TextEncoder().encode(JSON.stringify(next)).length>2000000)throw new Error('资料超过 2 MB，请先精简历史记录并备份。');
      this.state=copy(next);this.seq++;this.dirty=true;this.persistCache();
      this.emit(this.conflict?'conflict':'pending');
    }
    async flush() {
      if(this.busy)return this.busy;
      if(!this.ready||!this.dirty||this.conflict)return;
      const epoch=this.epoch,uid=this.userId;
      if(!this.pending) { this.pending={id:this.idFactory(),baseVersion:this.version,payload:copy(this.state)};this.persistCache(); }
      const pending=copy(this.pending);this.emit('saving');
      const task=(async()=>{
        try {
          const raw=await this.transport.save(uid,pending.payload,pending.baseVersion,pending.id);
          if(epoch!==this.epoch)return;
          const remote=this.remoteValues(raw);
          if(remote.last_mutation_id!==pending.id)throw new Error('云端保存回执不匹配，请重试同步。');
          this.version=remote.version;this.remoteAt=remote.updated_at;this.pending=null;
          this.dirty=!equal(this.state,pending.payload);this.persistCache();
          this.emit(this.dirty?'pending':'synced');
        } catch(e) {
          if(epoch!==this.epoch)return;
          if(e.code==='40001'||e.status===409) {this.conflict=true;this.persistCache();this.emit('conflict',e.message);}
          else {this.persistCache();this.emit('save-error',e.message);}
        }
      })();
      this.busy=task;
      try {await task;} finally {if(epoch===this.epoch)this.busy=null;}
      // A newer edit may have been made while the previous request was in flight.
      if(epoch===this.epoch&&this.dirty&&!this.conflict&&this.status==='pending')return this.flush();
    }
    async sync() {
      if(this.busy)await this.busy;
      if(!this.ready)return;
      if(this.dirty)return this.flush();
      const epoch=this.epoch;this.emit('checking');
      const task=(async()=>{
        try {
          const remote=await this.transport.load(this.userId);
          if(epoch!==this.epoch)return;
          // acceptRemote notices edits made DURING this read; it never discards them.
          this.acceptRemote(remote);
          if(!this.dirty&&!this.conflict)this.onData(copy(this.state));
          this.emit(this.conflict?'conflict':this.dirty?'pending':'synced');
        } catch(e) {if(epoch===this.epoch)this.emit('read-error',e.message);}
      })();
      this.busy=task;
      try {await task;} finally {if(epoch===this.epoch)this.busy=null;}
      if(epoch===this.epoch&&this.dirty&&!this.conflict&&this.status==='pending')await this.flush();
    }
    // Caller MUST obtain explicit consent and offer/export the unsynced draft first.
    async discardLocalAndLoad() {
      if(this.busy)await this.busy;
      const epoch=this.epoch; this.emit('checking');
      try {
        const remote=this.remoteValues(await this.transport.load(this.userId));
        if(epoch!==this.epoch)return;
        this.state=copy(remote.payload);this.version=remote.version;this.remoteAt=remote.updated_at;
        this.dirty=false;this.pending=null;this.conflict=false;this.ready=true;this.persistCache();
        this.onData(copy(this.state));this.emit('synced');
      } catch(e) {if(epoch===this.epoch)this.emit(this.conflict?'conflict':'read-error',e.message);throw e;}
    }
    clearOwnCache() {if(this.key)try{this.storage.removeItem(this.key);}catch{}}
  }
  return {SyncEngine};
});
