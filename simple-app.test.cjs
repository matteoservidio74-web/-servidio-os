const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('nuova-semplice-accesso.html', 'utf8');
const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
new vm.Script(script); // Validate the complete production script, including startup.
const source = script.replace(/sb\.auth\.onAuthStateChange\([\s\S]*?\n\}\)\(\);/, `
globalThis.testApp = {S,siteTotals,sitesPage,siteDetailPage,home,finance,workedHours,
 adjustmentDay,jobPlan,programEvents,programRows,week,weekDays,weekOffsetFor,reminderEvents,remindersAndMaterials,addPage,submit,render,
 setLoad:fn=>{load=fn}};
})();`);
const nodes = new Map();
const calls = [];
const inserts = [];
const updates = [];
const loggedErrors = [];
const materialRecords = new Map();
let updateError = null;
let confirmResult = true;
let promptAnswers=[];const promptDefaults=[];
class FixedDate extends Date {constructor(...args){super(...(args.length?args:['2026-10-10T12:00:00Z']))}static now(){return new Date('2026-10-10T12:00:00Z').getTime()}}
let rpcError = null;
const sb = {rpc:async(name,args)=>{calls.push({name,args});return {error:rpcError}},from:table=>({
 insert:async row=>{inserts.push({table,row});return {error:null}},
 update:row=>{
  const filters=[];
  const query={then:(resolve,reject)=>query.maybeSingle().then(resolve,reject),eq:(key,value)=>{filters.push([key,value]);return query},select:()=>query,maybeSingle:async()=>{
   updates.push({table,row,filters});
   if(updateError)return {data:null,error:updateError};
   const found=Array.from(materialRecords.values()).find(record=>filters.every(([key,value])=>record[key]===value));
   if(!found)return {data:null,error:null};
   Object.assign(found,row);return {data:{id:found.id},error:null};
  }};
  return query;
 }
})};
const context = vm.createContext({
 window:{supabase:{createClient:()=>sb}},
 document:{querySelector:s=>{if(!nodes.has(s))nodes.set(s,{innerHTML:'',textContent:'',addEventListener(){},classList:{add(){},remove(){}}});return nodes.get(s)}},
 Intl,Date:FixedDate,console:{...console,error:e=>loggedErrors.push(e?.message)},setTimeout:()=>0,crypto:{randomUUID:()=> '00000000-0000-4000-8000-000000000123'},confirm:()=>confirmResult,prompt:(label,value)=>{promptDefaults.push({label,value});return promptAnswers.shift()},
 FormData:class {constructor(form){this.data=form.data}entries(){return Object.entries(this.data)}}
});
vm.runInContext(source,context);
const app=context.testApp,S=app.S;
const s={id:'valentina',name:'Cantiere esempio',client_name:'Cantiere esempio',status:'active',contract_value:11745.23,collected_amount:0};
S.sites=[s];S.user={id:'owner'};S.workspace='jessica';
S.hours=[
 {id:'valerio',site_id:s.id,hours:9,work_date:'2026-10-10',hourly_cost:16,payable_hours:9,payment_status:'unpaid',worker_name_snapshot:'Operaio A'},
 {id:'robertino',site_id:s.id,hours:5,work_date:'2026-10-06',hourly_cost:13,payable_hours:5,cost_amount_override:117,payment_status:'paid',worker_name_snapshot:'Operaio B'}
];
S.laborAdjustments=[
 {site_id:s.id,worker_name:'Titolare',hours:9,amount:0,paid:true,period_label:'02/10/2026',created_at:'2026-10-02'},
 {site_id:s.id,worker_name:'Operaio C',hours:9,amount:100,paid:true,period_label:'02/10/2026',created_at:'2026-10-02'},
 {site_id:s.id,worker_name:'Operaio A',hours:8,amount:130,paid:true,period_label:'03/10/2026',created_at:'2026-10-04'},
 {site_id:s.id,worker_name:'Operaio A',hours:8,amount:150,paid:true,period_label:'2026-10-04',created_at:'2026-10-04'},
 {site_id:s.id,worker_name:'Operaio B',hours:7,amount:91,paid:true,period_label:'2026-10-08',created_at:'2026-10-08'},
 {site_id:s.id,worker_name:'Operaio B',hours:7,amount:91,paid:true,period_label:'2026-10-09',created_at:'2026-10-10'}
];
let t=app.siteTotals(s);
assert.equal(t.workedHours,62);
assert.equal(t.laborRecords,8);
assert.equal(t.laborCost,823); // Keep the existing cost override and hourly rate.
assert.equal(t.unpaidCosts,144);
assert.equal(app.workedHours([{hours:.1}],[{hours:.2}]),.3);
assert.equal(app.adjustmentDay(S.laborAdjustments[0]),'2026-10-02');
assert.equal(app.adjustmentDay({period_label:'Totale precedente'}),'');
assert.match(app.sitesPage(),/Ore 62/);
assert.match(app.siteDetailPage(s),/62 h/);
assert.match(app.siteDetailPage(s),/8 registrazioni, incluso lo storico/);
assert.doesNotMatch(app.siteDetailPage(s),/5 da pagare/);
assert.match(app.home(),/Ore lavorate totali<\/small><b>62 h/);
assert.match(app.home(),/Ore oggi<\/small><b>9 h/);
assert.match(app.finance(),/62 ore lavorate/);

