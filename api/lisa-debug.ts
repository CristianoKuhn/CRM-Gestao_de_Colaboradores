// api/lisa-debug.ts — endpoint temporário de diagnóstico
// Remove após confirmar que a Lisa funciona.

export default async function handler(req: any, res: any) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  
  // Testar o modelo sem usar @google/genai — chamada HTTP direta
  // para isolar se o problema é a biblioteca ou o modelo
  const modelToTest = 'gemini-2.5-flash';
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelToTest}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Diga apenas: OK' }] }],
        }),
      }
    );
    const data = await response.json();
    return res.status(200).json({
      success: response.ok,
      model: modelToTest,
      status: response.status,
      hasApiKey: apiKey.length > 0,
      apiKeyPrefix: apiKey.substring(0, 8) + '...',
      response: response.ok ? data?.candidates?.[0]?.content?.parts?.[0]?.text : data,
    });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}
