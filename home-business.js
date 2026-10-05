(()=>{
'use strict';
if(window.__SERVIDIO_FINANCE_HOME__) return;
window.__SERVIDIO_FINANCE_HOME__=true;

const U='https://rdxaxsosqiudklhvezuq.supabase.co';
const K='sb_publishable_abewBdHybtalh7RsfWbXUA_oOLebqMn';
const sb=window.supabase?.createClient?.(U,K,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});
if(!sb) return;

const S={user:null,workspaces:[],data:null,at:0,loading:null,forced:null};
const money=n=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(Number(n||0));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const visible=el=>{if(!el)return false;const r=el.getBoundingClientRect(),cs=getComputedStyle(el);return r.width>0&&r.height>0&&cs.display!=='none'&&cs.visibility!=='hidden'};
const norm=s=>String(s||'').replace(/\s+/g,' ').trim();
const isGreen=el=>{try{const m=getComputedStyle(el).color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);if(!m)return false;const r=+m[1],g=+m[2],b=+m[3];return g>105&&g>r*1.2&&g>b*1.05}catch{return false}};

function navLabelFrom(target){
  let el=target;
  for(let i=0;i<5&&el;i++,el=el.parentElement){
    const r=el.getBoundingClientRect?.();
    if(!r||r.top<innerHeight-240) continue;
    const t=norm(el.textContent);
    for(const name of ['Home','Cantieri','Preventivi','Squadra','Finanze','Altro']) if(t===name||t.endsWith(name)) return name;
  }
  return null;
}

function detectHome(){
  if(S.forced!==null) return S.forced;
  const homeNodes=[...document.querySelectorAll('a,button,div,span')].filter(el=>visible(el)&&el.getBoundingClientRect().top>innerHeight-230&&norm(el.textContent)==='Home');
  if(homeNodes.some(el=>[el,el.parentElement,el.parentElement?.parentElement].filter(Boolean).some(x=>x.getAttribute?.('aria-current')==='page'||/active|selected|current|\bon\b/i.test(String(x.className||''))||isGreen(x)))) return true;
  const topTexts=[...document.querySelectorAll('h1,h2,h3,div,span')].filter(el=>visible(el)&&el.getBoundingClientRect().top<390).map(el=>norm(el.textContent));
  return topTexts.some(t=>/^Oggi(?:$|\s*[·•-])/.test(t)||t==='OPERATIVITÀ');
}

function headerBottom(){
  const brands=[...document.querySelectorAll('div,span,p,h1,h2')].filter(el=>visible(el)&&el.getBoundingClientRect().top<190&&/^SERVIDIO RISTRUTTURA/i.test(norm(el.textContent)));
  let best=0;
  for(const brand of brands){
    let cur=brand;
    for(let i=0;i<8&&cur&&cur!==document.body;i++,cur=cur.parentElement){
      const r=cur.getBoundingClientRect();
      if(r.top<120&&r.bottom>170&&r.bottom<310&&r.width>innerWidth*.72) best=Math.max(best,r.bottom);
    }
  }
  if(best) return Math.ceil(best);
  const headers=[...document.querySelectorAll('header,[role="banner"],[class*="header"]')].filter(el=>visible(el)&&el.getBoundingClientRect().top<120&&el.getBoundingClientRect().bottom>170&&el.getBoundingClientRect().bottom<310&&el.getBoundingClientRect().width>innerWidth*.72);
  if(headers.length) return Math.ceil(Math.max(...headers.map(x=>x.getBoundingClientRect().bottom)));
  return Math.max(220,Math.min(270,Math.round(innerHeight*.142)));
}

function navTop(){
  const nodes=[...document.querySelectorAll('nav,footer,div')].filter(el=>{
    if(!visible(el)) return false;
    const r=el.getBoundingClientRect(),p=getComputedStyle(el).position;
    return ['fixed','sticky'].includes(p)&&r.bottom>=innerHeight-5&&r.height>=55&&r.height<180&&r.width>innerWidth*.78;
  });
  return nodes.length?Math.min(...nodes.map(x=>x.getBoundingClientRect().top)):innerHeight-92;
}

