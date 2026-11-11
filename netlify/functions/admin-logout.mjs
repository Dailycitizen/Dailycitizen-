import { json, originAllowed } from './_shared.mjs';
export default async request => {
 if(request.method!=='POST')return json({success:false,message:'Method not allowed'},405,{allow:'POST'});
 if(!originAllowed(request))return json({success:false,message:'Origin rejected.'},403);
 return json({success:true},200,{'set-cookie':'dc_admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'});
};
