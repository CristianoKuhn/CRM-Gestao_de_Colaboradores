// ── Motor de Disponibilidade Operacional — Consulta Unificada (Fase 7) ──────
// Este é o coração do objetivo original: UMA pergunta ("este colaborador está
// disponível nesta data, e se não, por quê?") que qualquer parte do sistema
// consulta — em vez de cada tela reimplementar suas próprias checagens de
// férias/day off/folga à sua maneira (que é exatamente como o
// ConstraintValidator.ts da Escala Inteligente funcionava até agora: 3
// funções soltas e independentes, cada uma olhando uma fonte).
//
// Função pura, sem React e sem DataService — recebe as listas já carregadas
// (mesmo padrão dos outros arquivos deste motor e do motor de Escala) e
// devolve uma resposta única.
//
// Preparado para crescer sem refatoração: `ausenciasGenericas` é o único
// ponto de entrada para qualquer ausência futura (licença, treinamento,
// banco de horas, evento) — quando esses módulos existirem, populam este
// array com o mesmo formato; nada aqui precisa mudar.

import type { DayOff, Ferias, Folga, TipoAusencia } from '../../../types';

export interface AusenciaGenerica {
  colaboradorId: string;
  tipo: TipoAusencia;
  dataInicio: string;
  dataFim: string;
  descricao?: string;
}

export interface FontesDisponibilidade {
  ferias: Ferias[];
  dayOffs: DayOff[];
  folgas: Folga[];
  // Vazio até licenças/treinamentos/banco de horas/eventos existirem como
  // módulo — a assinatura da função já está pronta para eles.
  ausenciasGenericas?: AusenciaGenerica[];
}

export interface ResultadoDisponibilidade {
  disponivel: boolean;
  motivo?: TipoAusencia;
  descricao?: string;
}

/**
 * Responde se um colaborador está disponível numa data específica — e, se
 * não estiver, por qual motivo. Nunca devolve só um booleano seco: tanto a
 * tela de RH quanto a Escala Inteligente precisam explicar *por que* alguém
 * está indisponível, não só que está.
 */
export function consultarDisponibilidade(
  colaboradorId: string,
  data: string,
  fontes: FontesDisponibilidade
): ResultadoDisponibilidade {
  const emFerias = fontes.ferias.find(
    (f) => f.colaboradorId === colaboradorId && f.status !== 'cancelada' && data >= f.dataInicio && data <= f.dataFim
  );
  if (emFerias) return { disponivel: false, motivo: 'ferias', descricao: 'Está de férias nesta data.' };

  const emDayOff = fontes.dayOffs.find(
    (d) => d.colaboradorId === colaboradorId && d.dataUtilizacao === data && d.status === 'utilizado'
  );
  if (emDayOff) return { disponivel: false, motivo: 'day_off', descricao: 'Está de day off nesta data.' };

  const emFolga = fontes.folgas.find((f) => f.colaboradorId === colaboradorId && f.data === data && f.status === 'aprovada');
  if (emFolga) return { disponivel: false, motivo: 'folga', descricao: 'Tem folga compensatória aprovada nesta data.' };

  const emAusenciaGenerica = (fontes.ausenciasGenericas ?? []).find(
    (a) => a.colaboradorId === colaboradorId && data >= a.dataInicio && data <= a.dataFim
  );
  if (emAusenciaGenerica) {
    return {
      disponivel: false,
      motivo: emAusenciaGenerica.tipo,
      descricao: emAusenciaGenerica.descricao ?? `Ausente (${emAusenciaGenerica.tipo}) nesta data.`,
    };
  }

  return { disponivel: true };
}

/**
 * Atalho para telas que precisam pintar um intervalo inteiro (ex: calendário
 * mensal de um colaborador) sem chamar consultarDisponibilidade uma vez por
 * dia manualmente. Retorna só os dias em que a pessoa NÃO está disponível.
 */
export function consultarIndisponibilidadesNoPeriodo(
  colaboradorId: string,
  dataInicio: string,
  dataFim: string,
  fontes: FontesDisponibilidade
): Array<{ data: string } & ResultadoDisponibilidade> {
  const resultado: Array<{ data: string } & ResultadoDisponibilidade> = [];
  let atual = new Date(dataInicio);
  const fim = new Date(dataFim);
  while (atual <= fim) {
    const dataISO = atual.toISOString().split('T')[0];
    const resposta = consultarDisponibilidade(colaboradorId, dataISO, fontes);
    if (!resposta.disponivel) resultado.push({ data: dataISO, ...resposta });
    atual = new Date(atual.getFullYear(), atual.getMonth(), atual.getDate() + 1);
  }
  return resultado;
}
