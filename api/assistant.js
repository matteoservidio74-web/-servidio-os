import { generateText } from 'ai';
import { localInterpret, localAnswer } from './local-organizer.js';

const SB_URL='https://rdxaxsosqiudklhvezuq.supabase.co';
const SB_KEY='sb_publishable_abewBdHybtalh7RsfWbXUA_oOLebqMn';
function json(res,status,body){res.status(status).setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(body))}
function extract(text){const clean=String(text||'').replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/i,'').trim();try{return JSON.parse(clean)}catch{}const a=clean.indexOf('{'),b=clean.lastIndexOf('}');if(a>=0&&b>a)return JSON.parse(clean.slice(a,b+1));throw new Error('invalid_ai_json')}
const SYSTEM=`Sei Matteo OS, cervello operativo personale e aziendale di Servidio OS. L'utente parla in italiano naturale, spesso con errori di dettatura. Devi capire l'intenzione, non copiare meccanicamente le parole. Non inventare mai cliente, cantiere, importo, ore o data.
Fuso orario Europe/Rome. Usa il CONTEXT per riconoscere cantieri reali e dati recenti.
Rispondi SOLO JSON valido: {"summary":"...","reply":"...","needs_review":false,"command":null,"actions":[...]}
command può essere null oppure delete_last oppure replace_last. Se l'utente dice elimina/cancella/annulla l'ultima cosa, usa delete_last. Se dice modifica/correggi/cambia l'ultima cosa, usa replace_last e nelle actions metti SOLO il nuovo dato corretto.
Ogni action può avere: {"type":"task|event|reminder|expense|note|memory|email_draft|business_schedule|business_expense|labor_entry|material_request|income_entry|site_update","scope":"personal|business","title":"...","details":null,"priority":"low|normal|high|urgent","due_at":null,"remind_at":null,"amount":0,"category":null,"contact_name":null,"site_name":null,"paid":true,"email_to":null,"email_subject":null,"email_body":null,"memory_kind":"decision|fact|idea|preference|result|note","worker_name":null,"hours":null,"work_date":null,"quantity":null,"unit":null,"confidence":0.95}.
REGOLE OPERATIVE:
- Operaio/lavoratore + ore + cantiere => labor_entry. Se dice pagato X euro: amount=X e paid=true. Se deve ancora pagarlo: paid=false. work_date deve essere YYYY-MM-DD. NON creare una note duplicata.
- Spesa già sostenuta per cantiere/materiali => business_expense con site_name, amount, paid=true. Spesa da pagare => paid=false.
- Materiale da comprare/ordinare/portare per un cantiere => material_request; se è solo 'portare X domani' può essere anche reminder se esplicitamente chiede ricordami.
- Incasso/acconto/saldo ricevuto da cliente/cantiere => income_entry, amount e site_name.
- Programmare lavori/cantiere in una data => business_schedule. Se manca la data ma chiede di organizzarlo, task business category programmazione.
- Aggiornamento stato lavori cantiere => site_update.
- Appuntamento personale => event. Ricordami => reminder. Email => email_draft, non dichiarare invio.
- Una frase può produrre più actions distinte.
- Se il nome pronunciato assomiglia chiaramente a un cantiere presente nel context (es. Giusi/Giusy, Paoletto/Povoletto), usa il nome canonico del cantiere nel site_name.
- Se manca il cantiere per una registrazione economica/operaio e non è deducibile con alta sicurezza, confidence<0.6 e needs_review=true: non inventarlo.
- Non trasformare comandi di modifica/eliminazione in note.
- In ask/plan non creare azioni salvo richiesta esplicita.`;

export default async function handler(req,res){
  if(req.method!=='POST')return json(res,405,{error:'method_not_allowed'});
  try{
    const auth=String(req.headers.authorization||''),token=auth.startsWith('Bearer ')?auth.slice(7):'';
    if(!token)return json(res,401,{error:'missing_session'});
    const vr=await fetch(`${SB_URL}/auth/v1/user`,{headers:{apikey:SB_KEY,Authorization:`Bearer ${token}`}});
    if(!vr.ok)return json(res,401,{error:'invalid_session'});
    const body=typeof req.body==='string'?JSON.parse(req.body):(req.body||{}),input=String(body.input||'').trim().slice(0,12000);
    if(!input)return json(res,400,{error:'empty_input'});
    const mode=['capture','ask','plan'].includes(body.mode)?body.mode:'capture',now=String(body.now||new Date().toISOString()),context=body.context&&typeof body.context==='object'?body.context:{};
    let parsed;
    try{
      const model=mode==='capture'?'openai/gpt-5.6-luna':'openai/gpt-5.6-sol';
      const result=await generateText({model,system:`${SYSTEM}\nData/ora di riferimento: ${now}`,prompt:JSON.stringify({mode,input,context})});
      parsed=extract(result.text);parsed.engine='ai';
    }catch(e){
      console.warn('matteo_os_local_fallback',String(e?.message||e).slice(0,240));
      parsed=mode==='capture'?localInterpret(input,context,now):{summary:'Programma controllato',reply:localAnswer(input,context),needs_review:false,actions:[],engine:'local'};
    }
    parsed.actions=Array.isArray(parsed.actions)?parsed.actions.slice(0,20):[];
    return json(res,200,parsed);
  }catch(e){console.error('assistant_error',e);return json(res,500,{error:'assistant_failed',message:String(e?.message||e)})}
}
