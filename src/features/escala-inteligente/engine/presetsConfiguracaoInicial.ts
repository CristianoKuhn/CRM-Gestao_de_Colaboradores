/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ═══════════════════════════════════════════════════════════════════
// ESCALA INTELIGENTE — MÓDULO 2: Assistente de Configuração
// Lógica pura (sem JSX), fácil de testar isoladamente. Ver documento de
// arquitetura, seção 16.1. Responsável por transformar 5-8 respostas
// simples em ConfiguracaoEscala + TurnoPadrao[] + RegraCobertura[] —
// o gestor nunca precisa entender o conceito de "regra de cobertura
// por hora" para começar a usar o sistema.
// ═══════════════════════════════════════════════════════════════════

import { ConfiguracaoEscala, TurnoPadrao, RegraCobertura, DiaSemana } from '../../../types';

export interface RespostasAssistente {
  empresaId: string;
  setorId?: string; // vazio = regra vale para a empresa toda
  funcionaSegASab: boolean;
  horaAberturaSegASab: string; // "07:00"
  horaFechamentoSegASab: string; // "24:00" (meia-noite representada como 24:00)
  funcionaDomingo: boolean;
  horaAberturaDomingo: string;
  horaFechamentoDomingo: string;
  minimoPadraoDurantePico: number; // ex: 6 (após horaCorteAlta)
  horaCorteAlta: string; // ex: "18:00"
  minimoNoturnoMinimo: number; // ex: 1 (após horaCorteNoturno, até o fechamento)
  horaCorteNoturno: string; // ex: "22:00"
  minimoDomingo: number; // ex: 4
  cargaHorariaSemanal: number; // ex: 44
  permiteBancoHoras: boolean;
  permiteHoraExtraSemana: boolean;
  domingoContaHoraExtra: boolean;
  intervaloMinimoInterjornadaHoras: number; // ex: 11 (CLT)
  maxDiasConsecutivos: number; // ex: 6
  diasAntecedenciaPublicacao: number; // ex: 7
}

export interface PresetConfiguracaoInicial {
  id: string;
  nome: string;
  descricao: string;
  respostas: Omit<RespostasAssistente, 'empresaId' | 'setorId'>;
}

// Os 3 presets citados no documento de arquitetura (seção 16.1). O primeiro é
// literalmente o cenário operacional que deu origem à Escala Inteligente —
// por isso é o default já pré-selecionado no primeiro passo do assistente.
export const PRESETS_CONFIGURACAO_INICIAL: PresetConfiguracaoInicial[] = [
  {
    id: 'atendimento-7x1-pico-noturno',
    nome: 'Atendimento 7x1 com pico noturno',
    descricao: 'Segunda a sábado 07h-24h, domingo 07h-22h, reforço de equipe à noite.',
    respostas: {
      funcionaSegASab: true,
      horaAberturaSegASab: '07:00',
      horaFechamentoSegASab: '24:00',
      funcionaDomingo: true,
      horaAberturaDomingo: '07:00',
      horaFechamentoDomingo: '22:00',
      minimoPadraoDurantePico: 6,
      horaCorteAlta: '18:00',
      minimoNoturnoMinimo: 1,
      horaCorteNoturno: '22:00',
      minimoDomingo: 4,
      cargaHorariaSemanal: 44,
      permiteBancoHoras: true,
      permiteHoraExtraSemana: false,
      domingoContaHoraExtra: true,
      intervaloMinimoInterjornadaHoras: 11,
      maxDiasConsecutivos: 6,
      diasAntecedenciaPublicacao: 7,
    },
  },
  {
    id: 'comercial-seg-sex',
    nome: 'Comercial segunda a sexta',
    descricao: 'Horário comercial simples, sem operação de fim de semana.',
    respostas: {
      funcionaSegASab: true,
      horaAberturaSegASab: '09:00',
      horaFechamentoSegASab: '18:00',
      funcionaDomingo: false,
      horaAberturaDomingo: '09:00',
      horaFechamentoDomingo: '13:00',
      minimoPadraoDurantePico: 2,
      horaCorteAlta: '09:00',
      minimoNoturnoMinimo: 0,
      horaCorteNoturno: '18:00',
      minimoDomingo: 0,
      cargaHorariaSemanal: 40,
      permiteBancoHoras: true,
      permiteHoraExtraSemana: false,
      domingoContaHoraExtra: false,
      intervaloMinimoInterjornadaHoras: 11,
      maxDiasConsecutivos: 5,
      diasAntecedenciaPublicacao: 7,
    },
  },
  {
    id: 'operacao-24h',
    nome: 'Operação 24h',
    descricao: 'Cobertura contínua, todos os dias, três turnos de 8 horas.',
    respostas: {
      funcionaSegASab: true,
      horaAberturaSegASab: '00:00',
      horaFechamentoSegASab: '24:00',
      funcionaDomingo: true,
      horaAberturaDomingo: '00:00',
      horaFechamentoDomingo: '24:00',
      minimoPadraoDurantePico: 3,
      horaCorteAlta: '00:00',
      minimoNoturnoMinimo: 2,
      horaCorteNoturno: '22:00',
      minimoDomingo: 3,
      cargaHorariaSemanal: 44,
      permiteBancoHoras: true,
      permiteHoraExtraSemana: false,
      domingoContaHoraExtra: true,
      intervaloMinimoInterjornadaHoras: 11,
      maxDiasConsecutivos: 6,
      diasAntecedenciaPublicacao: 7,
    },
  },
];

