// api/lisa-debug.ts — diagnóstico completo
// Testa múltiplos modelos e métodos de autenticação para identificar o que funciona.

export default async function handler(req: any, res: any) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  if (!apiKey) return res.status(500).json({ error: 'Sem GEMINI_API_KEY' });

  const resultados: any[] = [];

  // Combinações a testar: modelo + URL + método de autenticação
  const testes = [
    { model: 'gemini-2.5-flash',      auth: 'x-goog-api-key', version: 'v1beta' },
    { model: 'gemini-2.5-flash',      auth: 'x-goog-api-key', version: 'v1beta' },
    { model: 'gemini-2.5-flash-lite', auth: 'x-goog-api-key', version: 'v1beta' },
    { model: 'gemini-2.0-flash',      auth: 'x-goog-api-key', version: 'v1beta' },
    { model: 'gemini-2.5-flash',      auth: 'query-key',      version: 'v1beta' },
    { model: 'gemini-2.5-flash',      auth: 'query-key',      version: 'v1beta' },
    { model: 'gemini-2.0-flash',      auth: 'query-key',      version: 'v1beta' },
  ];

  for (const teste of testes) {
    const base = `https://generativelanguage.googleapis.com/${teste.version}/models/${teste.model}:generateContent`;
    const url = teste.auth === 'query-key' ? `${base}?key=${apiKey}` : base;
    const headers: any = { 'Content-Type': 'application/json' };
    if (teste.auth === 'x-goog-api-key') headers['x-goog-api-key'] = apiKey;

    try {
      const r = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'OK' }] }],
        }),
      });
      const d = await r.json() as any;
      resultados.push({
        model: teste.model,
        auth: teste.auth,
        version: teste.version,
        status: r.status,
        ok: r.ok,
        resposta: r.ok ? d?.candidates?.[0]?.content?.parts?.[0]?.text : d?.error?.message,
      });
      if (r.ok) break; // Encontrou — para aqui
    } catch (e: any) {
      resultados.push({ model: teste.model, auth: teste.auth, erro: e.message });
    }
  }

  return res.status(200).json({
    apiKeyPrefix: apiKey.substring(0, 10) + '...',
    resultados,
  });
}
