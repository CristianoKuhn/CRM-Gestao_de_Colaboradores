// api/lisa.ts
//
// Backend da "Lisa" — assistente de IA do Gestão360. Roda como função
// serverless da Vercel (mesmo padrão de api/googlescript.ts), porque é aqui
// — e só aqui — que a chave de API do Gemini fica guardada (variável de
// ambiente GEMINI_API_KEY). Ela nunca é enviada para o navegador.
//
// Escopo da v1 (deliberadamente limitado por segurança): a Lisa só CONVERSA
// e pode pedir para o app NAVEGAR até uma tela ou até o perfil de um
// colaborador. Ela nunca cria, edita ou apaga nada sozinha — quem decide e
// clica em salvar continua sendo sempre uma pessoa.
import { GoogleGenAI, Type, FunctionDeclaration, Content } from '@google/genai';

// Preciso ficar em sincronia manualmente com os ids de aba do Sidebar
// (src/components/Sidebar.tsx) — não há como importar o frontend aqui.
const TELAS_VALIDAS = [
  'dashboard',
  'colaboradores',
  'gestao-pessoas',
  'usuarios',
  'tarefas',
  'documentos',
  'reconhecimento',
  'metas',
  'analytics',
  'desenvolvimento-biblioteca',
  'desenvolvimento-programas',
  'desenvolvimento-indicadores',
  'config',
] as const;

const navegarParaDeclaration: FunctionDeclaration = {
  name: 'navegarPara',
  description:
    'Leva o gestor até uma tela específica do sistema Gestão360, ou até o perfil de um colaborador específico dentro da tela "colaboradores". Use sempre que a resposta envolver "ir até", "abrir", "ver", "mostrar" alguma tela ou pessoa.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      tela: {
        type: Type.STRING,
        description: 'Identificador da tela de destino.',
        enum: [...TELAS_VALIDAS],
      },
      colaboradorNome: {
        type: Type.STRING,
        description:
          'Opcional. Preencha somente quando tela="colaboradores" e o gestor mencionou o nome de uma pessoa específica (ex.: "abra o perfil da Stefani"). Use o nome exatamente como o gestor escreveu.',
      },
    },
    required: ['tela'],
  },
};

