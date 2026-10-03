import { generateText } from 'ai';
export default async function handler(req,res){
  if(req.method!=='GET') return res.status(405).end();
  try{
    const r=await generateText({model:'openai/gpt-5.6-luna',prompt:'Rispondi esclusivamente con la parola OK.'});
    return res.status(200).json({ok:String(r.text||'').trim().toUpperCase()==='OK'});
  }catch(e){return res.status(500).json({ok:false,error:String(e?.message||e).slice(0,300)});}
}