export function respostasIniciaisPadrao(empresaId: string): RespostasAssistente {
  const preset = PRESETS_CONFIGURACAO_INICIAL[0];
  return { ...preset.respostas, empresaId, setorId: undefined };
}

function somarHoras(horaISO: string, horas: number): string {
  const [h, m] = horaISO.split(':').map(Number);
  let totalMin = h * 60 + m + horas * 60;
  totalMin = ((totalMin % (24 * 60)) + 24 * 60) % (24 * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

const DIAS_SEG_A_SAB: DiaSemana[] = [1, 2, 3, 4, 5, 6];
const DIA_DOMINGO: DiaSemana[] = [0];

/**
 * Gera os 3 (ou 4, se funcionar domingo) turnos padrão que cobrem a janela de
 * funcionamento informada. Divide o expediente de seg-sáb em até 3 blocos de
 * ~8h — o gestor pode depois ajustar cada um manualmente em TurnosPadraoManager.
 */
function gerarTurnosPadrao(respostas: RespostasAssistente): Omit<TurnoPadrao, 'id'>[] {
  const turnos: Omit<TurnoPadrao, 'id'>[] = [];

  if (respostas.funcionaSegASab) {
    const abertura = respostas.horaAberturaSegASab;
    const fechamento = respostas.horaFechamentoSegASab;
    turnos.push({
      empresaId: respostas.empresaId,
      nome: 'Manhã',
      horaInicio: abertura,
      horaFim: somarHoras(abertura, 8),
      diasSemana: DIAS_SEG_A_SAB,
      setorId: respostas.setorId,
      ativo: true,
    });
    turnos.push({
      empresaId: respostas.empresaId,
      nome: 'Tarde',
      horaInicio: somarHoras(abertura, 8),
      horaFim: somarHoras(abertura, 16),
      diasSemana: DIAS_SEG_A_SAB,
      setorId: respostas.setorId,
      ativo: true,
    });
    turnos.push({
      empresaId: respostas.empresaId,
      nome: 'Fechamento',
      horaInicio: somarHoras(abertura, 16),
      horaFim: fechamento,
      diasSemana: DIAS_SEG_A_SAB,
      setorId: respostas.setorId,
      ativo: true,
    });
  }

  if (respostas.funcionaDomingo) {
    turnos.push({
      empresaId: respostas.empresaId,
      nome: 'Domingo',
      horaInicio: respostas.horaAberturaDomingo,
      horaFim: respostas.horaFechamentoDomingo,
      diasSemana: DIA_DOMINGO,
      setorId: respostas.setorId,
      ativo: true,
    });
  }

  return turnos;
}

/**
 * Gera as regras de cobertura mínima. A regra do "corte noturno" (ex: após
 * 22h) recebe prioridade mais alta que a do "corte de pico" (ex: após 18h),
 * exatamente como descrito no documento de arquitetura — resolve o empate
 * quando as duas janelas se sobrepõem.
 */
function gerarRegrasCobertura(respostas: RespostasAssistente): Omit<RegraCobertura, 'id'>[] {
  const regras: Omit<RegraCobertura, 'id'>[] = [];

  if (respostas.funcionaSegASab && respostas.minimoPadraoDurantePico > 0) {
    regras.push({
      empresaId: respostas.empresaId,
      setorId: respostas.setorId,
      diaSemana: 'todos',
      horaInicio: respostas.horaCorteAlta,
      horaFim: respostas.horaFechamentoSegASab,
      quantidadeMinima: respostas.minimoPadraoDurantePico,
      prioridade: 5,
    });
  }

  if (respostas.funcionaSegASab && respostas.minimoNoturnoMinimo > 0) {
    regras.push({
      empresaId: respostas.empresaId,
      setorId: respostas.setorId,
      diaSemana: 'todos',
      horaInicio: respostas.horaCorteNoturno,
      horaFim: respostas.horaFechamentoSegASab,
      quantidadeMinima: respostas.minimoNoturnoMinimo,
      prioridade: 10,
    });
  }

  if (respostas.funcionaDomingo && respostas.minimoDomingo > 0) {
    regras.push({
      empresaId: respostas.empresaId,
      setorId: respostas.setorId,
      diaSemana: 0,
      horaInicio: respostas.horaAberturaDomingo,
      horaFim: respostas.horaFechamentoDomingo,
      quantidadeMinima: respostas.minimoDomingo,
      prioridade: 5,
    });
  }

  return regras;
}

function gerarConfiguracaoEscala(respostas: RespostasAssistente): ConfiguracaoEscala {
  return {
    empresaId: respostas.empresaId,
    cargaHorariaSemanal: respostas.cargaHorariaSemanal,
    permiteBancoHoras: respostas.permiteBancoHoras,
    permiteHoraExtraSemana: respostas.permiteHoraExtraSemana,
    domingoContaHoraExtra: respostas.domingoContaHoraExtra,
    intervaloMinimoInterjornadaHoras: respostas.intervaloMinimoInterjornadaHoras,
    maxDiasConsecutivos: respostas.maxDiasConsecutivos,
    diasAntecedenciaPublicacao: respostas.diasAntecedenciaPublicacao,
  };
}

export interface ResultadoAssistente {
  configuracao: ConfiguracaoEscala;
  turnos: Omit<TurnoPadrao, 'id'>[];
  regras: Omit<RegraCobertura, 'id'>[];
}

export function gerarConfiguracaoAPartirDoAssistente(respostas: RespostasAssistente): ResultadoAssistente {
  return {
    configuracao: gerarConfiguracaoEscala(respostas),
    turnos: gerarTurnosPadrao(respostas),
    regras: gerarRegrasCobertura(respostas),
  };
}
