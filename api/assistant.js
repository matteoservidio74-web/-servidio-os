import { generateText } from 'ai';
import { localInterpret, localAnswer } from './local-organizer.js';

const SB_URL='https://rdxaxsosqiudklhvezuq.supabase.co';
const SB_KEY='sb_publishable_abewBdHybtalh7RsfWbXUA_oOLebqMn';
function json(res,status,body){res.status(status).setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(body))}
function extract(text){const clean=String(text||'').replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/i,'').trim();try{return JSON.parse(clean)}catch{}const a=clean.indexOf('{'),b=clean.lastIndexOf('}');if(a>=0&&b>a)return JSON.parse(clean.slice(a,b+1));throw new Error('invalid_ai_json')}
const SYSTEM=`Sei Matteo OS, assistente operativo personale e aziendale italiano. Trasforma dettatura imperfetta in dati ordinati senza inventare dettagli. Fuso: Europe/Rome. Rispondi esclusivamente con JSON: {"summary":"...","reply":"...","needs_review":false,"actions":[{"type":"task|event|reminder|expense|note|memory|email_draft|business_schedule|business_expense","scope":"personal|business","title":"...","details":null,"priority":"low|normal|high|urgent","due_at":null,"remind_at":null,"amount":0,"category":null,"contact_name":null,"site_name":null,"paid":true,"email_to":null,"email_subject":null,"email_body":null,"memory_kind":"decision|fact|idea|preference|result|note","confidence":0.95}]}. Risolvi date relative dal now fornito. Se ho speso/pagato: paid=true. Se devo pagare: paid=false. Appuntamenti con data/ora: event o business_schedule. Ricordami: reminder. Email: prepara bozza, non dichiarare invio. Se manca dato essenziale confidence<0.6 e needs_review=true. In ask/plan crea azioni solo se esplicitamente richiesto.`;

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
