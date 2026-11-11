import { isAdmin, json, originAllowed } from './_shared.mjs';
const allowed=new Set(['data/categories.json','data/laws.json','data/ads.json','data/lawyers.json','data/artists.json','data/greetings.json','data/campaign-packages.json']);
const repo=()=>process.env.GITHUB_REPOSITORY||''; const token=()=>process.env.GITHUB_TOKEN||''; const branch=()=>process.env.GITHUB_BRANCH||'main';
async function gh(path,options={}){const [owner,name]=repo().split('/');if(!owner||!name||!token())throw new Error('Configure GITHUB_REPOSITORY and GITHUB_TOKEN in Netlify.');return fetch(`https://api.github.com/repos/${owner}/${name}/${path}`,{...options,headers:{'Accept':'application/vnd.github+json','Authorization':`Bearer ${token()}`,'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json',...(options.headers||{})}})}
async function currentFile(path){const ref=await gh(`git/ref/heads/${encodeURIComponent(branch())}`);if(!ref.ok)throw new Error(`Cannot read Git branch (${ref.status}).`);const refData=await ref.json();const commit=await gh(`git/commits/${refData.object.sha}`);if(!commit.ok)throw new Error('Cannot read latest Git commit.');const commitData=await commit.json();const tree=await gh(`git/trees/${commitData.tree.sha}?recursive=1`);if(!tree.ok)throw new Error('Cannot read Git tree.');const treeData=await tree.json();const entry=treeData.tree.find(x=>x.path===path);if(!entry)throw new Error(`File ${path} was not found in the repository.`);const blob=await gh(`git/blobs/${entry.sha}`);if(!blob.ok)throw new Error('Cannot read JSON content blob.');const blobData=await blob.json();return {content:Buffer.from(blobData.content.replace(/\n/g,''),'base64').toString('utf8'),sha:entry.sha,refSha:refData.object.sha,treeSha:commitData.tree.sha};}
export default async request=>{
 if(!isAdmin(request))return json({success:false,message:'Administrator authentication required.'},401);
 const url=new URL(request.url),path=url.searchParams.get('file')||'';if(!allowed.has(path))return json({success:false,message:'This content file is not permitted.'},400);
 if(request.method==='GET')try{const f=await currentFile(path);return json({success:true,file:path,sha:f.sha,content:JSON.parse(f.content)});}catch(e){return json({success:false,message:e.message||'Unable to read content.'},502)}
 if(request.method==='PUT'){
  if(!originAllowed(request))return json({success:false,message:'Origin rejected.'},403);
  try{
   const body=await request.json();if(!body.content||typeof body.content!=='object')return json({success:false,message:'Valid JSON content is required.'},400);
   const serialized=JSON.stringify(body.content,null,2);if(serialized.length>8_000_000)return json({success:false,message:'Content file exceeds the 8 MB admin limit.'},413);
   const current=await currentFile(path);if(body.sha&&body.sha!==current.sha)return json({success:false,message:'This file changed on GitHub since you loaded it. Reload before saving to avoid overwriting newer work.'},409);
   const blobRes=await gh('git/blobs',{method:'POST',body:JSON.stringify({content:serialized,encoding:'utf-8'})});if(!blobRes.ok)throw new Error('GitHub could not create the new content blob.');const blob=await blobRes.json();
   const treeRes=await gh('git/trees',{method:'POST',body:JSON.stringify({base_tree:current.treeSha,tree:[{path,mode:'100644',type:'blob',sha:blob.sha}]})});if(!treeRes.ok)throw new Error('GitHub could not create the updated repository tree.');const tree=await treeRes.json();
   const commitRes=await gh('git/commits',{method:'POST',body:JSON.stringify({message:`Daily Citizen admin: update ${path}`,tree:tree.sha,parents:[current.refSha]})});if(!commitRes.ok)throw new Error('GitHub could not create the content commit.');const commit=await commitRes.json();
   const [owner,name]=repo().split('/');const updateRef=await gh(`git/refs/heads/${encodeURIComponent(branch())}`,{method:'PATCH',body:JSON.stringify({sha:commit.sha,force:false})});if(!updateRef.ok)throw new Error('GitHub could not update the branch. Reload content and retry if another commit was made.');
   return json({success:true,message:'Saved to GitHub. Netlify will deploy the update automatically.',commit:commit.sha});
  }catch(e){return json({success:false,message:e.message||'Unable to save content.'},502)}
 }
 return json({success:false,message:'Method not allowed.'},405,{allow:'GET, PUT'});
};
