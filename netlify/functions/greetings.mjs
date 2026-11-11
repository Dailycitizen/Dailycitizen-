import { readFile } from 'node:fs/promises';
import { json } from './_shared.mjs';
export default async () => {
  try { const data=JSON.parse(await readFile(new URL('../../data/greetings.json',import.meta.url),'utf8')); const valid=data.filter(x=>x.verified===true); if(!valid.length)return json({success:false,message:'No verified greeting available.'},503); return json({success:true,greeting:valid[Math.floor(Math.random()*valid.length)]}); }
  catch { return json({success:false,message:'Unable to load greetings.'},500); }
};
