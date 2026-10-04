(()=>{
'use strict';
if(window.__MATTEO_OS_CORE__) return;
window.__MATTEO_OS_CORE__=true;

const SB_URL='https://rdxaxsosqiudklhvezuq.supabase.co';
const SB_KEY='sb_publishable_abewBdHybtalh7RsfWbXUA_oOLebqMn';
const sb=window.supabase?.createClient?.(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
if(!sb) return;

const S={user:null,workspace:null,sites:[],memberships:[],data:null,dataAt:0,refreshing:null,busy:false,recognition:null,tab:'today'};
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const money=n=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(Number(n||0));
const romeDay=(d=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
const timeOf=v=>{if(!v)return'';try{return new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',hour:'2-digit',minute:'2-digit'}).format(new Date(v))}catch{return''}};
const dayOf=v=>v?String(v).slice(0,10):null;
const fmtDate=v=>{if(!v)return'';try{return new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(v))}catch{return String(v)}};
const stageLabel=s=>({completed:'Finito',in_progress:'In corso',not_started:'Da iniziare'}[s]||'');
const dueLabel=s=>({ora:'Da prendere ora',fine_lavori:'A fine lavori',prima_inizio:'Prima di iniziare'}[s]||String(s||''));

function toast(text){let el=$('#mos-toast');if(!el){el=document.createElement('div');el.id='mos-toast';el.className='mos-toast';document.body.appendChild(el)}el.textContent=text;el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),2200)}
function siteByName(name){if(!name)return null;const q=norm(name);let best=null,score=0;for(const s of S.sites){for(const label of [s.name,s.client_name,s.location]){const n=norm(label);if(!n)continue;let sc=0;if(n===q)sc=100;else if(n.includes(q)||q.includes(n))sc=80;else sc=q.split(' ').filter(w=>w.length>2&&n.includes(w)).length*18;if(sc>score){score=sc;best=s}}}return score>=30?best:null}
function siteName(id){const s=S.sites.find(x=>x.id===id);return s?.client_name||s?.name||''}
function chooseWorkspace(){const allowed=new Set(S.memberships.filter(x=>['owner','admin'].includes(x.role)).map(x=>x.workspace_id));const counts={};for(const site of S.sites){if(allowed.has(site.workspace_id))counts[site.workspace_id]=(counts[site.workspace_id]||0)+1}let best=null,bestCount=-1;for(const id of allowed){const c=counts[id]||0;if(c>bestCount){best=id;bestCount=c}}S.workspace=best||[...allowed][0]||null}

async function loadIdentity(){
  const {data:{session}}=await sb.auth.getSession();
  if(!session?.user)return false;
  S.user=session.user;
  const {data:m}=await sb.from('workspace_members').select('workspace_id,role').eq('user_id',S.user.id);
  S.memberships=m||[];
  try{const r=await fetch('/api/sites-context',{headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store'});if(r.ok){const j=await r.json();S.sites=Array.isArray(j.sites)?j.sites:[]}}catch{}
  if(!S.sites.length){const {data}=await sb.from('sites').select('id,name,client_name,location,status,workspace_id');S.sites=data||[]}
  chooseWorkspace();
  return !!S.workspace;
}

async function refreshData(force=false){
  if(!S.user)return null;
  if(S.refreshing)return S.refreshing;
  if(!force&&S.data&&Date.now()-S.dataAt<45000)return S.data;
  S.refreshing=(async()=>{
    const ids=[...new Set(S.sites.map(x=>x.workspace_id).filter(Boolean))],uid=S.user.id,empty={data:[]};
    const [p,m,sch,inv,ddl]=await Promise.all([
      sb.from('personal_items').select('id,item_type,title,details,status,priority,due_at,remind_at,category,site_id,workspace_id,amount,contact_name,metadata,created_at').eq('user_id',uid).neq('status','done').neq('status','cancelled').order('created_at',{ascending:false}).limit(400),
      ids.length?sb.from('material_requests').select('id,item,quantity,unit,note,status,priority,site_id,workspace_id,created_at').in('workspace_id',ids).eq('status','requested').order('created_at',{ascending:false}).limit(180):Promise.resolve(empty),
      ids.length?sb.from('company_schedule').select('id,schedule_date,scheduled_at,title,notes,status,site_id,workspace_id,created_at').in('workspace_id',ids).neq('status','cancelled').order('schedule_date',{ascending:true}).limit(220):Promise.resolve(empty),
      ids.length?sb.from('invoices').select('id,workspace_id,site_id,customer_name,number,issue_date,amount,collected_amount,status,notes').in('workspace_id',ids).order('issue_date',{ascending:false}).limit(180):Promise.resolve(empty),
      ids.length?sb.from('deadlines').select('id,workspace_id,category,title,due_date,amount_due,amount_paid,status,priority,notes').in('workspace_id',ids).neq('status','done').limit(120):Promise.resolve(empty)
    ]);
    S.data={items:p.data||[],materials:m.data||[],schedule:sch.data||[],invoices:(inv.data||[]).filter(x=>Number(x.amount||0)-Number(x.collected_amount||0)>0.009),deadlines:ddl.data||[]};
    S.dataAt=Date.now();return S.data;
  })().finally(()=>{S.refreshing=null});
  return S.refreshing;
}

function contextFromData(d){return{
  sites:S.sites.map(s=>({id:s.id,name:s.name,client:s.client_name,location:s.location,workspace_id:s.workspace_id,status:s.status})),
  personal_items:(d?.items||[]).slice(0,120).map(x=>({id:x.id,type:x.item_type,title:x.title,details:x.details,due_at:x.due_at,remind_at:x.remind_at,amount:x.amount,category:x.category,contact_name:x.contact_name,site_id:x.site_id,status:x.status,metadata:x.metadata})),
  company_schedule:(d?.schedule||[]).slice(0,100),deadlines:(d?.deadlines||[]).slice(0,80),materials:(d?.materials||[]).slice(0,80),
  open_invoices:(d?.invoices||[]).slice(0,80).map(x=>({...x,remaining:Number(x.amount||0)-Number(x.collected_amount||0)}))
}}
function isQuestion(text){const q=norm(text);return /^(quanto|quanti|quante|quale|quali|cosa|che cosa|come|dove|quando|chi)\b/.test(q)||/^(dimmi|mostrami|fammi vedere)\b/.test(q)||/\b(cosa devo|che devo|quanto devo|quali lavori|che lavori|che sopralluoghi|cosa ho)\b/.test(q)}
async function callAI(input,mode){const {data:{session}}=await sb.auth.getSession();if(!session?.access_token)throw new Error('session');const d=await refreshData(false);const r=await fetch('/api/assistant',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({input,mode,now:new Date().toISOString(),context:contextFromData(d)})});if(!r.ok)throw new Error('assistant');return r.json()}
async function serverAction(a){const {data:{session}}=await sb.auth.getSession();const r=await fetch('/api/execute-action',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({workspace_id:S.workspace,action:a})});const out=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(out.error||'execute');e.needs_review=!!out.needs_review;throw e}return out}

function normalizeActions(actions){
  const list=[...(actions||[])];
  for(let i=0;i<list.length;i++){
    const a=list[i];if(a?.type!=='carry_item')continue;
    for(let j=list.length-1;j>=0;j--){const r=list[j];if(!r||r.type!=='reminder')continue;const sameSite=norm(r.site_name)===norm(a.site_name);const carryDate=dayOf(a.due_at||a.remind_at),remDate=dayOf(r.remind_at||r.due_at);const looksCarry=/portar|material|nastro|carton|scotch|attrezz/i.test(norm(r.title+' '+r.details));if(sameSite&&looksCarry&&(!carryDate||!remDate||carryDate===remDate)){a.remind_at=a.remind_at||r.remind_at||r.due_at;a.due_at=a.due_at||r.due_at||r.remind_at;list.splice(j,1);if(j<i)i--}}
  }
  return list;
}

async function applyAction(a){
  if(['labor_entry','material_request','income_entry','business_expense'].includes(a.type))return serverAction(a);
  const site=siteByName(a.site_name),targetWs=site?.workspace_id||S.workspace;
  if(a.type==='business_schedule'){
    if(!a.due_at)throw new Error('schedule_date');
    const {data,error}=await sb.from('company_schedule').insert({workspace_id:targetWs,schedule_date:String(a.due_at).slice(0,10),scheduled_at:a.due_at,site_id:site?.id||null,title:a.title||'Lavoro',notes:a.details||null,status:'planned',created_by:S.user.id}).select('id').single();if(error)throw error;return{table:'company_schedule',id:data.id};
  }
  if(a.type==='memory'){
    const {data,error}=await sb.from('memory_entries').insert({user_id:S.user.id,workspace_id:targetWs,kind:a.memory_kind||'note',subject:a.title||null,content:a.details||a.title||'',tags:[a.category,a.site_name].filter(Boolean),importance:2,event_at:a.due_at||new Date().toISOString(),metadata:{source:'matteo_os'}}).select('id').single();if(error)throw error;return{table:'memory_entries',id:data.id};
  }
  const {data,error}=await sb.from('personal_items').insert({user_id:S.user.id,workspace_id:targetWs,site_id:site?.id||null,item_type:a.type||'task',scope:a.scope==='personal'?'personal':'business',title:a.title||a.details||'Voce',details:a.details||null,status:'open',priority:a.priority||'normal',due_at:a.due_at||null,remind_at:a.remind_at||null,amount:Number(a.amount||0)||null,category:a.category||null,contact_name:a.contact_name||null,metadata:{source:'matteo_os',site_name:a.site_name||null,paid:a.paid??null,email_to:a.email_to||null,email_subject:a.email_subject||null,email_body:a.email_body||null}}).select('id').single();if(error)throw error;return{table:'personal_items',id:data.id};
}

async function undoLastSafe(){const {data:links}=await sb.from('assistant_action_links').select('entity_table,entity_id,created_at').eq('user_id',S.user.id).order('created_at',{ascending:false}).limit(20);for(const l of links||[]){if(l.entity_table==='personal_items'){const {data}=await sb.from('personal_items').select('status').eq('id',l.entity_id).maybeSingle();if(data&&data.status!=='cancelled'&&data.status!=='done'){await sb.from('personal_items').update({status:'cancelled'}).eq('id',l.entity_id);return true}}if(l.entity_table==='company_schedule'){const {data}=await sb.from('company_schedule').select('status').eq('id',l.entity_id).maybeSingle();if(data&&data.status!=='cancelled'){await sb.from('company_schedule').update({status:'cancelled'}).eq('id',l.entity_id);return true}}if(l.entity_table==='material_requests'){const {data}=await sb.from('material_requests').select('status').eq('id',l.entity_id).maybeSingle();if(data&&data.status==='requested'){await sb.from('material_requests').update({status:'cancelled'}).eq('id',l.entity_id);return true}}}return false}

async function processInput(text){
  const mode=isQuestion(text)?'ask':'capture',result=await callAI(text,mode);
  if(mode==='ask')return{...result,executed:[]};
  let review=!!result.needs_review;const refs=[];
  if(result.command==='delete_last'||result.command==='replace_last'){const ok=await undoLastSafe();if(!ok)review=true}
  for(const a of normalizeActions(result.actions)){
    if(Number(a.confidence??1)<0.6){review=true;continue}
    try{const ref=await applyAction(a);if(ref?.id)refs.push(ref)}catch(e){console.warn('Matteo OS action failed',a?.type,e);review=true}
  }
  const {data:inbox,error}=await sb.from('assistant_inbox').insert({user_id:S.user.id,workspace_id:S.workspace,source:'voice',raw_text:text,interpreted:{...result,executed:refs.map(x=>x.table)},status:review?'needs_review':'processed'}).select('id').single();
  if(!error&&inbox?.id&&refs.length){await sb.from('assistant_action_links').insert(refs.map(r=>({inbox_id:inbox.id,user_id:S.user.id,workspace_id:S.workspace,entity_table:r.table,entity_id:r.id})))}
  S.dataAt=0;await refreshData(true);return{...result,needs_review:review,executed:refs.map(x=>x.table)};
}

function actionMenu(table,id,editable=true){if(!id||!table)return'';return `<button class="mos-more" data-op="toggle" aria-label="Azioni">•••</button><div class="mos-menu"><button data-op="edit" data-table="${table}" data-id="${id}" ${editable?'':'disabled'}>Modifica</button>${table==='personal_items'?`<button data-op="done" data-table="${table}" data-id="${id}">Segna fatto</button>`:''}<button class="danger" data-op="delete" data-table="${table}" data-id="${id}">Elimina</button></div>`}
function card(title,sub='',badge='',amount='',ref=null){return `<div class="mos-card">${ref?actionMenu(ref.table,ref.id,ref.editable!==false):''}<div class="mos-card-title">${esc(title)}</div>${badge?`<span class="mos-badge">${esc(badge)}</span>`:''}${amount?`<div class="mos-money">${esc(amount)}</div>`:''}${sub?`<div class="mos-card-sub">${esc(sub)}</div>`:''}</div>`}
function section(title,html){return `<div class="mos-section"><div class="mos-section-title">${esc(title)}</div>${html||'<div class="mos-empty">Niente da mostrare.</div>'}</div>`}
function empty(t){return `<div class="mos-empty">${esc(t)}</div>`}

function renderToday(d){
  const key=romeDay(),rows=[];
  for(const x of d.schedule.filter(x=>x.schedule_date===key))rows.push({t:x.scheduled_at||key,html:card(x.title,[timeOf(x.scheduled_at),siteName(x.site_id),x.notes].filter(Boolean).join(' · '),'Programma','',{table:'company_schedule',id:x.id})});
  for(const x of d.items.filter(x=>x.item_type!=='job_finance'&&(dayOf(x.due_at)===key||dayOf(x.remind_at)===key))){const badge=x.item_type==='carry_item'?'Da portare':x.item_type==='reminder'?'Promemoria':x.item_type==='inspection'?'Sopralluogo':x.item_type==='open_job'?'Lavoro aperto':'Attività';rows.push({t:x.due_at||x.remind_at,html:card(x.title,[timeOf(x.due_at||x.remind_at),siteName(x.site_id),x.contact_name,x.details].filter(Boolean).join(' · '),badge,'',{table:'personal_items',id:x.id})})}
  rows.sort((a,b)=>String(a.t||'').localeCompare(String(b.t||'')));return rows.length?rows.map(x=>x.html).join(''):empty('Oggi non hai nulla di programmato qui.');
}
function weekStart(){const p=romeDay().split('-').map(Number),d=new Date(Date.UTC(p[0],p[1]-1,p[2],12)),wd=d.getUTCDay()||7;if(wd===7)d.setUTCDate(d.getUTCDate()+1);else d.setUTCDate(d.getUTCDate()-wd+1);return d}
function renderWeek(d){const names=['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato','Domenica'],start=weekStart();let out='';for(let i=0;i<7;i++){const day=new Date(start);day.setUTCDate(start.getUTCDate()+i);const key=`${day.getUTCFullYear()}-${String(day.getUTCMonth()+1).padStart(2,'0')}-${String(day.getUTCDate()).padStart(2,'0')}`,rows=[];for(const x of d.schedule.filter(x=>x.schedule_date===key))rows.push(card(x.title,[timeOf(x.scheduled_at),siteName(x.site_id)].filter(Boolean).join(' · '),'Programma','',{table:'company_schedule',id:x.id}));for(const x of d.items.filter(x=>x.item_type!=='job_finance'&&(dayOf(x.due_at)===key||dayOf(x.remind_at)===key)))rows.push(card(x.title,[timeOf(x.due_at||x.remind_at),siteName(x.site_id),x.contact_name].filter(Boolean).join(' · '),x.item_type==='carry_item'?'Da portare':x.item_type==='reminder'?'Promemoria':'Attività','',{table:'personal_items',id:x.id}));out+=section(`${names[i]} ${String(day.getUTCDate()).padStart(2,'0')}/${String(day.getUTCMonth()+1).padStart(2,'0')}`,rows.join('')||empty('Libero'))}return out}
function renderJobs(d){const open=d.items.filter(x=>x.item_type==='open_job').map(x=>card(x.title,[siteName(x.site_id),x.contact_name,x.details].filter(Boolean).join(' · '),'Da completare','',{table:'personal_items',id:x.id})).join('');const planning=d.items.filter(x=>x.item_type==='planning_item').map(x=>card(x.title,[siteName(x.site_id),x.contact_name,x.details].filter(Boolean).join(' · '),'Da organizzare','',{table:'personal_items',id:x.id})).join('');const inspections=d.items.filter(x=>x.item_type==='inspection').map(x=>card(x.title,[x.due_at?`${fmtDate(x.due_at)} ${timeOf(x.due_at)}`:'Da fissare',siteName(x.site_id),x.contact_name,x.details].filter(Boolean).join(' · '),'Sopralluogo','',{table:'personal_items',id:x.id})).join('');const tasks=d.items.filter(x=>['task','event'].includes(x.item_type)).map(x=>card(x.title,[dayOf(x.due_at)||'',siteName(x.site_id),x.contact_name,x.details].filter(Boolean).join(' · '),x.category==='telefonata'?'Telefonata':'Attività','',{table:'personal_items',id:x.id})).join('');return section('Lavori aperti',open||empty('Nessun lavoro aperto.'))+section('Da organizzare',planning||empty('Nessun lavoro da organizzare.'))+section('Sopralluoghi',inspections||empty('Nessun sopralluogo.'))+section('Attività',tasks||empty('Nessuna attività.'))}
function renderMaterials(d){const carry=d.items.filter(x=>x.item_type==='carry_item').map(x=>card(x.title,[siteName(x.site_id),x.due_at?`per ${fmtDate(x.due_at)} ${timeOf(x.due_at)}`:'',x.details].filter(Boolean).join(' · '),x.remind_at?'Da portare · 🔔':'Da portare','',{table:'personal_items',id:x.id})).join('');const buy=d.materials.map(x=>card(x.item,[x.quantity?`${x.quantity}${x.unit?' '+x.unit:''}`:'',siteName(x.site_id),x.note].filter(Boolean).join(' · '),'Da comprare','',{table:'material_requests',id:x.id})).join('');return section('Da portare',carry||empty('Niente da portare.'))+section('Da comprare',buy||empty('Niente da comprare.'))}
function renderReminders(d){const rows=d.items.filter(x=>x.item_type==='reminder'||(x.item_type==='carry_item'&&x.remind_at));return rows.length?rows.map(x=>card(x.title,[x.remind_at?`${fmtDate(x.remind_at)} ${timeOf(x.remind_at)}`:'',siteName(x.site_id),x.details].filter(Boolean).join(' · '),x.item_type==='carry_item'?'Da portare · 🔔':'Promemoria','',{table:'personal_items',id:x.id})).join(''):empty('Nessun promemoria aperto.')}

function renderMoney(d){
  const invoices=d.invoices.map(x=>({kind:'invoice',id:x.id,title:x.customer_name||siteName(x.site_id)||`Fattura ${x.number}`,sub:[x.number?`Fattura ${x.number}`:'',siteName(x.site_id),x.notes].filter(Boolean).join(' · '),amount:Number(x.amount||0)-Number(x.collected_amount||0)}));
  const now=d.items.filter(x=>x.item_type==='receivable'&&x.metadata?.due_state==='now').map(x=>({kind:'item',id:x.id,title:x.title,sub:[siteName(x.site_id),x.contact_name,x.details].filter(Boolean).join(' · '),amount:Number(x.amount||0)}));
  const planned=d.items.filter(x=>x.item_type==='receivable'&&x.metadata?.due_state!=='now').map(x=>({kind:'item',id:x.id,title:x.title,sub:[dueLabel(x.metadata?.due_when),siteName(x.site_id),x.contact_name,x.details].filter(Boolean).join(' · '),amount:Number(x.amount||0)}));
  const plans=d.items.filter(x=>x.item_type==='job_finance');
  const dueNow=[...invoices,...now],sumNow=dueNow.reduce((s,x)=>s+x.amount,0),sumPlanned=planned.reduce((s,x)=>s+x.amount,0),trackedReceived=plans.reduce((s,x)=>s+Number(x.metadata?.received||0),0);
  let html=`<div class="mos-money-grid"><div class="mos-stat"><span>Da incassare ora</span><b>${money(sumNow)}</b></div><div class="mos-stat"><span>Previsti</span><b>${money(sumPlanned)}</b></div><div class="mos-stat"><span>Già incassati*</span><b>${money(trackedReceived)}</b></div></div><div class="mos-footnote">* Solo sui lavori con piano economico tracciato in Matteo OS.</div>`;
  html+=section('Da incassare ora',dueNow.length?dueNow.map(x=>card(x.title,x.sub,x.kind==='invoice'?'Fattura aperta':'Da incassare',money(x.amount),x.kind==='item'?{table:'personal_items',id:x.id}:null)).join(''):empty('Niente da incassare immediatamente.'));
  html+=section('Previsti / prossimi',planned.length?planned.map(x=>card(x.title,x.sub,'Previsto',x.amount?money(x.amount):'Importo da definire',{table:'personal_items',id:x.id})).join(''):empty('Nessun incasso futuro registrato.'));
  html+=section('Situazione lavori',plans.length?plans.map(x=>{const m=x.metadata||{};const sub=[stageLabel(m.job_stage),`Totale ${money(m.total_value||0)}`,`Incassato ${money(m.received||0)}`,`Residuo ${money(m.remaining||0)}`,m.next_due?`${dueLabel(m.next_due_when)}: ${money(m.next_due)}`:''].filter(Boolean).join(' · ');return card(x.title,sub,'Piano lavoro','',{table:'personal_items',id:x.id})}).join(''):empty('Nessun piano economico lavoro.'));
  return html;
}

async function renderTab(tab=S.tab){S.tab=tab;const body=$('#mos-body');if(!body)return;body.innerHTML='<div class="mos-empty">Aggiorno…</div>';const d=await refreshData(false),views={today:renderToday,week:renderWeek,jobs:renderJobs,materials:renderMaterials,money:renderMoney,reminders:renderReminders};body.innerHTML=(views[tab]||renderToday)(d||{items:[],materials:[],schedule:[],invoices:[],deadlines:[]});document.querySelectorAll('.mos-nav button').forEach(b=>b.classList.toggle('on',b.dataset.tab===tab))}

async function updateRecord(table,id,op){
  if(table==='personal_items'){
    if(op==='done'){await sb.from('personal_items').update({status:'done',completed_at:new Date().toISOString()}).eq('id',id);return}
    if(op==='delete'){await sb.from('personal_items').update({status:'cancelled'}).eq('id',id);return}
    if(op==='edit'){const row=S.data?.items.find(x=>x.id===id);if(!row)return;const title=prompt('Titolo',row.title||'');if(title===null)return;const details=prompt('Dettagli',row.details||'');if(details===null)return;const patch={title:title.trim()||row.title,details};if(['receivable','job_finance'].includes(row.item_type)){const raw=prompt('Importo (€)',row.amount??'');if(raw!==null&&raw.trim()!==''){const n=Number(raw.replace(',','.'));if(Number.isFinite(n))patch.amount=n}}await sb.from('personal_items').update(patch).eq('id',id);return}
  }
  if(table==='material_requests'){
    if(op==='delete'){await sb.from('material_requests').update({status:'cancelled'}).eq('id',id);return}
    if(op==='edit'){const row=S.data?.materials.find(x=>x.id===id);if(!row)return;const item=prompt('Materiale',row.item||'');if(item===null)return;const note=prompt('Note',row.note||'');if(note===null)return;await sb.from('material_requests').update({item:item.trim()||row.item,note}).eq('id',id);return}
  }
  if(table==='company_schedule'){
    if(op==='delete'){await sb.from('company_schedule').update({status:'cancelled'}).eq('id',id);return}
    if(op==='edit'){const row=S.data?.schedule.find(x=>x.id===id);if(!row)return;const title=prompt('Titolo',row.title||'');if(title===null)return;const date=prompt('Data (AAAA-MM-GG)',row.schedule_date||'');if(date===null)return;await sb.from('company_schedule').update({title:title.trim()||row.title,schedule_date:date.trim()||row.schedule_date}).eq('id',id);return}
  }
}
async function handleBodyClick(e){const b=e.target.closest('button[data-op]');if(!b)return;e.stopPropagation();const cardEl=b.closest('.mos-card');if(b.dataset.op==='toggle'){document.querySelectorAll('.mos-card.menu-open').forEach(x=>{if(x!==cardEl)x.classList.remove('menu-open')});cardEl?.classList.toggle('menu-open');return}const op=b.dataset.op,table=b.dataset.table,id=b.dataset.id;if(!table||!id)return;if(op==='delete'&&!confirm('Eliminare questa voce?'))return;if(op==='done'&&!confirm('Segnare questa voce come fatta?'))return;try{await updateRecord(table,id,op);S.dataAt=0;await refreshData(true);await renderTab(S.tab);toast(op==='edit'?'✓ Modificato':op==='done'?'✓ Segnato fatto':'✓ Eliminato')}catch(err){console.error(err);toast('Operazione non riuscita')}}

function isSiteDetailPage(){return [...document.querySelectorAll('h1,h2,[role="heading"]')].some(el=>/scheda cantiere/i.test(el.textContent||''))}
function fixHostLayout(){const talk=$('#mos-talk');if(!talk)return;const detail=isSiteDetailPage();talk.classList.toggle('site-detail',detail);const candidates=[...document.querySelectorAll('nav,footer,div')].filter(el=>{const cs=getComputedStyle(el),r=el.getBoundingClientRect();return cs.position==='fixed'&&r.bottom>=innerHeight-4&&r.height>45&&r.width>innerWidth*.65});const nav=candidates.sort((a,b)=>b.getBoundingClientRect().width-a.getBoundingClientRect().width)[0];if(nav){const h=Math.ceil(nav.getBoundingClientRect().height);document.documentElement.style.setProperty('--mos-host-nav',`${h}px`);const app=$('#app');if(app)app.style.paddingBottom=`${h+28}px`}}

function mount(){
  if($('#mos-talk'))return;
  const style=document.createElement('style');style.id='mos-core-style';style.textContent=`:root{--mos-host-nav:72px}#mos-talk{position:fixed;z-index:9998;right:18px;bottom:calc(var(--mos-host-nav) + 18px + env(safe-area-inset-bottom));width:58px;height:58px;border:0;border-radius:50%;background:#20d77a;color:#04140c;font-size:26px;box-shadow:0 10px 30px #0008;transition:.18s}#mos-talk.site-detail{width:44px;height:44px;font-size:20px;right:12px;bottom:calc(var(--mos-host-nav) + 10px + env(safe-area-inset-bottom));opacity:.82}#mos-chat{display:none;position:fixed;z-index:9999;inset:0;background:#07100c;color:#fff;padding:calc(env(safe-area-inset-top) + 10px) 16px calc(env(safe-area-inset-bottom) + 16px);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif;overflow:auto}.mos-wrap{max-width:720px;margin:auto}.mos-head{display:flex;justify-content:space-between;align-items:center;padding:12px 0 14px}.mos-head h2{margin:0;font-size:24px}.mos-sub{color:#90a69a;font-size:13px;margin-top:3px}.mos-close{width:42px;height:42px;border:0;border-radius:50%;background:#16231d;color:white;font-size:25px}.mos-answer{background:#0d1b14;border:1px solid #1e3c2d;border-radius:18px;padding:15px;line-height:1.45;margin-bottom:12px;min-height:48px}.mos-nav{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-bottom:12px}.mos-nav button{border:1px solid #234232;background:#0d1812;color:#a6b8ae;border-radius:13px;padding:10px 5px;font-size:12px;font-weight:850;min-height:42px}.mos-nav button.on{background:#20d77a;border-color:#20d77a;color:#04140c}.mos-body{background:#08120d;border:1px solid #173427;border-radius:18px;padding:10px;max-height:43vh;overflow:auto;margin-bottom:12px}.mos-section{margin:4px 0 14px}.mos-section:last-child{margin-bottom:2px}.mos-section-title{font-size:13px;font-weight:900;color:#d7e7de;padding:5px 3px}.mos-card{position:relative;background:#0d1b14;border:1px solid #203c2e;border-radius:14px;padding:12px;margin:7px 0}.mos-card-title{font-weight:850;font-size:14px;padding-right:82px}.mos-card-sub{font-size:12px;line-height:1.4;color:#a7b9af;margin-top:5px}.mos-badge{position:absolute;right:36px;top:9px;background:#173326;color:#70e5a6;border-radius:999px;padding:4px 7px;font-size:10px;font-weight:850;max-width:110px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mos-money{font-size:20px;font-weight:900;color:#76e7ab;margin-top:7px}.mos-more{position:absolute;right:7px;top:7px;width:28px;height:28px;border:0;border-radius:8px;background:transparent;color:#9fb0a6;font-weight:900}.mos-menu{display:none;position:absolute;right:8px;top:38px;z-index:3;background:#14231b;border:1px solid #2a4938;border-radius:12px;padding:5px;box-shadow:0 12px 28px #0009}.mos-card.menu-open .mos-menu{display:grid;gap:3px}.mos-menu button{border:0;background:transparent;color:#fff;text-align:left;padding:8px 12px;border-radius:8px;font-size:12px;font-weight:800}.mos-menu button:disabled{opacity:.4}.mos-menu .danger{color:#ff9f9f}.mos-money-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px}.mos-stat{background:#123022;border:1px solid #28533d;border-radius:14px;padding:11px}.mos-stat:last-child{grid-column:1/-1}.mos-stat span{display:block;font-size:11px;color:#afc8ba}.mos-stat b{display:block;font-size:19px;color:#76e7ab;margin-top:3px}.mos-footnote{font-size:10px;color:#6f8679;padding:0 3px 8px}.mos-empty{padding:12px 5px;color:#81968a;font-size:13px}.mos-input{width:100%;box-sizing:border-box;background:#101a15;color:white;border:1px solid #294536;border-radius:16px;padding:13px;font-size:16px;resize:none}.mos-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:9px}.mos-actions button{border:0;border-radius:14px;padding:14px;font-weight:900;font-size:16px}.mos-mic{background:#173326;color:white}.mos-send{background:#20d77a;color:#04140c}.mos-state{padding:8px 2px 0;color:#9db2a7;font-size:12px;min-height:16px}.mos-hint{color:#71877b;font-size:11px;padding-top:2px}.mos-toast{position:fixed;z-index:10000;left:50%;bottom:95px;transform:translate(-50%,10px);opacity:0;pointer-events:none;background:#10251b;color:white;padding:11px 15px;border-radius:14px;font-size:13px;font-weight:800;transition:.18s}.mos-toast.show{opacity:1;transform:translate(-50%,0)}@media(max-width:390px){.mos-nav{grid-template-columns:repeat(2,minmax(0,1fr))}.mos-body{max-height:40vh}}`;document.head.appendChild(style);
  const talk=document.createElement('button');talk.id='mos-talk';talk.setAttribute('aria-label','Parla con Matteo OS');talk.textContent='🎙';talk.onclick=open;document.body.appendChild(talk);
  const chat=document.createElement('div');chat.id='mos-chat';chat.innerHTML=`<div class="mos-wrap"><div class="mos-head"><div><h2>Matteo OS</h2><div class="mos-sub">Parla liberamente. Organizzo e registro io.</div></div><button class="mos-close" aria-label="Chiudi">×</button></div><div id="mos-answer" class="mos-answer">Dimmi quello che hai in testa oppure chiedimi cosa devi fare, organizzare o incassare.</div><div class="mos-nav"><button data-tab="today" class="on">Oggi</button><button data-tab="week">Settimana</button><button data-tab="jobs">Lavori</button><button data-tab="materials">Materiali</button><button data-tab="money">Soldi</button><button data-tab="reminders">Promemoria</button></div><div id="mos-body" class="mos-body"><div class="mos-empty">Apro l'organizzazione…</div></div><textarea id="mos-input" class="mos-input" rows="4" placeholder="Scrivi oppure premi Parla…"></textarea><div class="mos-actions"><button id="mos-mic" class="mos-mic">🎙 Parla</button><button id="mos-send" class="mos-send">Invia</button></div><div id="mos-state" class="mos-state"></div><div class="mos-hint">Con la voce, la frase viene inviata automaticamente quando smetti di parlare.</div></div>`;document.body.appendChild(chat);
  chat.querySelector('.mos-close').onclick=close;$('#mos-mic').onclick=startVoice;$('#mos-send').onclick=sendText;$('#mos-body').addEventListener('click',handleBodyClick);document.querySelectorAll('.mos-nav button').forEach(b=>b.onclick=()=>renderTab(b.dataset.tab));
  fixHostLayout();
}
async function open(){const chat=$('#mos-chat');if(!chat)return;chat.style.display='block';document.body.style.overflow='hidden';await renderTab(S.tab)}
function close(){try{S.recognition?.stop()}catch{}const chat=$('#mos-chat');if(chat)chat.style.display='none';document.body.style.overflow=''}
async function submit(text){if(S.busy||!text.trim())return;S.busy=true;const state=$('#mos-state'),answer=$('#mos-answer');state.textContent=isQuestion(text)?'Cerco nei tuoi dati…':'Capisco e organizzo…';try{const r=await processInput(text.trim());answer.innerHTML=esc(r.reply||r.summary||'Fatto.').replace(/\n/g,'<br>')+(r.needs_review?'<br><br><b>⚠️ Una parte richiede conferma.</b>':'');toast(isQuestion(text)?'Risposta aggiornata':'✓ Registrato');await renderTab(S.tab)}catch(e){console.error(e);answer.textContent='Non sono riuscito a completare la richiesta. Riprova: non registro dati incompleti.';toast('Operazione non completata')}finally{S.busy=false;state.textContent=''}}
async function sendText(){const input=$('#mos-input'),text=input?.value?.trim();if(!text)return;await submit(text);if(input)input.value=''}
function startVoice(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){toast('Usa il microfono della tastiera nel campo testo.');$('#mos-input')?.focus();return}try{S.recognition?.stop()}catch{}const r=new SR();S.recognition=r;r.lang='it-IT';r.continuous=false;r.interimResults=true;let final='';$('#mos-state').textContent='Ti ascolto…';r.onresult=e=>{let interim='';for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0].transcript;if(e.results[i].isFinal)final+=t+' ';else interim+=t}$('#mos-input').value=(final||interim).trim()};r.onerror=()=>{$('#mos-state').textContent='Dettatura interrotta. Puoi usare il microfono della tastiera.'};r.onend=async()=>{const text=(final||$('#mos-input').value||'').trim();$('#mos-state').textContent='';if(text){await submit(text);$('#mos-input').value=''}};r.start()}

async function init(){const ok=await loadIdentity();if(!ok)return;mount();window.MatteoOS={open,refresh:()=>refreshData(true),organize:processInput}}
let tries=0;const timer=setInterval(()=>{tries++;const app=$('#app');if(app&&getComputedStyle(app).display!=='none'){clearInterval(timer);init().catch(console.error)}else if(tries>160)clearInterval(timer)},500);
sb.auth.onAuthStateChange((event,session)=>{if(session?.user&&!S.user)init().catch(console.error)});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){S.dataAt=0;fixHostLayout();if($('#mos-chat')?.style.display==='block')renderTab(S.tab)}});
const mo=new MutationObserver(()=>{clearTimeout(mo._t);mo._t=setTimeout(fixHostLayout,120)});mo.observe(document.documentElement,{subtree:true,childList:true});
})();
