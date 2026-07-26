/**
 * Planejador de Férias Inteligente
 * Sistema de apoio ao gestor para planejamento de férias
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  Ferias,
  PeriodoAquisitivo,
  HistoricoPeriodoAquisitivo,
  AlertaFerias,
  SugestaoDataFerias,
  ConflitoFerias,
  ConfiguracaoFerias,
  Colaborador,
  Setor,
  Cargo,
  MovimentoAusencia,
} from '../types';
import { DataService } from '../services/DataService';
import { gerarPeriodosFaltantes } from '../features/disponibilidade/engine/GeradorPeriodosAquisitivos';
import { recalcularSaldoPeriodo, recalcularSaldoDeTodosOsPeriodos } from '../features/disponibilidade/engine/CalculadoraSaldoPeriodo';
import { format, addDays, addMonths, differenceInDays, parseISO, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ============================================================================
// UTILIDADES DE CÁLCULO
// ============================================================================
// A geração de períodos aquisitivos e o cálculo de saldo NÃO vivem mais aqui —
// foram extraídos para o Motor de Disponibilidade Operacional
// (features/disponibilidade/engine/), mesmo padrão já usado pelo motor da
// Escala Inteligente. Resolve a causa raiz do bug de período aquisitivo:
// id agora é determinístico por colaborador (sem colisão entre pessoas
// admitidas no mesmo ano) e diasUsados é sempre derivado do razão de
// MovimentoAusencia, nunca mais fixo em zero.

function calcularDiasRestantes(periodo: PeriodoAquisitivo): number {
  return periodo.diasDisponiveis - periodo.diasUsados;
}

// Único fallback usado em todo o arquivo quando a configuração ainda não
// carregou — Fase 3 exige que nenhuma regra fique hardcoded espalhada; se a
// config real não chegou a tempo, cai neste valor central, nunca em cópias
// soltas pelo componente.
const CONFIGURACAO_FERIAS_PADRAO: ConfiguracaoFerias = {
  diasAntecedenciaAlerta: 90,
  permitirFeriasProlongadas: true,
  maximoDiasSimultaneoSetor: 3,
  maximoPercentualEquipe: 35,
  diasMinimosAntecedenciaPlanejamento: 7,
  opcoesAntecedencia: [30, 60, 90, 120, 180],
  salarioMinimoDias: 10,
  prazoConcessivoMeses: 12,
  maximoParcelas: 3,
  permitirVendaFerias: true,
  diasVendidosMaximo: 10,
  bloquearSobreposicao: false,
};

function gerarAlertasFerias(
  colaborador: Colaborador,
  periodos: PeriodoAquisitivo[],
  configuracao: ConfiguracaoFerias
): AlertaFerias[] {
  const alertas: AlertaFerias[] = [];
  const hoje = new Date();
  
  periodos.forEach((periodo) => {
    const dataFim = parseISO(periodo.dataFim);
    const diasRestantes = differenceInDays(dataFim, hoje);
    
    // Alerta de período aquisitivo vencendo
    if (periodo.status === 'ativo') {
      if (diasRestantes <= 0) {
        alertas.push({
          id: `alerta-vencido-${periodo.id}`,
          colaboradorId: colaborador.id,
          tipo: 'periodo_aquisitivo_vencendo',
          titulo: '⛔ Prazo Vencido',
          descricao: `O período aquisitivo ${format(parseISO(periodo.dataInicio), 'dd/MM/yyyy')} até ${format(parseISO(periodo.dataFim), 'dd/MM/yyyy')} já venceu.`,
          severidade: 'vermelho',
          diasRestantes: 0,
          dataReferencia: periodo.dataFim,
          status: 'pendente',
          createdAt: new Date().toISOString(),
        });
      } else if (diasRestantes <= 30) {
        alertas.push({
          id: `alerta-30-${periodo.id}`,
          colaboradorId: colaborador.id,
          tipo: 'prazo_concessivo_vencendo',
          titulo: '🔴 Restam 30 dias',
          descricao: `Restam apenas ${diasRestantes} dias para vencer o prazo concessivo.`,
          severidade: 'vermelho',
          diasRestantes,
          dataReferencia: periodo.dataFim,
          status: 'pendente',
          createdAt: new Date().toISOString(),
        });
      } else if (diasRestantes <= 60) {
        alertas.push({
          id: `alerta-60-${periodo.id}`,
          colaboradorId: colaborador.id,
          tipo: 'prazo_concessivo_vencendo',
          titulo: '🔴 Restam 60 dias',
          descricao: `Restam ${diasRestantes} dias para vencer o prazo concessivo.`,
          severidade: 'vermelho',
          diasRestantes,
          dataReferencia: periodo.dataFim,
          status: 'pendente',
          createdAt: new Date().toISOString(),
        });
      } else if (diasRestantes <= 90) {
        alertas.push({
          id: `alerta-90-${periodo.id}`,
          colaboradorId: colaborador.id,
          tipo: 'prazo_concessivo_vencendo',
          titulo: '🟡 Restam 90 dias',
          descricao: `Restam ${diasRestantes} dias para vencer o prazo concessivo.`,
          severidade: 'amarelo',
          diasRestantes,
          dataReferencia: periodo.dataFim,
          status: 'pendente',
          createdAt: new Date().toISOString(),
        });
      }
    }
    
    // Novo período aquisitivo em breve
    const dataProximoPeriodo = addDays(parseISO(periodo.dataFim), 1);
    const diasParaProximo = differenceInDays(dataProximoPeriodo, hoje);
    
    if (diasParaProximo > 0 && diasParaProximo <= 30) {
      alertas.push({
        id: `alerta-novo-${periodo.id}`,
        colaboradorId: colaborador.id,
        tipo: 'periodo_aquisitivo_vencendo',
        titulo: '🟢 Novo período em breve',
        descricao: `Colaborador completará novo período aquisitivo em ${diasParaProximo} dias.`,
        severidade: 'verde',
        diasRestantes: diasParaProximo,
        dataReferencia: format(dataProximoPeriodo, 'yyyy-MM-dd'),
        status: 'pendente',
        createdAt: new Date().toISOString(),
      });
    }
  });
  
  return alertas;
}

function detectarConflitos(
  dataInicio: string,
  dataFim: string,
  setorId: string,
  colaboradorId: string,
  colaboradores: Colaborador[],
  feriasExistentes: Ferias[],
  configuracao: ConfiguracaoFerias
): ConflitoFerias[] {
  const conflitos: ConflitoFerias[] = [];
  const dataInicioObj = parseISO(dataInicio);
  const dataFimObj = parseISO(dataFim);
  
  // Encontrar colaboradores do mesmo setor
  const colegasSetor = colaboradores.filter(
    (c) => c.setorId === setorId && c.id !== colaboradorId && c.situacao !== 'Desligado'
  );
  
  // Verificar férias no mesmo período
  const feriasNoPeriodo = feriasExistentes.filter((f) => {
    if (f.colaboradorId === colaboradorId || f.status === 'cancelada') return false;
    const fInicio = parseISO(f.dataInicio);
    const fFim = parseISO(f.dataFim);
    return (
      isWithinInterval(dataInicioObj, { start: fInicio, end: fFim }) ||
      isWithinInterval(dataFimObj, { start: fInicio, end: fFim }) ||
      isWithinInterval(fInicio, { start: dataInicioObj, end: dataFimObj })
    );
  });
  
  // Contar colegas do setor em férias
  const colegasEmFerias = feriasNoPeriodo.filter((f) => {
    const colega = colegasSetor.find((c) => c.id === f.colaboradorId);
    return !!colega;
  });
  
  if (colegasEmFerias.length > 0) {
    conflitos.push({
      tipo: 'mesmo_setor',
      severidade: colegasEmFerias.length >= configuracao.maximoDiasSimultaneoSetor ? 'alerta' : 'info',
      descricao: `Já existem ${colegasEmFerias.length} colaborador(es) do setor em férias neste período (limite configurado: ${configuracao.maximoDiasSimultaneoSetor}).`,
      colaboradoresAfetados: colegasEmFerias.map((f) => f.colaboradorId),
      dataInicio,
      dataFim,
      recomendacao: 'Considere ajustar a data para evitar concentração.',
    });
  }
  
  // Verificar percentual da equipe
  const totalSetor = colegasSetor.length + 1;
  const percentual = (feriasNoPeriodo.length / totalSetor) * 100;
  
  if (percentual >= configuracao.maximoPercentualEquipe) {
    conflitos.push({
      tipo: 'alta_concentracao',
      severidade: percentual >= configuracao.maximoPercentualEquipe * 1.5 ? 'critico' : 'alerta',
      descricao: `${Math.round(percentual)}% da equipe ficará ausente nesta semana (limite configurado: ${configuracao.maximoPercentualEquipe}%).`,
      colaboradoresAfetados: feriasNoPeriodo.map((f) => f.colaboradorId),
      dataInicio,
      dataFim,
      recomendacao: 'Recomenda-se distribuir as férias ao longo do período.',
    });
  }
  
  return conflitos;
}

function gerarSugestoesDias(
  dataSolicitada: string,
  setorId: string,
  colaboradorId: string,
  colaboradores: Colaborador[],
  feriasExistentes: Ferias[],
  configuracao: ConfiguracaoFerias
): SugestaoDataFerias[] {
  const sugestoes: SugestaoDataFerias[] = [];
  const dataBase = parseISO(dataSolicitada);
  
  // Gerar sugestões para próximas 4 semanas
  for (let i = 0; i < 4; i++) {
    const dataSugerida = addDays(dataBase, 7 * (i + 1));
    const dataFimSugerida = addDays(dataSugerida, 14); // 15 dias de férias
    
    const conflitos = detectarConflitos(
      format(dataSugerida, 'yyyy-MM-dd'),
      format(dataFimSugerida, 'yyyy-MM-dd'),
      setorId,
      colaboradorId,
      colaboradores,
      feriasExistentes,
      configuracao
    );
    
    const colegasSetor = colaboradores.filter(
      (c) => c.setorId === setorId && c.id !== colaboradorId && c.situacao !== 'Desligado'
    );
    
    const percentual =
      colegasSetor.length > 0
        ? (conflitos.length / (colegasSetor.length + 1)) * 100
        : 0;
    
    sugestoes.push({
      data: format(dataSugerida, 'yyyy-MM-dd'),
      motivo:
        i === 0
          ? 'Menor conflito'
          : i === 1
          ? 'Nenhum colaborador do setor em férias'
          : 'Melhor distribuição da equipe',
      conflitos: conflitos.length,
      colaboradoresAfastados: conflitos.reduce(
        (acc, c) => acc + c.colaboradoresAfetados.length,
        0
      ),
      percentualEquipeAfastada: Math.round(percentual),
      score: conflitos.length * 10 + Math.round(percentual),
    });
  }
  
  // Ordenar por score (menor é melhor)
  return sugestoes.sort((a, b) => a.score - b.score);
}

function formatarDataSegura(dataISO: string | undefined | null, formato: string, fallback = '—'): string {
  if (!dataISO) return fallback;
  const data = parseISO(dataISO);
  if (isNaN(data.getTime())) return fallback;
  return format(data, formato);
}

function formatarTempoDeEmpresa(dataAdmissao: string): string {
  const admissao = parseISO(dataAdmissao);
  if (isNaN(admissao.getTime())) return '—';
  const hoje = new Date();
  const anos = differenceInDays(hoje, admissao) / 365;
  const anosInteiros = Math.floor(anos);
  const meses = Math.floor((anos - anosInteiros) * 12);
  
  if (anosInteiros > 0) {
    return `${anosInteiros} ano${anosInteiros > 1 ? 's' : ''}, ${meses} mes${meses !== 1 ? 'es' : ''}`;
  }
  return `${meses} mes${meses !== 1 ? 'es' : ''}`;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

interface PlanejadorFeriasProps {
  colaborador: Colaborador;
  setores: Setor[];
  cargos: Cargo[];
  colaboradores: Colaborador[];
  currentUserId: string;
  onClose: () => void;
  onSalvarFerias: (ferias: Ferias) => void;
  onMarcarPeriodoUtilizado: (periodoId: string, totalmente: boolean) => void;
}

export const PlanejadorFerias: React.FC<PlanejadorFeriasProps> = ({
  colaborador,
  setores,
  cargos,
  colaboradores,
  currentUserId,
  onClose,
  onSalvarFerias,
  onMarcarPeriodoUtilizado,
}) => {
  const [periodosAquisitivos, setPeriodosAquisitivos] = useState<PeriodoAquisitivo[]>([]);
  const [movimentosAusencia, setMovimentosAusencia] = useState<MovimentoAusencia[]>([]);
  const [ferias, setFerias] = useState<Ferias[]>([]);
  const [alertas, setAlertas] = useState<AlertaFerias[]>([]);
  const [configuracao, setConfiguracao] = useState<ConfiguracaoFerias | null>(null);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [mostrarConfiguracoes, setMostrarConfiguracoes] = useState(false);
  
  // Estado do planejamento
  const [dataInicio, setDataInicio] = useState('');
  const [diasDesejados, setDiasDesejados] = useState(15);
  const [periodoSelecionado, setPeriodoSelecionado] = useState<string>('');
  const [conflitos, setConflitos] = useState<ConflitoFerias[]>([]);
  const [sugestoes, setSugestoes] = useState<SugestaoDataFerias[]>([]);
  const [mostrarModalUtilizado, setMostrarModalUtilizado] = useState<string | null>(null);
  const [dataInicioManualPeriodo, setDataInicioManualPeriodo] = useState('');
  const [criandoPeriodoManual, setCriandoPeriodoManual] = useState(false);
  
  // Carregar dados
  useEffect(() => {
    const carregarDados = async () => {
      const [periodos, feriasData, alertasData, config, movimentos] = await Promise.all([
        DataService.getPeriodosAquisitivos(),
        DataService.getFerias(),
        DataService.getAlertasFerias(),
        DataService.getConfiguracaoFerias(),
        DataService.getMovimentosAusencia(colaborador.id),
      ]);
      
      // Filtrar para este colaborador
      const periodosColaborador = periodos.filter((p) => p.colaboradorId === colaborador.id);
      const feriasColaborador = feriasData.filter((f) => f.colaboradorId === colaborador.id);
      const alertasColaborador = alertasData.filter((a) => a.colaboradorId === colaborador.id);
      
      // Completa os períodos que ainda faltam (idempotente: roda sempre, não só na
      // primeira vez — assim um colaborador antigo que ganha mais um ano de casa
      // recebe o período novo automaticamente, sem precisar apagar nada).
      const { periodosNovos, admissaoInvalida } = gerarPeriodosFaltantes(
        colaborador.id,
        colaborador.dataAdmissao,
        periodosColaborador
      );
      for (const periodo of periodosNovos) {
        await DataService.savePeriodoAquisitivo(periodo);
      }

      // Saldo é sempre derivado do razão de movimentos — nunca lido de um campo
      // solto. Só regrava no backend os períodos cujo cache mudou de verdade,
      // pra não fazer uma escrita por período a cada vez que a tela abre.
      const todosOsPeriodos = [...periodosColaborador, ...periodosNovos];
      const periodosComSaldo = recalcularSaldoDeTodosOsPeriodos(todosOsPeriodos, movimentos);
      const periodosDivergentes = periodosComSaldo.filter((p, i) => {
        const original = todosOsPeriodos[i];
        return original.diasUsados !== p.diasUsados || original.diasRestantes !== p.diasRestantes || original.status !== p.status;
      });
      for (const periodo of periodosDivergentes) {
        await DataService.savePeriodoAquisitivo(periodo);
      }

      setPeriodosAquisitivos(periodosComSaldo);
      setMovimentosAusencia(movimentos);
      setFerias(feriasColaborador);
      setAlertas(alertasColaborador);
      setConfiguracao(config);
      
      // Gerar alertas automáticos se necessário
      if (alertasColaborador.length === 0) {
        const alertasGerados = gerarAlertasFerias(colaborador, periodosComSaldo, config);
        for (const alerta of alertasGerados) {
          await DataService.saveAlertaFerias(alerta);
        }
        setAlertas(alertasGerados);
      }
    };
    
    carregarDados();
  }, [colaborador]);
  
  // Calcular conflitos e sugestões quando data muda
  useEffect(() => {
    if (dataInicio) {
      const configEfetiva = configuracao || CONFIGURACAO_FERIAS_PADRAO;
      const conflitosDetectados = detectarConflitos(
        dataInicio,
        format(addDays(parseISO(dataInicio), diasDesejados - 1), 'yyyy-MM-dd'),
        colaborador.setorId,
        colaborador.id,
        colaboradores,
        ferias,
        configEfetiva
      );
      setConflitos(conflitosDetectados);
      
      const sugestoesGeradas = gerarSugestoesDias(
        dataInicio,
        colaborador.setorId,
        colaborador.id,
        colaboradores,
        ferias,
        configEfetiva
      );
      setSugestoes(sugestoesGeradas);
    }
  }, [dataInicio, colaborador, colaboradores, ferias, configuracao, diasDesejados]);
  
  // Obter período mais antigo não utilizado (automático)
  const periodoAutomatico = useMemo(() => {
    return periodosAquisitivos.find(
      (p) => p.status === 'ativo' && calcularDiasRestantes(p) > 0
    );
  }, [periodosAquisitivos]);
  
  const setor = setores.find((s) => s.id === colaborador.setorId);
  const cargo = cargos.find((c) => c.id === colaborador.cargoId);
  
  // Histórico formatado
  const historico: HistoricoPeriodoAquisitivo[] = periodosAquisitivos.map((p) => ({
    id: p.id,
    colaboradorId: p.colaboradorId,
    periodo: `${format(parseISO(p.dataInicio), 'dd/MM/yyyy')} até ${format(
      parseISO(p.dataFim),
      'dd/MM/yyyy'
    )}`,
    diasTotais: p.diasDisponiveis,
    diasUtilizados: p.diasUsados,
    diasRestantes: calcularDiasRestantes(p),
    status:
      p.status === 'concluido'
        ? 'Concluído'
        : p.status === 'vencido'
        ? 'Vencido'
        : calcularDiasRestantes(p) < p.diasDisponiveis
        ? 'Parcialmente utilizado'
        : 'Em aquisição',
    dataInicio: p.dataInicio,
    dataFim: p.dataFim,
  }));
  
  // Dias disponíveis no período selecionado
  const periodoAtual = periodosAquisitivos.find((p) => p.id === periodoSelecionado);
  const diasDisponiveisNoPeriodo = periodoAtual ? calcularDiasRestantes(periodoAtual) : 0;
  
  const handleSalvar = async () => {
    if (!dataInicio) {
      alert('Selecione uma data de início.');
      return;
    }
    
    if (diasDesejados > diasDisponiveisNoPeriodo) {
      alert(`Você possui apenas ${diasDisponiveisNoPeriodo} dias disponíveis neste período.`);
      return;
    }

    const configEfetiva = configuracao || CONFIGURACAO_FERIAS_PADRAO;
    const dataFimCalculada = format(addDays(parseISO(dataInicio), diasDesejados - 1), 'yyyy-MM-dd');
    const periodoIdEfetivo = periodoSelecionado || periodoAutomatico?.id || '';

    // ── Fase 3 — regras vindas 100% da configuração, nada fixo no código ──
    if (diasDesejados < configEfetiva.salarioMinimoDias) {
      alert(`O mínimo por lançamento é de ${configEfetiva.salarioMinimoDias} dia(s), conforme configurado.`);
      return;
    }

    const antecedenciaDias = differenceInDays(parseISO(dataInicio), new Date());
    if (antecedenciaDias < configEfetiva.diasMinimosAntecedenciaPlanejamento) {
      alert(
        `É preciso solicitar com pelo menos ${configEfetiva.diasMinimosAntecedenciaPlanejamento} dia(s) de antecedência (configurado). Faltam apenas ${Math.max(0, antecedenciaDias)} dia(s) para a data escolhida.`
      );
      return;
    }

    if (periodoIdEfetivo) {
      const parcelasAtivas = ferias.filter((f) => f.periodoAquisitivoId === periodoIdEfetivo && f.status !== 'cancelada').length;
      if (parcelasAtivas >= configEfetiva.maximoParcelas) {
        alert(`Este período aquisitivo já atingiu o máximo de ${configEfetiva.maximoParcelas} parcela(s) configurado.`);
        return;
      }
    }

    // Sobreposição com férias do próprio colaborador — checagem incondicional
    // de integridade de dado (não depende de configuração: ninguém pode ficar
    // de férias duas vezes ao mesmo tempo).
    const dataInicioObj = parseISO(dataInicio);
    const dataFimObj = parseISO(dataFimCalculada);
    const sobrepoeConsigoMesmo = ferias.some((f) => {
      if (f.status === 'cancelada') return false;
      const fInicio = parseISO(f.dataInicio);
      const fFim = parseISO(f.dataFim);
      return (
        isWithinInterval(dataInicioObj, { start: fInicio, end: fFim }) ||
        isWithinInterval(dataFimObj, { start: fInicio, end: fFim }) ||
        isWithinInterval(fInicio, { start: dataInicioObj, end: dataFimObj })
      );
    });
    if (sobrepoeConsigoMesmo) {
      alert('Este colaborador já possui férias lançadas que se sobrepõem a este período.');
      return;
    }

    // Sobreposição com a equipe — aqui SIM depende de configuração: por
    // padrão é só aviso (já mostrado na tela via `conflitos`), mas se
    // bloquearSobreposicao estiver ligado, impede salvar.
    if (configEfetiva.bloquearSobreposicao && conflitos.length > 0) {
      alert(`Não é possível salvar: ${conflitos.map((c) => c.descricao).join(' ')}`);
      return;
    }

    const dataFim = dataFimCalculada;
    const periodoId = periodoIdEfetivo;
    
    const novaFerias: Ferias = {
      id: `ferias-${Date.now()}`,
      colaboradorId: colaborador.id,
      periodoAquisitivoId: periodoId,
      dataInicio,
      dataFim,
      dias: diasDesejados,
      status: 'planejada',
      createdAt: new Date().toISOString(),
      tipo: diasDesejados === 30 ? 'integral' : 'parcial',
    };

    // Lançamento no razão — é isto que sustenta o saldo, não mais uma edição
    // direta em PeriodoAquisitivo. Ver features/disponibilidade/engine/.
    const novoMovimento: MovimentoAusencia = {
      id: `mov-${Date.now()}`,
      colaboradorId: colaborador.id,
      tipoAusencia: 'ferias',
      tipoMovimento: 'gozo',
      periodoAquisitivoId: periodoId || undefined,
      ausenciaOrigemId: novaFerias.id,
      dataInicio,
      dataFim,
      dias: diasDesejados,
      criadoPor: currentUserId,
      criadoEm: new Date().toISOString(),
    };
    await DataService.saveMovimentoAusencia(novoMovimento);
    const movimentosAtualizados = [...movimentosAusencia, novoMovimento];

    // Atualizar cache do período aquisitivo (derivado do razão, não editado à mão)
    if (periodoId) {
      const periodo = periodosAquisitivos.find((p) => p.id === periodoId);
      if (periodo) {
        const periodoAtualizado = recalcularSaldoPeriodo(periodo, movimentosAtualizados);
        await DataService.savePeriodoAquisitivo(periodoAtualizado);
      }
    }
    
    await DataService.saveFerias(novaFerias);
    onSalvarFerias(novaFerias);
    
    // Recarregar dados
    const periodosAtualizados = await DataService.getPeriodosAquisitivos();
    setPeriodosAquisitivos(
      recalcularSaldoDeTodosOsPeriodos(
        periodosAtualizados.filter((p) => p.colaboradorId === colaborador.id),
        movimentosAtualizados
      )
    );
    setMovimentosAusencia(movimentosAtualizados);
    setFerias([...ferias, novaFerias]);
    
    // Limpar formulário
    setDataInicio('');
    setDiasDesejados(15);
    setPeriodoSelecionado('');
  };
  
  const handleMarcarUtilizado = async (periodoId: string, totalmente: boolean) => {
    const periodo = periodosAquisitivos.find((p) => p.id === periodoId);
    if (!periodo || !totalmente) {
      setMostrarModalUtilizado(null);
      return;
    }

    // "Marcar como utilizado" é um ajuste manual, não um gozo com datas reais —
    // é exatamente o mecanismo pensado para migrar histórico de colaboradores
    // antigos (ver objetivo 2 do motor de disponibilidade): lança a diferença
    // que falta para fechar o período, sem apagar nada.
    const diasParaFechar = periodo.diasDisponiveis - periodo.diasUsados;
    let movimentosAtualizados = movimentosAusencia;
    if (diasParaFechar > 0) {
      const movimentoAjuste: MovimentoAusencia = {
        id: `mov-${Date.now()}`,
        colaboradorId: colaborador.id,
        tipoAusencia: 'ferias',
        tipoMovimento: 'ajuste_manual',
        periodoAquisitivoId: periodo.id,
        dataInicio: periodo.dataInicio,
        dataFim: periodo.dataFim,
        dias: diasParaFechar,
        observacoes: 'Marcado manualmente como período já utilizado.',
        criadoPor: currentUserId,
        criadoEm: new Date().toISOString(),
      };
      await DataService.saveMovimentoAusencia(movimentoAjuste);
      movimentosAtualizados = [...movimentosAusencia, movimentoAjuste];
    }

    const periodoAtualizado: PeriodoAquisitivo = {
      ...recalcularSaldoPeriodo(periodo, movimentosAtualizados),
      marcaComoUtilizado: true,
      dataConclusao: format(new Date(), 'yyyy-MM-dd'),
    };
    
    await DataService.savePeriodoAquisitivo(periodoAtualizado);
    onMarcarPeriodoUtilizado(periodoId, totalmente);
    
    // Recarregar
    const periodosAtualizados = await DataService.getPeriodosAquisitivos();
    setPeriodosAquisitivos(periodosAtualizados.filter((p) => p.colaboradorId === colaborador.id));
    setMovimentosAusencia(movimentosAtualizados);
    
    setMostrarModalUtilizado(null);
  };

  // Criação manual de período aquisitivo. Necessário para dois casos que o cálculo
  // automático (a partir da data de admissão) não cobre: (1) colaborador sem data de
  // admissão válida cadastrada, e (2) casos em que o ciclo real de férias do
  // colaborador não bate com a conta simples de "12 meses após a admissão" — por
  // exemplo, histórico migrado de outro sistema com datas diferentes.
  const handleCriarPeriodoManual = async () => {
    if (!dataInicioManualPeriodo) {
      alert('Selecione a data de início do período aquisitivo.');
      return;
    }
    const inicio = parseISO(dataInicioManualPeriodo);
    if (isNaN(inicio.getTime())) {
      alert('Data inválida.');
      return;
    }

    setCriandoPeriodoManual(true);
    try {
      const fim = addMonths(inicio, 12);
      const hoje = new Date();
      let status: PeriodoAquisitivo['status'] = 'futuro';
      if (inicio <= hoje && hoje <= fim) status = 'ativo';
      else if (hoje > fim) status = 'vencido';

      const novoPeriodo: PeriodoAquisitivo = {
        id: `pa-manual-${Date.now()}`,
        colaboradorId: colaborador.id,
        anoBase: inicio.getFullYear(),
        dataInicio: format(inicio, 'yyyy-MM-dd'),
        dataFim: format(fim, 'yyyy-MM-dd'),
        diasDisponiveis: 30,
        diasUsados: 0,
        diasRestantes: 30,
        status,
      };

      await DataService.savePeriodoAquisitivo(novoPeriodo);
      setPeriodosAquisitivos((atuais) => [...atuais, novoPeriodo]);
      setDataInicioManualPeriodo('');
    } finally {
      setCriandoPeriodoManual(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                🏖️ Planejador Inteligente de Férias
              </h2>
              <p className="text-blue-100 mt-1">
                {colaborador.nome} • {cargo?.nome || 'Cargo'} • {setor?.nome || 'Setor'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => { setMostrarHistorico(false); setMostrarConfiguracoes(false); }}
            className={`px-6 py-3 font-medium transition-colors ${
              !mostrarHistorico && !mostrarConfiguracoes
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📅 Planejar Férias
          </button>
          <button
            onClick={() => { setMostrarHistorico(true); setMostrarConfiguracoes(false); }}
            className={`px-6 py-3 font-medium transition-colors ${
              mostrarHistorico && !mostrarConfiguracoes
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📊 Histórico
          </button>
          <button
            onClick={() => { setMostrarHistorico(false); setMostrarConfiguracoes(true); }}
            className={`px-6 py-3 font-medium transition-colors ${
              mostrarConfiguracoes
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            ⚙️ Configurações
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ====== TAB PLANEJAR ====== */}
          {!mostrarHistorico && !mostrarConfiguracoes && (
            <div className="space-y-6">
              {/* Informações do Colaborador */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Admissão</span>
                    <p className="font-medium">
                      {formatarDataSegura(colaborador.dataAdmissao, 'dd/MM/yyyy', 'Não informada')}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Tempo de Empresa</span>
                    <p className="font-medium">{formatarTempoDeEmpresa(colaborador.dataAdmissao)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Dias Disponíveis</span>
                    <p className="font-medium text-emerald-600">
                      {periodoAutomatico ? calcularDiasRestantes(periodoAutomatico) : 0} dias
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Próximo Período</span>
                    <p className="font-medium text-blue-600">
                      {periodoAutomatico
                        ? format(addDays(parseISO(periodoAutomatico.dataFim), 1), 'dd/MM/yyyy')
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sem período aquisitivo: acontece quando a data de admissão está vazia/
                  inválida, ou quando o ciclo automático não bate com a realidade do
                  colaborador. Permite criar manualmente em vez de travar a tela. */}
              {periodosAquisitivos.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                  <div>
                    <p className="font-semibold text-amber-800">⚠️ Nenhum período aquisitivo cadastrado</p>
                    <p className="text-sm text-amber-700 mt-1">
                      {colaborador.dataAdmissao
                        ? 'Não foi possível calcular automaticamente a partir da data de admissão cadastrada. Você pode criar o período manualmente abaixo.'
                        : 'Este colaborador não tem data de admissão cadastrada, então o cálculo automático não pode rodar. Preencha a data de admissão no cadastro do colaborador, ou crie o período manualmente abaixo.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Data de início do período
                      </label>
                      <input
                        type="date"
                        value={dataInicioManualPeriodo}
                        onChange={(e) => setDataInicioManualPeriodo(e.target.value)}
                        className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      />
                    </div>
                    <button
                      onClick={handleCriarPeriodoManual}
                      disabled={criandoPeriodoManual || !dataInicioManualPeriodo}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      {criandoPeriodoManual ? 'Criando...' : '+ Criar Período Aquisitivo'}
                    </button>
                  </div>
                  <p className="text-xs text-amber-600">
                    Gera um período padrão de 30 dias, válido por 12 meses a partir da data escolhida — os mesmos parâmetros usados no cálculo automático.
                  </p>
                </div>
              )}
              
              {/* Alertas */}
              {alertas.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-700">🔔 Alertas</h3>
                  {alertas.map((alerta) => (
                    <div
                      key={alerta.id}
                      className={`p-3 rounded-lg border-l-4 ${
                        alerta.severidade === 'vermelho'
                          ? 'bg-red-50 border-red-500'
                          : alerta.severidade === 'amarelo'
                          ? 'bg-amber-50 border-amber-500'
                          : 'bg-green-50 border-green-500'
                      }`}
                    >
                      <p className="font-medium">{alerta.titulo}</p>
                      <p className="text-sm text-gray-600">{alerta.descricao}</p>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Formulário de Planejamento */}
              <div className="bg-white border rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">📅 Nova Solicitação de Férias</h3>
                </div>
                
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data de Início
                    </label>
                    <input
                      type="date"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantidade de Dias
                    </label>
                    <select
                      value={diasDesejados}
                      onChange={(e) => setDiasDesejados(Number(e.target.value))}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {[...Array(Math.min(diasDisponiveisNoPeriodo || 30, 30) + 1)].map((_, i) => (
                        <option key={i} value={i}>
                          {i} {i === 1 ? 'dia' : 'dias'}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Período Aquisitivo
                    </label>
                    <select
                      value={periodoSelecionado}
                      onChange={(e) => setPeriodoSelecionado(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">
                        Automático{periodoAutomatico ? ` (${format(parseISO(periodoAutomatico.dataInicio), 'yyyy')}/${format(parseISO(periodoAutomatico.dataFim), 'yyyy')})` : ''}
                      </option>
                      {periodosAquisitivos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {format(parseISO(p.dataInicio), 'yyyy')}/{format(parseISO(p.dataFim), 'yyyy')} — {format(parseISO(p.dataInicio), 'dd/MM/yyyy')} a{' '}
                          {format(parseISO(p.dataFim), 'dd/MM/yyyy')} ({calcularDiasRestantes(p)} dias disponíveis)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Conflitos */}
                {conflitos.length > 0 && (
                  <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <h4 className="font-medium text-amber-800 mb-2">⚠️ Conflitos Detectados</h4>
                    {conflitos.map((conflito, idx) => (
                      <div key={idx} className="text-sm text-amber-700 mb-1">
                        <p>{conflito.descricao}</p>
                        {conflito.recomendacao && (
                          <p className="text-amber-600 italic">{conflito.recomendacao}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Sugestões */}
                {sugestoes.length > 0 && dataInicio && (
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-700 mb-2">💡 Sugestões de Datas</h4>
                    <div className="grid md:grid-cols-3 gap-3">
                      {sugestoes.slice(0, 3).map((sugestao, idx) => (
                        <button
                          key={idx}
                          onClick={() => setDataInicio(sugestao.data)}
                          className={`p-3 rounded-lg border text-left transition-colors ${
                            sugestao.conflitos === 0
                              ? 'border-green-300 bg-green-50 hover:bg-green-100'
                              : sugestao.conflitos < 2
                              ? 'border-amber-300 bg-amber-50 hover:bg-amber-100'
                              : 'border-red-300 bg-red-50 hover:bg-red-100'
                          }`}
                        >
                          <p className="font-medium">
                            {format(parseISO(sugestao.data), 'dd/MM/yyyy')}
                          </p>
                          <p className="text-xs text-gray-600">{sugestao.motivo}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {sugestao.conflitos === 0
                              ? '✅ Sem conflitos'
                              : `⚠️ ${sugestao.conflitos} conflito(s)`}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <button
                  onClick={handleSalvar}
                  disabled={!dataInicio || diasDesejados === 0}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  📅 Confirmar Planejamento
                </button>
              </div>
              
              {/* Férias Planejadas */}
              {ferias.filter((f) => f.status === 'planejada').length > 0 && (
                <div className="bg-white border rounded-xl p-6 shadow-sm">
                  <h3 className="font-semibold text-lg mb-4">📋 Férias Planejadas</h3>
                  <div className="space-y-3">
                    {ferias
                      .filter((f) => f.status === 'planejada')
                      .map((f) => (
                        <div
                          key={f.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium">
                              {format(parseISO(f.dataInicio), 'dd/MM/yyyy')} até{' '}
                              {format(parseISO(f.dataFim), 'dd/MM/yyyy')}
                            </p>
                            <p className="text-sm text-gray-500">{f.dias} dias</p>
                          </div>
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                            Planejada
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* ====== TAB HISTÓRICO ====== */}
          {mostrarHistorico && !mostrarConfiguracoes && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">📊 Histórico de Períodos Aquisitivos</h3>
              </div>
              
              {historico.map((item) => (
                <div key={item.id} className="bg-white border rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-lg">{item.periodo}</h4>
                      <div className="mt-2 space-y-1 text-sm text-gray-600">
                        <p>
                          <span className="text-gray-500">Total:</span> {item.diasTotais} dias
                        </p>
                        <p>
                          <span className="text-gray-500">Utilizados:</span> {item.diasUtilizados} dias
                        </p>
                        <p>
                          <span className="text-gray-500">Restantes:</span>{' '}
                          <span
                            className={
                              item.diasRestantes > 0 ? 'text-emerald-600 font-medium' : 'text-gray-400'
                            }
                          >
                            {item.diasRestantes} dias
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          item.status === 'Concluído'
                            ? 'bg-green-100 text-green-700'
                            : item.status === 'Vencido'
                            ? 'bg-red-100 text-red-700'
                            : item.status === 'Parcialmente utilizado'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {item.status}
                      </span>
                      {item.diasRestantes > 0 && item.status !== 'Em aquisição' && (
                        <button
                          onClick={() => setMostrarModalUtilizado(item.id)}
                          className="text-sm text-blue-600 hover:text-blue-800 underline"
                        >
                          Marcar como utilizado
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Barra de progresso */}
                  <div className="mt-4">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{ width: `${(item.diasUtilizados / item.diasTotais) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* ====== TAB CONFIGURAÇÕES (somente leitura) ====== */}
          {mostrarConfiguracoes && (
            <div className="space-y-6">
              <h3 className="font-semibold text-lg">⚙️ Regras de Férias vigentes</h3>
              <p className="text-xs text-gray-500 -mt-4">
                Estas regras valem para toda a empresa e são editadas na tela "Configurações → Regras de Férias",
                não aqui — evita que o ajuste feito para uma pessoa mude a regra de todo mundo sem querer.
              </p>

              <div className="bg-white border rounded-xl p-6 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Antecedência dos alertas', valor: `${(configuracao || CONFIGURACAO_FERIAS_PADRAO).diasAntecedenciaAlerta} dias` },
                  { label: 'Antecedência mínima para solicitar', valor: `${(configuracao || CONFIGURACAO_FERIAS_PADRAO).diasMinimosAntecedenciaPlanejamento} dias` },
                  { label: 'Mínimo por lançamento', valor: `${(configuracao || CONFIGURACAO_FERIAS_PADRAO).salarioMinimoDias} dias` },
                  { label: 'Máximo de parcelas por período', valor: `${(configuracao || CONFIGURACAO_FERIAS_PADRAO).maximoParcelas}` },
                  { label: 'Máx. simultâneo por setor', valor: `${(configuracao || CONFIGURACAO_FERIAS_PADRAO).maximoDiasSimultaneoSetor} pessoa(s)` },
                  { label: 'Percentual máximo da equipe', valor: `${(configuracao || CONFIGURACAO_FERIAS_PADRAO).maximoPercentualEquipe}%` },
                  { label: 'Permite férias prolongadas (>30 dias)', valor: (configuracao || CONFIGURACAO_FERIAS_PADRAO).permitirFeriasProlongadas ? 'Sim' : 'Não' },
                  { label: 'Permite venda de férias', valor: (configuracao || CONFIGURACAO_FERIAS_PADRAO).permitirVendaFerias ? `Sim, até ${(configuracao || CONFIGURACAO_FERIAS_PADRAO).diasVendidosMaximo} dias` : 'Não' },
                  { label: 'Sobreposição de equipe', valor: (configuracao || CONFIGURACAO_FERIAS_PADRAO).bloquearSobreposicao ? 'Bloqueia salvar' : 'Só avisa' },
                ].map((linha) => (
                  <div key={linha.label} className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span className="text-xs text-gray-500">{linha.label}</span>
                    <span className="text-sm font-semibold text-gray-800">{linha.valor}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Modal Marcar como Utilizado */}
        {mostrarModalUtilizado && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
              <h3 className="font-semibold text-lg mb-4">Marcar Período como Utilizado</h3>
              <p className="text-gray-600 mb-4">
                Este período aquisitivo já foi totalmente utilizado anteriormente?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleMarcarUtilizado(mostrarModalUtilizado, true)}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  ✅ Sim, totalmente utilizado
                </button>
                <button
                  onClick={() => setMostrarModalUtilizado(null)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlanejadorFerias;
