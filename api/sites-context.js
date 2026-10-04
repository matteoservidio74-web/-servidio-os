const U='https://rdxaxsosqiudklhvezuq.supabase.co';
const K='sb_publishable_abewBdHybtalh7RsfWbXUA_oOLebqMn';
export default async function handler(req,res){
 if(req.method!=='GET'){res.status(405).end();return}
 const auth=String(req.headers.authorization||'');
 if(!auth.startsWith('Bearer ')){res.status(401).json({error:'session'});return}
 const token=auth.slice(7);
 const ur=await fetch(U+'/auth/v1/user',{headers:{apikey:K,Authorization:auth}});
 if(!ur.ok){res.status(401).json({error:'session'});return}
 const user=await ur.json();
 const mr=await fetch(U+`/rest/v1/workspace_members?select=workspace_id,role&user_id=eq.${user.id}`,{headers:{apikey:K,Authorization:auth}});
 const memberships=await mr.json();
 const ids=(memberships||[]).filter(x=>['owner','admin'].includes(x.role)).map(x=>x.workspace_id);
 if(!ids.length){res.status(200).json({sites:[]});return}
 const sr=await fetch(U+'/rest/v1/sites?select=id,name,client_name,location,status,workspace_id',{headers:{apikey:K,Authorization:auth}});
 const all=await sr.json();
 const sites=(all||[]).filter(x=>ids.includes(x.workspace_id));
 res.setHeader('Cache-Control','no-store');res.status(200).json({sites});
}
