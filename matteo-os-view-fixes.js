(()=>{
'use strict';
if(window.__MOS_VIEW_FIXES__)return;window.__MOS_VIEW_FIXES__=true;

const MONTHS={gennaio:1,febbraio:2,marzo:3,aprile:4,maggio:5,giugno:6,luglio:7,agosto:8,settembre:9,ottobre:10,novembre:11,dicembre:12};
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
function sortKey(text){
  const t=norm(text),now=new Date(),yearNow=now.getFullYear();
  let m=t.match(/\b(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)(?:\s+(20\d{2}))?/);
  if(m){const y=Number(m[3]||yearNow),mo=MONTHS[m[2]],d=Number(m[1]);return y*10000+mo*100+d}
  m=t.match(/\b(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)(?:\s+(20\d{2}))?/);
  if(m){const y=Number(m[2]||yearNow),mo=MONTHS[m[1]];return y*10000+mo*100+1}
  if(/questa settimana/.test(t))return yearNow*10000+(now.getMonth()+1)*100+now.getDate();
  if(/prossima settimana/.test(t)){const d=new Date(now);d.setDate(d.getDate()+7);return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate()}
  return 99999999;
}
function fixJobsOrder(){
  const body=document.querySelector('#mos-body');if(!body)return;
  const titles=[...body.querySelectorAll('.mos-section-title')];
  const title=titles.find(x=>/da organizzare/i.test(x.textContent||''));if(!title)return;
  const section=title.closest('.mos-section');if(!section)return;
  const cards=[...section.querySelectorAll(':scope > .mos-card')];if(cards.length<2)return;
  cards.sort((a,b)=>sortKey(a.textContent)-sortKey(b.textContent));
  for(const c of cards)section.appendChild(c);
}
function installStyle(){if(document.querySelector('#mos-view-fix-style'))return;const s=document.createElement('style');s.id='mos-view-fix-style';s.textContent=`#mos-chat .mos-card-title{padding-right:36px!important}#mos-chat .mos-badge{position:static!important;display:inline-flex!important;max-width:100%!important;margin-top:8px!important;margin-right:34px!important;white-space:normal!important;line-height:1.15!important}#mos-chat .mos-card-sub{margin-top:7px!important}`;document.head.appendChild(s)}
function run(){installStyle();fixJobsOrder()}
let t;const schedule=()=>{clearTimeout(t);t=setTimeout(run,80)};
new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true});
document.addEventListener('click',schedule,true);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule()});
setTimeout(run,900);
})();
