/**
 * AnaliseColaboradorService — Gestão360
 *
 * Serviço frontend que orquestra chamadas à API de análise inteligente
 * (api/analise-colaborador.ts). Responsável por:
 *  - Montar o payload com dados do colaborador (timeline + capacidades)
 *  - Fazer o cache local da última análise (evita chamadas repetidas)
 *  - Expor tipos para o componente consumidor
 */

import { TimelineRegistro, Colaborador, CapacidadeBiblioteca, CompetenciaBiblioteca } from '../types';

// ── Tipos públicos ────────────────────────────────────────────────────────────

export interface CompetenciaIdentificadaIA {
  nome: string;
  competencia: string;
  nivel: 'Em Desenvolvimento' | 'Aplicado' | 'Referência';
  evidenciasEncontradas: string[];
  confianca: number;
  observacao?: string;
}

export interface PadraoComportamentoIA {
  tipo: 'positivo' | 'negativo' | 'neutro';
  descricao: string;
  frequencia: string;
  ultimaOcorrencia: string;
  recomendacao?: string;
}

export interface RecomendacaoTreinamentoIA {
  capacidade: string;
  motivo: string;
  tipoTreinamento: string;
  urgencia: 'baixa' | 'media' | 'alta';
}

export interface AnaliseColaborador {
  competenciasIdentificadas: CompetenciaIdentificadaIA[];
  padroesComportamento: PadraoComportamentoIA[];
  recomendacoesTreinamento: RecomendacaoTreinamentoIA[];
  resumoNarrativo: string;
  totalEventosAnalisados: number;
  geradaEm: string;
}

// ── Tipos de registro que têm valor analítico (excluem administrativos) ───────

const TIPOS_ANALISAVEIS = new Set([
  'Feedback Positivo',
  'Feedback Corretivo',
  'Reconhecimento',
  'Conversa Individual (1:1)',
  'Plano de Desenvolvimento Individual (PDI)',
  'Advertência',
  'Suspensão',
  'Elogio de Cliente',
  'Reclamação de Cliente',
  'Acompanhamento',
  'Outros',
]);

// ── Chave de cache local (sessionStorage, não persiste entre abas) ────────────

function chaveCache(colaboradorId: string): string {
  return `gc_analise_ia_${colaboradorId}`;
}

function lerCache(colaboradorId: string): AnaliseColaborador | null {
  try {
    const raw = sessionStorage.getItem(chaveCache(colaboradorId));
    if (!raw) return null;
    const cached = JSON.parse(raw) as { analise: AnaliseColaborador; totalEventos: number };
    return cached.analise;
  } catch {
    return null;
  }
}

function gravarCache(colaboradorId: string, analise: AnaliseColaborador, totalEventos: number): void {
  try {
    sessionStorage.setItem(chaveCache(colaboradorId), JSON.stringify({ analise, totalEventos }));
  } catch {
    // sessionStorage cheio — não é crítico
  }
}

function totalEventosCached(colaboradorId: string): number {
  try {
    const raw = sessionStorage.getItem(chaveCache(colaboradorId));
    if (!raw) return 0;
    return (JSON.parse(raw) as { totalEventos: number }).totalEventos || 0;
  } catch {
    return 0;
  }
}

export function invalidarCacheAnalise(colaboradorId: string): void {
  try {
    sessionStorage.removeItem(chaveCache(colaboradorId));
  } catch {
    // silencioso
  }
}

// ── Função principal ──────────────────────────────────────────────────────────

export async function analisarColaborador(
  colaborador: Colaborador,
  timeline: TimelineRegistro[],
  capacidades: CapacidadeBiblioteca[],
  competencias: CompetenciaBiblioteca[],
  resumoExistente?: string,
  forcarAtualizacao = false
): Promise<AnaliseColaborador> {

  // Filtrar apenas registros com valor analítico, ordenados
  const registrosAnalisaveis = timeline
    .filter(r => TIPOS_ANALISAVEIS.has(r.tipo))
    .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

  if (registrosAnalisaveis.length === 0) {
    throw new Error('Este colaborador ainda não tem registros suficientes para análise (feedbacks, conversas, PDIs, etc.).');
  }

  // Usar cache se existir e não houver eventos novos desde a última análise
  if (!forcarAtualizacao) {
    const cached = lerCache(colaborador.id);
    const totalAnterior = totalEventosCached(colaborador.id);
    const MINIMO_NOVOS_EVENTOS = 3;

    if (cached && registrosAnalisaveis.length - totalAnterior < MINIMO_NOVOS_EVENTOS) {
      return cached;
    }
  }

  // Montar catálogo de capacidades — enriquecido com o nome da competência pai
  const competenciasPorId = new Map(competencias.map(c => [c.id, c.nome]));
  const catalogoCapacidades = capacidades
    .filter(c => c.ativo)
    .map(c => ({
      nome: c.nome,
      competencia: competenciasPorId.get(c.competenciaId || '') || 'Geral',
      descricao: c.descricao || undefined,
    }));

  // Payload para a API — sem IDs, apenas nomes e conteúdo analítico
  const payload = {
    nomeColaborador: colaborador.nome,
    cargo: '', // não enviamos ID de cargo, só o nome seria relevante — deixamos vazio por privacidade
    setor: '', // idem
    registros: registrosAnalisaveis.map(r => ({
      data: r.data,
      tipo: r.tipo,
      titulo: r.titulo,
      descricao: r.descricao,
      // O líder é enviado como referência de quem avaliou — útil para a IA
      // entender contexto de múltiplos avaliadores concordando
      lider: undefined as string | undefined,
    })),
    capacidades: catalogoCapacidades,
    analiseAnterior: resumoExistente ? { resumoTexto: resumoExistente } : undefined,
  };

  const resposta = await fetch('/api/analise-colaborador', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const dados = await resposta.json();

  if (!resposta.ok || !dados.success) {
    throw new Error(dados?.message || 'Não consegui analisar o colaborador agora.');
  }

  const analise = dados.resultado as AnaliseColaborador;

  // Gravar no cache para evitar chamadas repetidas
  gravarCache(colaborador.id, analise, registrosAnalisaveis.length);

  return analise;
}
