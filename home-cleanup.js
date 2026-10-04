(()=>{
'use strict';
if(window.__SERVIDIO_HOME_CLEANUP__)return;window.__SERVIDIO_HOME_CLEANUP__=true;
const KEEP=/cantier|preventiv|squadra|finanz|incass|fattur|cost|margine|opera|cliente|econom|situazione/i;
const ORG=/programmaz|promem|appunt|agenda|nota|note|appunti|da fare|ricordare|verificare|visita/i;
function visible(el){const r=el.getBoundingClientRect();const cs=getComputedStyle(el);return r.width>0&&r.height>0&&cs.display!=='none'&&cs.visibility!=='hidden'}
function greenish(el){try{const m=getComputedStyle(el).color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);if(!m)return false;const r=+m[1],g=+m[2],b=+m[3];return g>120&&g>r*1.3&&g>b*1.1}catch{return false}}
function homeIsActive(){
  const headings=[...document.querySelectorAll('h1,h2,[role="heading"],div,span')].filter(el=>visible(el)&&String(el.textContent||'').trim()==='Oggi');
  if(headings.some(el=>el.getBoundingClientRect().top<280))return true;
  const homes=[...document.querySelectorAll('a,button,div,span')].filter(el=>visible(el)&&String(el.textContent||'').trim()==='Home');
  for(const el of homes){const r=el.getBoundingClientRect();if(r.top<innerHeight-220)continue;const chain=[el,el.parentElement,el.parentElement?.parentElement].filter(Boolean);if(chain.some(x=>/active|selected|current|on\b/i.test(String(x.className||''))||x.getAttribute?.('aria-current')==='page'||greenish(x)))return true}
  return false;
}
function roundedAncestor(el){let cur=el,best=null;for(let i=0;i<8&&cur&&cur!==document.body;i++,cur=cur.parentElement){if(cur.closest?.('#mos-chat'))return null;const r=cur.getBoundingClientRect();if(r.width<innerWidth*.55||r.height<45)continue;const cls=String(cur.className||'');let radius=0;try{radius=parseFloat(getComputedStyle(cur).borderRadius)||0}catch{}if(/card|panel|section|widget|box|tile/i.test(cls)||radius>=12){best=cur;if(r.width>innerWidth*.72)break}}return best}
function clear(){document.querySelectorAll('[data-mos-home-hidden="1"]').forEach(el=>{el.style.removeProperty('display');el.removeAttribute('data-mos-home-hidden')})}
function hide(el){if(!el||el.closest('#mos-chat'))return;el.dataset.mosHomeHidden='1';el.style.setProperty('display','none','important')}
function simplify(){
  clear();if(!homeIsActive())return;
  for(const btn of [...document.querySelectorAll('button')]){const tx=String(btn.textContent||'').replace(/\s+/g,' ').trim();if(/^\+?\s*Inserisci$/i.test(tx))hide(btn)}
  const nodes=[...document.querySelectorAll('h1,h2,h3,h4,strong,b,button,[class*="title"],[class*="heading"]')];
  const seen=new Set();
  for(const el of nodes){if(el.closest('#mos-chat')||!visible(el))continue;const text=String(el.textContent||'').replace(/\s+/g,' ').trim();if(!text||text.length>120)continue;const parent=roundedAncestor(el);if(!parent||seen.has(parent))continue;const all=String(parent.textContent||'').replace(/\s+/g,' ').trim();
    const weekly=/\b\d{2}\/\d{2}\s*[–-]\s*\d{2}\/\d{2}\b/.test(all)&&/previst/i.test(all);
    const shopping=/\bAcquistato\b/i.test(all);
    const task=/\bFatto\b/i.test(all)&&(ORG.test(all)||/\b(?:lun|mar|mer|gio|ven|sab|dom)\b|\b\d{1,2}:\d{2}\b/i.test(all));
    const explicit=ORG.test(text)&&!KEEP.test(all);
    if((weekly||shopping||task||explicit)&&!KEEP.test(all)){hide(parent);seen.add(parent)}
  }
}
let t;function schedule(){clearTimeout(t);t=setTimeout(simplify,120)}
document.addEventListener('click',schedule,true);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule()});window.addEventListener('popstate',schedule);window.addEventListener('hashchange',schedule);
new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','aria-current']});
setTimeout(schedule,700);setTimeout(schedule,1800);
})();
