(()=>{
'use strict';
window.MatteoOSActions={
 async execute(sb,user,workspace,action){
  const operational=['labor_entry','material_request','income_entry','business_expense'];
  if(!operational.includes(String(action?.type||'')))return null;
  const {data:{session}}=await sb.auth.getSession();if(!session?.access_token)throw new Error('session');
  const r=await fetch('/api/execute-action',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({workspace_id:workspace,action})});
  const out=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(out.error||'execute');e.needs_review=!!out.needs_review;throw e}return out;
 }
};
})();
