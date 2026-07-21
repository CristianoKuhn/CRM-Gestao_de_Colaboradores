// ── Motor de Geração de Escala — Etapa 1: Calendário + Demanda ──────────────
// Funções puras e determinísticas: mesma entrada sempre produz a mesma saída.
// Não fazem I/O (não chamam DataService) — recebem os dados já carregados e
// devolvem estruturas prontas para a etapa 2 (alocação de candidatos).

import type {
  DiaSemana,
  FeriadoEscala,
  RegraCobertura,
  RotinaOperacional,
  TipoDiaRotina,
} from '../../../types';

export type TipoDiaCalendario = 'normal' | 'sabado' | 'domingo' | 'feriado';

export interface DiaCalendario {
  data: string; // yyyy-MM-dd
  diaSemana: DiaSemana; // 0 = domingo
  tipo: TipoDiaCalendario;
  feriado?: FeriadoEscala;
}

export interface SlotDemanda {
  // Determinístico: mesma rotina/regra + mesmo dia + mesmo horário = mesmo id,
  // não importa a ordem em que os slots foram gerados. Necessário porque o
  // motor precisa rodar duas vezes sobre os mesmos dados e dar o mesmo resultado.
  id: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  setorId?: string;
  cargosPermitidos: string[]; // vazio = qualquer cargo
  quantidadeMinima: number;
  prioridade: number; // maior = mais prioritário na hora de alocar
  obrigatoria: boolean;
  origem: 'rotina' | 'cobertura_generica';
  rotinaId?: string;
  rotinaNome?: string;
  rotinaCor?: string;
}

const PRIORIDADE_ROTINA_PARA_NUMERO: Record<string, number> = {
  alta: 3,
  media: 2,
  baixa: 1,
};

/**
 * Expande um período (ex: mês inteiro) em uma lista de dias, já classificando
 * cada um como normal / sábado / domingo / feriado. Feriados que não
 * "afetam cobertura" (ex: um facultativo que a empresa opera normalmente)
 * são marcados no calendário mas NÃO viram tipo 'feriado' — continuam com o
 * tipo do dia da semana, pra não acionar sem necessidade a rotina de feriado.
 */
export function buildCalendarioPeriodo(
  periodoInicio: string,
  periodoFim: string,
  feriados: FeriadoEscala[]
): DiaCalendario[] {
  const feriadosPorData = new Map<string, FeriadoEscala>();
  feriados.forEach((f) => {
    if (f.afetaCobertura) feriadosPorData.set(f.data, f);
  });

  const dias: DiaCalendario[] = [];
  const inicio = new Date(periodoInicio + 'T00:00:00');
  const fim = new Date(periodoFim + 'T00:00:00');

  for (let cursor = new Date(inicio); cursor <= fim; cursor.setDate(cursor.getDate() + 1)) {
    const dataIso = cursor.toISOString().slice(0, 10);
    const diaSemana = cursor.getDay() as DiaSemana;
    const feriado = feriadosPorData.get(dataIso);

    let tipo: TipoDiaCalendario;
    if (feriado) tipo = 'feriado';
    else if (diaSemana === 0) tipo = 'domingo';
    else if (diaSemana === 6) tipo = 'sabado';
    else tipo = 'normal';

    dias.push({ data: dataIso, diaSemana, tipo, feriado });
  }

  return dias;
}

function tipoDiaCalendarioParaTipoDiaRotina(tipo: TipoDiaCalendario): TipoDiaRotina {
  if (tipo === 'normal') return 'semana';
  return tipo; // 'sabado' | 'domingo' | 'feriado' têm o mesmo nome nos dois tipos
}

/**
 * Para um único dia, monta a lista de slots de demanda cruzando RotinasOperacionais
 * (tarefas nomeadas, ex: "Retenção", "Suporte Geral" — é o que aparece colorido na
 * grade semanal) com RegrasCobertura (piso genérico de headcount por horário,
 * usado quando não há rotina nomeada cobrindo aquela janela).
 *
 * Fallback de feriado: se o dia é feriado e não existe nenhuma rotina cadastrada
 * com tipoDia = 'feriado' para aquele setor, usa as rotinas de 'domingo' no lugar
 * (comportamento já documentado no types.ts, comentário de TipoDiaRotina).
 */
export function buildDemandaDoDia(
  dia: DiaCalendario,
  rotinas: RotinaOperacional[],
  regrasCobertura: RegraCobertura[]
): SlotDemanda[] {
  const slots: SlotDemanda[] = [];
  const tipoDiaRotina = tipoDiaCalendarioParaTipoDiaRotina(dia.tipo);

  const rotinasAtivas = rotinas.filter((r) => r.ativo);
  let rotinasDoTipo = rotinasAtivas.filter((r) => r.tipoDia === tipoDiaRotina);

  if (dia.tipo === 'feriado') {
    const setoresComRotinaFeriado = new Set(rotinasDoTipo.map((r) => r.setorId));
    const fallbackDomingo = rotinasAtivas.filter(
      (r) => r.tipoDia === 'domingo' && !setoresComRotinaFeriado.has(r.setorId)
    );
    rotinasDoTipo = rotinasDoTipo.concat(fallbackDomingo);
  }

  rotinasDoTipo.forEach((rotina) => {
    slots.push({
      id: `rotina_${rotina.id}_${dia.data}`,
      data: dia.data,
      horaInicio: rotina.horaInicio,
      horaFim: rotina.horaFim,
      setorId: rotina.setorId,
      cargosPermitidos: rotina.cargosPermitidos || [],
      quantidadeMinima: rotina.quantidadeMinima,
      prioridade: PRIORIDADE_ROTINA_PARA_NUMERO[rotina.prioridade] ?? 2,
      obrigatoria: rotina.obrigatoria,
      origem: 'rotina',
      rotinaId: rotina.id,
      rotinaNome: rotina.nome,
      rotinaCor: rotina.cor,
    });
  });

  // Regras de cobertura genérica: 'todos' aplica a qualquer dia; 'domingo' só
  // quando o dia é domingo OU feriado (feriado costuma ter regime de domingo);
  // valor numérico (0-6) casa exatamente com o dia da semana do calendário.
  regrasCobertura.forEach((regra) => {
    const aplicaHoje =
      regra.diaSemana === 'todos' ||
      (regra.diaSemana === 'domingo' && (dia.tipo === 'domingo' || dia.tipo === 'feriado')) ||
      regra.diaSemana === dia.diaSemana;
    if (!aplicaHoje) return;

    slots.push({
      id: `cobertura_${regra.id}_${dia.data}`,
      data: dia.data,
      horaInicio: regra.horaInicio,
      horaFim: regra.horaFim,
      setorId: regra.setorId,
      cargosPermitidos: regra.cargoId ? [regra.cargoId] : [],
      quantidadeMinima: regra.quantidadeMinima,
      prioridade: regra.prioridade,
      obrigatoria: true,
      origem: 'cobertura_generica',
    });
  });

  return slots;
}

/** Conveniência: roda buildDemandaDoDia para todos os dias do calendário de uma vez. */
export function buildDemandaDoPeriodo(
  calendario: DiaCalendario[],
  rotinas: RotinaOperacional[],
  regrasCobertura: RegraCobertura[]
): SlotDemanda[] {
  return calendario.flatMap((dia) => buildDemandaDoDia(dia, rotinas, regrasCobertura));
}
