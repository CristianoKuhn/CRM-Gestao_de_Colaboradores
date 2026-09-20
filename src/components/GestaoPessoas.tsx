/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Colaborador,
  Setor,
  Cargo,
  Ferias,
  DayOff,
  Folga,
  PeriodoAquisitivo,
  ConfiguracaoGestaoPessoas,
  ConfiguracaoFerias,
  MovimentoAusencia,
  TimelineRegistro,
  Tarefa,
  Reconhecimento,
  AvaliacaoExperiencia,
  PrioridadeRegistro,
  StatusRegistro,
  Inscricao,
  InscricaoEtapa,
  AlertaInteligente,
} from '../types';
import { DataService } from '../services/DataService';
import { PlanejadorFerias, CONFIGURACAO_FERIAS_PADRAO } from './PlanejadorFerias';
import { SugestaoDistribuicaoModal } from './SugestaoDistribuicaoFerias';
import { gerarPeriodosFaltantes } from '../features/disponibilidade/engine/GeradorPeriodosAquisitivos';
import { recalcularSaldoPeriodo } from '../features/disponibilidade/engine/CalculadoraSaldoPeriodo';
import { format, addDays, parseISO, differenceInDays, isWithinInterval } from 'date-fns';
import {
  Calendar,
  Palmtree,
  Briefcase,
  Cake,
  PartyPopper,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Users,
  Settings,
  ChevronLeft,
  Filter,
  Plus,
  X,
  CalendarDays,
  Gift,
  TrendingUp,
  Info,
  LayoutDashboard,
  Sparkles,
  Search,
} from 'lucide-react';

// ==========================================
// TIPOS INTERNOS
// ==========================================
type SubTab = 'dashboard' | 'calendario' | 'ferias' | 'dayoff' | 'desenvolvimento' | 'config';

interface AlertaGestaoPessoas {
  id: string;
  tipo: 'ferias_90_dias' | 'ferias_vencendo' | 'dayoff_pendente' | 'aniversario' | 'aniversario_empresa' | 'folga_pendente' | 'conflito_setor' | 'etapa_desenvolvimento_atrasada';
  titulo: string;
  descricao: string;
  colaboradorId?: string;
  setorId?: string;
  data?: string;
  nivel: 'info' | 'warning' | 'urgent';
}

interface EventoCalendario {
  id: string;
  tipo: 'ferias' | 'dayoff' | 'folga' | 'aniversario' | 'aniversario_empresa' | 'avaliacao' | 'feedback' | 'pdi' | 'treinamento' | 'etapa_desenvolvimento';
  titulo: string;
  data: string;
  colaboradorId?: string;
  setorId?: string;
  cor: string;
}

// ==========================================
// UTILITÁRIOS DE DATA
// ==========================================
const HOJE = new Date();
const ANO_ATUAL = HOJE.getFullYear();
const MES_ATUAL = HOJE.getMonth();

function calcularTempoDeEmpresa(dataAdmissao: string | undefined): { texto: string; dias: number } {
  if (!dataAdmissao) return { texto: '-', dias: 0 };
  
  const admissao = new Date(dataAdmissao);
  if (isNaN(admissao.getTime())) return { texto: '-', dias: 0 };
  
  const diffMs = HOJE.getTime() - admissao.getTime();
  const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const anos = Math.floor(dias / 365);
  const meses = Math.floor((dias % 365) / 30);
  
  let texto = '';
  if (anos > 0) texto += `${anos} ano${anos > 1 ? 's' : ''}, `;
  if (meses > 0 || anos > 0) texto += `${meses} m${meses !== 1 ? 'eses' : 'ês'}`;
  if (!texto) texto = `${dias} dia${dias !== 1 ? 's' : ''}`;
  
  return { texto: texto.trim(), dias };
}

function calcularProximoAniversario(dataNascimento: string | undefined): { data: string; diasRestantes: number } | null {
  if (!dataNascimento) return null;
  
  const nasc = new Date(dataNascimento);
  if (isNaN(nasc.getTime())) return null;
  
  const proximoAniversario = new Date(ANO_ATUAL, nasc.getMonth(), nasc.getDate());
  
  if (proximoAniversario < HOJE) {
    proximoAniversario.setFullYear(ANO_ATUAL + 1);
  }
  
  const diffMs = proximoAniversario.getTime() - HOJE.getTime();
  const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  return {
    data: proximoAniversario.toISOString().split('T')[0],
    diasRestantes,
  };
}

function calcularProximoAniversarioEmpresa(dataAdmissao: string | undefined): { data: string; diasRestantes: number } {
  if (!dataAdmissao) return { data: '', diasRestantes: 0 };
  
  const admissao = new Date(dataAdmissao);
  if (isNaN(admissao.getTime())) return { data: '', diasRestantes: 0 };
  
  let proximoAniversario = new Date(ANO_ATUAL, admissao.getMonth(), admissao.getDate());
  
  if (proximoAniversario < HOJE) {
    proximoAniversario.setFullYear(ANO_ATUAL + 1);
  }
  
  const diffMs = proximoAniversario.getTime() - HOJE.getTime();
  const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  return {
    data: proximoAniversario.toISOString().split('T')[0],
    diasRestantes,
  };
}

function calcularElegibilidadeFerias(dataAdmissao: string | undefined): { elegivel: boolean; dataElegibilidade: string; diasRestantes: number } {
  if (!dataAdmissao) return { elegivel: false, dataElegibilidade: '', diasRestantes: 0 };
  
  const admissao = new Date(dataAdmissao);
  if (isNaN(admissao.getTime())) return { elegivel: false, dataElegibilidade: '', diasRestantes: 0 };
  
  const dataElegibilidade = new Date(admissao);
  dataElegibilidade.setDate(dataElegibilidade.getDate() + 365);
  
  const diffMs = dataElegibilidade.getTime() - HOJE.getTime();
  const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  return {
    elegivel: diasRestantes <= 0,
    dataElegibilidade: dataElegibilidade.toISOString().split('T')[0],
    diasRestantes,
  };
}

function calcularPrazoMaximoFerias(dataAdmissao: string | undefined): { data: string; diasRestantes: number } {
  if (!dataAdmissao) return { data: '', diasRestantes: 0 };
  
  const admissao = new Date(dataAdmissao);
  if (isNaN(admissao.getTime())) return { data: '', diasRestantes: 0 };
  
  const prazoMaximo = new Date(admissao);
  prazoMaximo.setDate(prazoMaximo.getDate() + 730); // 2 anos para gozar
  
  const diffMs = prazoMaximo.getTime() - HOJE.getTime();
  const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  return {
    data: prazoMaximo.toISOString().split('T')[0],
    diasRestantes,
  };
}

function getMesesDoAno(): string[] {
  return ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
}

// ==========================================
// FUNÇÕES DE REGRAS DE FÉRIAS
// ==========================================

// Feriados brasileiros (fixos e moveis aproximados)
function getFeriadosBrasil(ano: number): Date[] {
  const pascoa = calcularPascoa(ano);
  return [
    new Date(ano, 0, 1),   // Ano Novo
    new Date(ano, 0, 25),  // São Paulo (ou 21/04 para Tiradentes)
    new Date(ano, 3, 21),  // Tiradentes
    new Date(ano, 3, 1),   // Dia do Trabalho
    new Date(ano, 8, 7),   // Independência
    new Date(ano, 9, 12),   // Nossa Senhora Aparecida
    new Date(ano, 10, 2),  // Finados
    new Date(ano, 10, 15), // Proclamação da República
    new Date(ano, 11, 25), // Natal
    // Carnaval (sexta antes da Páscoa)
    new Date(pascoa.getTime() - 2 * 24 * 60 * 60 * 1000),
    new Date(pascoa.getTime() - 1 * 24 * 60 * 60 * 1000),
    // Paixão de Cristo (sexta Santa)
    new Date(pascoa.getTime() - 0 * 24 * 60 * 60 * 1000),
  ];
}

function calcularPascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 30);
  const dia = ((h + l - 7 * m + 114) % 30) + 1;
  return new Date(ano, mes - 1, dia);
}

function isFimDeSemana(data: Date): boolean {
  const diaSemana = data.getDay();
  return diaSemana === 0 || diaSemana === 6;
}

function isFeriado(data: Date, ano: number): boolean {
  const feriados = getFeriadosBrasil(ano);
  const dataStr = data.toISOString().split('T')[0];
  return feriados.some(f => f.toISOString().split('T')[0] === dataStr);
}

function isProximoFeriado(data: Date, ano: number, margemDias: number = 2): boolean {
  const feriados = getFeriadosBrasil(ano);
  const dataTime = data.getTime();
  return feriados.some(f => {
    const diff = Math.abs(f.getTime() - dataTime);
    return diff <= margemDias * 24 * 60 * 60 * 1000;
  });
}

function getProximoDiaUtil(data: Date, direção: 'proximo' | 'anterior' = 'proximo'): Date {
  let novaData = new Date(data);
  while (isFimDeSemana(novaData)) {
    novaData.setDate(novaData.getDate() + (direção === 'proximo' ? 1 : -1));
  }
  return novaData;
}

function getDatasBloqueadasFerias(dataInicio: Date, dias: number, ano: number): { valida: boolean; motivo?: string } {
  const inicio = new Date(dataInicio);
  const fim = new Date(dataInicio);
  fim.setDate(fim.getDate() + dias - 1);
  
  // Verificar início
  if (isFimDeSemana(inicio)) {
    return { valida: false, motivo: 'Início não pode ser em fim de semana' };
  }
  if (isProximoFeriado(inicio, ano)) {
    return { valida: false, motivo: 'Início muito próximo de feriado' };
  }
  
  // Verificar fim
  if (isFimDeSemana(fim)) {
    return { valida: false, motivo: 'Fim não pode ser em fim de semana' };
  }
  if (isProximoFeriado(fim, ano)) {
    return { valida: false, motivo: 'Fim muito próximo de feriado' };
  }
  
  // Verificar se atravessa feriado no meio
  const feriados = getFeriadosBrasil(ano);
  for (let i = 0; i < dias; i++) {
    const dataAtual = new Date(inicio);
    dataAtual.setDate(dataAtual.getDate() + i);
    const dataStr = dataAtual.toISOString().split('T')[0];
    if (feriados.some(f => f.toISOString().split('T')[0] === dataStr)) {
      return { valida: false, motivo: 'Período inclui feriado(s)' };
    }
  }
  
  return { valida: true };
}

interface SugestaoFerias {
  dataInicio: Date;
  dataFim: Date;
  dias: number;
  pontuacao: number;
  motivo: string;
}