async function identity(){
  const {data:{session}}=await sb.auth.getSession();
  if(!session?.user) return false;
  S.user=session.user;
  const {data}=await sb.from('workspace_members').select('workspace_id,role').eq('user_id',S.user.id);
  S.workspaces=(data||[]).filter(x=>['owner','admin'].includes(x.role)).map(x=>x.workspace_id);
  return S.workspaces.length>0;
}

async function load(force=false){
  if(S.loading) return S.loading;
  if(!force&&S.data&&Date.now()-S.at<60000) return S.data;
  S.loading=(async()=>{
    if(!S.user&&!(await identity())) return null;
    const ids=S.workspaces,uid=S.user.id,now=new Date();
    const y=now.getUTCFullYear(),m=now.getUTCMonth();
    const monthStart=`${y}-${String(m+1).padStart(2,'0')}-01`;
    const nextMonth=new Date(Date.UTC(y,m+1,1)).toISOString().slice(0,10);
    const empty={data:[]};
    const [sitesQ,itemsQ,invoicesQ,costsQ,laborQ,receiptsQ]=await Promise.all([
      ids.length?sb.from('sites').select('id,name,client_name,location,status,contract_value,collected_amount,workspace_id').in('workspace_id',ids):Promise.resolve(empty),
      sb.from('personal_items').select('id,item_type,title,details,status,amount,category,contact_name,site_id,workspace_id,metadata,created_at').eq('user_id',uid).neq('status','done').neq('status','cancelled').order('created_at',{ascending:false}).limit(400),
      ids.length?sb.from('invoices').select('id,site_id,customer_name,number,amount,collected_amount,status,workspace_id,issue_date').in('workspace_id',ids).order('issue_date',{ascending:false}).limit(250):Promise.resolve(empty),
      ids.length?sb.from('cost_entries').select('id,amount,entry_date,category,description,site_id,workspace_id,paid,due_date').in('workspace_id',ids).limit(1200):Promise.resolve(empty),
      ids.length?sb.from('site_labor_adjustments').select('id,amount,paid,created_at,site_id,workspace_id,worker_name,period_label').in('workspace_id',ids).limit(1200):Promise.resolve(empty),
      ids.length?sb.from('cash_receipts').select('id,amount,received_date,site_id,workspace_id,receipt_type').in('workspace_id',ids).gte('received_date',monthStart).lt('received_date',nextMonth).limit(700):Promise.resolve(empty)
    ]);

    const sites=sitesQ.data||[],items=itemsQ.data||[],invoices=invoicesQ.data||[],costs=costsQ.data||[],labor=laborQ.data||[],receipts=receiptsQ.data||[];
    const openInvoices=invoices.filter(x=>Number(x.amount||0)-Number(x.collected_amount||0)>.009);
    const receivables=items.filter(x=>x.item_type==='receivable');
    const dueNow=receivables.filter(x=>x.metadata?.due_state==='now');
    const plannedIncome=receivables.filter(x=>x.metadata?.due_state!=='now');
    const monthCosts=costs.filter(x=>String(x.entry_date||'')>=monthStart&&String(x.entry_date||'')<nextMonth&&x.paid!==false);
    const monthLabor=labor.filter(x=>String(x.created_at||'').slice(0,10)>=monthStart&&String(x.created_at||'').slice(0,10)<nextMonth&&x.paid!==false);
    const materialMonth=monthCosts.filter(x=>String(x.category||'').toLowerCase()==='materials').reduce((s,x)=>s+Number(x.amount||0),0);
    const laborMonth=monthLabor.reduce((s,x)=>s+Number(x.amount||0),0);
    const otherMonth=monthCosts.filter(x=>String(x.category||'').toLowerCase()!=='materials').reduce((s,x)=>s+Number(x.amount||0),0);
    const totalOutMonth=materialMonth+laborMonth+otherMonth;
    const plannedCosts=costs.filter(x=>x.paid===false).reduce((s,x)=>s+Number(x.amount||0),0)+labor.filter(x=>x.paid===false).reduce((s,x)=>s+Number(x.amount||0),0);
    const monthReceipts=receipts.reduce((s,x)=>s+Number(x.amount||0),0);
    const collectedSites=sites.reduce((s,x)=>s+Number(x.collected_amount||0),0);
    const invoiceDue=openInvoices.reduce((s,x)=>s+Number(x.amount||0)-Number(x.collected_amount||0),0);
    const voiceDue=dueNow.reduce((s,x)=>s+Number(x.amount||0),0);
    const futureIncome=plannedIncome.reduce((s,x)=>s+Number(x.amount||0),0);
    const activeSites=sites.filter(x=>!['completed','closed','cancelled'].includes(String(x.status||'').toLowerCase()));
    const completedSites=sites.filter(x=>String(x.status||'').toLowerCase()==='completed');
    const siteMap=new Map(sites.map(x=>[x.id,x]));
    const alerts=[];
    for(const inv of openInvoices){
      const site=siteMap.get(inv.site_id);const remaining=Number(inv.amount||0)-Number(inv.collected_amount||0);const finished=site&&String(site.status||'').toLowerCase()==='completed';
      alerts.push({score:finished?100:80,title:inv.customer_name||site?.client_name||site?.name||'Fattura aperta',sub:`${finished?'Lavoro finito · ':''}da incassare ${money(remaining)}`,tag:'Incasso'});
    }
    for(const x of dueNow) alerts.push({score:90,title:x.contact_name||x.title,sub:`Da incassare ${x.amount?money(x.amount):'importo da definire'}`,tag:'Incasso'});
    alerts.sort((a,b)=>b.score-a.score);

    S.data={monthReceipts,collectedSites,invoiceDue,voiceDue,futureIncome,materialMonth,laborMonth,otherMonth,totalOutMonth,plannedCosts,activeSites:activeSites.length,completedSites:completedSites.length,alerts:alerts.slice(0,6)};
    S.at=Date.now();return S.data;
  })().finally(()=>S.loading=null);
  return S.loading;
}

