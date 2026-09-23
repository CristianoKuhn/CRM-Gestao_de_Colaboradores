// api/lisa-debug.ts — diagnóstico final
export default async function handler(req: any, res: any) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  if (!apiKey) return res.status(500).json({ error: 'Sem GEMINI_API_KEY' });

  const resultados: any[] = [];

  // O Google recomenda gemini-2.5-flash em TODAS as mensagens de erro.
  // Testando as variações exatas do nome que o Google usa internamente.
  const testes = [
    { model: 'gemini-2.5-flash',                 auth: 'x-goog-api-key' },
    { model: 'gemini-2.5-flash',                 auth: 'query-key'      },
    { model: 'gemini-2.5-flash-preview-06-05',   auth: 'x-goog-api-key' },
    { model: 'gemini-2.5-flash-preview-05-20',   auth: 'x-goog-api-key' },
    { model: 'gemini-2.5-flash-002',             auth: 'x-goog-api-key' },
    { model: 'gemini-2.5-flash-latest',          auth: 'x-goog-api-key' },
    { model: 'gemini-2.5-flash-exp-1206',        auth: 'x-goog-api-key' },
    { model: 'gemini-exp-1206',                  auth: 'x-goog-api-key' },
    { model: 'gemini-2.5-pro',                   auth: 'x-goog-api-key' },
    { model: 'gemini-2.5-pro-latest',            auth: 'x-goog-api-key' },
  ];

  for (const teste of testes) {
    const base = `https://generativelanguage.googleapis.com/v1beta/models/${teste.model}:generateContent`;
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
      const resultado = {
        model: teste.model,
        auth: teste.auth,
        status: r.status,
        ok: r.ok,
        resposta: r.ok
          ? d?.candidates?.[0]?.content?.parts?.[0]?.text
          : d?.error?.message?.substring(0, 120),
      };
      resultados.push(resultado);
      if (r.ok) break;
    } catch (e: any) {
      resultados.push({ model: teste.model, auth: teste.auth, erro: e.message });
    }
  }

  // Também listar os modelos disponíveis para esta chave
  let modelos: string[] = [];
  try {
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=50`;
    const lr = await fetch(listUrl);
    if (lr.ok) {
      const ld = await lr.json() as any;
      modelos = (ld.models || [])
        .map((m: any) => m.name)
        .filter((n: string) => n.includes('gemini'));
    }
  } catch { /* ignora */ }

  return res.status(200).json({
    apiKeyPrefix: apiKey.substring(0, 10) + '...',
    modelosDisponiveis: modelos,
    testes: resultados,
  });
}
