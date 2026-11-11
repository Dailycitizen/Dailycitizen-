import { readFile } from 'node:fs/promises';
import { json } from './_shared.mjs';
const categoryMap = { constitutional:'Constitutional Rights', employment:'Employment Law', business:'Business Law', property:'Property & Land Law', family:'Family Law', criminal:'Criminal Law', traffic:'Traffic & Transport Law', consumer:'Consumer Rights', cyber:'Cyber & Digital Law', banking:'Banking & Finance', 'human-rights':'Human Rights', civic:'Civic & Government' };
const norm = v => String(v??'').trim().replace(/\s+/g,' ').toLowerCase();
const slug = v => norm(v).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export default async request => {
  try {
    const url = new URL(request.url), date = url.searchParams.get('date') || new Date().toLocaleDateString('en-CA'), requested = url.searchParams.get('category') || 'all';
    const items = JSON.parse(await readFile(new URL('../../data/laws.json', import.meta.url),'utf8'));
    const all = norm(requested)==='' || norm(requested)==='all';
    const target = all ? null : (categoryMap[norm(requested)] || requested);
    const matches = items.filter(x => x.date===date && (all || [x.category,x.category_name].some(v=>norm(v)===norm(target)||slug(v)===slug(target))));
    if (!matches.length) return json({success:false,message:'No content is available for this date/category yet.',date,requested_category:requested,available_categories:[...new Set(items.filter(x=>x.date===date).map(x=>x.category_name||x.category))]},404);
    const content = matches[0];
    return json({success:true,message:'Daily Citizen content loaded.',date,category:requested,count:matches.length,content,data:content});
  } catch (error) { return json({success:false,message:'Unable to load legal content.'},500); }
};