function metric(label,value,sub=''){return `<div class="fd-card"><span>${esc(label)}</span><b>${esc(value)}</b>${sub?`<small>${esc(sub)}</small>`:''}</div>`}
function render(d){
  if(!d) return '<div class="fd-loading">Caricamento dati…</div>';
  const due=d.invoiceDue+d.voiceDue;
  return `<div class="fd-head"><div><span>DASHBOARD AZIENDA</span><h2>Andamento economico</h2></div><button id="fd-refresh" aria-label="Aggiorna">↻</button></div>
  <div class="fd-grid fd-main">${metric('Incassato cantieri',money(d.collectedSites),'Totale registrato sui cantieri')}${metric('Da incassare ora',money(due),d.invoiceDue?`${money(d.invoiceDue)} da fatture aperte`:'')}${metric('Incassi previsti',money(d.futureIncome),'Acconti e saldi futuri')}${metric('Spese previste',money(d.plannedCosts),'Costi registrati non ancora pagati')}</div>
  <div class="fd-section"><h3>Questo mese</h3><div class="fd-grid">${metric('Incassi registrati',money(d.monthReceipts))}${metric('Uscite registrate',money(d.totalOutMonth))}${metric('Materiali',money(d.materialMonth))}${metric('Operai',money(d.laborMonth))}${metric('Altre spese',money(d.otherMonth))}${metric('Saldo mese',money(d.monthReceipts-d.totalOutMonth),'Incassi registrati meno uscite registrate')}</div></div>
  <div class="fd-section"><h3>Stato lavori</h3><div class="fd-grid">${metric('Cantieri attivi',String(d.activeSites))}${metric('Cantieri conclusi',String(d.completedSites))}</div></div>
  <div class="fd-section"><h3>Da tenere d’occhio</h3>${d.alerts.length?d.alerts.map(x=>`<div class="fd-alert"><div><b>${esc(x.title)}</b><span>${esc(x.sub)}</span></div><em>${esc(x.tag)}</em></div>`).join(''):'<div class="fd-empty">Nessuna situazione economica urgente.</div>'}</div>`;
}