S.sites.push({id:'giusy',name:'Cliente Esempio A',client_name:'Cliente Esempio A',status:'planned'});
S.schedule=[
 {id:'job',site_id:'giusy',schedule_date:'2026-10-11',scheduled_at:'2026-10-11T06:00:00Z',title:'Inizio lavoro — Cliente Esempio A',notes:'Fase 1: smontaggio cucina',status:'planned',updated_at:'2026-10-10T18:45:19Z',metadata:{contact_name:'Cliente Esempio A',crew:'Operaio A, Operaio B',total_amount:4500,expected_amount:2500,planned_hours:16,estimated_cost:300,invoiceable:false}},
 {id:'past',site_id:s.id,schedule_date:'2026-10-06',title:'Avanzamento lavori',status:'done'},
 {id:'tiziana',schedule_date:'2026-10-14',title:'Inizio lavoro Cliente Esempio B',status:'planned',metadata:{total_amount:1600,expected_amount:900,invoiceable:false}}
];
S.items=[
 {id:'deposit',item_type:'receivable',category:'acconto',status:'cancelled',amount:2500,metadata:{schedule_id:'job'},title:'Acconto previsto Giusy',due_at:'2026-10-11T10:00:00Z'},
 {id:'tiziana-deposit',item_type:'receivable',category:'acconto',status:'open',amount:900,metadata:{schedule_id:'tiziana'},title:'Acconto previsto Cliente Esempio B',due_at:'2026-10-14T10:00:00Z'},
 {id:'reminder',item_type:'task',status:'open',due_at:'2026-10-11T10:00:00Z',title:'Ordina rasante'}
];
const events=app.programEvents();
assert.equal(events.length,4);
assert.ok(events.some(x=>x.id==='past'));
assert.ok(!events.some(x=>x.type==='income'||x.id==='tiziana-deposit'));
const rows=app.programRows(events);
for(const text of ['Totale lavoro','Acconto previsto','Saldo previsto','Ore previste squadra','Costi previsti','Operaio A, Operaio B','Non fatturabile','smontaggio cucina'])assert.ok(rows.includes(text),text);
for(const amount of [2500,4500,2000])assert.ok(rows.includes(new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(amount)));
assert.match(rows,/Acconto rimosso dagli incassi previsti/);
assert.doesNotMatch(app.week(),/Acconto previsto Cliente Esempio B/);
assert.equal((app.week().split('Lavori in corso')[0].match(/Inizio lavoro — Cliente Esempio A/g)||[]).length,1);
assert.deepEqual(Array.from(app.weekDays()),['2026-10-05','2026-10-06','2026-10-07','2026-10-08','2026-10-09','2026-10-10','2026-10-11']);
S.weekOffset=1;assert.equal(app.weekDays()[0],'2026-10-12');S.weekOffset=0;
assert.equal(app.weekOffsetFor('2026-10-14'),1);
assert.equal(app.weekOffsetFor('2026-10-11'),0);
assert.equal(app.weekOffsetFor('2026-10-04'),-1);
S.form='event';S.editScheduleId='job';
let formHtml=app.addPage();
for(const pair of [['expected_amount','2500'],['total_amount','4500'],['planned_hours','16'],['estimated_cost','300'],['crew','Operaio A, Operaio B']])assert.ok(formHtml.includes(`name="${pair[0]}" type=`)&&formHtml.includes(`value="${pair[1]}"`));
assert.doesNotMatch(formHtml,/name="invoiceable" value="true" checked/);
assert.equal(app.jobPlan(S.schedule[0]).expected_amount,2500); // Even with cancelled financial forecast.

