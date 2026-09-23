// api/lisa.ts — Backend da Lisa, assistente do Gestão360
// Chama a API Gemini diretamente via HTTP REST (sem biblioteca intermediária).

const TELAS_VALIDAS = [
  'dashboard', 'colaboradores', 'gestao-pessoas', 'usuarios',
  'tarefas', 'documentos', 'reconhecimento', 'metas', 'analytics',
  'desenvolvimento-biblioteca', 'desenvolvimento-programas',
  'desenvolvimento-indicadores', 'config',
];

const SYSTEM_INSTRUCTION = `
Você é a Lisa, assistente de IA do Gestão360 — sistema de gestão de pessoas (CRM de RH) da RBT Internet.

PERSONALIDADE: Direta, calorosa e prática. Responda como uma colega experiente. Use "você". Máximo de 3 frases por resposta — se precisar de mais, use bullets curtos.

SEU PAPEL:
- Orientar sobre como usar o sistema e interpretar dados de pessoas.
- Quando fizer sentido, indique a tela escrevendo NAVEGAR:nome-da-tela no final da resposta.
- NUNCA criar, editar, apagar ou salvar dados — só orienta.
- Se não souber algo da empresa, diga claramente.

TELAS: dashboard, colaboradores, gestao-pessoas, usuarios, tarefas, documentos, reconhecimento, metas, analytics, config

MÓDULOS PRINCIPAIS:
- Dashboard: visão executiva com alertas, desenvolvimento (prontos/lacunas), liderança.
- Colaboradores: CRM & Timeline (feedbacks, PDIs, reconhecimentos) + Desenvolvimento (capacidades com graus 0–4, evidências, prontidão).
- Gestão de Pessoas: Férias (motor completo), Relatório, DayOff, Radar de Desenvolvimento (ciclos 5 meses), Calendário.
- Tarefas de Liderança: ações com prazo, filtros por líder.
- Config → Trilha & Matriz: Competências, Escalas (graus 0–4), Matriz por Cargo.

GRAUS: 0 Não Iniciado · 1 Consciente · 2 Aplicado · 3 Avançado · 4 Referência.

Seja breve. Até 3 bullets quando necessário.
`.trim();

interface MensagemHistorico {
  role: 'user' | 'model';
  texto: string;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método não permitido.' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      success: false,
      message: 'Chave GEMINI_API_KEY não configurada na Vercel.',
    });
  }

  const { mensagem, historico = [] } = req.body as {
    mensagem: string;
    historico: MensagemHistorico[];
  };

  if (!mensagem?.trim()) {
    return res.status(400).json({ success: false, message: 'Mensagem vazia.' });
  }

  const contents = [
    ...historico.map((m: MensagemHistorico) => ({
      role: m.role,
      parts: [{ text: m.texto }],
    })),
    { role: 'user', parts: [{ text: mensagem }] },
  ];

  // gemini-3.6-flash: disponível na conta e recomendado pelo Google
  // em todas as mensagens de erro recebidas.
  const MODEL = 'gemini-3.6-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

  try {
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents,
        generation_config: { temperature: 0.7, max_output_tokens: 512 },
      }),
    });

    const data = await geminiRes.json() as any;

    if (!geminiRes.ok) {
      console.error('[api/lisa] Erro Gemini:', JSON.stringify(data));
      return res.status(500).json({
        success: false,
        message: data?.error?.message || 'Erro ao falar com a Lisa.',
      });
    }

    const textoResposta: string =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extrair instrução de navegação (NAVEGAR:tela)
    const acoes: Array<{ tela: string }> = [];
    const nav = textoResposta.match(/NAVEGAR:([a-z-]+)/i);
    if (nav && TELAS_VALIDAS.includes(nav[1].toLowerCase())) {
      acoes.push({ tela: nav[1].toLowerCase() });
    }

    const textoLimpo = textoResposta.replace(/\s*NAVEGAR:[a-z-]+/gi, '').trim();

    return res.status(200).json({ success: true, texto: textoLimpo || null, acoes });

  } catch (error: any) {
    console.error('[api/lisa] Erro:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Erro ao falar com a Lisa. Tente novamente.',
    });
  }
}
