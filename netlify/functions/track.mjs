import { getStore } from '@netlify/blobs';
import { json, originAllowed } from './_shared.mjs';
const ID=/^[a-zA-Z0-9_-]{12,100}$/;
export default async request => {
  if(request.method!=='POST') return json({success:false,message:'Method not allowed'},405,{allow:'POST'});
  if(!originAllowed(request)) return json({success:false,message:'Origin rejected.'},403);
  if(Number(request.headers.get('content-length')||0)>4096) return json({success:false,message:'Request too large.'},413);
  try {
    const body=await request.json();
    const visitor=String(body.visitor_id||''), session=String(body.session_id||'');
    if(!ID.test(visitor)||!ID.test(session)) return json({success:false,message:'Invalid anonymous identifiers.'},400);
    const page=String(body.page||'/').slice(0,180).replace(/[?#].*$/,'');
    const event=['visit','pageview','heartbeat'].includes(body.event)?body.event:'pageview';
    const store=getStore('daily-citizen-analytics'); const now=Date.now(); const day=new Date(now).toISOString().slice(0,10);
    const key=`visitor:${visitor}`; const old=await store.get(key,{type:'json'})||{first_seen:now,last_seen:now,visits:0,page_views:0,visit_dates:[],pages:{}};
    old.last_seen=now; old.page_views=(old.page_views||0)+(event==='pageview'?1:0); old.pages=old.pages||{}; if(event==='pageview')old.pages[page]=(old.pages[page]||0)+1;
    if(event==='visit'){old.visits=(old.visits||0)+1;old.visit_dates=[...(old.visit_dates||[]).filter(d=>d!==day),day].slice(-400);old.daily_visits=old.daily_visits||{};old.daily_visits[day]=(old.daily_visits[day]||0)+1;for(const d of Object.keys(old.daily_visits))if(d<new Date(now-400*86400000).toISOString().slice(0,10))delete old.daily_visits[d];old.last_visit=day;}
    await store.setJSON(key,old);
    await store.setJSON(`session:${visitor}:${session}`,{visitor_id:visitor,last_seen:now,page});
    return json({success:true});
  } catch { return json({success:false,message:'Analytics temporarily unavailable.'},503); }
};