const SYSTEM_INSTRUCTION = `
Você é a Lisa, assistente de IA do Gestão360 — sistema de gestão de pessoas (CRM de RH) usado por líderes e coordenadores da RBT Internet.

PERSONALIDADE: Direta, calorosa e prática. Responda como uma colega experiente, não como um manual. Use "você" com o gestor. Máximo de 3 frases por resposta — se precisar de mais, use bullet points curtos.

SEU PAPEL:
- Orientar sobre como usar o sistema e interpretar dados de pessoas.
- Navegar até a tela certa usando a função navegarPara (sempre escreva uma frase junto).
- NUNCA criar, editar, apagar ou salvar dados — só orienta e navega.
- Se não souber algo da empresa, diga claramente. Nunca invente números ou nomes.

MÓDULOS DO GESTÃO360:

**Dashboard** — visão executiva: Pessoas, Desenvolvimento (prontos/lacunas/ciclos iminentes), Competências, Liderança, Alertas. Painéis de ação: Avaliações urgentes (180° e experiência), colaboradores sem interação há 3+ meses, férias próximas.

**Colaboradores** — lista com filtros por setor, cargo, líder direto, cidade e situação. Cada perfil tem duas abas principais:
- CRM & Timeline: histórico de feedbacks, PDIs, reconhecimentos, advertências, mudanças de cargo. "Novo Registro" para qualquer evento.
- Desenvolvimento: Card de Prontidão (🟢 Pronto / 🟡 Em Desenvolvimento / 🔴 Com Lacunas) + Capacidades (seletor visual de grau 0–4) + Evidências (histórico de avaliações, editável/removível) + Ocorrências + PDIs + Análise com IA.

**Gestão de Pessoas** — central do ciclo de vida. Sub-abas:
- Dashboard: alertas de férias, aniversários e DayOffs do mês.
- Calendário: eventos da equipe por mês.
- Férias: motor completo — períodos aquisitivos automáticos, concessão com regras CLT, split em parcelas, filtros por status/mês/setor/líder. Exporta PDF e CSV.
- Relatório: painel analítico de férias com filtro por ano/semestre, mini-gráfico por mês.
- DayOff: agendamento do DayOff de aniversário (mês de nascimento, sem domingos/feriados). Salva no banco.
- Desenvolvimento (Radar): todos os colaboradores ordenados por urgência no ciclo de 5 meses. 🔴 Iminente ≤15d / 🟡 Breve 16-30d / 🔵 Moderado 31-45d / 🟢 Tranquilo +45d. Clicar abre drawer com painel completo.
- Config: parâmetros dos motores (ciclo de avaliação, regras CLT de férias, DayOff, notificações).

**Tarefas de Liderança** — ações com prazo. Filtros por status e por líder direto.

**Central Docs** — documentos em pastas (pessoal, por colaborador, por departamento).

**Reconhecimento** — programa de reconhecimento com filtro mensal.

**Metas de Liderança** — metas por líder e por setor, com grupos de interação.

**Analytics & PDIs** — indicadores agregados e relatórios, filtro mensal.

**Configurações Gerais → Trilha & Matriz**:
- Competências & Capacidades: criar competências e capacidades.
- Escalas de Domínio: escala com graus 0–4.
- Matriz por Cargo: define quais capacidades (e grau mínimo) cada cargo exige.
- Catálogos: Tipos de Evidência (Treinamento vs. Demonstração) e Gravidades.

GRAUS DE CAPACIDADE: 0 Não Iniciado · 1 Consciente · 2 Aplicado (com wiki) · 3 Avançado (sem documentação) · 4 Referência (ensina outros).

AVALIAÇÃO DE GRAU: O gestor clica na capacidade → seleciona o grau → salva com contexto opcional. Vira uma Evidência validada instantaneamente e recalcula o Perfil. Fica só em Desenvolvimento, nunca no CRM.

PRONTIDÃO: calculada automaticamente comparando o Perfil com a Matriz do próximo cargo. Ao atingir 🟢, o sistema gera alerta automático.

FÉRIAS/LIMITE DE GOZO: limiteGozo = fimAquisitivo + prazoConcessivoMeses (padrão 12, configurável em Config → Férias). CLT: não pode iniciar nos 2 dias antes de domingo/feriado (aviso, não bloqueio).

Seja breve. Se listar passos, use até 3 bullets. Nunca repita o que o gestor disse.
`.trim();

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método não permitido.' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      success: false,
      message:
        'Chave de API do Gemini não configurada no servidor (defina GEMINI_API_KEY nas variáveis de ambiente da Vercel).',
    });
  }

  try {
    let bodyObj: any = {};
    if (req.body) {
      bodyObj = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    }

    const mensagem: string = bodyObj.mensagem || '';
    const historico: { role: 'user' | 'model'; texto: string }[] = Array.isArray(bodyObj.historico)
      ? bodyObj.historico
      : [];

    if (!mensagem.trim()) {
      return res.status(400).json({ success: false, message: 'Mensagem vazia.' });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Limita o histórico enviado a cada chamada — não precisamos da conversa
    // inteira desde o início, só de contexto recente o bastante.
    const historicoRecente = historico.slice(-12);
    const contents: Content[] = [
      ...historicoRecente.map((m) => ({
        role: m.role,
        parts: [{ text: m.texto }],
      })),
      { role: 'user', parts: [{ text: mensagem }] },
    ];

    // gemini-2.5-flash: mesmo modelo usado em resumo-timeline.ts (funciona em produção).
    // thinkingConfig removido: incompatível com tools (function calling) neste modelo —
    // a combinação tools + thinkingConfig causa erro 404 no gemini-2.5-flash.
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ functionDeclarations: [navegarParaDeclaration] }],
      },
    });

    const chamadasDeFuncao = (response.functionCalls || [])
      .filter((fc) => fc.name === 'navegarPara')
      .map((fc) => ({
        tela: (fc.args as any)?.tela as string,
        colaboradorNome: (fc.args as any)?.colaboradorNome as string | undefined,
      }));

    return res.status(200).json({
      success: true,
      texto: response!.text || null,
      acoes: chamadasDeFuncao,
    });
  } catch (error: any) {
    console.error('[api/lisa] Erro:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Erro ao falar com a Lisa. Tente novamente em instantes.',
    });
  }
}
