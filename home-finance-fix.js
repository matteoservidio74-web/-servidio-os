(()=>{
'use strict';
if(window.__SERVIDIO_HOME_FINANCE_FIX__)return;
window.__SERVIDIO_HOME_FINANCE_FIX__=true;

function bottomNavGap(){
  const candidates=[...document.querySelectorAll('nav,footer,div')].filter(el=>{
    const cs=getComputedStyle(el),r=el.getBoundingClientRect();
    return ['fixed','sticky'].includes(cs.position)&&r.bottom>=innerHeight-4&&r.height>=55&&r.height<180&&r.width>innerWidth*.72;
  });
  if(!candidates.length)return 92;
  const top=Math.min(...candidates.map(el=>el.getBoundingClientRect().top));
  return Math.max(76,Math.ceil(innerHeight-top)+8);
}
function adjust(){
  const modal=document.getElementById('fd-modal');
  if(!modal||modal.hidden)return;
  const gap=bottomNavGap();
  modal.style.setProperty('top','0','important');
  modal.style.setProperty('left','0','important');
  modal.style.setProperty('right','0','important');
  modal.style.setProperty('bottom',`${gap}px`,'important');
  modal.style.setProperty('height','auto','important');
  const card=modal.querySelector('.fd-modal-card');
  if(card){
    card.style.setProperty('max-height',`calc(100dvh - ${gap+36}px)`,'important');
    card.style.setProperty('padding-bottom','36px','important');
    card.style.setProperty('scroll-padding-bottom','36px','important');
  }
}
function clear(){
  const modal=document.getElementById('fd-modal');
  if(!modal)return;
  modal.style.removeProperty('top');modal.style.removeProperty('left');modal.style.removeProperty('right');modal.style.removeProperty('bottom');modal.style.removeProperty('height');
}

document.addEventListener('click',e=>{
  if(e.target?.closest?.('[data-detail]'))setTimeout(adjust,30);
  if(e.target?.closest?.('[data-close-detail]'))setTimeout(clear,30);
},true);
window.addEventListener('resize',()=>setTimeout(adjust,40));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(adjust,80)});
const mo=new MutationObserver(()=>setTimeout(adjust,20));
mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});

const style=document.createElement('style');
style.textContent=`.fd-modal-card{padding-bottom:36px!important}.fd-modal-body,.fd-detail-row:last-child,.fd-issue:last-child{margin-bottom:8px}`;
document.head.appendChild(style);
})();
