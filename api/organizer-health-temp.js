import { localInterpret } from './local-organizer.js';
export default async function handler(req,res){
  const context={sites:[{name:'Valentina Graneri',client:'Valentina',location:'Ziracco'},{name:'Ivo Valloppi',client:'Ivo',location:'Cividale'}]};
  const result=localInterpret('Domani alle 8 devo andare da Valentina, ricordami di portare ZL25 e primer.',context,'2026-10-03T20:26:41Z');
  return res.status(200).json({ok:result.actions?.length===2,engine:result.engine,actions:result.actions?.map(x=>({type:x.type,due_at:x.due_at,site_name:x.site_name,title:x.title}))});
}
