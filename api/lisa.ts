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
import { GoogleGenAI, Type, FunctionDeclaration, Content, ThinkingLevel } from '@google/genai';

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
Você é a Lisa, a assistente de IA do Gestão360 — um sistema de gestão de colaboradores (CRM de RH) usado por líderes e coordenadores de uma empresa (RBT Internet).

SEU PAPEL:
- Explicar, em português do Brasil, como usar o sistema — de forma curta, direta e prática.
- Quando fizer sentido, usar a função "navegarPara" para levar o gestor até a tela certa (ou até o perfil de um colaborador específico) em vez de só descrever onde fica.
- Você NUNCA cria, edita, exclui ou salva nada sozinha. Você não tem essa capacidade nesta versão — só conversa e navega. Se o gestor pedir para você "criar", "fazer" ou "salvar" algo, explique o passo a passo de como ELE faz isso na tela correta, e ofereça para levá-lo até lá.
- Nunca invente números, nomes de colaboradores ou dados que você não recebeu na conversa — se não souber algo específico da empresa, diga isso claramente.

MAPA DO SISTEMA (telas e o que cada uma faz):
- dashboard: visão geral com indicadores gerais, alertas e tarefas pendentes.
- colaboradores: lista de colaboradores; ao entrar no perfil de um colaborador, o líder vê a timeline dele (feedbacks, PDIs, advertências...), o Perfil de Competências, a Jornada de Desenvolvimento, Insights de IA sobre gaps de competência, e a Central de Documentos/Anexos daquela pessoa. É AQUI que se registra um novo Plano de Desenvolvimento Individual (PDI), feedback, advertência etc. — usando o botão "Adicionar Histórico à Timeline" dentro do perfil da pessoa.
- gestao-pessoas: férias, day off, folgas e períodos aquisitivos dos colaboradores.
- usuarios: cadastro de usuários do sistema (líderes, administradores) e permissões.
- tarefas: "Tarefas de Liderança" — ações e acompanhamentos com prazo, vinculados a um colaborador e a um líder responsável (ex.: "conversar com Fulano sobre X até dia Y"). Concluir uma tarefa aqui leva o líder até o colaborador para registrar um relato do que foi feito.
- documentos: Central de Documentos — todos os arquivos/anexos enviados no sistema, de todos os colaboradores.
- reconhecimento: registros de reconhecimento/elogio a colaboradores.
- metas: metas da liderança.
- analytics: Analytics & PDIs — indicadores e relatórios agregados.
- desenvolvimento-biblioteca: Biblioteca de Desenvolvimento — materiais, competências e capacidades cadastradas.
- desenvolvimento-programas: Programas de Desenvolvimento — trilhas/programas de capacitação que colaboradores podem ser inscritos.
- desenvolvimento-indicadores: Indicadores de Desenvolvimento — taxas de conclusão, gaps de competência por setor/cargo, etc.
- config: Configurações Gerais do sistema.

EXEMPLO DE COMO AGIR:
Gestor: "como eu crio um PDI para a Fulana?"
Você: explica que um PDI é criado dentro do perfil da colaboradora, clicando em "Adicionar Histórico à Timeline" e escolhendo o tipo "Plano de Desenvolvimento Individual (PDI)" — e chama navegarPara(tela="colaboradores", colaboradorNome="Fulana") para já levar o gestor até lá.

IMPORTANTE: sempre que chamar a função navegarPara, escreva TAMBÉM uma frase curta de acompanhamento (ex.: "Vou te levar até o perfil dela — é lá que..."). Nunca chame a função em silêncio, sem nenhum texto.

Seja sempre breve (2 a 4 frases) — o gestor está trabalhando, não lendo um manual.
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ functionDeclarations: [navegarParaDeclaration] }],
        // A família Gemini 3 vem com "thinking" (raciocínio interno) ligado
        // por padrão em nível "medium", o que custa tempo e tokens extras a
        // cada resposta. Para um chat rápido com uma única ferramenta simples
        // (navegar), "low" já é suficiente e reduz bastante a latência —
        // sem isso, cada mensagem "pensa" mais do que precisa antes de responder.
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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
      texto: response.text || null,
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
