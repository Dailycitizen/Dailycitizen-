import { getStore } from '@netlify/blobs';
import { json } from './_shared.mjs';
export default async request => {
  if(request.method!=='GET')return json({success:false,message:'Method not allowed'},405,{allow:'GET'});
  try {
    const store=getStore('daily-citizen-analytics'), now=Date.now(), today=new Date().toISOString().slice(0,10), month=today.slice(0,7);
    const [visitors,sessions]=await Promise.all([store.list({prefix:'visitor:'}),store.list({prefix:'session:'})]);
    const records=await Promise.all(visitors.blobs.map(x=>store.get(x.key,{type:'json'})));
    const active=await Promise.all(sessions.blobs.map(x=>store.get(x.key,{type:'json'})));
    const live=active.filter(x=>x&&now-(x.last_seen||0)<90000).length;for(const x of sessions.blobs){const rec=await store.get(x.key,{type:'json'});if(rec&&now-(rec.last_seen||0)>86400000)await store.delete(x.key)}
    let totalVisits=0,totalViews=0,visitsToday=0,visitsWeek=0,visitsMonth=0,returning=0; const pages={};
    const weekStart=new Date(now-6*86400000).toISOString().slice(0,10);
    for(const r of records){if(!r)continue;totalVisits+=r.visits||0;totalViews+=r.page_views||0;if((r.visits||0)>1)returning++;for(const [d,n] of Object.entries(r.daily_visits||{})){if(d===today)visitsToday+=n;if(d>=weekStart)visitsWeek+=n;if(d.startsWith(month))visitsMonth+=n;}for(const [p,n] of Object.entries(r.pages||{}))pages[p]=(pages[p]||0)+n;}
    return json({success:true,total_visits:totalVisits,unique_visitors:records.filter(Boolean).length,returning_visitors:returning,visits_today:visitsToday,visits_week:visitsWeek,visits_month:visitsMonth,page_views:totalViews,online_now:live,top_pages:Object.entries(pages).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([page,views])=>({page,views})),updated_at:new Date(now).toISOString(),mode:'anonymous-live'});
  }catch{return json({success:false,message:'Analytics are not configured or are temporarily unavailable.'},503);}
};
