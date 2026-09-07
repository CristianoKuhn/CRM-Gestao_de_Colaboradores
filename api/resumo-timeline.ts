// api/resumo-timeline.ts
//
// Gera/atualiza o resumo por tópicos da Linha do Tempo de um colaborador.
// Mesma infraestrutura de api/lisa.ts (chave do Gemini só no servidor), mas
// é um endpoint separado porque a tarefa é diferente: aqui não há conversa
// nem navegação, só sumarização de texto.
//
// PRINCÍPIO DE ECONOMIA DE TOKENS (plano gratuito): esta função NUNCA recebe
// o histórico inteiro do colaborador. O frontend só envia os registros NOVOS
// desde a última atualização (ResumoLinhaTempo.ultimaDataProcessada) mais o
// resumo já salvo — a IA apenas incorpora o que é novo ao que já existe, tal
// como uma pessoa atualizando um resumo à mão. Reprocessar tudo do zero a
// cada clique seria o oposto do pedido ("atualiza só o que entrou depois").
import { GoogleGenAI, ThinkingLevel, Content } from '@google/genai';

interface EventoParaResumir {
  data: string;
  tipo: string;
  titulo: string;
  descricao: string;
}

const SYSTEM_INSTRUCTION = `
Você resume o histórico profissional de um colaborador para a liderança de uma empresa, em português do Brasil.

FORMATO DE SAÍDA — sempre assim, sem exceção:
- Texto corrido organizado por PERÍODO/TÓPICO (ex.: "Mar/2026 — Onboarding e adaptação: ..."), nunca uma lista eventos crus copiados.
- Curto e denso: cada tópico em 1-3 frases, só o que importa para alguém que precisa entender rapidamente a trajetória da pessoa.
- Nunca use markdown (sem **negrito**, sem #, sem listas com "-") — só texto simples com quebras de linha entre os blocos de período/tópico.
- Nunca invente datas, nomes ou fatos além dos fornecidos.

VOCÊ SEMPRE RECEBE DUAS COISAS:
1. O resumo já existente (pode vir vazio, se for a primeira vez).
2. Uma lista de eventos NOVOS, ainda não incorporados a esse resumo.

SUA TAREFA: produzir o resumo ATUALIZADO — o resumo anterior reescrito incorporando os eventos novos nos tópicos certos (podendo criar um tópico novo se for algo relevante e distinto), nunca simplesmente concatenar o resumo antigo com uma lista nova ao final. O resultado deve ler como um resumo único e coerente, como se tivesse sido escrito de uma vez.
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

    const nomeColaborador: string = bodyObj.nomeColaborador || 'o colaborador';
    const resumoAnterior: string = bodyObj.resumoAnterior || '';
    const novosEventos: EventoParaResumir[] = Array.isArray(bodyObj.novosEventos) ? bodyObj.novosEventos : [];

    if (novosEventos.length === 0) {
      return res.status(400).json({ success: false, message: 'Nenhum evento novo para processar.' });
    }

    const ai = new GoogleGenAI({ apiKey });

    const listaEventos = novosEventos
      .map((e) => `- [${e.data}] (${e.tipo}) ${e.titulo}: ${e.descricao}`)
      .join('\n');

    const prompt = `Colaborador: ${nomeColaborador}

RESUMO EXISTENTE:
${resumoAnterior || '(nenhum ainda — esta é a primeira atualização)'}

EVENTOS NOVOS A INCORPORAR:
${listaEventos}

Gere o resumo atualizado, seguindo exatamente o formato e a tarefa descritos nas instruções.`;

    const contents: Content[] = [{ role: 'user', parts: [{ text: prompt }] }];

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });

    const resumoAtualizado = response.text || resumoAnterior;

    return res.status(200).json({
      success: true,
      resumoTexto: resumoAtualizado,
    });
  } catch (error: any) {
    console.error('[api/resumo-timeline] Erro:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Erro ao atualizar o resumo. Tente novamente em instantes.',
    });
  }
}
