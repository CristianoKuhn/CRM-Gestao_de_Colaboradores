// api/analise-colaborador.ts
//
// Motor de Análise Inteligente de Colaboradores — Gestão360
//
// Esta API recebe o histórico completo de um colaborador (timeline de registros)
// mais o catálogo de capacidades/competências da empresa e produz três saídas:
//
//  1. COMPETÊNCIAS IDENTIFICADAS — capacidades que o colaborador JÁ DEMONSTRA
//     ou está demonstrando, inferidas a partir de padrões nos registros.
//     Ex.: "5 feedbacks positivos sobre atendimento ao cliente em 3 meses →
//     Comunicação com Cliente está em nível Aplicado".
//
//  2. PADRÕES DE COMPORTAMENTO — "persistência" positiva ou negativa.
//     Ex.: "3 ocorrências do mesmo tipo em <60 dias → padrão recorrente" vs
//     "comportamento consistente por 6 meses → consolidado".
//
//  3. RECOMENDAÇÕES DE TREINAMENTO — sugestões específicas baseadas em gaps
//     identificados ou em capacidades parcialmente demonstradas.
//
// PRINCÍPIO DE PRIVACIDADE: os dados enviados são anonimizados — o nome do
// colaborador é enviado apenas para contextualizar o pronome correto na saída.
// IDs internos nunca saem para a IA.
//
// PRINCÍPIO DE ECONOMIA: só é chamada explicitamente pelo gestor (botão) ou
// quando há pelo menos 3 eventos novos desde a última análise. Nunca roda
// automaticamente em background.

import { GoogleGenAI, ThinkingLevel } from '@google/genai';

// ── Tipos de entrada ─────────────────────────────────────────────────────────

interface RegistroTimeline {
  data: string;           // ISO date
  tipo: string;           // TipoRegistro: 'Feedback Positivo', 'PDI', etc.
  titulo: string;
  descricao: string;
  lider?: string;         // nome do líder responsável (nunca o id)
}

interface Capacidade {
  nome: string;
  competencia: string;    // competência pai
  descricao?: string;
}

interface AnaliseAnterior {
  resumoTexto?: string;           // resumo existente da timeline
  competenciasIdentificadas?: string; // última análise em JSON string
  geradaEm?: string;
}

// ── Tipos de saída ───────────────────────────────────────────────────────────

interface CompetenciaIdentificada {
  nome: string;
  competencia: string;
  nivel: 'Em Desenvolvimento' | 'Aplicado' | 'Referência';
  evidenciasEncontradas: string[];   // trechos dos registros que embasam a conclusão
  confianca: number;                 // 0-1
  observacao?: string;
}

interface PadraoComportamento {
  tipo: 'positivo' | 'negativo' | 'neutro';
  descricao: string;
  frequencia: string;   // ex.: "3 vezes em 45 dias"
  ultimaOcorrencia: string;
  recomendacao?: string;
}

interface RecomendacaoTreinamento {
  capacidade: string;
  motivo: string;
  tipoTreinamento: string;   // ex.: "Prático em campo", "Mentoria com par sênior", "Curso técnico"
  urgencia: 'baixa' | 'media' | 'alta';
}

interface ResultadoAnalise {
  competenciasIdentificadas: CompetenciaIdentificada[];
  padroesComportamento: PadraoComportamento[];
  recomendacoesTreinamento: RecomendacaoTreinamento[];
  resumoNarrativo: string;   // parágrafo para o gestor ler rapidamente
  totalEventosAnalisados: number;
  geradaEm: string;
}

// ── System Instruction — o coração do motor ──────────────────────────────────

