(()=>{
'use strict';
if(window.__SERVIDIO_HOME_CLEANUP__)return;window.__SERVIDIO_HOME_CLEANUP__=true;
const HIDE_TITLES=[/^programmazione$/i,/^programma( della)? settimana$/i,/^promemoria$/i,/^note$/i,/^appunti$/i,/^agenda$/i,/^da fare$/i,/^cose da fare$/i,/^cose da ricordare$/i,/^attivita di oggi$/i,/^attività di oggi$/i];
const ORG_WORDS=/programmaz|promem|appunt|agenda|nota|note|appunti|da fare|ricordare/i;
const KEEP_WORDS=/cantier|preventiv|squadra|finanz|incass|fattur|cost|margine|opera|material|cliente|econom/i;

function greenish(el){try{const m=getComputedStyle(el).color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);if(!m)return false;const r=+m[1],g=+m[2],b=+m[3];return g>120&&g>r*1.35&&g>b*1.15}catch{return false}}
function homeIsActive(){
  const els=[...document.querySelectorAll('a,button,div,span')].filter(el=>el.children.length<4&&String(el.textContent||'').trim()==='Home');
  for(const el of els){const r=el.getBoundingClientRect();if(r.bottom<innerHeight-180)continue;const chain=[el,el.parentElement,el.parentElement?.parentElement].filter(Boolean);if(chain.some(x=>/active|selected|current|on\b/i.test(String(x.className||''))||x.getAttribute?.('aria-current')==='page'))return true;if(chain.some(greenish))return true}
  return false;
}
function cardContainer(el){
  let cur=el,best=null;
  for(let i=0;i<6&&cur&&cur!==document.body;i++,cur=cur.parentElement){
    if(cur.closest?.('#mos-chat'))return null;
    const cls=String(cur.className||'');
    if(/card|panel|section|widget|box|tile/i.test(cls)){best=cur;break}
    const r=cur.getBoundingClientRect();let radius=0;try{radius=parseFloat(getComputedStyle(cur).borderRadius)||0}catch{}
    if(radius>=10&&r.width>innerWidth*.65&&r.height>48&&r.height<innerHeight*.7){best=cur;break}
  }
  return best;
}
function clearHidden(){document.querySelectorAll('[data-mos-home-hidden="1"]').forEach(el=>{el.style.removeProperty('display');el.removeAttribute('data-mos-home-hidden')})}
function simplify(){
  clearHidden();if(!homeIsActive())return;
  const candidates=[...document.querySelectorAll('h1,h2,h3,h4,strong,b,[class*="title"],[class*="heading"]')];
  const seen=new Set();
  for(const el of candidates){
    if(el.closest('#mos-chat'))continue;
    const text=String(el.textContent||'').replace(/\s+/g,' ').trim();if(!text||text.length>90)continue;
    const exact=HIDE_TITLES.some(rx=>rx.test(text));
    const organizational=ORG_WORDS.test(text)&&!KEEP_WORDS.test(text);
    if(!exact&&!organizational)continue;
    const card=cardContainer(el);if(!card||seen.has(card))continue;
    const all=String(card.textContent||'').replace(/\s+/g,' ').trim();if(KEEP_WORDS.test(all)&&all.length<450&&!exact)continue;
    card.dataset.mosHomeHidden='1';card.style.setProperty('display','none','important');seen.add(card);
  }
}
let t;function schedule(){clearTimeout(t);t=setTimeout(simplify,120)}
document.addEventListener('click',schedule,true);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule()});window.addEventListener('popstate',schedule);window.addEventListener('hashchange',schedule);
new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','aria-current']});
setTimeout(schedule,800);setTimeout(schedule,2200);
})();
