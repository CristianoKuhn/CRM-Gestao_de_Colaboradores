// api/lisa-debug.ts — confirma qual modelo funciona com esta chave
export default async function handler(req: any, res: any) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  if (!apiKey) return res.status(500).json({ error: 'Sem GEMINI_API_KEY' });

  const model = 'gemini-3.6-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: 'Diga apenas: OK' }] }],
    }),
  });
  const d = await r.json() as any;

  return res.status(200).json({
    model,
    status: r.status,
    ok: r.ok,
    apiKeyPrefix: apiKey.substring(0, 10) + '...',
    resposta: r.ok ? d?.candidates?.[0]?.content?.parts?.[0]?.text : d?.error?.message,
  });
}
