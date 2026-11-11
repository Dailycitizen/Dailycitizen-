import { makeSession, json, originAllowed } from './_shared.mjs';
import { timingSafeEqual, createHmac } from 'node:crypto';
import { getStore } from '@netlify/blobs';
export default async (request, context) => {
  if(request.method!=='POST')return json({success:false,message:'Method not allowed'},405,{allow:'POST'});
  if(!originAllowed(request))return json({success:false,message:'Origin rejected.'},403);
  try{
    const expected=process.env.ADMIN_PASSWORD||'', secret=process.env.ADMIN_SESSION_SECRET||'';
    if(!expected||!secret)return json({success:false,message:'Administrator secrets have not been configured in Netlify.'},503);
    const ip=String(context?.ip||request.headers.get('x-nf-client-connection-ip')||'unknown');
    const key=createHmac('sha256',secret).update(ip).digest('hex');
    const store=getStore('daily-citizen-security'); const rateKey=`login:${key}`; const now=Date.now();
    const rate=await store.get(rateKey,{type:'json'})||{count:0,window_start:now};
    if(now-rate.window_start>15*60*1000){rate.count=0;rate.window_start=now;}
    if(rate.count>=10)return json({success:false,message:'Too many login attempts. Try again in 15 minutes.'},429);
    const {password}=await request.json(); const a=Buffer.from(String(password||'')),b=Buffer.from(expected);
    if(a.length!==b.length||!timingSafeEqual(a,b)){rate.count++;await store.setJSON(rateKey,rate);return json({success:false,message:'Incorrect administrator password.'},401);}
    await store.delete(rateKey);
    const token=makeSession();
    return json({success:true},200,{'set-cookie':`dc_admin=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`});
  }catch{return json({success:false,message:'Login could not be completed. Confirm Netlify Blobs and administrator settings.'},503)}
};