const SYSTEM_INSTRUCTION = `
Você é um especialista em desenvolvimento de pessoas e gestão de competências para um sistema de CRM de RH chamado Gestão360.

Sua tarefa é analisar o histórico de registros de um colaborador e produzir um diagnóstico estruturado em JSON.

CONTEXTO DO SISTEMA:
- Os registros vêm da timeline do colaborador: Feedback Positivo, Feedback Corretivo, Reconhecimento, Conversa Individual (1:1), PDI (Plano de Desenvolvimento Individual), Advertência, Suspensão, Elogio de Cliente, Reclamação de Cliente, Observação Geral, Acompanhamento, Mudança de Cargo, Outros.
- Competências/Capacidades são definidas pela empresa e enviadas na entrada. Você deve mapear o que vê nos registros para essas capacidades — nunca inventar capacidades que não estão na lista.
- Níveis de domínio: "Em Desenvolvimento" (evidências pontuais, inconsistente), "Aplicado" (consistente ao longo do tempo, múltiplas evidências), "Referência" (excepcional, reconhecido por pares/clientes, mencionado em elogios externos).

REGRAS DE ANÁLISE:
1. EVIDÊNCIA MÍNIMA: para apontar uma competência como "Aplicado" ou acima, precisa de pelo menos 2 registros que a sustentem em períodos diferentes. Uma menção única → "Em Desenvolvimento" com confiança ≤ 0.5.
2. PERSISTÊNCIA NEGATIVA: 2 ou mais ocorrências do mesmo problema em ≤90 dias = padrão recorrente (negativo). Informe a frequência e o que os registros dizem.
3. PERSISTÊNCIA POSITIVA: comportamento consistente confirmado em 3+ registros ao longo de 60+ dias = competência consolidada (positivo).
4. RECOMENDAÇÃO ESPECÍFICA: nunca sugira "fazer um curso genérico". Baseie a recomendação no gap identificado: "Mentoria com colega sênior em X", "Prática supervisionada em Y", "Roleplay de atendimento ao cliente".
5. CONFIANÇA: seja honesto. Se há poucos registros, confiança ≤ 0.6. Se há muitos, consistentes, no mesmo sentido → até 0.95.
6. NEUTRO: registros de férias, mudanças de cargo administrativas, observações gerais sem conteúdo avaliativo → ignorar para fins de competência.

FORMATO DE SAÍDA — SEMPRE JSON puro, sem markdown, sem texto antes ou depois:
{
  "competenciasIdentificadas": [
    {
      "nome": "nome da capacidade exatamente como na lista enviada",
      "competencia": "nome da competência pai",
      "nivel": "Em Desenvolvimento | Aplicado | Referência",
      "evidenciasEncontradas": ["trecho curto do registro 1", "trecho curto do registro 2"],
      "confianca": 0.0,
      "observacao": "contexto opcional em 1 frase"
    }
  ],
  "padroesComportamento": [
    {
      "tipo": "positivo | negativo | neutro",
      "descricao": "descrição do padrão em 1-2 frases",
      "frequencia": "ex.: '4 vezes em 60 dias'",
      "ultimaOcorrencia": "data ISO da última ocorrência",
      "recomendacao": "ação sugerida ao gestor (opcional, só quando útil)"
    }
  ],
  "recomendacoesTreinamento": [
    {
      "capacidade": "nome da capacidade",
      "motivo": "por que essa capacidade precisa de desenvolvimento (1 frase)",
      "tipoTreinamento": "tipo de treinamento específico e concreto",
      "urgencia": "baixa | media | alta"
    }
  ],
  "resumoNarrativo": "parágrafo de 3-5 frases para o gestor ler em 30 segundos. Começa pelo ponto mais importante. Tom profissional, direto, sem jargão."
}

Se não houver evidências suficientes para qualquer análise, retorne os arrays vazios e explique no resumoNarrativo.
`.trim();

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método não permitido.' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      success: false,
      message: 'Chave de API não configurada (defina GEMINI_API_KEY nas variáveis de ambiente da Vercel).',
    });
  }

  try {
    let body: any = {};
    if (req.body) {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    }

    const nomeColaborador: string = body.nomeColaborador || 'o colaborador';
    const cargo: string = body.cargo || '';
    const setor: string = body.setor || '';
    const registros: RegistroTimeline[] = Array.isArray(body.registros) ? body.registros : [];
    const capacidades: Capacidade[] = Array.isArray(body.capacidades) ? body.capacidades : [];
    const analiseAnterior: AnaliseAnterior = body.analiseAnterior || {};

    if (registros.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum registro para analisar. O colaborador precisa ter ao menos 1 registro na timeline.',
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Formatar registros para a IA — ordenados por data, mais antigos primeiro
    const registrosOrdenados = [...registros].sort(
      (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()
    );

    const listaRegistros = registrosOrdenados
      .map((r, i) => `[${i + 1}] ${r.data} | ${r.tipo} | ${r.titulo}: ${r.descricao}${r.lider ? ` (lider: ${r.lider})` : ''}`)
      .join('\n');

    const listaCapacidades = capacidades.length > 0
      ? capacidades.map(c => `- ${c.nome} (competência: ${c.competencia})${c.descricao ? `: ${c.descricao}` : ''}`).join('\n')
      : '(Nenhuma capacidade cadastrada — analise apenas padrões comportamentais e faça recomendações genéricas baseadas nos registros)';

    const contextoAnterior = analiseAnterior.resumoTexto
      ? `\nCONTEXTO DA ANÁLISE ANTERIOR (${analiseAnterior.geradaEm || 'data não registrada'}):\n${analiseAnterior.resumoTexto.slice(0, 800)}\n`
      : '';

    const prompt = `Colaborador: ${nomeColaborador}${cargo ? ` | Cargo: ${cargo}` : ''}${setor ? ` | Setor: ${setor}` : ''}
Total de registros para analisar: ${registros.length}
${contextoAnterior}
CATÁLOGO DE CAPACIDADES DA EMPRESA:
${listaCapacidades}

REGISTROS DA TIMELINE (cronológico, do mais antigo ao mais recente):
${listaRegistros}

Analise os registros acima, mapeie competências identificadas, padrões de comportamento e recomendações de treinamento. Retorne APENAS o JSON estruturado conforme as instruções.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });

    const textoResposta = response.text || '';

    // Extrair o JSON — remove possíveis cercas de markdown que o modelo possa ter inserido
    const jsonLimpo = textoResposta
      .replace(/^```(?:json)?\s*/m, '')
      .replace(/\s*```\s*$/m, '')
      .trim();

    let resultado: ResultadoAnalise;
    try {
      const parsed = JSON.parse(jsonLimpo);
      resultado = {
        competenciasIdentificadas: Array.isArray(parsed.competenciasIdentificadas) ? parsed.competenciasIdentificadas : [],
        padroesComportamento: Array.isArray(parsed.padroesComportamento) ? parsed.padroesComportamento : [],
        recomendacoesTreinamento: Array.isArray(parsed.recomendacoesTreinamento) ? parsed.recomendacoesTreinamento : [],
        resumoNarrativo: parsed.resumoNarrativo || 'Análise concluída.',
        totalEventosAnalisados: registros.length,
        geradaEm: new Date().toISOString(),
      };
    } catch {
      // JSON malformado — retorna erro descritivo sem expor o texto cru
      console.error('[api/analise-colaborador] JSON inválido:', jsonLimpo.slice(0, 200));
      return res.status(500).json({
        success: false,
        message: 'A IA retornou um formato inesperado. Tente novamente.',
      });
    }

    return res.status(200).json({ success: true, resultado });
  } catch (error: any) {
    console.error('[api/analise-colaborador] Erro:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Erro ao analisar o colaborador. Tente novamente em instantes.',
    });
  }
}
