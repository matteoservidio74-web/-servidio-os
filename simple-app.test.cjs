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
class FixedDate extends Date {constructor(...args){super(...(args.length?args:['2026-10-10T12:00:00Z']))}static now(){return new Date('2026-10-10T12:00:00Z').getTime()}}
let rpcError = null;
const sb = {rpc:async(name,args)=>{calls.push({name,args});return {error:rpcError}},from:table=>({insert:async row=>{inserts.push({table,row});return {error:null}}})};
const context = vm.createContext({
 window:{supabase:{createClient:()=>sb}},
 document:{querySelector:s=>{if(!nodes.has(s))nodes.set(s,{innerHTML:'',textContent:'',addEventListener(){},classList:{add(){},remove(){}}});return nodes.get(s)}},
 Intl,Date:FixedDate,console:{...console,error:e=>{if(e?.message!=='Simulated network failure')throw e}},setTimeout:()=>0,crypto:{randomUUID:()=> '00000000-0000-4000-8000-000000000123'},
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
 // The old company's financial records must not remain clickable during a switch.
 S.workspaces=[{id:'one',name:'Example One'},{id:'two',name:'Example Two'}];S.workspace='one';S.tab='sites';
 let finishLoad;app.setLoad(()=>new Promise(resolve=>{finishLoad=resolve}));
 const changing=context.window.appWorkspace('two');
 assert.equal(S.loading,true);
 assert.match(nodes.get('#root').innerHTML,/Caricamento azienda/);
 assert.doesNotMatch(nodes.get('#root').innerHTML,/Ore 62/);
 context.window.appTab('finance');assert.equal(S.tab,'sites');
 finishLoad();await changing;assert.equal(S.loading,false);assert.equal(S.workspace,'two');
 console.log('PASS: hours, historical costs, calendar/finance separation, full job details, edit payload and idempotent retries');
})().catch(e=>{console.error(e);process.exitCode=1});