// Bottom of Programma contains tasks and the same purchase requests saved by Da comprare.
S.items.push({id:'undated',item_type:'task',status:'open',title:'Telefonare al cliente senza scadenza'});
S.materials=[
 {id:'purchase-request',site_id:'giusy',status:'requested',item:'Rasante da acquistare',quantity:5,unit:'sacchi',note:'Per la fase 1'},
 {id:'already-bought',site_id:'giusy',status:'purchased',item:'Materiale già acquistato'}
];
const programHtml=app.week();
assert.doesNotMatch(programHtml,/Prossimi impegni/);
const lowerSection=programHtml.slice(programHtml.indexOf('<h2>Promemoria e materiali</h2>'));
for(const text of ['Ordina rasante','Telefonare al cliente senza scadenza','Senza scadenza','Rasante da acquistare','5 sacchi','Per la fase 1','Cliente Esempio A'])assert.ok(lowerSection.includes(text),text);
assert.doesNotMatch(lowerSection,/Inizio lavoro|Acconto previsto|Materiale già acquistato/);
for(const action of ['appEditMaterial','appCompleteMaterial','appDeleteMaterial'])assert.ok(lowerSection.includes(`${action}('purchase-request')`),action);
assert.match(programHtml,/Lavori da iniziare/);assert.match(programHtml,/Lavori in corso/);assert.match(programHtml,/Calendario della settimana/);
assert.equal(app.reminderEvents().length,2);

