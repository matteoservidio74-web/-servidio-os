(()=>{'use strict';
async function token(){try{const raw=localStorage.getItem('sb-rdxaxsosqiudklhvezuq-auth-token');if(raw){const x=JSON.parse(raw);return x?.access_token||x?.currentSession?.access_token||null}}catch{}return null}
async function refresh(){const t=await token();if(!t)return;try{const r=await fetch('/api/sites-context',{headers:{Authorization:'Bearer '+t},cache:'no-store'});if(!r.ok)return;const d=await r.json();window.__MATTEO_OS_ALL_SITES=Array.isArray(d.sites)?d.sites:[];window.dispatchEvent(new CustomEvent('matteo-sites-ready',{detail:{count:window.__MATTEO_OS_ALL_SITES.length}}))}catch(e){console.warn('unified sites',e)}}
refresh();window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh()});
})();
