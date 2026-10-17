(function(){
'use strict';
var api=null,busy=false;
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function allSites(S){return (S.calendarSites||S.sites||[]).filter(function(x){return !x.deleted_at})}
function siteLabel(id,S){var s=allSites(S).find(function(x){return x.id===id});return s?(s.client_name||s.name):'Cantiere non disponibile'}
function siteOptions(S,selected){var out=['<option value="" disabled '+(!selected?'selected':'')+'>Seleziona dove si trova</option>'];out.push('<option value="van" '+(selected==='van'?'selected':'')+'>🚐 Furgone</option>','<option value="warehouse" '+(selected==='warehouse'?'selected':'')+'>🏠 Magazzino</option>','<option value="other" '+(selected==='other'?'selected':'')+'>📍 Altra posizione</option>');allSites(S).forEach(function(s){var v='site:'+s.id;var ws=(S.workspaces||[]).find(function(w){return w.id===s.workspace_id});out.push('<option value="'+esc(v)+'" '+(selected===v?'selected':'')+'>'+esc((s.client_name||s.name)+(ws?' · '+ws.name:''))+'</option>')});return out.join('')}
function where(x,S){if(x.location_kind==='site')return '🏗️ '+siteLabel(x.current_site_id,S);if(x.location_kind==='warehouse')return '🏠 Magazzino';if(x.location_kind==='van')return '🚐 Furgone';return '📍 '+(x.location_note||'Altra posizione')}
function html(S){
 var items=(S.equipment||[]).slice().sort(function(a,b){return String(a.name).localeCompare(String(b.name),'it')});
 var ons=items.filter(function(x){return x.location_kind==='site'}),off=items.filter(function(x){return x.location_kind!=='site'});
 function row(x){var sel=x.location_kind==='site'?'site:'+x.current_site_id:x.location_kind;
 return '<div class="item equipment-row" data-search="'+esc((x.name+' '+where(x,S)).toLowerCase())+'" style="display:block">'+
 '<b>'+esc(x.name)+'</b><small>'+esc(where(x,S))+(x.assigned_on&&x.location_kind==='site'?' · dal '+esc(x.assigned_on.split('-').reverse().join('/')):'')+'</small>'+
 '<div class="mini-actions" style="margin-top:10px;align-items:center">'+
 '<select aria-label="Nuova posizione di '+esc(x.name)+'" id="equipment-move-'+esc(x.id)+'" style="flex:1;min-width:135px;border:1px solid var(--line);border-radius:9px;padding:7px;font-size:12px;background:white">'+siteOptions(S,sel)+'</select>'+
 '<button onclick="appEquipmentMove(\''+esc(x.id)+'\')">Sposta</button>'+
 (x.location_kind==='site'?'<button onclick="appEquipmentReturn(\''+esc(x.id)+'\')">↩ Rientrata</button>':'')+
 '<button onclick="appEquipmentHistory(\''+esc(x.id)+'\')">Storico</button></div></div>'}
 return '<div class="pagehead"><h1>Attrezzature</h1><p>Il tuo inventario riutilizzabile, separato dai materiali. Posizione aggiornata per entrambe le aziende.</p></div>'+
 '<div class="metrics"><div class="metric"><small>In cantiere</small><b>'+ons.length+'</b><em>da recuperare o trasferire</em></div><div class="metric"><small>Furgone / deposito</small><b>'+off.length+'</b><em>attrezzi disponibili</em></div></div>'+
 '<form class="card form" id="equipment-add" onsubmit="appEquipmentAdd(event)"><b>＋ Registra attrezzatura</b>'+
 '<label>Attrezzatura</label><input name="name" required maxlength="160" placeholder="Es. Prolunga, trapano, scala">'+
 '<label>Dove la porti?</label><select name="where" required>'+siteOptions(S,'')+'</select>'+
 '<label>Nota facoltativa</label><input name="note" maxlength="250" placeholder="Es. scala rossa, custodia nera">'+
 '<button class="primary full" type="submit">Salva attrezzatura</button></form>'+
 '<div class="sectiontitle"><h2>Posizioni attuali</h2><small>'+items.length+' attrezzature</small></div>'+
 '<input id="equipment-filter" class="form" style="width:100%;border:1px solid var(--line);border-radius:10px;padding:11px;margin-bottom:10px" placeholder="🔎 Cerca attrezzo o cantiere" oninput="appEquipmentSearch(this.value)">'+
 '<div class="card"><h3 style="margin:0 0 10px;font-size:14px">🏗️ Nei cantieri · '+ons.length+'</h3>'+ (ons.map(row).join('')||'<div class="empty">Nessuna attrezzatura in cantiere</div>')+'</div>'+
 '<div class="card"><h3 style="margin:0 0 10px;font-size:14px">🚐 Furgone e magazzino · '+off.length+'</h3>'+ (off.map(row).join('')||'<div class="empty">Nessuna attrezzatura registrata fuori cantiere</div>')+'</div>'+
 '<div class="notice">“Rientrata” segna il ritorno nel furgone. Per magazzino o altro cantiere usa “Sposta”. Lo storico conserva tutti i trasferimenti.</div>'
}
function bind(deps){api=deps}
function loc(value){if(value.indexOf('site:')===0)return {current_site_id:value.slice(5),location_kind:'site'};if(['van','warehouse','other'].includes(value))return {current_site_id:null,location_kind:value};throw new Error('Scegli una posizione valida')}
function knownSite(S,id){return allSites(S).some(function(s){return s.id===id})}
async function reload(){await api.load();api.render()}
function fail(e){api.pageError(e)}
window.appEquipmentAdd=async function(ev){
 ev.preventDefault();if(busy||!api)return;var form=ev.currentTarget,d=Object.fromEntries(new FormData(form).entries());
 var name=String(d.name||'').trim(),siteLoc;
 try{if(name.length<2)throw new Error('Inserisci il nome dell’attrezzatura');siteLoc=loc(String(d.where||''));if(siteLoc.current_site_id&&!knownSite(api.S,siteLoc.current_site_id))throw new Error('Cantiere non valido');
 var exists=(api.S.equipment||[]).some(function(x){return x.name.trim().toLowerCase()===name.toLowerCase()&&x.location_kind===siteLoc.location_kind&&x.current_site_id===siteLoc.current_site_id});
 if(exists&&!confirm('Esiste già un attrezzo con questo nome in questa posizione. Vuoi registrarne un secondo?'))return;
 busy=true;var row={workspace_id:siteLoc.current_site_id?(allSites(api.S).find(function(s){return s.id===siteLoc.current_site_id})||{}).workspace_id:api.S.workspace,
 created_by:api.S.user.id,name:name,current_site_id:siteLoc.current_site_id,location_kind:siteLoc.location_kind,
 location_note:String(d.note||'').trim()||null,assigned_on:siteLoc.current_site_id?api.today():null,last_moved_at:new Date().toISOString()};
 var res=await api.sb.from('equipment_assets').insert(row);if(res.error)throw res.error;await reload();api.toast('Attrezzatura registrata');
 }catch(e){fail(e)}finally{busy=false}
};
window.appEquipmentMove=async function(id,forced){
 if(busy||!api)return;var asset=(api.S.equipment||[]).find(function(x){return x.id===id});if(!asset)return;
 try{var select=document.getElementById('equipment-move-'+id),to=loc(forced||select.value);if(to.current_site_id&&!knownSite(api.S,to.current_site_id))throw new Error('Cantiere non valido');
 if(asset.current_site_id===to.current_site_id&&asset.location_kind===to.location_kind){api.toast('Posizione già aggiornata');return}
 var note=null;if(to.location_kind==='other'){note=prompt('Dove si trova esattamente?','');if(note===null)return;if(!note.trim())throw new Error('Indica la nuova posizione')}
 busy=true;var res=await api.sb.from('equipment_assets').update({
 current_site_id:to.current_site_id,location_kind:to.location_kind,location_note:note,
 assigned_on:to.current_site_id?api.today():null,last_moved_at:new Date().toISOString(),updated_at:new Date().toISOString()
 }).eq('id',id).select('id').maybeSingle();
 if(res.error)throw res.error;if(!res.data)throw new Error('Attrezzatura non aggiornata');await reload();api.toast('Posizione aggiornata');
 }catch(e){fail(e)}finally{busy=false}
};
window.appEquipmentReturn=function(id){window.appEquipmentMove(id,'van')};
window.appEquipmentHistory=async function(id){
 if(!api)return;var asset=(api.S.equipment||[]).find(function(x){return x.id===id});if(!asset)return;
 try{var r=await api.sb.from('equipment_movements').select('action,to_site_id,to_location_kind,to_location_note,moved_at').eq('equipment_id',id).order('moved_at',{ascending:false}).limit(40);
 if(r.error)throw r.error;var logs=(r.data||[]).map(function(x){var place=x.to_location_kind==='site'?siteLabel(x.to_site_id,api.S):({van:'Furgone',warehouse:'Magazzino',other:x.to_location_note||'Altro'}[x.to_location_kind]||'Altro');
 return new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(x.moved_at))+' · '+place});
 alert(asset.name+'\n\n'+(logs.length?logs.join('\n'):'Nessuno spostamento registrato'));
 }catch(e){fail(e)}
};
window.appEquipmentSearch=function(q){var term=String(q||'').toLowerCase().trim();document.querySelectorAll('.equipment-row').forEach(function(row){row.hidden=!row.dataset.search.includes(term);row.style.display=row.hidden?'none':'block'})};
window.ServidioEquipment={bind:bind,html:html};
})();