(async()=>{
 app.setLoad(async()=>{});
 const button={disabled:false,textContent:''},form={data:{schedule_date:'2026-10-11',time:'08:00',site_id:'giusy',contact_name:'Cliente Esempio A',title:'Inizio lavoro',notes:'Fase 1',crew:'Operaio A',planned_hours:'16',estimated_cost:'300',expected_amount:'2500',total_amount:'4500'},querySelector:()=>button};
 await app.submit({preventDefault(){},currentTarget:form});
 assert.equal(S.tab,'week');
 assert.equal(calls[0].name,'save_simple_job');
 assert.equal(calls[0].args.p_schedule_id,'job');
 assert.equal(calls[0].args.p_job.is_new,false);
 assert.equal(calls[0].args.p_job.expected_updated_at,'2026-10-10T18:45:19Z');
 assert.equal(calls[0].args.p_job.invoiceable,false);
 assert.equal(calls[0].args.p_job.planned_hours,'16');
 // Failed new-job save and retry must keep the same request id.
 S.editScheduleId=null;S.draftScheduleId=null;rpcError={message:'Simulated network failure'};
 await app.submit({preventDefault(){},currentTarget:form});
 const id=calls[1].args.p_schedule_id;rpcError=null;
 await app.submit({preventDefault(){},currentTarget:form});
 assert.equal(calls[2].args.p_schedule_id,id);
 assert.equal(S.draftScheduleId,null);
 S.form='material';
 form.data={item:'Rasante da acquistare',site_id:'giusy',quantity:'5',unit:'sacchi',note:'Per la fase 1'};
 await app.submit({preventDefault(){},currentTarget:form});
 assert.equal(inserts[0].table,'material_requests');
 assert.equal(inserts[0].row.site_id,'giusy');assert.equal(inserts[0].row.quantity,5);assert.equal(inserts[0].row.status,'requested');
 assert.equal(S.tab,'week');
 assert.match(app.addPage(),/Programma → Promemoria e materiali/);
 // Material edits update the same row, retain its history and appear at the new site.
 for(const record of S.materials)materialRecords.set(record.id,{...record,workspace_id:'jessica',requested_by:'owner',priority:'normal'});
 materialRecords.set('delete-request',{id:'delete-request',workspace_id:'jessica',site_id:'giusy',item:'Profilo da eliminare',status:'requested'});
 app.setLoad(async()=>{S.materials=Array.from(materialRecords.values()).filter(x=>x.workspace_id===S.workspace&&x.status==='requested').map(x=>({...x}))});
 const financesBefore=JSON.stringify([S.hours,S.laborAdjustments,S.costs,S.receipts,S.invoices,S.items]);
 context.window.appEditMaterial('purchase-request');
 assert.equal(S.form,'material');assert.equal(S.editMaterialId,'purchase-request');
 formHtml=app.addPage();
 for(const value of ['value="Rasante da acquistare"','value="5"','value="sacchi"','value="Per la fase 1"','value="giusy" selected','Salva modifiche'])assert.ok(formHtml.includes(value),value);
 form.data={item:'Rasante aggiornato',quantity:'6.5',unit:'sacchi',site_id:s.id,note:'Seconda fase'};
 await app.submit({preventDefault(){},currentTarget:form});
 assert.equal(inserts.length,1);assert.equal(updates.length,1);
 assert.deepEqual(updates[0].filters,[['id','purchase-request'],['workspace_id','jessica'],['status','requested']]);
 assert.equal(materialRecords.get('purchase-request').quantity,6.5);
 assert.equal(materialRecords.get('purchase-request').requested_by,'owner');
 assert.equal(S.editMaterialId,null);assert.equal(S.tab,'week');
 assert.match(app.siteDetailPage(s),/Rasante aggiornato/);
 assert.match(app.remindersAndMaterials(),/6.5 sacchi/);
 // Invalid edits, stale records and transport errors do not claim success or create duplicates.
 context.window.appEditMaterial('purchase-request');
 form.data.quantity='-1';await app.submit({preventDefault(){},currentTarget:form});
 assert.equal(updates.length,1);assert.equal(S.editMaterialId,'purchase-request');assert.equal(button.disabled,false);
 form.data.quantity='7';form.data.site_id='another-company';await app.submit({preventDefault(){},currentTarget:form});
 assert.equal(updates.length,1);form.data.site_id=s.id;
 updateError={message:'Simulated network failure'};await app.submit({preventDefault(){},currentTarget:form});
 assert.equal(S.editMaterialId,'purchase-request');assert.equal(button.textContent,'Salva modifiche');
 updateError=null;materialRecords.get('purchase-request').status='purchased';
 await app.submit({preventDefault(){},currentTarget:form});
 assert.equal(S.editMaterialId,'purchase-request');assert.equal(inserts.length,1);
 materialRecords.get('purchase-request').status='requested';await app.submit({preventDefault(){},currentTarget:form});
 assert.equal(S.editMaterialId,null);assert.equal(materialRecords.get('purchase-request').quantity,7);
 // Completion and deletion remove pending rows from every loaded section, without creating a cost.
 await context.window.appCompleteMaterial('purchase-request');
 assert.equal(materialRecords.get('purchase-request').status,'purchased');
 assert.equal(materialRecords.get('purchase-request').purchased_by,'owner');
 assert.equal(materialRecords.get('purchase-request').resolved_at,materialRecords.get('purchase-request').purchased_at);
 assert.doesNotMatch(app.remindersAndMaterials(),/Rasante aggiornato/);
 assert.doesNotMatch(app.siteDetailPage(s),/Rasante aggiornato/);
 let updateCount=updates.length;confirmResult=false;await context.window.appDeleteMaterial('delete-request');
 assert.equal(updates.length,updateCount);assert.equal(materialRecords.get('delete-request').status,'requested');
 confirmResult=true;await context.window.appDeleteMaterial('delete-request');
 assert.equal(materialRecords.get('delete-request').status,'cancelled');assert.ok(materialRecords.has('delete-request'));
 assert.doesNotMatch(app.remindersAndMaterials(),/Profilo da eliminare/);
 updateCount=updates.length;await context.window.appCompleteMaterial('foreign-or-missing-id');assert.equal(updates.length,updateCount);
 assert.equal(JSON.stringify([S.hours,S.laborAdjustments,S.costs,S.receipts,S.invoices,S.items]),financesBefore);
 assert.ok(updates.every(x=>x.table==='material_requests'&&x.filters.some(([key,value])=>key==='workspace_id'&&value==='jessica')));
 assert.deepEqual(loggedErrors,['Simulated network failure','La quantità deve essere un numero maggiore o uguale a zero','Seleziona un cantiere dell’azienda attuale','Simulated network failure','Il materiale è già stato aggiornato o non è più disponibile. Ricarica la pagina.','Il materiale non è più disponibile. Ricarica la pagina.']);
 // Receipt kinds must match the database constraint; an unbilled advance has no invoice.
 S.form='receipt';S.editMaterialId=null;app.setLoad(async()=>{});
 const receiptForm=app.addPage();
 assert.match(receiptForm,/value="advance">Acconto/);
 assert.match(receiptForm,/value="balance">Saldo/);
 assert.match(receiptForm,/value="">Non fatturato/);
 assert.doesNotMatch(receiptForm,/value="deposit"|value="invoice"/);
 form.data={received_date:'2026-10-11',amount:'2700',site_id:s.id,receipt_type:'advance',invoice_id:'',note:'Acconto'};
 await app.submit({preventDefault(){},currentTarget:form});
 const receipt=inserts.at(-1);
 assert.equal(receipt.table,'cash_receipts');assert.equal(receipt.row.receipt_type,'advance');
 assert.equal(receipt.row.invoice_id,null);assert.equal(receipt.row.amount,2700);
 assert.equal(receipt.row.workspace_id,'jessica');assert.equal(receipt.row.fiscal_year,2026);
 S.receipts=[{id:'example-receipt',...receipt.row}];
 assert.match(app.finance(),/Acconto · Non fatturato/);
 assert.match(app.siteDetailPage(s),/Acconto · Non fatturato/);
 const receiptInsertCount=inserts.length;
 form.data.receipt_type='deposit';await app.submit({preventDefault(){},currentTarget:form});
 assert.equal(inserts.length,receiptInsertCount);
 form.data.receipt_type='balance';S.invoices=[{id:'example-invoice',site_id:s.id,amount:1600}];form.data.invoice_id='example-invoice';
 await app.submit({preventDefault(){},currentTarget:form});
 assert.equal(inserts.at(-1).row.invoice_id,'example-invoice');assert.equal(inserts.at(-1).row.receipt_type,'balance');
 S.receipts=[{...inserts.at(-1).row}];assert.match(app.siteDetailPage(s),/Saldo · Fatturato/);
 form.data.invoice_id='foreign-invoice';await app.submit({preventDefault(){},currentTarget:form});
 assert.equal(inserts.length,receiptInsertCount+1);
 assert.deepEqual(loggedErrors.slice(-2),['Seleziona Acconto, Saldo o Altro','Seleziona una fattura del cantiere indicato']);
 // A fixed team price replaces hourly multiplication while preserving hours and payment state.
 S.form='hours';S.hours=[];S.laborAdjustments=[];S.costs=[];S.receipts=[];S.invoices=[];
 S.tab='add';
 assert.match(app.addPage(),/name="cost_amount_override"/);
 assert.match(app.addPage(),/Costo totale €/);
 form.data={work_date:'2026-10-10',hours:'3',site_id:s.id,worker_name_snapshot:'Squadra esempio',hourly_cost:'18',payable_hours:'3',cost_amount_override:'500',payment_status:'unpaid',note:'Prezzo fisso squadra'};
 const beforeLabor=inserts.length;
 await app.submit({preventDefault(){},currentTarget:form});
 let team={id:'team-example',...inserts.at(-1).row};
 assert.equal(inserts.at(-1).table,'time_entries');assert.equal(team.hours,3);
 assert.equal(team.cost_amount_override,500);assert.equal(team.hourly_cost,18);
 assert.equal(team.payment_status,'unpaid');assert.equal(team.paid_at,null);assert.equal(team.paid_by,null);
 S.hours=[team];
 let totals=app.siteTotals(s);
 assert.equal(totals.workedHours,3);assert.equal(totals.laborCost,500);assert.equal(totals.totalCosts,500);
 assert.equal(totals.unpaidCosts,500);
 assert.match(app.siteDetailPage(s),/Prezzo fisso/);
 assert.match(app.home(),/Prezzo fisso/);
 assert.match(app.finance(),/Prezzo fisso/);
 form.data.payment_status='paid';await app.submit({preventDefault(){},currentTarget:form});
 team={id:'team-example',...inserts.at(-1).row};S.hours=[team];
 assert.equal(team.payment_status,'paid');assert.equal(team.paid_by,'owner');assert.ok(team.paid_at);
 assert.equal(app.siteTotals(s).unpaidCosts,0);assert.equal(app.siteTotals(s).laborCost,500);
 // No second cost entry is created; leaving the fixed amount blank preserves hourly costs.
 assert.ok(inserts.slice(beforeLabor).every(x=>x.table==='time_entries'));
 form.data.cost_amount_override='';await app.submit({preventDefault(){},currentTarget:form});
 S.hours=[{...inserts.at(-1).row}];assert.equal(S.hours[0].cost_amount_override,null);
 assert.equal(app.siteTotals(s).laborCost,54);
 form.data.cost_amount_override='0';await app.submit({preventDefault(){},currentTarget:form});
 S.hours=[{...inserts.at(-1).row}];assert.equal(S.hours[0].cost_amount_override,0);assert.equal(app.siteTotals(s).laborCost,0);
 const validLaborInserts=inserts.length;
 for(const bad of ['-1','not-a-number','Infinity']){form.data.cost_amount_override=bad;await app.submit({preventDefault(){},currentTarget:form})}
 assert.equal(inserts.length,validLaborInserts);
 form.data.cost_amount_override='500';form.data.site_id='other-company';await app.submit({preventDefault(){},currentTarget:form});
 assert.equal(inserts.length,validLaborInserts);
 form.data.site_id=s.id;form.data.hours='25';await app.submit({preventDefault(){},currentTarget:form});
 assert.equal(inserts.length,validLaborInserts);
 // Fixed contractor quotes need no invented hours and are counted once as labor, with the same paid toggle.
 S.form='hours';S.hours=[];S.laborAdjustments=[];S.costs=[];
 const fixedOnlyForm=app.addPage(),hoursInput=fixedOnlyForm.match(/<input name="hours"[^>]*>/)[0];
 assert.doesNotMatch(hoursInput,/required/);
 assert.match(fixedOnlyForm,/più giorni inserisci il prezzo una sola volta/);
 form.data={work_date:'2026-10-10',hours:'',site_id:s.id,worker_name_snapshot:'Artigiano esempio',hourly_cost:'',payable_hours:'',cost_amount_override:'500',payment_status:'unpaid',note:'Prezzo totale per due giorni'};
 const fixedOnlyStart=inserts.length;
 await app.submit({preventDefault(){},currentTarget:form});
 let quote={id:'quote-example',...inserts.at(-1).row};
 assert.equal(inserts.at(-1).table,'site_labor_adjustments');assert.equal(quote.amount,500);
 assert.equal(quote.hours,0);assert.equal(quote.period_label,'2026-10-10');assert.equal(quote.paid,false);
 assert.equal(quote.workspace_id,S.workspace);assert.equal(quote.site_id,s.id);assert.equal(quote.created_by,'owner');
 S.laborAdjustments=[quote];
 assert.equal(app.siteTotals(s).workedHours,0);assert.equal(app.siteTotals(s).laborCost,500);
 assert.equal(app.siteTotals(s).costTotal,0);assert.equal(app.siteTotals(s).totalCosts,500);assert.equal(app.siteTotals(s).unpaidCosts,500);
 assert.match(app.siteDetailPage(s),/Prezzo fisso/);assert.match(app.home(),/Prezzo fisso/);assert.match(app.finance(),/Artigiano esempio/);
 assert.ok(app.siteDetailPage(s).includes("appSetAdjustmentPaid('quote-example',this.checked)"));
 materialRecords.set(quote.id,quote);app.setLoad(async()=>{S.laborAdjustments=[{...materialRecords.get('quote-example')}]});
 await context.window.appSetAdjustmentPaid('quote-example',true);
 assert.equal(app.siteTotals(s).unpaidCosts,0);assert.equal(app.siteTotals(s).totalCosts,500);
 assert.doesNotMatch(app.finance(),/Artigiano esempio/);
 app.setLoad(async()=>{});form.data.payment_status='paid';await app.submit({preventDefault(){},currentTarget:form});
 assert.equal(inserts.at(-1).row.paid,true);assert.equal(inserts.at(-1).row.amount,500);
 assert.ok(inserts.slice(fixedOnlyStart).every(x=>x.table==='site_labor_adjustments'));
 const fixedOnlyValid=inserts.length;form.data.cost_amount_override='';await app.submit({preventDefault(){},currentTarget:form});
 assert.equal(inserts.length,fixedOnlyValid);assert.equal(loggedErrors.at(-1),'Inserisci le ore oppure il costo totale a prezzo fisso');
 form.data.cost_amount_override='500';form.data.payable_hours='4';await app.submit({preventDefault(){},currentTarget:form});
 assert.equal(inserts.length,fixedOnlyValid);assert.equal(loggedErrors.at(-1),'Per indicare ore da pagare, inserisci anche le ore lavorate');
 form.data.payable_hours='';form.data.cost_amount_override='-1';await app.submit({preventDefault(){},currentTarget:form});
 assert.equal(inserts.length,fixedOnlyValid);
 // A reminder can have no date, and must remain outside the calendar after create and edit.
 S.form='reminder';S.tab='add';S.items=[];app.setLoad(async()=>{});
 const reminderForm=app.addPage(),dateInput=reminderForm.match(/<input name="reminder_date"[^>]*>/)[0];
 assert.match(reminderForm,/Giorno \(facoltativo\)/);assert.doesNotMatch(dateInput,/required/);
 assert.match(dateInput,/value=""/);
 form.data={reminder_date:'',time:'',site_id:'',title:'Telefonare al fornitore',details:'Chiedere disponibilità'};
 await app.submit({preventDefault(){},currentTarget:form});
 let reminder={id:'new-reminder',...inserts.at(-1).row};
 assert.equal(inserts.at(-1).table,'personal_items');assert.equal(reminder.due_at,null);assert.equal(reminder.remind_at,null);
 S.items=[reminder];
 assert.equal(app.programEvents().filter(x=>x.id===reminder.id).length,0);
 assert.match(app.remindersAndMaterials(),/Telefonare al fornitore/);
 assert.match(app.remindersAndMaterials(),/Senza scadenza/);
 for(const action of ['appEditItem','appCompleteItem','appDeleteItem'])assert.ok(app.remindersAndMaterials().includes(action+"('new-reminder')"));
 // Dated reminders still appear on the selected day, with an optional time.
 form.data.reminder_date='2026-10-12';await app.submit({preventDefault(){},currentTarget:form});
 reminder={id:'dated-reminder',...inserts.at(-1).row};S.items=[reminder];
 assert.equal(app.programEvents().find(x=>x.id===reminder.id).date,'2026-10-12');assert.equal(reminder.remind_at,null);
 form.data.time='08:30';await app.submit({preventDefault(){},currentTarget:form});
 reminder={id:'timed-reminder',...inserts.at(-1).row};S.items=[reminder];
 assert.ok(reminder.remind_at);assert.equal(app.programEvents().find(x=>x.id===reminder.id).date,'2026-10-12');
 const validReminderInserts=inserts.length;form.data.reminder_date='';await app.submit({preventDefault(){},currentTarget:form});
 assert.equal(inserts.length,validReminderInserts);assert.equal(loggedErrors.at(-1),'Per indicare un’ora, scegli anche il giorno');
 // Removing the date clears both timestamps; editing an undated note does not add today's date.
 materialRecords.set('timed-reminder',reminder);
 app.setLoad(async()=>{S.items=[{...materialRecords.get('timed-reminder')}]});
 promptAnswers=['Titolo aggiornato','','Dettagli aggiornati'];await context.window.appEditItem('timed-reminder');
 assert.equal(materialRecords.get('timed-reminder').due_at,null);assert.equal(materialRecords.get('timed-reminder').remind_at,null);
 promptAnswers=['Solo una nota','','Altri dettagli'];await context.window.appEditItem('timed-reminder');
 assert.equal(promptDefaults.at(-2).value,'');
 assert.equal(materialRecords.get('timed-reminder').due_at,null);
 assert.match(app.remindersAndMaterials(),/Solo una nota/);assert.equal(app.programEvents().filter(x=>x.id==='timed-reminder').length,0);
 app.setLoad(async()=>{});
 // The old company's financial records must not remain clickable during a switch.
 S.workspaces=[{id:'one',name:'Example One'},{id:'two',name:'Example Two'}];S.workspace='one';S.tab='sites';
 let finishLoad;app.setLoad(()=>new Promise(resolve=>{finishLoad=resolve}));
 const changing=context.window.appWorkspace('two');
 assert.equal(S.loading,true);
 assert.match(nodes.get('#root').innerHTML,/Caricamento azienda/);
 assert.doesNotMatch(nodes.get('#root').innerHTML,/Ore 62/);
 context.window.appTab('finance');assert.equal(S.tab,'sites');
 finishLoad();await changing;assert.equal(S.loading,false);assert.equal(S.workspace,'two');
 console.log('PASS: hours, historical costs, calendar/job details, material edit/complete/delete, company scope, fixed team prices with or without hours, payment states, undated reminders, validation and failed-save retries');
})().catch(e=>{console.error(e);process.exitCode=1});