function gerarSugestoesFerias(
  colaborador: Colaborador,
  diasDisponiveis: number,
  setor: Setor | undefined,
  colaboradoresSetor: Colaborador[],
  feriasExistentes: Ferias[],
  ano: number
): SugestaoFerias[] {
  const sugestoes: SugestaoFerias[] = [];
  const hoje = new Date();
  
  // Encontrar colaboradores do setor que já têm férias marcadas
  const feriasSetor = feriasExistentes.filter(f => {
    const col = colaboradoresSetor.find(c => c.id === f.colaboradorId);
    return col && f.status !== 'cancelada' && new Date(f.dataInicio).getFullYear() === ano;
  });
  
  // Meses ideais para férias (evitando picos)
  const mesesIdeais = [2, 3, 4, 5, 9, 10, 11]; // Fora do verão e dezembro
  
  for (const mes of mesesIdeais) {
    for (let dia = 1; dia <= 28; dia += 7) {
      const dataTeste = new Date(ano, mes, dia);
      
      if (dataTeste <= hoje) continue;
      
      for (let duracao = 10; duracao <= Math.min(diasDisponiveis, 20); duracao += 5) {
        const validacao = getDatasBloqueadasFerias(dataTeste, duracao, ano);
        
        if (!validacao.valida) continue;
        
        // Verificar se há conflito com outros do setor
        const dataFim = new Date(dataTeste);
        dataFim.setDate(dataFim.getDate() + duracao - 1);
        
        const conflitos = feriasSetor.filter(f => {
          const inicio = new Date(f.dataInicio);
          const fim = new Date(f.dataFim);
          return (dataTeste <= fim && dataFim >= inicio);
        });
        
        let pontuacao = 100;
        
        // Penalizar se houver conflitos
        pontuacao -= conflitos.length * 30;
        
        // Bonificar se for no meio da semana
        const inicioUtil = getProximoDiaUtil(dataTeste, 'proximo');
        if (inicioUtil.getDay() === 1) pontuacao += 10; // Segunda
        if (inicioUtil.getDay() === 5) pontuacao += 5;  // Sexta
        
        // Bonificar se for fora da alta temporada
        if (![0, 6, 11].includes(mes)) pontuacao += 15;
        
        // Penalizar se muito curto
        if (duracao < 10) pontuacao -= 10;
        
        if (pontuacao > 30) {
          sugestoes.push({
            dataInicio: dataTeste,
            dataFim: dataFim,
            dias: duracao,
            pontuacao,
            motivo: conflitos.length > 0 
              ? `${conflitos.length} colega(s) do setor em férias neste período`
              : 'Período recomendado',
          });
        }
      }
    }
  }
  
  // Ordenar por pontuação
  return sugestoes.sort((a, b) => b.pontuacao - a.pontuacao).slice(0, 5);
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
interface GestaoPessoasProps {
  colaboradores: Colaborador[];
  setores: Setor[];
  cargos: Cargo[];
  timeline: TimelineRegistro[];
  tarefas: Tarefa[];
  reconhecimentos: Reconhecimento[];
  avaliacoesExperiencia: AvaliacaoExperiencia[];
  currentUserId: string;
  onSelectColaborador?: (id: string) => void;
  onNavigateToColaborador?: (colaboradorId: string, aba?: string) => void;
}

export default function GestaoPessoas({
  colaboradores,
  setores,
  cargos,
  timeline,
  tarefas,
  reconhecimentos,
  avaliacoesExperiencia,
  currentUserId,
  onSelectColaborador,
  onNavigateToColaborador,
}: GestaoPessoasProps) {
  const [subTab, setSubTab] = useState<SubTab>('dashboard');
  const [ferias, setFerias] = useState<Ferias[]>([]);
  const [dayOffs, setDayOffs] = useState<DayOff[]>([]);
  const [folgas, setFolgas] = useState<Folga[]>([]);
  const [periodosAquisitivos, setPeriodosAquisitivos] = useState<PeriodoAquisitivo[]>([]);
  const [config, setConfig] = useState<ConfiguracaoGestaoPessoas | null>(null);
  const [configFerias, setConfigFerias] = useState<ConfiguracaoFerias | null>(null);
  const [showSugestaoDistribuicao, setShowSugestaoDistribuicao] = useState(false);

  // Motor de Desenvolvimento de Colaboradores — Gestão de Pessoas era a
  // última tela "cega" para Programas/Inscrições/Etapas (PDI, capacitação,
  // carreira etc.): o colaborador podia estar com uma Etapa atrasada e
  // isso nunca aparecia no calendário nem nos Alertas Inteligentes daqui,
  // mesmo o backend já calculando tudo isso todo dia (marcarEtapasAtrasadas_,
  // dentro de gerarAlertasAutomaticos). Sem prop-drilling desde App.tsx.
  const [inscricoesDesenvolvimento, setInscricoesDesenvolvimento] = useState<Inscricao[]>([]);
  const [etapasDesenvolvimento, setEtapasDesenvolvimento] = useState<InscricaoEtapa[]>([]);
  const [alertasEtapasAtrasadas, setAlertasEtapasAtrasadas] = useState<AlertaInteligente[]>([]);
  
  // Filtros
  const [filtroAno, setFiltroAno] = useState(ANO_ATUAL);
  const [filtroMes, setFiltroMes] = useState<number | null>(new Date().getMonth());
  const [filtroSetor, setFiltroSetor] = useState<string | null>(null);
  const [filtroTipoEvento, setFiltroTipoEvento] = useState<string | null>(null);

  // ── Filtros de Férias ────────────────────────────────────────────────────
  const [feriasFiltroBusca, setFeriasFiltroBusca] = useState('');
  const [feriasFiltroPlanejamento, setFeriasFiltroPlanejamento] = useState<'todos' | 'pendente' | 'planejado'>('todos');
  const [feriasFilterStatusPeriodo, setFeriasFilterStatusPeriodo] = useState<'ativo' | 'vencido' | 'futuro' | 'todos'>('ativo');

  // ── Modal de agendamento de DayOff ────────────────────────────────────────
  const [dayoffModalAberto, setDayoffModalAberto] = useState<DayOff | null>(null);
  const [dayoffDataAgendamento, setDayoffDataAgendamento] = useState('');

  // ── Modo de visualização do Desenvolvimento ────────────────────────────────
  // 'ciclo5meses' = padrão — dias até fechar ciclo de 5 meses
  // 'tempoCargo'  = modo antigo — tempo total no cargo atual
  const [modoDesenvolvimento, setModoDesenvolvimento] = useState<'ciclo5meses' | 'tempoCargo'>('ciclo5meses');
  
  // Modal de cadastro
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'ferias' | 'dayoff' | 'folga'>('ferias');
  const [selectedColaborador, setSelectedColaborador] = useState<string | null>(null);
  
  // Planejador de Férias Inteligente
  const [showPlanejadorFerias, setShowPlanejadorFerias] = useState(false);
  const [colaboradorParaPlanejar, setColaboradorParaPlanejar] = useState<Colaborador | null>(null);
  
  // Detalhe de colaborador selecionado
  const [colaboradorDetalhe, setColaboradorDetalhe] = useState<Colaborador | null>(null);
  
  // Lista de anos disponíveis (baseado na primeira admissão)
  const anosDisponiveis = useMemo(() => {
    const anos = new Set<number>();
    anos.add(ANO_ATUAL);
    
    colaboradores.forEach(col => {
      if (!col.dataAdmissao) return;
      const dataAdmissao = new Date(col.dataAdmissao);
      if (isNaN(dataAdmissao.getTime())) return;
      for (let ano = dataAdmissao.getFullYear(); ano <= ANO_ATUAL + 2; ano++) {
        anos.add(ano);
      }
    });
    
    return Array.from(anos).sort((a, b) => a - b);
  }, [colaboradores]);

  // Carregar dados
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [
      feriasData,
      dayoffsData,
      folgasData,
      periodosData,
      configData,
      configFeriasData,
      inscricoesData,
      etapasData,
      alertasData,
    ] = await Promise.all([
      DataService.getFerias(),
      DataService.getDayOffs(),
      DataService.getFolgas(),
      DataService.getPeriodosAquisitivos(),
      DataService.getConfiguracaoGestaoPessoas(),
      DataService.getConfiguracaoFerias(),
      // Motor de Desenvolvimento de Colaboradores — Inscrições em andamento
      // (PDI, capacitação, carreira...) e suas Etapas, para alimentar o
      // calendário e os Alertas Inteligentes desta tela.
      DataService.getInscricoes({ estadoWorkflow: 'em_andamento' }),
      DataService.getInscricaoEtapas(),
      DataService.getAlertasInteligentes(),
    ]);
    setFerias(feriasData);
    setDayOffs(dayoffsData);
    setFolgas(folgasData);
    setPeriodosAquisitivos(periodosData);
    setConfig(configData);
    setConfigFerias(configFeriasData);
    setInscricoesDesenvolvimento(inscricoesData);
    setEtapasDesenvolvimento(etapasData);
    setAlertasEtapasAtrasadas(
      alertasData.filter((a) => a.tipo === 'etapa_desenvolvimento_atrasada' && a.status !== 'resolvido')
    );
  };

  // ==========================================
  // CÁLCULOS E DERIVAÇÕES
  // ==========================================
  
  // Selecionar colaborador para ver detalhes
  const handleSelectColaborador = (colaborador: Colaborador) => {
    setColaboradorDetalhe(colaborador);
  };
  
  // Colaborador selecionado para modal de cadastro
  const handlePlanejarFerias = (colaborador: Colaborador) => {
    setColaboradorParaPlanejar(colaborador);
    setShowPlanejadorFerias(true);
  };
  
  // Alertas inteligentes
  const alertas = useMemo<AlertaGestaoPessoas[]>(() => {
    const listaAlertas: AlertaGestaoPessoas[] = [];
    
    colaboradores.forEach(col => {
      if (col.situacao === 'Desligado') return;
      
      // Próximo aniversário de nascimento
      const proximoAniv = calcularProximoAniversario(col.dataNascimento);
      if (proximoAniv && proximoAniv.diasRestantes <= 15) {
        listaAlertas.push({
          id: `aniv-${col.id}`,
          tipo: 'aniversario',
          titulo: `${col.nome} faz aniversário em breve`,
          descricao: proximoAniv.diasRestantes <= 7 
            ? `${col.nome} faz aniversário em ${proximoAniv.diasRestantes} dia${proximoAniv.diasRestantes !== 1 ? 's' : ''}!`
            : `Aniversário de ${col.nome} no dia ${new Date(proximoAniv.data).toLocaleDateString('pt-BR')}`,
          colaboradorId: col.id,
          data: proximoAniv.data,
          nivel: proximoAniv.diasRestantes <= 7 ? 'urgent' : 'warning',
        });
      }
      
      // Próximo aniversário de empresa
      const proximoAnivEmp = calcularProximoAniversarioEmpresa(col.dataAdmissao);
      if (proximoAnivEmp.diasRestantes <= 30) {
        listaAlertas.push({
          id: `aniv-emp-${col.id}`,
          tipo: 'aniversario_empresa',
          titulo: `${col.nome} completa anos de empresa em breve`,
          descricao: `${col.nome} completa ${Math.floor(proximoAnivEmp.diasRestantes / 365) + 1} ano${proximoAnivEmp.diasRestantes < 365 ? '+' : 's'} de empresa em ${new Date(proximoAnivEmp.data).toLocaleDateString('pt-BR')}`,
          colaboradorId: col.id,
          data: proximoAnivEmp.data,
          nivel: proximoAnivEmp.diasRestantes <= 14 ? 'urgent' : 'info',
        });
      }
      
      // Elegibilidade para férias
      const elegibilidade = calcularElegibilidadeFerias(col.dataAdmissao);
      if (elegibilidade.elegivel) {
        const periodoAtivo = periodosAquisitivos.find(p => p.colaboradorId === col.id && p.status === 'ativo');
        if (periodoAtivo) {
          const diasDisponiveis = periodoAtivo.diasDisponiveis - periodoAtivo.diasUsados;
          if (diasDisponiveis > 0) {
            listaAlertas.push({
              id: `ferias-90-${col.id}`,
              tipo: 'ferias_90_dias',
              titulo: `${col.nome} está elegível para férias`,
              descricao: `${col.nome} possui ${diasDisponiveis} dia${diasDisponiveis !== 1 ? 's' : ''} de férias disponíveis`,
              colaboradorId: col.id,
              nivel: 'info',
            });
          }
        }
      } else if (elegibilidade.diasRestantes <= 90 && elegibilidade.diasRestantes > 0) {
        listaAlertas.push({
          id: `ferias-90-${col.id}`,
          tipo: 'ferias_90_dias',
          titulo: `${col.nome} poderá sair de férias em breve`,
          descricao: `${col.nome} estará elegível para férias em ${elegibilidade.diasRestantes} dia${elegibilidade.diasRestantes !== 1 ? 's' : ''}`,
          colaboradorId: col.id,
          nivel: 'info',
        });
      }
      
      // DayOff pendente
      const dayoffDisponivel = dayOffs.find(d => d.colaboradorId === col.id && d.ano === ANO_ATUAL && d.status === 'disponivel');
      if (dayoffDisponivel) {
        const diffMs = new Date(dayoffDisponivel.dataLimite).getTime() - HOJE.getTime();
        const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (diasRestantes <= 30) {
          listaAlertas.push({
            id: `dayoff-${col.id}`,
            tipo: 'dayoff_pendente',
            titulo: `${col.nome} ainda não utilizou o DayOff`,
            descricao: `DayOff de ${col.nome} vence em ${new Date(dayoffDisponivel.dataLimite).toLocaleDateString('pt-BR')}`,
            colaboradorId: col.id,
            data: dayoffDisponivel.dataLimite,
            nivel: diasRestantes <= 7 ? 'urgent' : 'warning',
          });
        }
      }
    });
    
    // Verificar conflitos de férias no mesmo setor
    const feriasPlanejadas = ferias.filter(f => f.status === 'planejada');
    const colaboradoresPorSetor: Record<string, Ferias[]> = {};
    feriasPlanejadas.forEach(f => {
      const col = colaboradores.find(c => c.id === f.colaboradorId);
      if (col) {
        if (!colaboradoresPorSetor[col.setorId]) {
          colaboradoresPorSetor[col.setorId] = [];
        }
        colaboradoresPorSetor[col.setorId].push(f);
      }
    });
    
    Object.entries(colaboradoresPorSetor).forEach(([setorId, listaFerias]) => {
      if (listaFerias.length >= 2) {
        // Agrupar por mês
        const porMes: Record<string, number> = {};
        listaFerias.forEach(f => {
          const mes = new Date(f.dataInicio).getMonth();
          porMes[mes] = (porMes[mes] || 0) + 1;
        });
        
        Object.entries(porMes).forEach(([mes, count]) => {
          if (count >= 2) {
            const setor = setores.find(s => s.id === setorId);
            listaAlertas.push({
              id: `conflito-${setorId}-${mes}`,
              tipo: 'conflito_setor',
              titulo: `Conflito de férias no setor ${setor?.nome}`,
              descricao: `${count} colaboradores do setor ${setor?.nome} estão previstos para férias em ${getMesesDoAno()[parseInt(mes)]}`,
              setorId,
              nivel: 'warning',
            });
          }
        });
      }
    });
    
    // Etapas de Desenvolvimento atrasadas (PDI, capacitação, carreira...) —
    // o alerta já vem pronto do backend (marcarEtapasAtrasadas_, dentro do
    // job diário gerarAlertasAutomaticos), com título/descrição formatados;
    // aqui só projetamos para o mesmo formato usado nesta tela, para entrar
    // na mesma lista e ordenação que os demais alertas de pessoas.
    alertasEtapasAtrasadas.forEach((alertaEtapa) => {
      const col = colaboradores.find((c) => c.id === alertaEtapa.colaboradorId);
      if (!col || col.situacao === 'Desligado') return;
      listaAlertas.push({
        id: `etapa-dev-${alertaEtapa.id}`,
        tipo: 'etapa_desenvolvimento_atrasada',
        titulo: alertaEtapa.titulo || `Etapa de desenvolvimento atrasada: ${col.nome}`,
        descricao: alertaEtapa.descricao,
        colaboradorId: alertaEtapa.colaboradorId,
        data: alertaEtapa.dataReferencia || undefined,
        nivel: 'urgent',
      });
    });

    return listaAlertas.sort((a, b) => {
      const ordem = { urgent: 0, warning: 1, info: 2 };
      return ordem[a.nivel] - ordem[b.nivel];
    });
  }, [colaboradores, dayOffs, ferias, periodosAquisitivos, setores, alertasEtapasAtrasadas]);

  // Férias previstos nos próximos 90 dias
  const feriasProximos90Dias = useMemo(() => {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() + 90);
    
    return ferias.filter(f => {
      if (f.status !== 'planejada') return false;
      const inicio = new Date(f.dataInicio);
      return inicio >= HOJE && inicio <= dataLimite;
    });
  }, [ferias]);

  // Férias vencendo (período vencido sem gozar)
  const feriasVencendo = useMemo(() => {
    return periodosAquisitivos.filter(p => {
      if (p.status !== 'ativo') return false;
      const diasRestantes = p.diasDisponiveis - p.diasUsados;
      if (diasRestantes <= 0) return false;
      
      const dataFim = new Date(p.dataFim);
      const diffMs = dataFim.getTime() - HOJE.getTime();
      const diasParaVencimento = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      
      return diasParaVencimento <= 60;
    });
  }, [periodosAquisitivos]);

  // DayOffs pendentes
  const dayoffsPendentes = useMemo(() => {
    return dayOffs.filter(d => d.status === 'disponivel' && d.ano === ANO_ATUAL);
  }, [dayOffs]);

  // Aniversariantes do mês
  const aniversariantesDoMes = useMemo(() => {
    return colaboradores.filter(col => {
      if (!col.dataNascimento || col.situacao === 'Desligado') return false;
      const nasc = new Date(col.dataNascimento);
      return nasc.getMonth() === MES_ATUAL;
    });
  }, [colaboradores]);

  // Aniversários de empresa do mês
  const aniversarioEmpresaDoMes = useMemo(() => {
    return colaboradores.filter(col => {
      if (col.situacao === 'Desligado') return false;
      if (!col.dataAdmissao) return false;
      const admissao = new Date(col.dataAdmissao);
      if (isNaN(admissao.getTime())) return false;
      return admissao.getMonth() === MES_ATUAL;
    });
  }, [colaboradores]);

  // Folgas pendentes
  const folgasPendentes = useMemo(() => {
    return folgas.filter(f => f.status === 'pendente');
  }, [folgas]);

  // ==========================================
  // EVENTOS DO CALENDÁRIO
  // ==========================================
  const eventosCalendario = useMemo<EventoCalendario[]>(() => {
    const eventos: EventoCalendario[] = [];
    
    // Férias
    ferias.forEach(f => {
      if (f.status === 'planejada' || f.status === 'concluida') {
        eventos.push({
          id: f.id,
          tipo: 'ferias',
          titulo: `Férias: ${colaboradores.find(c => c.id === f.colaboradorId)?.nome}`,
          data: f.dataInicio,
          colaboradorId: f.colaboradorId,
          setorId: colaboradores.find(c => c.id === f.colaboradorId)?.setorId,
          cor: '#10b981',
        });
      }
    });
    
    // DayOffs
    dayOffs.forEach(d => {
      if (d.status === 'disponivel') {
        eventos.push({
          id: d.id,
          tipo: 'dayoff',
          titulo: `DayOff: ${colaboradores.find(c => c.id === d.colaboradorId)?.nome}`,
          data: d.dataLimite,
          colaboradorId: d.colaboradorId,
          setorId: colaboradores.find(c => c.id === d.colaboradorId)?.setorId,
          cor: '#8b5cf6',
        });
      }
    });
    
    // Folgas
    folgas.forEach(f => {
      if (f.status === 'aprovada') {
        eventos.push({
          id: f.id,
          tipo: 'folga',
          titulo: `Folga: ${colaboradores.find(c => c.id === f.colaboradorId)?.nome}`,
          data: f.data,
          colaboradorId: f.colaboradorId,
          setorId: colaboradores.find(c => c.id === f.colaboradorId)?.setorId,
          cor: '#f59e0b',
        });
      }
    });
    
    // Aniversários de nascimento
    colaboradores.forEach(col => {
      if (!col.dataNascimento || col.situacao === 'Desligado') return;
      const nasc = new Date(col.dataNascimento);
      if (isNaN(nasc.getTime())) return;
      let proximoAniversario = new Date(ANO_ATUAL, nasc.getMonth(), nasc.getDate());
      if (proximoAniversario < HOJE) {
        proximoAniversario.setFullYear(ANO_ATUAL + 1);
      }
      eventos.push({
        id: `aniv-${col.id}`,
        tipo: 'aniversario',
        titulo: `Aniversário: ${col.nome}`,
        data: proximoAniversario.toISOString().split('T')[0],
        colaboradorId: col.id,
        setorId: col.setorId,
        cor: '#ec4899',
      });
    });
    
    // Aniversários de empresa
    colaboradores.forEach(col => {
      if (col.situacao === 'Desligado') return;
      if (!col.dataAdmissao) return;
      const admissao = new Date(col.dataAdmissao);
      if (isNaN(admissao.getTime())) return;
      let proximoAniversario = new Date(ANO_ATUAL, admissao.getMonth(), admissao.getDate());
      if (proximoAniversario < HOJE) {
        proximoAniversario.setFullYear(ANO_ATUAL + 1);
      }
      eventos.push({
        id: `aniv-emp-${col.id}`,
        tipo: 'aniversario_empresa',
        titulo: `${col.nome} - Aniversário de empresa`,
        data: proximoAniversario.toISOString().split('T')[0],
        colaboradorId: col.id,
        setorId: col.setorId,
        cor: '#3b82f6',
      });
    });
    
    // Avaliações de experiência
    avaliacoesExperiencia.forEach(av => {
      if (av.status === 'pendente') {
        const col = colaboradores.find(c => c.id === av.colaboradorId);
        eventos.push({
          id: av.id,
          tipo: 'avaliacao',
          titulo: `Avaliação ${av.dias} dias: ${col?.nome}`,
          data: av.dataVencimento,
          colaboradorId: av.colaboradorId,
          setorId: col?.setorId,
          cor: '#ef4444',
        });
      }
    });
    
    // Etapas de Desenvolvimento (PDI, capacitação, carreira...) em aberto —
    // Motor de Desenvolvimento de Colaboradores. Só entram Etapas já
    // liberadas/em curso/atrasadas (nunca "bloqueada", que ainda depende de
    // outra Etapa concluir) e com data prevista definida.
    const inscricaoPorId = new Map(inscricoesDesenvolvimento.map((i) => [i.id, i]));
    etapasDesenvolvimento.forEach((etapa) => {
      if (!etapa.dataPrevista) return;
      if (!['disponivel', 'em_andamento', 'atrasada'].includes(etapa.status)) return;
      const inscricao = inscricaoPorId.get(etapa.inscricaoId);
      if (!inscricao) return;
      const col = colaboradores.find((c) => c.id === inscricao.colaboradorId);
      if (!col || col.situacao === 'Desligado') return;
      eventos.push({
        id: `etapa-dev-${etapa.id}`,
        tipo: 'etapa_desenvolvimento',
        titulo: `Desenvolvimento: ${etapa.nome} — ${col.nome}`,
        data: etapa.dataPrevista,
        colaboradorId: col.id,
        setorId: col.setorId,
        cor: etapa.status === 'atrasada' ? '#dc2626' : '#6366f1',
      });
    });

    return eventos;
  }, [colaboradores, ferias, dayOffs, folgas, avaliacoesExperiencia, inscricoesDesenvolvimento, etapasDesenvolvimento]);

  // ==========================================
  // HANDLERS
  // ==========================================
  const handleSalvarFerias = async (feriasData: Ferias) => {
    await DataService.saveFerias(feriasData);

    // Lançamento no razão do Motor de Disponibilidade — fonte única de
    // verdade do saldo, seja qual for a tela de origem (Planejador
    // Inteligente ou o cadastro rápido). O guard por ausenciaOrigemId evita
    // duplicar o movimento caso o chamador já tenha lançado o seu próprio.
    if (feriasData.periodoAquisitivoId) {
      const movimentosDoColaborador = await DataService.getMovimentosAusencia(feriasData.colaboradorId);
      const jaLancado = movimentosDoColaborador.some((m) => m.ausenciaOrigemId === feriasData.id);
      if (!jaLancado) {
        const novoMovimento: MovimentoAusencia = {
          id: `mov-${Date.now()}`,
          colaboradorId: feriasData.colaboradorId,
          tipoAusencia: 'ferias',
          tipoMovimento: 'gozo',
          periodoAquisitivoId: feriasData.periodoAquisitivoId,
          ausenciaOrigemId: feriasData.id,
          dataInicio: feriasData.dataInicio,
          dataFim: feriasData.dataFim,
          dias: feriasData.dias,
          criadoPor: currentUserId || 'sistema',
          criadoEm: new Date().toISOString(),
        };
        await DataService.saveMovimentoAusencia(novoMovimento);

        const periodo = periodosAquisitivos.find((p) => p.id === feriasData.periodoAquisitivoId);
        if (periodo) {
          const movimentosAtualizados = [...movimentosDoColaborador, novoMovimento];
          const periodoAtualizado = recalcularSaldoPeriodo(periodo, movimentosAtualizados);
          await DataService.savePeriodoAquisitivo(periodoAtualizado);
        }
      }
    }
    
    // Criar registro na timeline automaticamente
    const novoRegistro: TimelineRegistro = {
      id: `tl-ferias-${Date.now()}`,
      colaboradorId: feriasData.colaboradorId,
      tipo: 'Férias Planejadas',
      titulo: `Férias Planejadas: ${feriasData.dias} dias`,
      descricao: `Período de ${new Date(feriasData.dataInicio).toLocaleDateString('pt-BR')} a ${new Date(feriasData.dataFim).toLocaleDateString('pt-BR')}`,
      data: feriasData.dataInicio,
      responsavelId: currentUserId || 'sistema',
      prioridade: 'Média' as PrioridadeRegistro,
      status: 'Pendente' as StatusRegistro,
      gerarTarefaFutura: false,
      anexos: [],
    };
    await DataService.saveTimelineRegistro(novoRegistro);
    
    loadData();
    setShowModal(false);
  };

  // Fase 4: mesmo mecanismo idempotente do Planejador Inteligente
  // (gerarPeriodosFaltantes) — chamado aqui para que o cadastro rápido de
  // férias também funcione para um colaborador que nunca abriu o planejador
  // completo antes, sem duplicar nada se os períodos já existirem.
  const garantirPeriodosDoColaborador = async (colaboradorId: string) => {
    const colaborador = colaboradores.find((c) => c.id === colaboradorId);
    if (!colaborador) return;
    const periodosDoColaborador = periodosAquisitivos.filter((p) => p.colaboradorId === colaboradorId);
    const { periodosNovos } = gerarPeriodosFaltantes(colaboradorId, colaborador.dataAdmissao, periodosDoColaborador);
    for (const periodo of periodosNovos) {
      await DataService.savePeriodoAquisitivo(periodo);
    }
    if (periodosNovos.length > 0) {
      setPeriodosAquisitivos(await DataService.getPeriodosAquisitivos());
    }
  };

  const handleSalvarDayOff = async (dayoffData: DayOff) => {
    await DataService.saveDayOff(dayoffData);
    loadData();
    setShowModal(false);
  };

  const handleSalvarFolga = async (folgaData: Folga) => {
    await DataService.saveFolga(folgaData);
    loadData();
    setShowModal(false);
  };

  const handleUtilizarDayOff = async (dayoff: DayOff) => {
    const updatedDayOff: DayOff = {
      ...dayoff,
      status: 'utilizado',
      dataUtilizacao: new Date().toISOString().split('T')[0],
    };
    await DataService.saveDayOff(updatedDayOff);
    loadData();
  };

  const handleAprovarFolga = async (folga: Folga) => {
    const updatedFolga: Folga = {
      ...folga,
      status: 'aprovada',
    };
    await DataService.saveFolga(updatedFolga);
    loadData();
  };

  const handleCancelarFolga = async (folga: Folga) => {
    const updatedFolga: Folga = {
      ...folga,
      status: 'cancelada',
    };
    await DataService.saveFolga(updatedFolga);
    loadData();
  };

  const handleSalvarConfig = async (newConfig: ConfiguracaoGestaoPessoas) => {
    await DataService.saveConfiguracaoGestaoPessoas(newConfig);
    setConfig(newConfig);
  };

  const handleSalvarConfigFerias = async (newConfig: ConfiguracaoFerias) => {
    await DataService.saveConfiguracaoFerias(newConfig);
    setConfigFerias(newConfig);
  };

  // ==========================================
  // RENDERIZAÇÃO
  // ==========================================
  const renderSubTabs = () => (
    <div className="flex flex-wrap gap-2 mb-6">
      {[
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'calendario', label: 'Calendário', icon: Calendar },
        { id: 'ferias', label: 'Férias', icon: Palmtree },
        { id: 'dayoff', label: 'DayOff', icon: Gift },
        { id: 'desenvolvimento', label: 'Desenvolvimento', icon: TrendingUp },
        { id: 'config', label: 'Config', icon: Settings },
      ].map(tab => (
        <button
          key={tab.id}
          onClick={() => setSubTab(tab.id as SubTab)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            subTab === tab.id
              ? 'bg-teal-500 text-slate-950'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <tab.icon size={14} />
          {tab.label}
        </button>
      ))}
    </div>
  );

  const getNivelBadge = (nivel: AlertaGestaoPessoas['nivel']) => {
    switch (nivel) {
      case 'urgent':
        return <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-full uppercase">Urgente</span>;
      case 'warning':
        return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase">Atenção</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full uppercase">Info</span>;
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Palmtree size={16} className="text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{feriasProximos90Dias.length}</p>
          <p className="text-[10px] text-slate-500 font-medium">Férias nos próx. 90 dias</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
              <AlertTriangle size={16} className="text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{feriasVencendo.length}</p>
          <p className="text-[10px] text-slate-500 font-medium">Férias vencendo</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center">
              <Gift size={16} className="text-violet-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{dayoffsPendentes.length}</p>
          <p className="text-[10px] text-slate-500 font-medium">DayOffs pendentes</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-pink-100 flex items-center justify-center">
              <Cake size={16} className="text-pink-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{aniversariantesDoMes.length}</p>
          <p className="text-[10px] text-slate-500 font-medium">Aniversários do mês</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
              <PartyPopper size={16} className="text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{aniversarioEmpresaDoMes.length}</p>
          <p className="text-[10px] text-slate-500 font-medium">Aniv. de empresa</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center">
              <Clock size={16} className="text-orange-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{folgasPendentes.length}</p>
          <p className="text-[10px] text-slate-500 font-medium">Folgas pendentes</p>
        </div>
      </div>

      {/* Lista de Alertas */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-500" />
          Alertas Inteligentes
        </h3>
        
        {alertas.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
            <p className="text-sm font-medium">Nenhum alerta no momento</p>
            <p className="text-xs">Tudo em dia com a gestão de pessoas!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alertas.slice(0, 10).map(alerta => {
              const col = alerta.colaboradorId ? colaboradores.find(c => c.id === alerta.colaboradorId) : null;
              return (
                <div
                  key={alerta.id}
                  className={`p-3 rounded-xl border flex items-start gap-3 ${
                    alerta.nivel === 'urgent' ? 'bg-rose-50 border-rose-200' :
                    alerta.nivel === 'warning' ? 'bg-amber-50 border-amber-200' :
                    'bg-slate-50 border-slate-200'
                  }`}
                >
                  {col && (
                    <img src={col.fotoUrl} alt={col.nome} className="w-8 h-8 rounded-full object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-bold text-slate-800">{alerta.titulo}</p>
                      {getNivelBadge(alerta.nivel)}
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">{alerta.descricao}</p>
                    {alerta.data && (
                      <p className="text-[10px] text-slate-400 mt-1">
                        {new Date(alerta.data).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Visão Macro: Setores com Previsão de Férias */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <LayoutDashboard size={16} className="text-teal-500" />
          Visão Macro: Previsão de Férias por Setor
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {setores.map(setor => {
            const colsSetor = colaboradores.filter(c => c.setorId === setor.id && c.situacao !== 'Desligado');
            const colsComFerias = colsSetor.filter(col => {
              const periodo = periodosAquisitivos.find(p => p.colaboradorId === col.id && p.status === 'ativo');
              return periodo && (periodo.diasDisponiveis - periodo.diasUsados) > 0;
            });
            
            return (
              <div 
                key={setor.id}
                onClick={() => setFiltroSetor(setor.id)}
                className="p-4 border border-slate-100 rounded-xl hover:border-teal-200 hover:bg-teal-50/20 cursor-pointer transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-slate-800 text-sm">{setor.nome}</h4>
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {colsSetor.length} cols
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Com férias pendentes:</span>
                    <span className="font-semibold text-amber-600">{colsComFerias.length}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Férias agendadas:</span>
                    <span className="font-semibold text-emerald-600">
                      {ferias.filter(f => {
                        const col = colsSetor.find(c => c.id === f.colaboradorId);
                        return col && f.status !== 'cancelada' && new Date(f.dataInicio).getFullYear() === ANO_ATUAL;
                      }).length}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex -space-x-1">
                  {colsSetor.slice(0, 4).map(col => (
                    <img 
                      key={col.id} 
                      src={col.fotoUrl} 
                      alt={col.nome} 
                      className="w-6 h-6 rounded-full border-2 border-white object-cover"
                      title={col.nome}
                    />
                  ))}
                  {colsSetor.length > 4 && (
                    <span className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white text-[9px] font-bold text-slate-600 flex items-center justify-center">
                      +{colsSetor.length - 4}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Visão Micro: Colaborador Selecionado Detalhadamente */}
      {colaboradorDetalhe ? (
        <ColaboradorDetalheCard
          colaborador={colaboradorDetalhe}
          setor={setores.find(s => s.id === colaboradorDetalhe.setorId)}
          cargo={cargos.find(c => c.id === colaboradorDetalhe.cargoId)}
          periodoAtivo={periodosAquisitivos.find(p => p.colaboradorId === colaboradorDetalhe.id && p.status === 'ativo')}
          prazoMaximoFerias={calcularPrazoMaximoFerias(colaboradorDetalhe.dataAdmissao)}
          sugestoesFerias={gerarSugestoesFerias(
            colaboradorDetalhe,
            (periodosAquisitivos.find(p => p.colaboradorId === colaboradorDetalhe.id && p.status === 'ativo')?.diasDisponiveis || 0) - 
            (periodosAquisitivos.find(p => p.colaboradorId === colaboradorDetalhe.id && p.status === 'ativo')?.diasUsados || 0),
            setores.find(s => s.id === colaboradorDetalhe.setorId),
            colaboradores.filter(c => c.setorId === colaboradorDetalhe.setorId),
            ferias,
            ANO_ATUAL
          )}
          dayoff={dayOffs.find(d => d.colaboradorId === colaboradorDetalhe.id && d.ano === ANO_ATUAL)}
          onClose={() => setColaboradorDetalhe(null)}
          onPlanejarFerias={() => handlePlanejarFerias(colaboradorDetalhe)}
          onVerCompleto={() => onSelectColaborador?.(colaboradorDetalhe.id)}
        />
      ) : (
        /* Lista clicável de colaboradores */
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Users size={16} className="text-teal-500" />
            Visão Micro: Colaboradores - Clique para ver detalhes
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {colaboradores.filter(c => c.situacao !== 'Desligado').map(col => {
              const tempo = calcularTempoDeEmpresa(col.dataAdmissao);
              const prazoFerias = calcularPrazoMaximoFerias(col.dataAdmissao);
              const periodoAtivo = periodosAquisitivos.find(p => p.colaboradorId === col.id && p.status === 'ativo');
              const diasFerias = periodoAtivo ? periodoAtivo.diasDisponiveis - periodoAtivo.diasUsados : 0;
              const dayoff = dayOffs.find(d => d.colaboradorId === col.id && d.ano === ANO_ATUAL);
              const proximoAniv = calcularProximoAniversario(col.dataNascimento);
              
              return (
                <div 
                  key={col.id}
                  onClick={() => handleSelectColaborador(col)}
                  className="p-3 border border-slate-100 rounded-xl hover:border-teal-300 hover:bg-teal-50/30 cursor-pointer transition group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <img src={col.fotoUrl} alt={col.nome} className="w-10 h-10 rounded-full object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-xs truncate">{col.nome}</p>
                      <p className="text-[10px] text-slate-400 truncate">{setores.find(s => s.id === col.setorId)?.nome}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-1 text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tempo:</span>
                      <span className="text-slate-600 font-medium">{tempo.texto}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Férias:</span>
                      <span className={`font-medium ${diasFerias > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {diasFerias} dias
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Prazo máx:</span>
                      <span className={`font-medium ${prazoFerias.diasRestantes < 90 ? 'text-rose-600' : 'text-slate-600'}`}>
                        {prazoFerias.diasRestantes}d
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">DayOff:</span>
                      {dayoff ? (
                        <span className="text-violet-600 font-medium">Agendado</span>
                      ) : (
                        <span className="text-amber-500 font-medium">Pendente</span>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Aniversário:</span>
                      <span className="text-slate-600 font-medium">{proximoAniv?.diasRestantes}d</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const renderCalendario = () => {
    const meses = getMesesDoAno();
    
    // Filtrar eventos
    let eventosFiltrados = eventosCalendario.filter(e => {
      // Excluir eventos de colaboradores desligados por padrão
      const col = colaboradores.find(c => c.id === e.colaboradorId);
      return !col || col.situacao !== 'Desligado';
    });
    if (filtroSetor) {
      eventosFiltrados = eventosFiltrados.filter(e => e.setorId === filtroSetor);
    }
    if (filtroTipoEvento) {
      eventosFiltrados = eventosFiltrados.filter(e => e.tipo === filtroTipoEvento);
    }
    if (filtroMes !== null) {
      eventosFiltrados = eventosFiltrados.filter(e => new Date(e.data).getMonth() === filtroMes);
    }
    
    return (
      <div className="space-y-6">
        {/* Filtros */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-400" />
              <span className="text-xs font-semibold text-slate-500">Filtros:</span>
            </div>
            
            <select
              value={filtroMes ?? ''}
              onChange={e => setFiltroMes(e.target.value ? parseInt(e.target.value) : null)}
              className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-teal-500"
            >
              <option value="">Todos os meses</option>
              {meses.map((mes, idx) => (
                <option key={idx} value={idx}>{mes}</option>
              ))}
            </select>
            
            <select
              value={filtroSetor ?? ''}
              onChange={e => setFiltroSetor(e.target.value || null)}
              className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-teal-500"
            >
              <option value="">Todos os setores</option>
              {setores.map(setor => (
                <option key={setor.id} value={setor.id}>{setor.nome}</option>
              ))}
            </select>
            
            <select
              value={filtroTipoEvento ?? ''}
              onChange={e => setFiltroTipoEvento(e.target.value || null)}
              className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-teal-500"
            >
              <option value="">Todos os eventos</option>
              <option value="ferias">Férias</option>
              <option value="dayoff">DayOff</option>
              <option value="folga">Folgas</option>
              <option value="aniversario">Aniversários</option>
              <option value="aniversario_empresa">Aniv. Empresa</option>
              <option value="avaliacao">Avaliações</option>
              <option value="etapa_desenvolvimento">Desenvolvimento (PDI/Carreira)</option>
            </select>
            
            {(filtroMes !== null || filtroSetor || filtroTipoEvento) && (
              <button
                onClick={() => {
                  setFiltroMes(null);
                  setFiltroSetor(null);
                  setFiltroTipoEvento(null);
                }}
                className="text-xs text-rose-500 hover:text-rose-600 font-medium"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        {/* Calendário Grid */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-4">{ANO_ATUAL}</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {meses.map((mes, mesIdx) => {
              const eventosDoMes = eventosFiltrados.filter(e => new Date(e.data).getMonth() === mesIdx);
              const isCurrentMonth = mesIdx === MES_ATUAL;
              
              return (
                <div
                  key={mesIdx}
                  className={`p-4 rounded-xl border ${
                    isCurrentMonth ? 'bg-teal-50 border-teal-200' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <h4 className={`text-xs font-bold mb-2 ${isCurrentMonth ? 'text-teal-700' : 'text-slate-600'}`}>
                    {mes}
                    {isCurrentMonth && <span className="ml-2 text-teal-500">(atual)</span>}
                  </h4>
                  
                  {eventosDoMes.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic">Sem eventos</p>
                  ) : (
                    <div className="space-y-1">
                      {eventosDoMes.slice(0, 3).map(evento => (
                        <div
                          key={evento.id}
                          className="flex items-center gap-1.5 text-[10px]"
                        >
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: evento.cor }}
                          />
                          <span className="text-slate-600 truncate">{evento.titulo}</span>
                        </div>
                      ))}
                      {eventosDoMes.length > 3 && (
                        <p className="text-[10px] text-slate-400 italic">
                          +{eventosDoMes.length - 3} mais
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Lista de Eventos */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Todos os Eventos</h3>
          
          <div className="space-y-2">
            {eventosFiltrados.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()).map(evento => {
              const col = evento.colaboradorId ? colaboradores.find(c => c.id === evento.colaboradorId) : null;
              return (
                <div key={evento.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: evento.cor }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800">{evento.titulo}</p>
                    <p className="text-[10px] text-slate-500">{new Date(evento.data).toLocaleDateString('pt-BR')}</p>
                  </div>
                  {col && (
                    <img src={col.fotoUrl} alt={col.nome} className="w-6 h-6 rounded-full object-cover" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderFerias = () => {
    const hoje = new Date();

    // ── Helpers CLT ────────────────────────────────────────────────────────
    const FERIADOS = [[1,0],[21,3],[1,4],[7,8],[12,9],[2,10],[15,10],[25,11]];
    const isDSR = (d: Date) => d.getDay() === 0 || d.getDay() === 6;
    const isFeriado = (d: Date) => FERIADOS.some(([dia, mes]) => d.getDate() === dia && d.getMonth() === mes);
    const validarInicioFerias = (dataInicio: Date): { ok: boolean; aviso?: string } => {
      const d1 = new Date(dataInicio); d1.setDate(d1.getDate() + 1);
      const d2 = new Date(dataInicio); d2.setDate(d2.getDate() + 2);
      if (isDSR(d1) || isFeriado(d1) || isDSR(d2) || isFeriado(d2))
        return { ok: false, aviso: 'CLT: Início muito próximo de DSR/feriado.' };
      const dia = dataInicio.getDay();
      if (dia < 2 || dia > 4) return { ok: true, aviso: 'Recomendação: iniciar entre terça e quinta.' };
      return { ok: true };
    };

    // ── Tipo de linha da tabela ─────────────────────────────────────────────
    type LinhaPlanejamento = {
      colaborador: Colaborador; setor: Setor | undefined;
      anoBase: number; inicioAquisitivo: Date; fimAquisitivo: Date; limiteGozo: Date;
      diasGozados: number; diasRestantes: number;
      status: 'vencido' | 'ativo' | 'futuro';
      jaGozado: boolean; periodoDbId?: string;
      concessaoFeriasId?: string; concessaoInicio?: string; concessaoDias?: number;
      isParcela: boolean;
    };

    const linhas: LinhaPlanejamento[] = [];
    const ANOS_A_GERAR = 3;

    const colsFiltrados = colaboradores
      .filter(c =>
        c.situacao !== 'Desligado' &&
        (!filtroSetor || c.setorId === filtroSetor) &&
        (!feriasFiltroBusca || c.nome.toLowerCase().includes(feriasFiltroBusca.toLowerCase()))
      )
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    colsFiltrados.forEach(col => {
      if (!col.dataAdmissao) return;
      const admissao = new Date(col.dataAdmissao);
      if (isNaN(admissao.getTime())) return;
      const anos = Math.ceil((hoje.getFullYear() + ANOS_A_GERAR - admissao.getFullYear())) + 1;

      for (let i = 0; i < anos; i++) {
        const inicioAq = new Date(admissao); inicioAq.setFullYear(admissao.getFullYear() + i);
        const fimAq = new Date(inicioAq); fimAq.setFullYear(fimAq.getFullYear() + 1); fimAq.setDate(fimAq.getDate() - 1);
        const limiteGozo = new Date(fimAq); limiteGozo.setFullYear(limiteGozo.getFullYear() + 1);
        const anoBase = admissao.getFullYear() + i;

        const periodoDb = periodosAquisitivos.find(p =>
          p.colaboradorId === col.id && Math.abs(new Date(p.dataInicio).getFullYear() - anoBase) <= 0
        );

        const feriasVinc = ferias.filter(f => {
          if (f.colaboradorId !== col.id) return false;
          if (periodoDb && f.periodoAquisitivoId === periodoDb.id) return true;
          const fi = new Date(f.dataInicio);
          return fi >= inicioAq && fi <= fimAq;
        });

        const diasGozados = feriasVinc.filter(f => f.status !== 'planejada').reduce((a, f) => a + (f.dias || 0), 0);
        const diasPlanejadasTotal = feriasVinc.filter(f => f.status === 'planejada').reduce((a, f) => a + (f.dias || 0), 0);
        const jaGozado = periodoDb?.marcaComoUtilizado === true || diasGozados >= 30;
        const status: 'vencido' | 'ativo' | 'futuro' = limiteGozo < hoje ? 'vencido' : inicioAq > hoje ? 'futuro' : 'ativo';
        const feriasPlanejadas = feriasVinc.filter(f => f.status === 'planejada');

        if (feriasPlanejadas.length === 0) {
          linhas.push({ colaborador: col, setor: setores.find(s => s.id === col.setorId),
            anoBase, inicioAquisitivo: inicioAq, fimAquisitivo: fimAq, limiteGozo,
            diasGozados, diasRestantes: Math.max(0, 30 - diasGozados - diasPlanejadasTotal),
            status, jaGozado, periodoDbId: periodoDb?.id, isParcela: false });
        } else {
          feriasPlanejadas.forEach(fp => {
            linhas.push({ colaborador: col, setor: setores.find(s => s.id === col.setorId),
              anoBase, inicioAquisitivo: inicioAq, fimAquisitivo: fimAq, limiteGozo,
              diasGozados, diasRestantes: 0,
              status, jaGozado, periodoDbId: periodoDb?.id,
              concessaoFeriasId: fp.id, concessaoInicio: fp.dataInicio, concessaoDias: fp.dias, isParcela: true });
          });
          const restantes = Math.max(0, 30 - diasGozados - diasPlanejadasTotal);
          if (restantes > 0 && !jaGozado) {
            linhas.push({ colaborador: col, setor: setores.find(s => s.id === col.setorId),
              anoBase, inicioAquisitivo: inicioAq, fimAquisitivo: fimAq, limiteGozo,
              diasGozados, diasRestantes: restantes, status, jaGozado, periodoDbId: periodoDb?.id, isParcela: false });
          }
        }
      }
    });

    // ── Filtros ─────────────────────────────────────────────────────────────
    const linhasFiltradas = linhas.filter(l => {
      if (feriasFilterStatusPeriodo !== 'todos' && l.status !== feriasFilterStatusPeriodo) return false;
      if (feriasFiltroPlanejamento === 'pendente' && (l.concessaoFeriasId || l.jaGozado)) return false;
      if (feriasFiltroPlanejamento === 'planejado' && !l.concessaoFeriasId && !l.jaGozado) return false;
      if (l.jaGozado && feriasFilterStatusPeriodo === 'ativo') return false;
      return true;
    });

    // ── Handlers ────────────────────────────────────────────────────────────
    const handleMarcarJaGozado = async (linha: LinhaPlanejamento) => {
      if (!linha.periodoDbId) return;
      const p = periodosAquisitivos.find(pp => pp.id === linha.periodoDbId)!;
      const atualizado = { ...p, marcaComoUtilizado: true, diasUsados: 30 };
      await DataService.savePeriodoAquisitivo(atualizado);
      setPeriodosAquisitivos(prev => prev.map(pp => pp.id === p.id ? atualizado : pp));
    };

    const handleDesfazerJaGozado = async (linha: LinhaPlanejamento) => {
      if (!linha.periodoDbId) return;
      const p = periodosAquisitivos.find(pp => pp.id === linha.periodoDbId)!;
      const atualizado = { ...p, marcaComoUtilizado: false, diasUsados: linha.diasGozados };
      await DataService.savePeriodoAquisitivo(atualizado);
      setPeriodosAquisitivos(prev => prev.map(pp => pp.id === p.id ? atualizado : pp));
    };

    const handleRemoverConcessao = async (feriasId: string) => {
      await DataService.deleteFerias(feriasId);
      setFerias(prev => prev.filter(f => f.id !== feriasId));
    };

    return (
      <div className="space-y-3">
        {/* Barra de filtros */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={feriasFiltroBusca} onChange={e => setFeriasFiltroBusca(e.target.value)}
              placeholder="Buscar colaborador..."
              className="pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 w-44" />
          </div>
          <div className="flex bg-slate-100 rounded-xl p-0.5 text-xs font-semibold">
            {(['ativo', 'vencido', 'futuro', 'todos'] as const).map(v => (
              <button key={v} onClick={() => setFeriasFilterStatusPeriodo(v)}
                className={`px-3 py-1.5 rounded-[10px] transition cursor-pointer capitalize ${feriasFilterStatusPeriodo === v ? 'bg-white shadow text-teal-700' : 'text-slate-500 hover:text-slate-700'}`}>
                {v === 'ativo' ? 'Ativo' : v === 'vencido' ? 'Vencido' : v === 'futuro' ? 'Futuro' : 'Todos'}
              </button>
            ))}
          </div>
          <div className="flex bg-slate-100 rounded-xl p-0.5 text-xs font-semibold">
            {(['todos', 'pendente', 'planejado'] as const).map(v => (
              <button key={v} onClick={() => setFeriasFiltroPlanejamento(v)}
                className={`px-3 py-1.5 rounded-[10px] transition cursor-pointer ${feriasFiltroPlanejamento === v ? 'bg-white shadow text-teal-700' : 'text-slate-500 hover:text-slate-700'}`}>
                {v === 'todos' ? 'Todos' : v === 'pendente' ? 'Pendentes' : 'Planejados'}
              </button>
            ))}
          </div>
          <select value={filtroSetor ?? ''} onChange={e => setFiltroSetor(e.target.value || null)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500 bg-white">
            <option value="">Todos os setores</option>
            {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
          <button onClick={() => setShowSugestaoDistribuicao(true)}
            className="flex items-center gap-1.5 px-3 py-2 border border-teal-200 text-teal-700 hover:bg-teal-50 font-semibold rounded-xl text-xs transition ml-auto">
            <Sparkles size={13} /> Sugerir Distribuição
          </button>
        </div>

        {/* Info CLT */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 flex items-center gap-2 text-[11px] text-blue-700">
          <Info size={13} className="shrink-0" />
          <span><strong>CLT:</strong> Férias não podem iniciar nos 2 dias antes de DSR/feriado. <strong>Recomendação:</strong> iniciar entre terça e quinta. Mínimo 10 dias por concessão.</span>
        </div>

        {/* Tabela com sticky header */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="w-full text-xs" style={{ minWidth: 1050 }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Colaborador','Admissão','Início Aquisitivo','Fim Aquisitivo','Gozados','Restantes','Limite Gozo','Concessão Início','Nº Dias','Concessão Fim','Status',''].map(h => (
                    <th key={h} className="text-left py-3 px-3 font-bold text-slate-500 uppercase tracking-wider text-[10px] whitespace-nowrap bg-slate-50 border-b border-slate-200">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhasFiltradas.map((l, rowIdx) => {
                  const isFirstRowOfCol = rowIdx === 0 || linhasFiltradas[rowIdx - 1].colaborador.id !== l.colaborador.id;
                  const isFirstRowOfPeriod = isFirstRowOfCol ||
                    linhasFiltradas[rowIdx - 1].anoBase !== l.anoBase ||
                    linhasFiltradas[rowIdx - 1].colaborador.id !== l.colaborador.id;
                  const concessaoInicio = l.concessaoInicio ? new Date(l.concessaoInicio) : null;
                  const concessaoFim = concessaoInicio && l.concessaoDias
                    ? (() => { const d = new Date(concessaoInicio); d.setDate(d.getDate() + (l.concessaoDias! - 1)); return d; })()
                    : null;
                  const validacao = concessaoInicio ? validarInicioFerias(concessaoInicio) : null;
                  const bgRow = l.jaGozado ? 'bg-slate-50/60 opacity-70' :
                    l.isParcela && l.concessaoFeriasId ? 'bg-teal-50/40' :
                    l.status === 'vencido' && l.diasRestantes > 0 ? 'bg-rose-50/30' :
                    rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20';
                  const statusLabel = l.jaGozado ? { label: 'Já Gozado', cls: 'bg-slate-100 text-slate-500' } :
                    l.concessaoFeriasId ? { label: 'Planejado', cls: 'bg-teal-100 text-teal-700' } :
                    l.status === 'vencido' && l.diasRestantes > 0 ? { label: 'VENCIDO', cls: 'bg-rose-100 text-rose-700' } :
                    l.status === 'vencido' ? { label: 'Concluído', cls: 'bg-slate-100 text-slate-500' } :
                    l.status === 'futuro' ? { label: 'Futuro', cls: 'bg-blue-100 text-blue-700' } :
                    { label: 'ATIVO', cls: 'bg-emerald-100 text-emerald-700' };

                  return (
                    <tr key={`${l.colaborador.id}-${l.anoBase}-${l.concessaoFeriasId || 'main'}-${rowIdx}`} className={`border-t border-slate-100 ${bgRow}`}>
                      <td className="py-2 px-3">
                        {isFirstRowOfCol && (
                          <div className="flex items-center gap-2">
                            <img src={l.colaborador.fotoUrl} alt={l.colaborador.nome} className="w-6 h-6 rounded-full object-cover shrink-0" />
                            <div>
                              <p className="font-bold text-slate-800 whitespace-nowrap text-xs">{l.colaborador.nome}</p>
                              <p className="text-[9px] text-slate-400">{l.setor?.nome}</p>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-500 whitespace-nowrap text-xs">
                        {isFirstRowOfCol ? new Date(l.colaborador.dataAdmissao).toLocaleDateString('pt-BR') : ''}
                      </td>
                      <td className="py-2 px-3 text-slate-600 whitespace-nowrap text-xs">
                        {isFirstRowOfPeriod ? l.inicioAquisitivo.toLocaleDateString('pt-BR') : ''}
                      </td>
                      <td className="py-2 px-3 text-slate-600 whitespace-nowrap text-xs">
                        {isFirstRowOfPeriod ? l.fimAquisitivo.toLocaleDateString('pt-BR') : ''}
                      </td>
                      <td className="py-2 px-3 text-center text-xs">
                        {isFirstRowOfPeriod && <span className="font-semibold text-slate-700">{l.diasGozados}</span>}
                      </td>
                      <td className="py-2 px-3 text-center text-xs">
                        <span className={`font-bold ${(l.isParcela ? l.concessaoDias! : l.diasRestantes) > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>
                          {l.isParcela ? l.concessaoDias : (l.diasRestantes > 0 ? l.diasRestantes : '—')}
                        </span>
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-xs">
                        {isFirstRowOfPeriod && (
                          <span className={l.limiteGozo < hoje && l.diasRestantes > 0 && !l.isParcela ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                            {l.limiteGozo.toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {l.concessaoFeriasId ? (
                          <div className="flex flex-col gap-0.5">
                            <input type="date" defaultValue={l.concessaoInicio || ''}
                              onChange={async (e) => {
                                const f = ferias.find(ff => ff.id === l.concessaoFeriasId)!;
                                const atualizado = { ...f, dataInicio: e.target.value };
                                await DataService.saveFerias(atualizado);
                                setFerias(prev => prev.map(ff => ff.id === f.id ? atualizado : ff));
                              }}
                              className="text-[10px] border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-teal-500 bg-white w-28" />
                            {validacao?.aviso && <span className={`text-[9px] ${validacao.ok ? 'text-amber-600' : 'text-rose-600'}`}>{validacao.aviso}</span>}
                          </div>
                        ) : (!l.jaGozado && l.diasRestantes > 0 && l.status !== 'futuro') ? (
                          <input type="date" id={`ci-${l.colaborador.id}-${l.anoBase}`}
                            className="text-[10px] border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-teal-500 bg-white w-28" />
                        ) : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {l.concessaoFeriasId ? (
                          <input type="number" min={10} max={l.concessaoDias || 30} defaultValue={l.concessaoDias || ''}
                            onChange={async (e) => {
                              const dias = parseInt(e.target.value); if (!dias || dias < 10) return;
                              const f = ferias.find(ff => ff.id === l.concessaoFeriasId)!;
                              const inicio = new Date(f.dataInicio);
                              const fim = new Date(inicio); fim.setDate(fim.getDate() + dias - 1);
                              const atualizado = { ...f, dias, dataFim: fim.toISOString().split('T')[0] };
                              await DataService.saveFerias(atualizado);
                              setFerias(prev => prev.map(ff => ff.id === f.id ? atualizado : ff));
                            }}
                            className="text-[10px] border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-teal-500 bg-white w-14 text-center" />
                        ) : (!l.jaGozado && l.diasRestantes > 0 && l.status !== 'futuro') ? (
                          <input type="number" min={10} max={l.diasRestantes} id={`nd-${l.colaborador.id}-${l.anoBase}`}
                            placeholder="dias"
                            onBlur={async (e) => {
                              const dias = parseInt(e.target.value); if (!dias || dias < 10) return;
                              const ciInput = document.getElementById(`ci-${l.colaborador.id}-${l.anoBase}`) as HTMLInputElement;
                              const dataInicio = ciInput?.value; if (!dataInicio) return;
                              const dataFimD = new Date(dataInicio); dataFimD.setDate(dataFimD.getDate() + dias - 1);
                              const novaFeria: Ferias = {
                                id: `fer-${Date.now()}`, colaboradorId: l.colaborador.id,
                                periodoAquisitivoId: l.periodoDbId || '', dataInicio,
                                dataFim: dataFimD.toISOString().split('T')[0], dias, status: 'planejada',
                                createdAt: new Date().toISOString(),
                              };
                              await DataService.saveFerias(novaFeria);
                              setFerias(prev => [...prev, novaFeria]);
                              ciInput.value = ''; e.target.value = '';
                            }}
                            className="text-[10px] border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-teal-500 bg-white w-14 text-center" />
                        ) : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="py-2 px-3 text-slate-600 whitespace-nowrap text-xs">
                        {concessaoFim ? <span className="text-teal-700 font-semibold">{concessaoFim.toLocaleDateString('pt-BR')}</span> : '—'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase whitespace-nowrap ${statusLabel.cls}`}>
                          {statusLabel.label}
                        </span>
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {l.concessaoFeriasId && (
                            <button onClick={() => { if (confirm('Remover esta concessão?')) handleRemoverConcessao(l.concessaoFeriasId!); }}
                              className="text-[9px] text-rose-400 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-lg cursor-pointer transition">Remover</button>
                          )}
                          {!l.jaGozado && !l.concessaoFeriasId && l.status !== 'futuro' && l.diasRestantes > 0 && (
                            <button onClick={() => handleMarcarJaGozado(l)}
                              className="text-[9px] text-slate-400 hover:text-amber-700 hover:bg-amber-50 px-2 py-1 rounded-lg cursor-pointer transition whitespace-nowrap">Já Gozado</button>
                          )}
                          {l.jaGozado && !l.isParcela && (
                            <button onClick={() => handleDesfazerJaGozado(l)}
                              className="text-[9px] text-slate-400 hover:text-teal-700 hover:bg-teal-50 px-2 py-1 rounded-lg cursor-pointer transition whitespace-nowrap">Desfazer</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {linhasFiltradas.length === 0 && (
                  <tr><td colSpan={12} className="py-12 text-center text-slate-400 text-xs">Nenhum período encontrado com os filtros aplicados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderDayOff = () => {
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();

    const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

    const getDayOffStatus = (col: Colaborador) =>
      dayOffs.find(d => d.colaboradorId === col.id && d.ano === anoAtual);

    const getAlertaStatus = (colId: string): string | null => {
      try { return localStorage.getItem(`gc_dayoff_alerta_${mesAtual}_${anoAtual}_${colId}`); } catch { return null; }
    };
    const setAlertaStatus = (colId: string, status: string) => {
      try {
        localStorage.setItem(`gc_dayoff_alerta_${mesAtual}_${anoAtual}_${colId}`, status);
        setFiltroSetor(prev => prev);
      } catch {}
    };

    // ── Handler de agendamento com data — persiste no banco ─────────────
    const handleAgendarDayOff = async (dayoff: DayOff, dataAgendada: string) => {
      if (!dataAgendada) return;
      const atualizado: DayOff = {
        ...dayoff,
        status: 'utilizado',
        dataUtilizacao: dataAgendada,
      };
      await DataService.saveDayOff(atualizado);
      setDayOffs(prev => prev.map(d => d.id === atualizado.id ? atualizado : d));
      setDayoffModalAberto(null);
      setDayoffDataAgendamento('');
    };

    // ── Handler para cancelar/desfazer DayOff ───────────────────────────
    const handleCancelarDayOff = async (dayoff: DayOff) => {
      const revertido: DayOff = { ...dayoff, status: 'disponivel', dataUtilizacao: undefined };
      await DataService.saveDayOff(revertido);
      setDayOffs(prev => prev.map(d => d.id === revertido.id ? revertido : d));
    };

    const pendentesAlerta = colaboradores
      .filter(c => {
        if (c.situacao === 'Desligado' || !c.dataNascimento) return false;
        const nasc = new Date(c.dataNascimento);
        if (nasc.getMonth() !== mesAtual) return false;
        const alertaStatus = getAlertaStatus(c.id);
        if (alertaStatus === 'ciente') return false;
        if (alertaStatus?.startsWith('amanha_')) {
          const dataLembrete = alertaStatus.replace('amanha_', '');
          if (dataLembrete > hoje.toISOString().split('T')[0]) return false;
        }
        const dayoff = getDayOffStatus(c);
        return dayoff?.status !== 'utilizado';
      });

    const dayoffsPorColaborador = colaboradores
      .filter(c => c.situacao !== 'Desligado' && (!filtroSetor || c.setorId === filtroSetor))
      .sort((a, b) => {
        const mA = a.dataNascimento ? new Date(a.dataNascimento).getMonth() : 12;
        const mB = b.dataNascimento ? new Date(b.dataNascimento).getMonth() : 12;
        return mA - mB || new Date(a.dataNascimento||'').getDate() - new Date(b.dataNascimento||'').getDate();
      })
      .map(col => ({ colaborador: col, dayoff: getDayOffStatus(col) }));

    return (
      <div className="space-y-6">
        {/* Modal de agendamento */}
        {dayoffModalAberto && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
              <h3 className="font-extrabold text-slate-900 mb-1">Agendar DayOff</h3>
              <p className="text-xs text-slate-500 mb-4">
                {colaboradores.find(c => c.id === dayoffModalAberto.colaboradorId)?.nome}
              </p>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Data do DayOff
              </label>
              <input
                type="date"
                value={dayoffDataAgendamento}
                onChange={e => setDayoffDataAgendamento(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 mb-4"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setDayoffModalAberto(null); setDayoffDataAgendamento(''); }}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold cursor-pointer hover:bg-slate-50"
                >Cancelar</button>
                <button
                  onClick={() => handleAgendarDayOff(dayoffModalAberto, dayoffDataAgendamento)}
                  disabled={!dayoffDataAgendamento}
                  className="flex-1 py-2.5 bg-violet-500 hover:bg-violet-400 text-white font-bold rounded-xl text-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >Confirmar</button>
              </div>
            </div>
          </div>
        )}

        {/* Banner de aniversariantes do mês */}
        {pendentesAlerta.length > 0 && (
          <div className="bg-violet-50 border-2 border-violet-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🎂</span>
              <p className="font-extrabold text-violet-900 text-sm">
                {pendentesAlerta.length} aniversariante(s) em {MESES_PT[mesAtual]} sem DayOff organizado
              </p>
            </div>
            <div className="space-y-2">
              {pendentesAlerta.map(col => {
                const nasc = new Date(col.dataNascimento!);
                const dayoff = getDayOffStatus(col);
                return (
                  <div key={col.id} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-violet-100">
                    <img src={col.fotoUrl} alt={col.nome} className="w-8 h-8 rounded-full object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 text-sm">{col.nome}</p>
                      <p className="text-[11px] text-slate-500">
                        Aniversário: dia {nasc.getDate()} de {MESES_PT[mesAtual]}
                        {!dayoff && <span className="ml-2 text-rose-600 font-semibold">· DayOff não gerado ainda</span>}
                        {dayoff?.status === 'disponivel' && <span className="ml-2 text-violet-600 font-semibold">· Disponível — clique em Agendar</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      {dayoff?.status === 'disponivel' && (
                        <button
                          onClick={() => { setDayoffModalAberto(dayoff); setDayoffDataAgendamento(''); }}
                          className="px-3 py-1.5 bg-violet-500 hover:bg-violet-400 text-white text-[10px] font-bold rounded-lg cursor-pointer transition"
                        >Agendar</button>
                      )}
                      <button
                        onClick={() => setAlertaStatus(col.id, 'ciente')}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg cursor-pointer transition border border-emerald-200"
                      >Estou ciente</button>
                      <button
                        onClick={() => {
                          const amanha = new Date(hoje);
                          amanha.setDate(amanha.getDate() + 1);
                          setAlertaStatus(col.id, `amanha_${amanha.toISOString().split('T')[0]}`);
                        }}
                        className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg cursor-pointer transition border border-slate-200"
                      >Lembrar amanhã</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filtro de setor */}
        <div className="flex items-center gap-3">
          <select
            value={filtroSetor ?? ''}
            onChange={e => setFiltroSetor(e.target.value || null)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500 bg-white"
          >
            <option value="">Todos os setores</option>
            {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
          <span className="text-xs text-slate-400">Ordenado por mês de aniversário</span>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left py-3 px-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Colaborador</th>
                <th className="text-left py-3 px-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Setor</th>
                <th className="text-center py-3 px-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Aniversário</th>
                <th className="text-center py-3 px-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Mês</th>
                <th className="text-center py-3 px-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Status DayOff</th>
                <th className="text-left py-3 px-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Data Agendada</th>
                <th className="text-center py-3 px-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Ação</th>
              </tr>
            </thead>
            <tbody>
              {dayoffsPorColaborador.map(({ colaborador, dayoff }) => {
                const nasc = colaborador.dataNascimento ? new Date(colaborador.dataNascimento) : null;
                const isAnivMesAtual = nasc?.getMonth() === mesAtual;
                return (
                  <tr key={colaborador.id}
                    className={`border-t border-slate-100 ${isAnivMesAtual ? 'bg-violet-50/30' : ''}`}>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <img src={colaborador.fotoUrl} alt={colaborador.nome} className="w-6 h-6 rounded-full object-cover" />
                        <span className="font-semibold text-slate-800">{colaborador.nome}</span>
                        {isAnivMesAtual && <span>🎂</span>}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-slate-500">{setores.find(s => s.id === colaborador.setorId)?.nome || '—'}</td>
                    <td className="py-2.5 px-4 text-center text-slate-600">
                      {nasc ? `${nasc.getDate().toString().padStart(2,'0')}/${(nasc.getMonth()+1).toString().padStart(2,'0')}` : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${isAnivMesAtual ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-400'}`}>
                        {nasc ? MESES_PT[nasc.getMonth()] : '—'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        dayoff?.status === 'utilizado' ? 'bg-emerald-100 text-emerald-700' :
                        dayoff?.status === 'disponivel' ? 'bg-violet-100 text-violet-700' :
                        'bg-slate-100 text-slate-500'}`}>
                        {dayoff?.status || 'N/A'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {dayoff?.dataUtilizacao ? new Date(dayoff.dataUtilizacao).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {dayoff?.status === 'disponivel' && (
                        <button
                          onClick={() => { setDayoffModalAberto(dayoff); setDayoffDataAgendamento(''); }}
                          className="px-3 py-1 bg-violet-500 hover:bg-violet-400 text-white text-[10px] font-semibold rounded-lg cursor-pointer transition"
                        >Agendar</button>
                      )}
                      {dayoff?.status === 'utilizado' && (
                        <button
                          onClick={() => handleCancelarDayOff(dayoff)}
                          className="px-3 py-1 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 text-[10px] font-semibold rounded-lg cursor-pointer transition"
                          title="Desfazer agendamento"
                        >Desfazer</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ── RADAR DE DESENVOLVIMENTO ────────────────────────────────────────────────
  const renderDesenvolvimento = () => {
    const hoje = new Date();

    const colsAtivos = colaboradores.filter(
      c => c.situacao !== 'Desligado' && (!filtroSetor || c.setorId === filtroSetor)
    );

    const dadosDesenvolvimento = colsAtivos.map(col => {
      const cargo = cargos.find(ca => ca.id === col.cargoId);
      const setor = setores.find(s => s.id === col.setorId);
      const temProximoCargo = !!(cargo?.proximoCargoId);

      // Data real de início no cargo atual — última "Mudança de Cargo" na timeline
      // para este colaborador. Se não houver, usa a data de admissão.
      const mudancasCargo = timeline
        .filter(r => r.colaboradorId === col.id && r.tipo === 'Mudança de Cargo' && r.cargoNovoId === col.cargoId)
        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

      const dataInicioCargoAtual = mudancasCargo.length > 0
        ? new Date(mudancasCargo[0].data)
        : col.dataAdmissao ? new Date(col.dataAdmissao) : hoje;

      const diasNoCargo = Math.floor((hoje.getTime() - dataInicioCargoAtual.getTime()) / (1000 * 60 * 60 * 24));
      const mesesNoCargo = Math.floor(diasNoCargo / 30);

      // ── Ciclo de 5 meses ─────────────────────────────────────────────────
      // O ciclo começa na data de início no cargo. A cada 5 meses é o período
      // de avaliação; no 6º mês reinicia independentemente de mudança de cargo.
      const CICLO_MESES = 5;
      const diasDoCicloAtual = diasNoCargo % (CICLO_MESES * 30);
      const diasRestantesCiclo = (CICLO_MESES * 30) - diasDoCicloAtual;
      const numeroCiclo = Math.floor(diasNoCargo / (CICLO_MESES * 30)) + 1; // qual ciclo está no

      // Urgência no modo ciclo: quanto tempo falta para o próximo mês de avaliação
      const urgenciaCiclo: 'iminente' | 'breve' | 'moderado' | 'tranquilo' =
        diasRestantesCiclo <= 15 ? 'iminente' :
        diasRestantesCiclo <= 30 ? 'breve' :
        diasRestantesCiclo <= 45 ? 'moderado' : 'tranquilo';

      // Urgência no modo tempo-no-cargo (modo antigo)
      const urgenciaTempo: 'alta' | 'media' | 'baixa' | 'ok' =
        !temProximoCargo ? 'ok' :
        mesesNoCargo >= 18 ? 'alta' :
        mesesNoCargo >= 12 ? 'media' :
        mesesNoCargo >= 6 ? 'baixa' : 'ok';

      return {
        colaborador: col, cargo, setor,
        mesesNoCargo, diasNoCargo, dataInicioCargoAtual,
        temProximoCargo,
        diasRestantesCiclo, diasDoCicloAtual, numeroCiclo,
        urgenciaCiclo, urgenciaTempo,
      };
    });

    // ── Ordenação por modo ────────────────────────────────────────────────
    const dadosOrdenados = [...dadosDesenvolvimento].sort((a, b) =>
      modoDesenvolvimento === 'ciclo5meses'
        ? a.diasRestantesCiclo - b.diasRestantesCiclo // menos dias restantes = mais urgente
        : b.mesesNoCargo - a.mesesNoCargo              // mais meses = mais urgente
    );

    // Agrupamentos para ciclo
    const grupoCiclo = {
      iminente: dadosOrdenados.filter(d => d.urgenciaCiclo === 'iminente'),
      breve: dadosOrdenados.filter(d => d.urgenciaCiclo === 'breve'),
      moderado: dadosOrdenados.filter(d => d.urgenciaCiclo === 'moderado'),
      tranquilo: dadosOrdenados.filter(d => d.urgenciaCiclo === 'tranquilo'),
    };

    const grupoCargo = {
      alta: dadosOrdenados.filter(d => d.urgenciaTempo === 'alta'),
      media: dadosOrdenados.filter(d => d.urgenciaTempo === 'media'),
      baixa: dadosOrdenados.filter(d => d.urgenciaTempo === 'baixa'),
      ok: dadosOrdenados.filter(d => d.urgenciaTempo === 'ok'),
    };

    // ── Barra de progresso do ciclo ────────────────────────────────────────
    const BarraCiclo = ({ dias, diasTotal }: { dias: number; diasTotal: number }) => {
      const pct = Math.min(100, Math.round((dias / diasTotal) * 100));
      const cor = pct >= 90 ? 'bg-rose-500' : pct >= 75 ? 'bg-amber-400' : pct >= 50 ? 'bg-blue-400' : 'bg-emerald-400';
      return (
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
          <div className={`h-full rounded-full ${cor} transition-all`} style={{ width: `${pct}%` }} />
        </div>
      );
    };

    const CardCol = ({ d }: { d: typeof dadosOrdenados[0] }) => {
      const diasTotal = 5 * 30;
      const pctCiclo = Math.min(100, Math.round((d.diasDoCicloAtual / diasTotal) * 100));
      const corBadge =
        d.urgenciaCiclo === 'iminente' ? 'bg-rose-100 text-rose-700' :
        d.urgenciaCiclo === 'breve' ? 'bg-amber-100 text-amber-700' :
        d.urgenciaCiclo === 'moderado' ? 'bg-blue-100 text-blue-700' :
        'bg-emerald-100 text-emerald-700';
      const corBorda =
        d.urgenciaCiclo === 'iminente' ? 'border-rose-200 bg-rose-50/60' :
        d.urgenciaCiclo === 'breve' ? 'border-amber-200 bg-amber-50/60' :
        d.urgenciaCiclo === 'moderado' ? 'border-blue-200 bg-blue-50/40' :
        'border-slate-100 bg-white';

      return (
        <button
          onClick={() => onNavigateToColaborador?.(d.colaborador.id, 'desenvolvimento')}
          className={`flex flex-col gap-2.5 p-4 rounded-2xl border text-left cursor-pointer hover:shadow-sm transition group w-full ${
            modoDesenvolvimento === 'ciclo5meses' ? corBorda : 'border-slate-100 bg-white hover:border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2.5 w-full">
            <img src={d.colaborador.fotoUrl} alt={d.colaborador.nome}
              className="w-9 h-9 rounded-full object-cover shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-800 text-xs truncate group-hover:text-teal-700 transition">
                {d.colaborador.nome}
              </p>
              <p className="text-[10px] text-slate-400 truncate">{d.cargo?.nome || 'Sem cargo'}</p>
            </div>
          </div>

          {modoDesenvolvimento === 'ciclo5meses' ? (
            <>
              <BarraCiclo dias={d.diasDoCicloAtual} diasTotal={diasTotal} />
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] text-slate-400">Ciclo {d.numeroCiclo} · {pctCiclo}%</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${corBadge}`}>
                  {d.diasRestantesCiclo}d para avaliar
                </span>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between w-full">
              <span className="text-[10px] text-slate-400">{d.setor?.nome || '—'}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                d.urgenciaTempo === 'alta' ? 'bg-rose-100 text-rose-700' :
                d.urgenciaTempo === 'media' ? 'bg-amber-100 text-amber-700' :
                d.urgenciaTempo === 'baixa' ? 'bg-blue-100 text-blue-700' :
                'bg-slate-100 text-slate-500'
              }`}>
                {d.mesesNoCargo}m no cargo
              </span>
            </div>
          )}

          <div className="text-[10px] text-teal-600 font-semibold group-hover:underline flex items-center gap-1">
            Ver desenvolvimento →
          </div>
        </button>
      );
    };

    return (
      <div className="space-y-5">
        {/* Header + controles */}
        <div className="flex flex-wrap justify-between items-start gap-3">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">Radar de Desenvolvimento</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {modoDesenvolvimento === 'ciclo5meses'
                ? 'Ordenado por quem está mais próximo de completar o ciclo de 5 meses de avaliação.'
                : 'Ordenado pelo tempo total no cargo atual (data de admissão ou última mudança de cargo).'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Toggle de modo */}
            <div className="flex bg-slate-100 rounded-xl p-0.5 text-xs font-semibold">
              <button
                onClick={() => setModoDesenvolvimento('ciclo5meses')}
                className={`px-3 py-1.5 rounded-[10px] transition cursor-pointer ${modoDesenvolvimento === 'ciclo5meses' ? 'bg-white shadow text-teal-700' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Ciclo 5 meses
              </button>
              <button
                onClick={() => setModoDesenvolvimento('tempoCargo')}
                className={`px-3 py-1.5 rounded-[10px] transition cursor-pointer ${modoDesenvolvimento === 'tempoCargo' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Tempo no cargo
              </button>
            </div>
            <select
              value={filtroSetor ?? ''}
              onChange={e => setFiltroSetor(e.target.value || null)}
              className="text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500 bg-white"
            >
              <option value="">Todos os setores</option>
              {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
        </div>

        {/* Legenda */}
        {modoDesenvolvimento === 'ciclo5meses' ? (
          <div className="flex flex-wrap gap-2 text-[10px] font-bold">
            {[
              { cls: 'bg-rose-100 text-rose-700', label: '🔴 Iminente — ≤15 dias para avaliar' },
              { cls: 'bg-amber-100 text-amber-700', label: '🟡 Breve — 16–30 dias' },
              { cls: 'bg-blue-100 text-blue-700', label: '🔵 Moderado — 31–45 dias' },
              { cls: 'bg-emerald-100 text-emerald-700', label: '🟢 Tranquilo — +45 dias' },
            ].map(l => <span key={l.label} className={`px-2.5 py-1 rounded-full ${l.cls}`}>{l.label}</span>)}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 text-[10px] font-bold">
            {[
              { cls: 'bg-rose-100 text-rose-700', label: '🔴 Urgente — +18 meses' },
              { cls: 'bg-amber-100 text-amber-700', label: '🟡 Atenção — 12–18 meses' },
              { cls: 'bg-blue-100 text-blue-700', label: '🔵 Planejamento — 6–12 meses' },
              { cls: 'bg-slate-100 text-slate-500', label: '✅ No prazo ou sem trilha' },
            ].map(l => <span key={l.label} className={`px-2.5 py-1 rounded-full ${l.cls}`}>{l.label}</span>)}
          </div>
        )}

        {/* Grid de cards */}
        {modoDesenvolvimento === 'ciclo5meses' ? (
          <>
            {(['iminente', 'breve', 'moderado', 'tranquilo'] as const).map(grp => {
              const lista = grupoCiclo[grp];
              if (lista.length === 0) return null;
              const labels = {
                iminente: '🔴 Iminente — avaliar em até 15 dias',
                breve: '🟡 Breve — 16 a 30 dias',
                moderado: '🔵 Moderado — 31 a 45 dias',
                tranquilo: '🟢 Tranquilo — mais de 45 dias',
              };
              return (
                <div key={grp}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    {labels[grp]}
                    <span className="text-slate-300 font-normal">— {lista.length} colaborador(es)</span>
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {lista.map(d => <CardCol key={d.colaborador.id} d={d} />)}
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          <>
            {(['alta', 'media', 'baixa', 'ok'] as const).map(grp => {
              const lista = grupoCargo[grp];
              if (lista.length === 0) return null;
              const labels = {
                alta: '🔴 Urgente — mais de 18 meses no cargo',
                media: '🟡 Atenção — 12 a 18 meses',
                baixa: '🔵 Planejamento — 6 a 12 meses',
                ok: '✅ No prazo ou trilha não configurada',
              };
              return (
                <div key={grp}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    {labels[grp]}
                    <span className="text-slate-300 font-normal">— {lista.length} colaborador(es)</span>
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {lista.map(d => <CardCol key={d.colaborador.id} d={d} />)}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {dadosOrdenados.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <p className="font-semibold">Nenhum colaborador ativo encontrado.</p>
          </div>
        )}
      </div>
    );
  };
  const renderConfig = () => {
    if (!config) return null;

    // Wrapper para salvar config com merge defensivo dos campos novos
    const salvar = (patch: Partial<typeof config>) => {
      handleSalvarConfig({
        diasAntecedenciaFerias: config.diasAntecedenciaFerias ?? 30,
        permitirFeriasProlongadas: config.permitirFeriasProlongadas ?? false,
        obrigarPeriodoAquisitivo: config.obrigarPeriodoAquisitivo ?? true,
        anteciparAniversario: config.anteciparAniversario ?? false,
        cicloDesenvolvimentoMeses: (config as any).cicloDesenvolvimentoMeses ?? 5,
        alertaCicloDias: (config as any).alertaCicloDias ?? 15,
        diasLimiteDayOff: (config as any).diasLimiteDayOff ?? 30,
        notificacoes: {
          ferias90dias: config.notificacoes?.ferias90dias ?? true,
          feriasVencendo: config.notificacoes?.feriasVencendo ?? true,
          dayoffPendente: config.notificacoes?.dayoffPendente ?? true,
          aniversarioProximo: config.notificacoes?.aniversarioProximo ?? true,
          aniversarioEmpresaProximo: config.notificacoes?.aniversarioEmpresaProximo ?? true,
          cicloPendente: (config.notificacoes as any)?.cicloPendente ?? true,
        },
        ...patch,
      } as any);
    };

    const Label = ({ children }: { children: React.ReactNode }) => (
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">{children}</label>
    );
    const Hint = ({ children }: { children: React.ReactNode }) => (
      <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{children}</p>
    );
    const Card = ({ titulo, desc, icon, children }: { titulo: string; desc: string; icon: string; children: React.ReactNode }) => (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-50">
          <span className="text-xl">{icon}</span>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">{titulo}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">{desc}</p>
          </div>
        </div>
        {children}
      </div>
    );
    const Toggle = ({ id, checked, onChange, label, hint }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) => (
      <label htmlFor={id} className="flex items-start gap-3 cursor-pointer group">
        <div className="relative mt-0.5 shrink-0">
          <input type="checkbox" id={id} checked={checked} onChange={e => onChange(e.target.checked)}
            className="sr-only peer" />
          <div className="w-9 h-5 bg-slate-200 peer-checked:bg-teal-500 rounded-full transition-colors" />
          <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-700">{label}</p>
          {hint && <p className="text-[10px] text-slate-400 mt-0.5">{hint}</p>}
        </div>
      </label>
    );
    const NumInput = ({ label, value, min, max, onChange, hint, unit }: { label: string; value: number; min: number; max?: number; onChange: (v: number) => void; hint?: string; unit?: string }) => (
      <div>
        <Label>{label}</Label>
        <div className="flex items-center gap-2">
          <input type="number" min={min} max={max} value={value}
            onChange={e => onChange(parseInt(e.target.value) || min)}
            className="w-24 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-center font-semibold" />
          {unit && <span className="text-xs text-slate-400">{unit}</span>}
        </div>
        {hint && <Hint>{hint}</Hint>}
      </div>
    );

    const cicloAtual = (config as any).cicloDesenvolvimentoMeses ?? 5;
    const alertaCiclo = (config as any).alertaCicloDias ?? 15;
    const diasDayOff = (config as any).diasLimiteDayOff ?? 30;

    return (
      <div className="space-y-5 max-w-3xl">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">Configurações — Gestão de Pessoas</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Parâmetros centrais que controlam o comportamento de todas as sub-dashboards.
            Valores salvos automaticamente ao sair do campo.
          </p>
        </div>

        {/* ── GRUPO 1: Radar de Desenvolvimento ─────────────────────────── */}
        <Card titulo="Radar de Desenvolvimento" desc="Controla o motor de ciclos de avaliação de cargo." icon="📈">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <NumInput
              label="Duração do ciclo de avaliação"
              value={cicloAtual}
              min={1} max={12}
              unit="meses"
              onChange={v => salvar({ cicloDesenvolvimentoMeses: v } as any)}
              hint="A cada N meses o sistema considera que o colaborador entrou no mês de avaliação de cargo. Padrão: 5 meses."
            />
            <NumInput
              label="Alerta de ciclo iminente"
              value={alertaCiclo}
              min={1} max={60}
              unit="dias antes"
              onChange={v => salvar({ alertaCicloDias: v } as any)}
              hint="Quantos dias antes do fim do ciclo o card aparece como 🔴 Iminente no Radar. Padrão: 15 dias."
            />
          </div>
        </Card>

        {/* ── GRUPO 2: Férias ────────────────────────────────────────────── */}
        <Card titulo="Férias" desc="Regras CLT e parâmetros operacionais do planejador de férias." icon="🌴">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <NumInput
              label="Antecedência mínima para solicitar"
              value={configFerias?.diasMinimosAntecedenciaPlanejamento ?? 7}
              min={0}
              unit="dias"
              onChange={v => configFerias && handleSalvarConfigFerias({ ...configFerias, diasMinimosAntecedenciaPlanejamento: v })}
              hint="Mínimo de dias de antecedência para criar um planejamento de férias."
            />
            <NumInput
              label="Antecedência dos alertas automáticos"
              value={configFerias?.diasAntecedenciaAlerta ?? 90}
              min={30} max={365}
              unit="dias"
              onChange={v => configFerias && handleSalvarConfigFerias({ ...configFerias, diasAntecedenciaAlerta: v })}
              hint="O sistema começa a alertar sobre férias vencendo com esta antecedência."
            />
            <NumInput
              label="Mínimo de dias por concessão"
              value={configFerias?.salarioMinimoDias ?? 10}
              min={1} max={30}
              unit="dias"
              onChange={v => configFerias && handleSalvarConfigFerias({ ...configFerias, salarioMinimoDias: v })}
              hint="CLT exige mínimo de 10 dias por lançamento de férias."
            />
            <NumInput
              label="Máximo de parcelas por período"
              value={configFerias?.maximoParcelas ?? 3}
              min={1} max={6}
              unit="parcelas"
              onChange={v => configFerias && handleSalvarConfigFerias({ ...configFerias, maximoParcelas: v })}
              hint="Quantidade máxima de vezes que as férias de um período podem ser divididas."
            />
            <NumInput
              label="Prazo concessivo após o período"
              value={configFerias?.prazoConcessivoMeses ?? 12}
              min={1} max={24}
              unit="meses"
              onChange={v => configFerias && handleSalvarConfigFerias({ ...configFerias, prazoConcessivoMeses: v })}
              hint="Meses além do fim do período aquisitivo antes que as férias vençam. CLT: 12 meses."
            />
            <NumInput
              label="Máx. colaboradores simultâneos no setor"
              value={configFerias?.maximoDiasSimultaneoSetor ?? 3}
              min={1}
              unit="pessoas"
              onChange={v => configFerias && handleSalvarConfigFerias({ ...configFerias, maximoDiasSimultaneoSetor: v })}
              hint="Número máximo de colaboradores do mesmo setor que podem estar em férias ao mesmo tempo."
            />
          </div>
          <div className="space-y-4 pt-4 border-t border-slate-50">
            <Toggle
              id="obrigarPeriodoAquisitivo"
              checked={config.obrigarPeriodoAquisitivo}
              onChange={v => salvar({ obrigarPeriodoAquisitivo: v })}
              label="Exigir período aquisitivo completo antes do planejamento"
              hint="Quando ativo, só permite planejar férias após o colaborador completar 12 meses de período aquisitivo."
            />
            <Toggle
              id="permitirFeriasProlongadas"
              checked={config.permitirFeriasProlongadas}
              onChange={v => salvar({ permitirFeriasProlongadas: v })}
              label="Permitir férias prolongadas (mais de 30 dias)"
            />
            {configFerias && (
              <Toggle
                id="bloquearSobreposicao"
                checked={configFerias.bloquearSobreposicao ?? false}
                onChange={v => handleSalvarConfigFerias({ ...configFerias, bloquearSobreposicao: v })}
                label="Bloquear sobreposição de férias na mesma equipe"
                hint="Quando ativo, impede salvar um planejamento que ultrapasse o limite simultâneo do setor."
              />
            )}
          </div>
        </Card>

        {/* ── GRUPO 3: DayOff ───────────────────────────────────────────── */}
        <Card titulo="DayOff de Aniversário" desc="Regras do benefício de folga no mês de aniversário." icon="🎂">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <NumInput
              label="Dias após o aniversário para usar o DayOff"
              value={diasDayOff}
              min={1} max={365}
              unit="dias"
              onChange={v => salvar({ diasLimiteDayOff: v } as any)}
              hint="Prazo dentro do mês do aniversário (ou N dias após) para o colaborador utilizar o DayOff. Padrão: 30 dias."
            />
          </div>
        </Card>

        {/* ── GRUPO 4: Notificações ─────────────────────────────────────── */}
        <Card titulo="Notificações Automáticas" desc="Controla quais alertas o sistema gera na Dashboard e no sino." icon="🔔">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Toggle id="n-ferias90" checked={config.notificacoes?.ferias90dias ?? true}
              onChange={v => salvar({ notificacoes: { ...config.notificacoes, ferias90dias: v } })}
              label="Férias vencendo em 90 dias"
              hint="Alerta quando um período aquisitivo vai vencer em até 90 dias sem férias planejadas." />
            <Toggle id="n-feriasVencendo" checked={config.notificacoes?.feriasVencendo ?? true}
              onChange={v => salvar({ notificacoes: { ...config.notificacoes, feriasVencendo: v } })}
              label="Férias vencidas sem gozo"
              hint="Alerta quando o prazo concessivo já expirou e ainda há dias a gozar." />
            <Toggle id="n-dayoff" checked={config.notificacoes?.dayoffPendente ?? true}
              onChange={v => salvar({ notificacoes: { ...config.notificacoes, dayoffPendente: v } })}
              label="DayOff de aniversário pendente"
              hint="Lembrete mensal para organizar o DayOff dos aniversariantes do mês." />
            <Toggle id="n-aniversario" checked={config.notificacoes?.aniversarioProximo ?? true}
              onChange={v => salvar({ notificacoes: { ...config.notificacoes, aniversarioProximo: v } })}
              label="Aniversário de colaborador próximo"
              hint="Avisa quando um colaborador fará aniversário nos próximos 7 dias." />
            <Toggle id="n-empresa" checked={config.notificacoes?.aniversarioEmpresaProximo ?? true}
              onChange={v => salvar({ notificacoes: { ...config.notificacoes, aniversarioEmpresaProximo: v } })}
              label="Aniversário de empresa próximo"
              hint="Avisa quando um colaborador completará aniversário de empresa em breve." />
            <Toggle id="n-ciclo" checked={(config.notificacoes as any)?.cicloPendente ?? true}
              onChange={v => salvar({ notificacoes: { ...config.notificacoes, cicloPendente: v } as any })}
              label="Ciclo de desenvolvimento iminente"
              hint="Alerta no Radar de Desenvolvimento quando um colaborador está nos últimos dias do ciclo." />
          </div>
        </Card>
      </div>
    );
  };


  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Users size={24} className="text-teal-500" />
          Gestão de Pessoas
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Acompanhe ciclo de vida, férias, dayoffs, folgas e muito mais
        </p>
      </div>

      {renderSubTabs()}

      {subTab === 'dashboard' && renderDashboard()}
      {subTab === 'calendario' && renderCalendario()}
      {subTab === 'ferias' && renderFerias()}
      {subTab === 'dayoff' && renderDayOff()}
      {subTab === 'desenvolvimento' && renderDesenvolvimento()}
      {subTab === 'config' && renderConfig()}

      {/* Modal de Cadastro */}
      {showModal && (
        <ModalCadastro
          type={modalType}
          colaboradores={colaboradores}
          periodosAquisitivos={periodosAquisitivos}
          ferias={ferias}
          configuracaoFerias={configFerias}
          onSave={(data) => {
            if (modalType === 'ferias') handleSalvarFerias(data as Ferias);
            else if (modalType === 'dayoff') handleSalvarDayOff(data as DayOff);
            else handleSalvarFolga(data as Folga);
          }}
          onColaboradorSelecionadoParaFerias={garantirPeriodosDoColaborador}
          onClose={() => setShowModal(false)}
        />
      )}

      {showSugestaoDistribuicao && (
        <SugestaoDistribuicaoModal
          setores={setores}
          colaboradores={colaboradores}
          periodosAquisitivos={periodosAquisitivos}
          ferias={ferias}
          configuracaoFerias={configFerias}
          onAplicar={handleSalvarFerias}
          onClose={() => setShowSugestaoDistribuicao(false)}
        />
      )}

      {/* Planejador Inteligente de Férias */}
      {showPlanejadorFerias && colaboradorParaPlanejar && (
        <PlanejadorFerias
          colaborador={colaboradorParaPlanejar}
          setores={setores}
          cargos={cargos}
          colaboradores={colaboradores}
          currentUserId={currentUserId}
          onClose={() => {
            setShowPlanejadorFerias(false);
            setColaboradorParaPlanejar(null);
          }}
          onSalvarFerias={handleSalvarFerias}
          onMarcarPeriodoUtilizado={async () => {
            // O PlanejadorFerias já fez o cálculo e o save autoritativos (via
            // Motor de Disponibilidade Operacional, derivado do razão de
            // MovimentoAusencia) antes de chamar este callback — aqui só
            // resta refletir o resultado no estado deste componente pai.
            // Não recalcular/regravar aqui de novo, ou o segundo save
            // reescreve por cima do valor correto que acabou de ser salvo.
            const periodosAtualizados = await DataService.getPeriodosAquisitivos();
            setPeriodosAquisitivos(periodosAtualizados);
          }}
        />
      )}
    </div>
  );
}

// ==========================================
// MODAL DE CADASTRO
// ==========================================
interface ModalCadastroProps {
  type: 'ferias' | 'dayoff' | 'folga';
  colaboradores: Colaborador[];
  periodosAquisitivos: PeriodoAquisitivo[];
  // Fase 5 (correção de qualidade): sem estes dois, o cadastro rápido nunca
  // conseguia aplicar as mesmas regras do Planejador Inteligente (mínimo de
  // dias, antecedência, parcelamento, sobreposição) — cada tela tinha um
  // comportamento diferente para a mesma ação de negócio.
  ferias: Ferias[];
  configuracaoFerias: ConfiguracaoFerias | null;
  onSave: (data: Ferias | DayOff | Folga) => void;
  onClose: () => void;
  // Fase 4: sem isto, um colaborador que nunca abriu o Planejador Inteligente
  // simplesmente não tem período aquisitivo nenhum gerado ainda — o select
  // aparecia vazio. Gera (e persiste) os períodos que faltam antes de deixar
  // a pessoa escolher, mesmo motor usado no Planejador (GeradorPeriodosAquisitivos).
  onColaboradorSelecionadoParaFerias: (colaboradorId: string) => Promise<void>;
}

function ModalCadastro({
  type,
  colaboradores,
  periodosAquisitivos,
  ferias,
  configuracaoFerias,
  onSave,
  onClose,
  onColaboradorSelecionadoParaFerias,
}: ModalCadastroProps) {
  const [colaboradorId, setColaboradorId] = useState('');
  const [carregandoPeriodos, setCarregandoPeriodos] = useState(false);
  const [dataInicio, setDataInicio] = useState('');
  const [dias, setDias] = useState(0);
  const [motivo, setMotivo] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [periodoAquisitivoId, setPeriodoAquisitivoId] = useState('');
  // Fase 5: trava contra duplo-clique/duplo-submit — sem isto, dois cliques
  // rápidos no "Salvar" (ou um segundo clique enquanto o primeiro ainda
  // estava salvando) geravam DOIS lançamentos idênticos, como reportado.
  const [salvando, setSalvando] = useState(false);

  const periodoSelecionado = periodosAquisitivos.find(p => p.id === periodoAquisitivoId);
  const configEfetiva = configuracaoFerias || CONFIGURACAO_FERIAS_PADRAO;

  // Fim é sempre CALCULADO a partir de início + dias — nunca mais um campo
  // manual independente, que é justamente o que permitia inconsistência
  // entre "Início", "Fim" e "Dias" (os três podiam divergir entre si).
  const dataFimCalculada =
    type === 'ferias' && dataInicio && dias > 0 ? format(addDays(parseISO(dataInicio), dias - 1), 'yyyy-MM-dd') : '';

  function validarFerias(): string | null {
    if (!periodoSelecionado) return 'Selecione um período aquisitivo.';
    const saldoDisponivel = periodoSelecionado.diasDisponiveis - periodoSelecionado.diasUsados;
    if (dias > saldoDisponivel) return `Saldo disponível neste período é de ${saldoDisponivel} dia(s).`;
    if (dias < configEfetiva.salarioMinimoDias) return `O mínimo por lançamento é de ${configEfetiva.salarioMinimoDias} dia(s), conforme configurado.`;

    const antecedenciaDias = differenceInDays(parseISO(dataInicio), new Date());
    if (antecedenciaDias < configEfetiva.diasMinimosAntecedenciaPlanejamento) {
      return `É preciso solicitar com pelo menos ${configEfetiva.diasMinimosAntecedenciaPlanejamento} dia(s) de antecedência (configurado).`;
    }

    const parcelasAtivas = ferias.filter(
      (f) => f.periodoAquisitivoId === periodoAquisitivoId && f.status !== 'cancelada'
    ).length;
    if (parcelasAtivas >= configEfetiva.maximoParcelas) {
      return `Este período aquisitivo já atingiu o máximo de ${configEfetiva.maximoParcelas} parcela(s) configurado.`;
    }

    const dataInicioObj = parseISO(dataInicio);
    const dataFimObj = parseISO(dataFimCalculada);
    const sobrepoe = ferias.some((f) => {
      if (f.colaboradorId !== colaboradorId || f.status === 'cancelada') return false;
      const fInicio = parseISO(f.dataInicio);
      const fFim = parseISO(f.dataFim);
      return (
        isWithinInterval(dataInicioObj, { start: fInicio, end: fFim }) ||
        isWithinInterval(dataFimObj, { start: fInicio, end: fFim }) ||
        isWithinInterval(fInicio, { start: dataInicioObj, end: dataFimObj })
      );
    });
    if (sobrepoe) return 'Este colaborador já possui férias lançadas que se sobrepõem a este período.';

    return null;
  }

  const handleSubmit = () => {
    if (salvando) return; // trava de duplo-submit
    if (type === 'ferias') {
      const erro = validarFerias();
      if (erro) {
        alert(erro);
        return;
      }
    }

    setSalvando(true);
    if (type === 'ferias') {
      const feriasData: Ferias = {
        id: `fer-${Date.now()}`,
        colaboradorId,
        periodoAquisitivoId,
        dataInicio,
        dataFim: dataFimCalculada,
        dias,
        status: 'planejada',
        observacoes,
        createdAt: new Date().toISOString(),
      };
      onSave(feriasData);
    } else if (type === 'dayoff') {
      const col = colaboradores.find(c => c.id === colaboradorId);
      const dataLimite = new Date();
      if (col?.dataNascimento) {
        const nasc = new Date(col.dataNascimento);
        if (!isNaN(nasc.getTime())) {
          dataLimite.setFullYear(ANO_ATUAL, nasc.getMonth(), nasc.getDate() + 30);
        }
      }
      
      const dayoffData: DayOff = {
        id: `do-${Date.now()}`,
        colaboradorId,
        ano: ANO_ATUAL,
        dataLimite: dataLimite.toISOString().split('T')[0],
        status: 'disponivel',
        observacoes,
      };
      onSave(dayoffData);
    } else {
      const folgaData: Folga = {
        id: `fol-${Date.now()}`,
        colaboradorId,
        data: dataInicio,
        motivo,
        status: 'pendente',
        observacoes,
        createdAt: new Date().toISOString(),
      };
      onSave(folgaData);
    }
    // Não precisa setSalvando(false) aqui: o pai fecha este modal
    // (setShowModal(false)) assim que o save termina — o componente desmonta.
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-scale-up">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
          <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
            {type === 'ferias' ? 'Planejar Férias' : type === 'dayoff' ? 'Registrar DayOff' : 'Solicitar Folga'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Colaborador
            </label>
            <select
              value={colaboradorId}
              onChange={async e => {
                const novoColaboradorId = e.target.value;
                setColaboradorId(novoColaboradorId);
                setPeriodoAquisitivoId('');
                if (type === 'ferias' && novoColaboradorId) {
                  setCarregandoPeriodos(true);
                  await onColaboradorSelecionadoParaFerias(novoColaboradorId);
                  setCarregandoPeriodos(false);
                  const periodos = periodosAquisitivos.filter(p => p.colaboradorId === novoColaboradorId && p.status === 'ativo');
                  if (periodos.length > 0) {
                    setPeriodoAquisitivoId(periodos[0].id);
                  }
                }
              }}
              disabled={salvando}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-teal-500 disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">Selecione...</option>
              {colaboradores.filter(c => c.situacao !== 'Desligado').map(col => (
                <option key={col.id} value={col.id}>{col.nome}</option>
              ))}
            </select>
          </div>

          {type === 'ferias' && (
            <>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Período Aquisitivo
                </label>
                <select
                  value={periodoAquisitivoId}
                  onChange={e => setPeriodoAquisitivoId(e.target.value)}
                  disabled={carregandoPeriodos || salvando}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-teal-500 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">{carregandoPeriodos ? 'Gerando períodos…' : 'Selecione...'}</option>
                  {periodosAquisitivos
                    .filter(p => p.colaboradorId === colaboradorId && p.status === 'ativo')
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {p.anoBase}/{p.anoBase + 1} - {p.diasDisponiveis - p.diasUsados} dias disponíveis
                      </option>
                    ))}
                </select>
                {!carregandoPeriodos && colaboradorId && periodosAquisitivos.filter(p => p.colaboradorId === colaboradorId && p.status === 'ativo').length === 0 && (
                  <p className="text-[10px] text-amber-600 mt-1">
                    Este colaborador não tem período aquisitivo ativo (verifique a data de admissão cadastrada).
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Início
                  </label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={e => setDataInicio(e.target.value)}
                    disabled={salvando}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-teal-500 disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Dias
                  </label>
                  <input
                    type="number"
                    value={dias}
                    onChange={e => setDias(parseInt(e.target.value) || 0)}
                    disabled={salvando}
                    max={periodoSelecionado ? periodoSelecionado.diasDisponiveis - periodoSelecionado.diasUsados : undefined}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-teal-500 disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>
              </div>

              {/* Fim é sempre calculado a partir de Início + Dias — nunca mais um
                  campo digitado à parte, para nunca divergir do que foi lançado. */}
              <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 flex items-center justify-between text-xs">
                <span className="text-slate-500">Fim das férias</span>
                <span className="font-semibold text-slate-800">
                  {dataFimCalculada ? format(parseISO(dataFimCalculada), 'dd/MM/yyyy') : '—'}
                </span>
              </div>
              {dataFimCalculada && (
                <p className="text-[10px] text-slate-400 -mt-2">
                  Volta ao trabalho em {format(addDays(parseISO(dataFimCalculada), 1), 'dd/MM/yyyy')}.
                  {periodoSelecionado && ` Saldo neste período: ${periodoSelecionado.diasDisponiveis - periodoSelecionado.diasUsados} dia(s) disponível(is).`}
                </p>
              )}
            </>
          )}

          {type === 'folga' && (
            <>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Data
                </label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={e => setDataInicio(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Motivo
                </label>
                <input
                  type="text"
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  placeholder="Ex: Compensação por fim de semana trabalhado"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-teal-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Observações
            </label>
            <textarea
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              rows={2}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-teal-500 resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-slate-100">
          <button
            onClick={onClose}
            disabled={salvando}
            className="px-4 py-2 border border-slate-200 text-slate-600 bg-slate-50 rounded-xl text-xs font-semibold hover:bg-slate-100 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              salvando ||
              !colaboradorId ||
              (type === 'ferias' && (!periodoAquisitivoId || !dataInicio || dias <= 0)) ||
              (type === 'folga' && (!dataInicio || !motivo))
            }
            className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold rounded-xl text-xs transition disabled:opacity-50"
          >
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// COMPONENTE: CARD DE DETALHE DO COLABORADOR
// ==========================================
interface ColaboradorDetalheCardProps {
  colaborador: Colaborador;
  setor?: Setor;
  cargo?: Cargo;
  periodoAtivo?: PeriodoAquisitivo;
  prazoMaximoFerias: { data: string; diasRestantes: number };
  sugestoesFerias: SugestaoFerias[];
  dayoff?: DayOff;
  onClose: () => void;
  onPlanejarFerias: () => void;
  onVerCompleto: () => void;
}

function ColaboradorDetalheCard({
  colaborador,
  setor,
  cargo,
  periodoAtivo,
  prazoMaximoFerias,
  sugestoesFerias,
  dayoff,
  onClose,
  onPlanejarFerias,
  onVerCompleto,
}: ColaboradorDetalheCardProps) {
  const tempo = calcularTempoDeEmpresa(colaborador.dataAdmissao);
  const diasDisponiveis = periodoAtivo ? periodoAtivo.diasDisponiveis - periodoAtivo.diasUsados : 0;
  const proximoAniv = calcularProximoAniversario(colaborador.dataNascimento);
  const anivEmpresa = calcularProximoAniversarioEmpresa(colaborador.dataAdmissao);
  
  return (
    <div className="bg-white rounded-2xl border border-teal-200 shadow-lg p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <img src={colaborador.fotoUrl} alt={colaborador.nome} className="w-16 h-16 rounded-full object-cover border-2 border-teal-200" />
          <div>
            <h3 className="text-lg font-bold text-slate-900">{colaborador.nome}</h3>
            <p className="text-xs text-slate-500">{cargo?.nome} · {setor?.nome}</p>
            <p className="text-xs text-slate-400 mt-1">{tempo.texto} na empresa</p>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X size={20} />
        </button>
      </div>
      
      {/* Métricas Automáticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="p-3 bg-emerald-50 rounded-xl">
          <p className="text-[10px] text-emerald-600 font-semibold uppercase">Férias Disponíveis</p>
          <p className="text-xl font-bold text-emerald-700">{diasDisponiveis} dias</p>
        </div>
        <div className={`p-3 rounded-xl ${prazoMaximoFerias.diasRestantes < 90 ? 'bg-rose-50' : 'bg-amber-50'}`}>
          <p className={`text-[10px] font-semibold uppercase ${prazoMaximoFerias.diasRestantes < 90 ? 'text-rose-600' : 'text-amber-600'}`}>
            Prazo Limite Férias
          </p>
          <p className={`text-xl font-bold ${prazoMaximoFerias.diasRestantes < 90 ? 'text-rose-700' : 'text-amber-700'}`}>
            {prazoMaximoFerias.diasRestantes}d
          </p>
        </div>
        <div className="p-3 bg-pink-50 rounded-xl">
          <p className="text-[10px] text-pink-600 font-semibold uppercase">Próximo Aniversário</p>
          <p className="text-xl font-bold text-pink-700">{proximoAniv?.diasRestantes}d</p>
        </div>
        <div className="p-3 bg-blue-50 rounded-xl">
          <p className="text-[10px] text-blue-600 font-semibold uppercase">Aniversário Empresa</p>
          <p className="text-xl font-bold text-blue-700">{anivEmpresa.diasRestantes}d</p>
        </div>
      </div>
      
      {/* DayOff */}
      <div className="mb-6 p-4 bg-violet-50 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-violet-800 flex items-center gap-2">
              <Cake size={16} />
              Day Off no Mês do Aniversário
            </h4>
            <p className="text-xs text-violet-600 mt-1">
              {proximoAniv ? `Mês: ${getMesesDoAno()[new Date(proximoAniv.data).getMonth()]}` : 'Mês do aniversário'}
            </p>
          </div>
          {dayoff ? (
            <div className="text-right">
              <span className={`inline-block px-3 py-1 text-white text-xs font-bold rounded-full ${
                dayoff.status === 'utilizado' ? 'bg-violet-500' : 
                dayoff.status === 'disponivel' ? 'bg-amber-500' : 'bg-rose-500'
              }`}>
                {dayoff.status === 'utilizado' ? 'Utilizado' : 
                 dayoff.status === 'disponivel' ? 'Disponível' : 'Vencido'}
              </span>
              {dayoff.dataUtilizacao && (
                <p className="text-[10px] text-violet-600 mt-1">
                  {new Date(dayoff.dataUtilizacao).toLocaleDateString('pt-BR')}
                </p>
              )}
              {dayoff.status === 'disponivel' && (
                <p className="text-[10px] text-amber-600 mt-1">
                  Limite: {new Date(dayoff.dataLimite).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
          ) : (
            <span className="px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-full">
              Pendente
            </span>
          )}
        </div>
      </div>
      
      {/* Sugestões de Férias Otimizadas */}
      <div className="mb-6">
        <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Palmtree size={16} className="text-emerald-500" />
          Sugestões de Férias Otimizadas
        </h4>
        
        {sugestoesFerias.length > 0 ? (
          <div className="space-y-2">
            {sugestoesFerias.map((sug, idx) => (
              <div 
                key={idx}
                className={`p-3 rounded-xl border ${
                  idx === 0 ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs font-bold ${idx === 0 ? 'text-emerald-700' : 'text-slate-700'}`}>
                      {new Date(sug.dataInicio).toLocaleDateString('pt-BR')} a {new Date(sug.dataFim).toLocaleDateString('pt-BR')}
                      {' '}({sug.dias} dias)
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">{sug.motivo}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-lg font-bold ${idx === 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {sug.pontuacao}%
                    </span>
                    {idx === 0 && <span className="block text-[10px] text-emerald-600">Melhor opção</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-slate-400 text-xs">
            <Palmtree size={24} className="mx-auto mb-2 opacity-50" />
            <p>Sem sugestões disponíveis no momento</p>
            <p className="text-[10px]">Verifique as datas disponíveis</p>
          </div>
        )}
      </div>
      
      {/* Ações */}
      <div className="flex gap-3">
        <button
          onClick={onPlanejarFerias}
          className="flex-1 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs transition"
        >
          Planejar Férias
        </button>
        <button
          onClick={onVerCompleto}
          className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs transition"
        >
          Ver Completo
        </button>
      </div>
    </div>
  );
}
