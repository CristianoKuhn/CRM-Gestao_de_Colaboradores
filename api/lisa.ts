// api/lisa.ts
//
// Backend da "Lisa" — assistente de IA do Gestão360.
// Usa HTTP direto para a API do Gemini (sem biblioteca @google/genai)
// para ter controle exato sobre modelo, URL e payload.

const TELAS_VALIDAS = [
  'dashboard', 'colaboradores', 'gestao-pessoas', 'usuarios',
  'tarefas', 'documentos', 'reconhecimento', 'metas', 'analytics',
  'desenvolvimento-biblioteca', 'desenvolvimento-programas',
  'desenvolvimento-indicadores', 'config',
];

const SYSTEM_INSTRUCTION = `
Você é a Lisa, assistente de IA do Gestão360 — sistema de gestão de pessoas (CRM de RH) usado por líderes e coordenadores da RBT Internet.

PERSONALIDADE: Direta, calorosa e prática. Responda como uma colega experiente, não como um manual. Use "você" com o gestor. Máximo de 3 frases por resposta — se precisar de mais, use bullet points curtos.

SEU PAPEL:
- Orientar sobre como usar o sistema e interpretar dados de pessoas.
- Quando fizer sentido, sugira a tela correta escrevendo: NAVEGAR:nome-da-tela no final da sua resposta.
- NUNCA criar, editar, apagar ou salvar dados — só orienta.
- Se não souber algo da empresa, diga claramente. Nunca invente números ou nomes.

TELAS DISPONÍVEIS PARA NAVEGAR:
dashboard, colaboradores, gestao-pessoas, usuarios, tarefas, documentos, reconhecimento, metas, analytics, config

MÓDULOS DO GESTÃO360:

**Dashboard** — visão executiva: Pessoas, Desenvolvimento (prontos/lacunas/ciclos iminentes), Competências, Liderança, Alertas.

**Colaboradores** — lista com filtros por setor, cargo, líder direto, cidade e situação. Cada perfil tem:
- CRM & Timeline: histórico de feedbacks, PDIs, reconhecimentos, advertências, mudanças de cargo.
- Desenvolvimento: Card de Prontidão (Pronto / Em Desenvolvimento / Com Lacunas) + Capacidades (seletor visual de grau 0–4) + Evidências (histórico de avaliações) + Ocorrências + PDIs + Análise IA.

**Gestão de Pessoas** — Férias (motor completo), Relatório de férias, DayOff de aniversário, Radar de Desenvolvimento (ciclos de 5 meses), Calendário.

**Tarefas de Liderança** — ações com prazo, filtros por status e líder direto.

**Reconhecimento** — programa de reconhecimento com filtro mensal.

**Configurações Gerais → Trilha & Matriz** — Competências & Capacidades, Escalas de Domínio (graus 0–4), Matriz por Cargo, Catálogos.

GRAUS DE CAPACIDADE: 0 Não Iniciado · 1 Consciente · 2 Aplicado · 3 Avançado · 4 Referência.

Seja breve. Se listar passos, use até 3 bullets.
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
      message: 'Chave de API do Gemini não configurada no servidor (defina GEMINI_API_KEY nas variáveis de ambiente da Vercel).',
    });
  }

  const { mensagem, historico = [] } = req.body as {
    mensagem: string;
    historico: MensagemHistorico[];
  };

  if (!mensagem?.trim()) {
    return res.status(400).json({ success: false, message: 'Mensagem vazia.' });
  }

  // Montar histórico no formato da API REST do Gemini
  const contents = [
    ...historico.map((m: MensagemHistorico) => ({
      role: m.role,
      parts: [{ text: m.texto }],
    })),
    { role: 'user', parts: [{ text: mensagem }] },
  ];

  // Modelo: gemini-2.5-flash — conforme recomendação explícita do Google
  // API REST direta (v1beta) — sem biblioteca intermediária
  const MODEL = 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

  try {
    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_INSTRUCTION }],
        },
        contents,
        generation_config: {
          temperature: 0.7,
          max_output_tokens: 512,
        },
      }),
    });

    const data = await geminiResponse.json() as any;

    if (!geminiResponse.ok) {
      console.error('[api/lisa] Erro da API Gemini:', JSON.stringify(data));
      return res.status(500).json({
        success: false,
        message: data?.error?.message || 'Erro ao falar com a Lisa. Tente novamente.',
      });
    }

    const textoResposta: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extrair instrução de navegação do texto (NAVEGAR:tela-id)
    const acoes: Array<{ tela: string; colaboradorNome?: string }> = [];
    const navegarMatch = textoResposta.match(/NAVEGAR:([a-z-]+)/i);
    if (navegarMatch) {
      const tela = navegarMatch[1].toLowerCase();
      if (TELAS_VALIDAS.includes(tela)) {
        acoes.push({ tela });
      }
    }

    // Limpar o texto removendo a instrução de navegação antes de enviar ao usuário
    const textoLimpo = textoResposta.replace(/\s*NAVEGAR:[a-z-]+/gi, '').trim();

    return res.status(200).json({
      success: true,
      texto: textoLimpo || null,
      acoes,
    });

  } catch (error: any) {
    console.error('[api/lisa] Erro:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Erro ao falar com a Lisa. Tente novamente em instantes.',
    });
  }
}
