/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Colaborador, AvaliacaoExperiencia, ConfiguracaoAlertas } from '../types';

export interface LembreteAvaliacao {
  colaborador: Colaborador;
  milestone: string; // '15' | '30' | '60' | '90' | '180'
  templateFamiliaId: string;
  label: string;
  dataLimite?: string;
  diasRestantes: number; // negativo = atrasada
}

export function diffEmDias(data: Date, hoje: Date = new Date()): number {
  return Math.ceil((data.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

// Lembretes de Avaliação 180°: não existe entidade pré-gerada — a data-alvo é
// calculada a partir de dataAdmissao + prazoAvaliacao180 (meses, padrão 6),
// mesmo cálculo usado por gerarAlertasAutomaticos() no backend (Code.gs).
// Usada tanto pelo Dashboard Operacional (janela completa, configurável)
// quanto pela Visão Geral (que filtra depois só o que for realmente urgente).
export function calcularLembretes180(
  colaboradores: Colaborador[],
  configuracaoAlertas: ConfiguracaoAlertas,
  hoje: Date = new Date()
): LembreteAvaliacao[] {
  return colaboradores
    .filter((c) => c.situacao !== 'Desligado' && c.realizarExperiencia !== false)
    .map((c): LembreteAvaliacao | null => {
      if (!c.dataAdmissao) return null;
      if ((c.avaliacoesCompletas || []).includes('180')) return null;
      const dataAdmissao = new Date(c.dataAdmissao);
      if (isNaN(dataAdmissao.getTime())) return null;
      const prazoMeses = c.prazoAvaliacao180 ?? 6;
      const dataAlvo = new Date(dataAdmissao);
      dataAlvo.setMonth(dataAlvo.getMonth() + prazoMeses);
      const diasRestantes = diffEmDias(dataAlvo, hoje);
      if (diasRestantes > (configuracaoAlertas?.diasAntecedenciaAvaliacao180 ?? 30)) return null;
      return {
        colaborador: c,
        milestone: '180',
        templateFamiliaId: 'avaliacao-180',
        label: 'Avaliação 180°',
        dataLimite: dataAlvo.toISOString(),
        diasRestantes,
      };
    })
    .filter((l): l is LembreteAvaliacao => l !== null)
    .sort((a, b) => a.diasRestantes - b.diasRestantes);
}

// Lembretes de Avaliação de Experiência (15/30/60/90 dias). Fonte de
// verdade: as entidades AvaliacaoExperiencia já pré-geradas na criação do
// colaborador (ver App.handleAddColaborador). Mostra pendentes dentro da
// janela configurada, e SEMPRE as atrasadas (nunca escondidas).
export function calcularLembretesExperiencia(
  colaboradores: Colaborador[],
  avaliacoesExperiencia: AvaliacaoExperiencia[],
  configuracaoAlertas: ConfiguracaoAlertas,
  hoje: Date = new Date()
): LembreteAvaliacao[] {
  return avaliacoesExperiencia
    .filter((a) => a.status === 'pendente')
    .map((a): LembreteAvaliacao | null => {
      const colaborador = colaboradores.find((c) => c.id === a.colaboradorId);
      if (!colaborador || colaborador.situacao === 'Desligado') return null;
      const diasRestantes = diffEmDias(new Date(a.dataVencimento), hoje);
      if (diasRestantes > (configuracaoAlertas?.diasAntecedenciaAvaliacao180 ?? 30)) return null;
      return {
        colaborador,
        milestone: String(a.dias),
        templateFamiliaId: 'avaliacao-experiencia',
        label: `Avaliação de ${a.dias} dias`,
        dataLimite: a.dataVencimento,
        diasRestantes,
      };
    })
    .filter((l): l is LembreteAvaliacao => l !== null)
    .sort((a, b) => a.diasRestantes - b.diasRestantes);
}
