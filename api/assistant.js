import { generateText } from 'ai';

const SB_URL = 'https://rdxaxsosqiudklhvezuq.supabase.co';
const SB_KEY = 'sb_publishable_abewBdHybtalh7RsfWbXUA_oOLebqMn';

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function extractJson(text) {
  const clean = String(text || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(clean); } catch {}
  const a = clean.indexOf('{'), b = clean.lastIndexOf('}');
  if (a >= 0 && b > a) return JSON.parse(clean.slice(a, b + 1));
  throw new Error('invalid_ai_json');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });
  try {
    const auth = String(req.headers.authorization || '');
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return json(res, 401, { error: 'missing_session' });

    const vr = await fetch(`${SB_URL}/auth/v1/user`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${token}` },
    });
    if (!vr.ok) return json(res, 401, { error: 'invalid_session' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const input = String(body.input || '').trim().slice(0, 12000);
    if (!input) return json(res, 400, { error: 'empty_input' });
    const mode = ['capture', 'ask', 'plan'].includes(body.mode) ? body.mode : 'capture';
    const now = String(body.now || new Date().toISOString());
    const context = body.context && typeof body.context === 'object' ? body.context : {};

    const system = `Sei il motore operativo di Matteo OS, un assistente personale e aziendale italiano.
Devi trasformare linguaggio naturale, spesso dettato e imperfetto, in dati ordinati SENZA inventare dettagli.
Fuso orario: Europe/Rome. Data/ora di riferimento: ${now}.

Restituisci ESCLUSIVAMENTE JSON valido con questa struttura:
{
  "summary": "breve conferma in italiano",
  "reply": "risposta utile se l'utente fa una domanda o chiede pianificazione",
  "needs_review": false,
  "actions": [
    {
      "type": "task|event|reminder|expense|note|memory|email_draft|business_schedule|business_expense",
      "scope": "personal|business",
      "title": "titolo breve",
      "details": "dettagli o null",
      "priority": "low|normal|high|urgent",
      "due_at": "ISO-8601 con offset Europe/Rome oppure null",
      "remind_at": "ISO-8601 con offset Europe/Rome oppure null",
      "amount": 0,
      "category": "categoria o null",
      "contact_name": "persona o null",
      "site_name": "cantiere/cliente o null",
      "paid": true,
      "email_to": "email esplicita o null",
      "email_subject": "oggetto o null",
      "email_body": "bozza o null",
      "memory_kind": "decision|fact|idea|preference|result|note",
      "confidence": 0.95
    }
  ]
}

Regole:
- Risolvi oggi/domani/lunedì/prossima settimana usando la data di riferimento e Europe/Rome.
- Se l'utente dice "ho speso/pagato" usa expense/business_expense con paid=true. Se dice "devo pagare" paid=false e deve restare da fare.
- Se cita chiaramente un cantiere/cliente e la frase è lavorativa usa scope=business.
- Appuntamenti personali o di lavoro con data/ora => event o business_schedule.
- "ricordami" => reminder con remind_at.
- "scrivi una mail" => email_draft: prepara testo, NON dichiarare che è stata inviata.
- Informazioni che vale la pena ricordare nel tempo => memory.
- Non inventare email, importi, orari, persone o cantieri. Se manca un dato essenziale, abbassa confidence sotto 0.6 e imposta needs_review=true.
- Se mode=ask o plan, usa il contesto per rispondere e crea actions solo se l'utente ha esplicitamente chiesto di registrare/modificare qualcosa.
- Sii sintetico e operativo.`;

    const prompt = JSON.stringify({ mode, input, context }, null, 2);
    const model = mode === 'capture' ? 'openai/gpt-5.6-luna' : 'openai/gpt-5.6-sol';
    const result = await generateText({ model, system, prompt });
    const parsed = extractJson(result.text);
    parsed.actions = Array.isArray(parsed.actions) ? parsed.actions.slice(0, 20) : [];
    return json(res, 200, parsed);
  } catch (e) {
    console.error('assistant_error', e);
    return json(res, 500, { error: 'assistant_failed', message: String(e?.message || e) });
  }
}