function ensure(){
  let d=document.getElementById('servidio-finance-home');
  if(!d){
    d=document.createElement('section');d.id='servidio-finance-home';d.hidden=true;document.body.appendChild(d);
    d.addEventListener('click',async e=>{if(e.target?.id==='fd-refresh'){d.innerHTML='<div class="fd-loading">Aggiorno…</div>';S.at=0;d.innerHTML=render(await load(true));position()}});
  }
  return d;
}
function position(){const d=document.getElementById('servidio-finance-home');if(!d||d.hidden)return;d.style.top=`${headerBottom()}px`;d.style.bottom=`${Math.max(74,innerHeight-navTop())}px`}
async function show(){const d=ensure();d.hidden=false;position();if(!S.data)d.innerHTML='<div class="fd-loading">Caricamento dashboard…</div>';d.innerHTML=render(await load(false));position()}
function hide(){const d=document.getElementById('servidio-finance-home');if(d)d.hidden=true}
function sync(){detectHome()?show():hide()}

const style=document.createElement('style');
style.textContent=`#servidio-finance-home{position:fixed;left:0;right:0;z-index:2147482000!important;background:#f4fbf7;color:#092d1e;overflow:auto;padding:18px 18px 34px;box-sizing:border-box;border-top:1px solid #d7eee2;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;isolation:isolate;pointer-events:auto}#servidio-finance-home[hidden]{display:none!important}#mos-talk,#mos-chat{z-index:2147483000!important}#mos-toast{z-index:2147483001!important}.fd-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}.fd-head span{font-size:10px;letter-spacing:.18em;font-weight:900;color:#21c77a}.fd-head h2{font-size:25px;margin:4px 0 0;font-weight:950}.fd-head button{width:40px;height:40px;border-radius:13px;border:1px solid #bfe4d1;background:#fff;color:#087442;font-size:20px}.fd-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.fd-main{margin-bottom:13px}.fd-card{background:#fff;border:1px solid #c9e8d8;border-radius:17px;padding:13px;min-height:82px;box-sizing:border-box}.fd-card span{display:block;font-size:11px;color:#607b6d;font-weight:800}.fd-card b{display:block;font-size:21px;color:#0a623a;margin-top:6px;line-height:1.05}.fd-card small{display:block;font-size:9px;color:#819489;margin-top:5px;line-height:1.3}.fd-section{margin-top:13px;background:#fff;border:1px solid #c9e8d8;border-radius:19px;padding:13px}.fd-section h3{margin:0 0 10px;font-size:16px}.fd-section .fd-card{background:#f8fcfa}.fd-alert{display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-top:1px solid #edf6f1}.fd-alert:first-of-type{border-top:0}.fd-alert b{display:block;font-size:13px}.fd-alert span{display:block;margin-top:3px;color:#70857a;font-size:11px;line-height:1.35}.fd-alert em{height:max-content;font-style:normal;background:#e8f8ef;color:#128956;border-radius:999px;padding:4px 7px;font-size:9px;font-weight:900;white-space:nowrap}.fd-empty,.fd-loading{text-align:center;padding:24px;color:#778d81;font-weight:700}@media(max-width:390px){#servidio-finance-home{padding-left:14px;padding-right:14px}.fd-head h2{font-size:22px}.fd-card b{font-size:18px}}`;
document.head.appendChild(style);

document.addEventListener('click',e=>{
  const label=navLabelFrom(e.target);
  if(label){S.forced=label==='Home';setTimeout(sync,40)}
},true);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){S.at=0;S.forced=null;setTimeout(sync,80)}});
window.addEventListener('resize',position);
let mt;
new MutationObserver(records=>{if(records.every(r=>r.target?.closest?.('#servidio-finance-home')))return;clearTimeout(mt);mt=setTimeout(()=>{if(S.forced===null)sync();else if(S.forced)position()},120)}).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','aria-current']});
setTimeout(sync,450);setTimeout(sync,1100);setTimeout(sync,2200);
})();