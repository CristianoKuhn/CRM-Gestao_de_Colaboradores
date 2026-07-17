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
  TimelineRegistro,
  Tarefa,
  Reconhecimento,
  AvaliacaoExperiencia,
  PrioridadeRegistro,
  StatusRegistro,
} from '../types';
import { DataService } from '../services/DataService';
import { PlanejadorFerias } from './PlanejadorFerias';
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
} from 'lucide-react';

// ==========================================
// TIPOS INTERNOS
// ==========================================
type SubTab = 'dashboard' | 'calendario' | 'ferias' | 'dayoff' | 'folgas' | 'config';

interface AlertaGestaoPessoas {
  id: string;
  tipo: 'ferias_90_dias' | 'ferias_vencendo' | 'dayoff_pendente' | 'aniversario' | 'aniversario_empresa' | 'folga_pendente' | 'conflito_setor';
  titulo: string;
  descricao: string;
  colaboradorId?: string;
  setorId?: string;
  data?: string;
  nivel: 'info' | 'warning' | 'urgent';
}

interface EventoCalendario {
  id: string;
  tipo: 'ferias' | 'dayoff' | 'folga' | 'aniversario' | 'aniversario_empresa' | 'avaliacao' | 'feedback' | 'pdi' | 'treinamento';
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
}: GestaoPessoasProps) {
  const [subTab, setSubTab] = useState<SubTab>('dashboard');
  const [ferias, setFerias] = useState<Ferias[]>([]);
  const [dayOffs, setDayOffs] = useState<DayOff[]>([]);
  const [folgas, setFolgas] = useState<Folga[]>([]);
  const [periodosAquisitivos, setPeriodosAquisitivos] = useState<PeriodoAquisitivo[]>([]);
  const [config, setConfig] = useState<ConfiguracaoGestaoPessoas | null>(null);
  
  // Filtros
  const [filtroAno, setFiltroAno] = useState(ANO_ATUAL);
  const [filtroMes, setFiltroMes] = useState<number | null>(null);
  const [filtroSetor, setFiltroSetor] = useState<string | null>(null);
  const [filtroTipoEvento, setFiltroTipoEvento] = useState<string | null>(null);
  
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
    const [feriasData, dayoffsData, folgasData, periodosData, configData] = await Promise.all([
      DataService.getFerias(),
      DataService.getDayOffs(),
      DataService.getFolgas(),
      DataService.getPeriodosAquisitivos(),
      DataService.getConfiguracaoGestaoPessoas(),
    ]);
    setFerias(feriasData);
    setDayOffs(dayoffsData);
    setFolgas(folgasData);
    setPeriodosAquisitivos(periodosData);
    setConfig(configData);
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
    
    return listaAlertas.sort((a, b) => {
      const ordem = { urgent: 0, warning: 1, info: 2 };
      return ordem[a.nivel] - ordem[b.nivel];
    });
  }, [colaboradores, dayOffs, ferias, periodosAquisitivos, setores]);

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
    
    return eventos;
  }, [colaboradores, ferias, dayOffs, folgas, avaliacoesExperiencia]);

  // ==========================================
  // HANDLERS
  // ==========================================
  const handleSalvarFerias = async (feriasData: Ferias) => {
    await DataService.saveFerias(feriasData);
    
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
    
    // Atualizar período aquisitivo
    const periodo = periodosAquisitivos.find(p => p.id === feriasData.periodoAquisitivoId);
    if (periodo) {
      const updatedPeriodo = {
        ...periodo,
        diasUsados: periodo.diasUsados + feriasData.dias,
      };
      await DataService.savePeriodoAquisitivo(updatedPeriodo);
    }
    
    loadData();
    setShowModal(false);
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
        { id: 'folgas', label: 'Folgas', icon: Briefcase },
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
    let eventosFiltrados = eventosCalendario;
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
    // Filtros
    let feriasFiltradas = [...ferias];
    if (filtroSetor) {
      feriasFiltradas = feriasFiltradas.filter(f => {
        const col = colaboradores.find(c => c.id === f.colaboradorId);
        return col?.setorId === filtroSetor;
      });
    }
    if (filtroAno) {
      feriasFiltradas = feriasFiltradas.filter(f => new Date(f.dataInicio).getFullYear() === filtroAno);
    }
    
    // Planning de férias
    const planejamento = colaboradores
      .filter(c => c.situacao !== 'Desligado')
      .map(col => {
        const colPeriodos = periodosAquisitivos.filter(p => p.colaboradorId === col.id);
        const colFerias = feriasFiltradas.filter(f => f.colaboradorId === col.id);
        const periodoAtivo = colPeriodos.find(p => p.status === 'ativo');
        const prazoMax = calcularPrazoMaximoFerias(col.dataAdmissao);
        
        return {
          colaborador: col,
          setores: setores.find(s => s.id === col.setorId),
          periodos: colPeriodos,
          ferias: colFerias,
          periodoAtivo,
          prazoMaximo: prazoMax,
        };
      });
    
    return (
      <div className="space-y-6">
        {/* Header com filtros e ações */}
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="flex flex-wrap gap-4 items-center">
            <select
              value={filtroAno}
              onChange={e => setFiltroAno(parseInt(e.target.value))}
              className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-teal-500 bg-white"
            >
              {anosDisponiveis.map(ano => (
                <option key={ano} value={ano}>{ano}</option>
              ))}
            </select>
            
            <select
              value={filtroSetor ?? ''}
              onChange={e => setFiltroSetor(e.target.value || null)}
              className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-teal-500 bg-white"
            >
              <option value="">Todos os setores</option>
              {setores.map(setor => (
                <option key={setor.id} value={setor.id}>{setor.nome}</option>
              ))}
            </select>
          </div>
          
          <button
            onClick={() => {
              setModalType('ferias');
              setSelectedColaborador(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold rounded-xl text-xs transition"
          >
            <Plus size={14} />
            Planejar Férias
          </button>
        </div>

        {/* Tabela de Planejamento */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider">Colaborador</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider">Setor</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider">Admissão</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider">Período</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider">Início</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider">Fim</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider">Dias</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider">Restantes</th>
                </tr>
              </thead>
              <tbody>
                {planejamento.flatMap(item => {
                  const rows: React.ReactNode[] = [];
                  
                  // Períodos
                  item.periodos.forEach(periodo => {
                    const diasRestantes = periodo.diasDisponiveis - periodo.diasUsados;
                    rows.push(
                      <tr key={periodo.id} className="border-t border-slate-100">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <img src={item.colaborador.fotoUrl} alt={item.colaborador.nome} className="w-6 h-6 rounded-full object-cover" />
                            <span className="font-semibold text-slate-800">{item.colaborador.nome}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{item.setores?.nome}</td>
                        <td className="py-3 px-4 text-slate-600">{new Date(item.colaborador.dataAdmissao).toLocaleDateString('pt-BR')}</td>
                        <td className="py-3 px-4 text-slate-600">
                          {periodo.anoBase}/{periodo.anoBase + 1}
                        </td>
                        <td className="py-3 px-4 text-slate-400">-</td>
                        <td className="py-3 px-4 text-slate-400">-</td>
                        <td className="py-3 px-4 text-slate-400">-</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            periodo.status === 'ativo' ? 'bg-emerald-100 text-emerald-700' :
                            periodo.status === 'vencido' ? 'bg-slate-100 text-slate-600' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {periodo.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`font-semibold ${diasRestantes > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {diasRestantes} dias
                          </span>
                        </td>
                      </tr>
                    );
                  });
                  
                  // Férias planejadas
                  item.ferias.filter(f => f.status === 'planejada').forEach(ferias => {
                    rows.push(
                      <tr key={ferias.id} className="border-t border-slate-100 bg-teal-50/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <img src={item.colaborador.fotoUrl} alt={item.colaborador.nome} className="w-6 h-6 rounded-full object-cover" />
                            <span className="font-semibold text-teal-700">{item.colaborador.nome}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-teal-600">{item.setores?.nome}</td>
                        <td className="py-3 px-4 text-slate-600">{new Date(item.colaborador.dataAdmissao).toLocaleDateString('pt-BR')}</td>
                        <td className="py-3 px-4 text-slate-400">-</td>
                        <td className="py-3 px-4 text-teal-700 font-semibold">{new Date(ferias.dataInicio).toLocaleDateString('pt-BR')}</td>
                        <td className="py-3 px-4 text-teal-700 font-semibold">{new Date(ferias.dataFim).toLocaleDateString('pt-BR')}</td>
                        <td className="py-3 px-4 text-teal-700 font-semibold">{ferias.dias}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full text-[10px] font-semibold uppercase">
                            Planejada
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">-</td>
                      </tr>
                    );
                  });
                  
                  return rows;
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderDayOff = () => {
    const dayoffsPorColaborador = colaboradores
      .filter(c => c.situacao !== 'Desligado')
      .map(col => {
        const dayoff = dayOffs.find(d => d.colaboradorId === col.id && d.ano === ANO_ATUAL);
        const diffMs = dayoff ? new Date(dayoff.dataLimite).getTime() - HOJE.getTime() : 0;
        const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        
        return {
          colaborador: col,
          dayoff,
          diasRestantes: diasRestantes > 0 ? diasRestantes : 0,
        };
      });
    
    return (
      <div className="space-y-6">
        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
          <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-blue-800">Como funciona o DayOff?</p>
            <p className="text-[11px] text-blue-600 leading-relaxed mt-1">
              O DayOff é uma folga especial granteda no mês do aniversário do colaborador. 
              Deve ser utilizado até 30 dias após o aniversário. O cálculo é automático 
              baseado na data de nascimento do colaborador.
            </p>
          </div>
        </div>

        {/* Lista de DayOffs */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider">Colaborador</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider">Setor</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider">Disponível</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider">Utilizado</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider">Data Limite</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider">Ação</th>
              </tr>
            </thead>
            <tbody>
              {dayoffsPorColaborador.map(item => (
                <tr key={item.colaborador.id} className="border-t border-slate-100">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <img src={item.colaborador.fotoUrl} alt={item.colaborador.nome} className="w-6 h-6 rounded-full object-cover" />
                      <span className="font-semibold text-slate-800">{item.colaborador.nome}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {setores.find(s => s.id === item.colaborador.setorId)?.nome}
                  </td>
                  <td className="py-3 px-4">
                    {item.dayoff?.status === 'disponivel' ? (
                      <span className="text-violet-600 font-semibold">Sim</span>
                    ) : (
                      <span className="text-slate-400">Não</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {item.dayoff?.status === 'utilizado' ? (
                      <span className="text-emerald-600 font-semibold">
                        {item.dayoff.dataUtilizacao && new Date(item.dayoff.dataUtilizacao).toLocaleDateString('pt-BR')}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {item.dayoff ? new Date(item.dayoff.dataLimite).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                      item.dayoff?.status === 'disponivel' ? 'bg-violet-100 text-violet-700' :
                      item.dayoff?.status === 'utilizado' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {item.dayoff?.status || 'N/A'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {item.dayoff?.status === 'disponivel' && (
                      <button
                        onClick={() => item.dayoff && handleUtilizarDayOff(item.dayoff)}
                        className="px-3 py-1 bg-violet-500 hover:bg-violet-400 text-white text-[10px] font-semibold rounded-lg transition"
                      >
                        Registrar Uso
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderFolgas = () => {
    return (
      <div className="space-y-6">
        {/* Header com ação */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
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
          </div>
          
          <button
            onClick={() => {
              setModalType('folga');
              setSelectedColaborador(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold rounded-xl text-xs transition"
          >
            <Plus size={14} />
            Solicitar Folga
          </button>
        </div>

        {/* Lista de Folgas */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider">Colaborador</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider">Data</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider">Motivo</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider">Obs.</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {folgas
                .filter(f => {
                  if (filtroSetor) {
                    const col = colaboradores.find(c => c.id === f.colaboradorId);
                    return col?.setorId === filtroSetor;
                  }
                  return true;
                })
                .map(folga => {
                  const col = colaboradores.find(c => c.id === folga.colaboradorId);
                  return (
                    <tr key={folga.id} className="border-t border-slate-100">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {col && <img src={col.fotoUrl} alt={col.nome} className="w-6 h-6 rounded-full object-cover" />}
                          <span className="font-semibold text-slate-800">{col?.nome}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{new Date(folga.data).toLocaleDateString('pt-BR')}</td>
                      <td className="py-3 px-4 text-slate-600">{folga.motivo}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          folga.status === 'aprovada' ? 'bg-emerald-100 text-emerald-700' :
                          folga.status === 'pendente' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {folga.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[10px]">{folga.observacoes || '-'}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1">
                          {folga.status === 'pendente' && (
                            <>
                              <button
                                onClick={() => handleAprovarFolga(folga)}
                                className="px-2 py-1 bg-emerald-500 hover:bg-emerald-400 text-white text-[10px] font-semibold rounded-lg transition"
                              >
                                Aprovar
                              </button>
                              <button
                                onClick={() => handleCancelarFolga(folga)}
                                className="px-2 py-1 bg-slate-500 hover:bg-slate-400 text-white text-[10px] font-semibold rounded-lg transition"
                              >
                                Cancelar
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Saldo por Colaborador */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Saldo de Folgas por Colaborador</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {colaboradores
              .filter(c => c.situacao !== 'Desligado')
              .map(col => {
                const folgasAprovadas = folgas.filter(f => 
                  f.colaboradorId === col.id && 
                  f.status === 'aprovada' && 
                  new Date(f.data).getFullYear() === ANO_ATUAL
                ).length;
                const maxFolgas = config?.maximoDiasFolga || 5;
                const saldo = maxFolgas - folgasAprovadas;
                
                return (
                  <div key={col.id} className="p-3 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <img src={col.fotoUrl} alt={col.nome} className="w-6 h-6 rounded-full object-cover" />
                      <span className="text-xs font-semibold text-slate-700">{col.nome}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">Saldo disponível:</span>
                      <span className={`text-sm font-bold ${saldo > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {saldo} / {maxFolgas}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    );
  };

  const renderConfig = () => {
    if (!config) return null;
    
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-6">Configurações de Gestão de Pessoas</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Dias de antecedência para planejar férias
              </label>
              <input
                type="number"
                value={config.diasAntecedenciaFerias}
                onChange={e => handleSalvarConfig({ ...config, diasAntecedenciaFerias: parseInt(e.target.value) || 0 })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-teal-500"
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Máximo de folgas por ano
              </label>
              <input
                type="number"
                value={config.maximoDiasFolga}
                onChange={e => handleSalvarConfig({ ...config, maximoDiasFolga: parseInt(e.target.value) || 0 })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-teal-500"
              />
            </div>
            
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="permitirFeriasProlongadas"
                checked={config.permitirFeriasProlongadas}
                onChange={e => handleSalvarConfig({ ...config, permitirFeriasProlongadas: e.target.checked })}
                className="w-4 h-4 text-teal-500 rounded border-slate-300 focus:ring-teal-500"
              />
              <label htmlFor="permitirFeriasProlongadas" className="text-xs text-slate-700">
                Permitir férias prolongadas (mais de 30 dias)
              </label>
            </div>
            
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="obrigarPeriodoAquisitivo"
                checked={config.obrigarPeriodoAquisitivo}
                onChange={e => handleSalvarConfig({ ...config, obrigarPeriodoAquisitivo: e.target.checked })}
                className="w-4 h-4 text-teal-500 rounded border-slate-300 focus:ring-teal-500"
              />
              <label htmlFor="obrigarPeriodoAquisitivo" className="text-xs text-slate-700">
                Exigir período aquisitivo completo
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Notificações Automáticas</h3>
          
          <div className="space-y-3">
            {Object.entries(config.notificacoes).map(([key, value]) => (
              <div key={key} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id={`notif-${key}`}
                  checked={value}
                  onChange={e => handleSalvarConfig({
                    ...config,
                    notificacoes: {
                      ...config.notificacoes,
                      [key]: e.target.checked,
                    },
                  })}
                  className="w-4 h-4 text-teal-500 rounded border-slate-300 focus:ring-teal-500"
                />
                <label htmlFor={`notif-${key}`} className="text-xs text-slate-700 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                </label>
              </div>
            ))}
          </div>
        </div>
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
      {subTab === 'folgas' && renderFolgas()}
      {subTab === 'config' && renderConfig()}

      {/* Modal de Cadastro */}
      {showModal && (
        <ModalCadastro
          type={modalType}
          colaboradores={colaboradores}
          periodosAquisitivos={periodosAquisitivos}
          onSave={(data) => {
            if (modalType === 'ferias') handleSalvarFerias(data as Ferias);
            else if (modalType === 'dayoff') handleSalvarDayOff(data as DayOff);
            else handleSalvarFolga(data as Folga);
          }}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Planejador Inteligente de Férias */}
      {showPlanejadorFerias && colaboradorParaPlanejar && (
        <PlanejadorFerias
          colaborador={colaboradorParaPlanejar}
          setores={setores}
          cargos={cargos}
          colaboradores={colaboradores}
          onClose={() => {
            setShowPlanejadorFerias(false);
            setColaboradorParaPlanejar(null);
          }}
          onSalvarFerias={handleSalvarFerias}
          onMarcarPeriodoUtilizado={async (periodoId, totalmente) => {
            const periodo = periodosAquisitivos.find(p => p.id === periodoId);
            if (periodo) {
              const atualizado: PeriodoAquisitivo = {
                ...periodo,
                diasUsados: totalmente ? periodo.diasDisponiveis : periodo.diasUsados,
                diasRestantes: totalmente ? 0 : periodo.diasRestantes,
                status: totalmente ? 'concluido' : periodo.status,
                marcaComoUtilizado: true,
                dataConclusao: new Date().toISOString().split('T')[0],
              };
              await DataService.savePeriodoAquisitivo(atualizado);
              const periodosAtualizados = await DataService.getPeriodosAquisitivos();
              setPeriodosAquisitivos(periodosAtualizados);
            }
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
  onSave: (data: Ferias | DayOff | Folga) => void;
  onClose: () => void;
}

function ModalCadastro({ type, colaboradores, periodosAquisitivos, onSave, onClose }: ModalCadastroProps) {
  const [colaboradorId, setColaboradorId] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [dias, setDias] = useState(0);
  const [motivo, setMotivo] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [periodoAquisitivoId, setPeriodoAquisitivoId] = useState('');

  const periodoSelecionado = periodosAquisitivos.find(p => p.id === periodoAquisitivoId);

  const handleSubmit = () => {
    if (type === 'ferias') {
      const feriasData: Ferias = {
        id: `fer-${Date.now()}`,
        colaboradorId,
        periodoAquisitivoId,
        dataInicio,
        dataFim,
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
              onChange={e => {
                setColaboradorId(e.target.value);
                if (type === 'ferias') {
                  const periodos = periodosAquisitivos.filter(p => p.colaboradorId === e.target.value && p.status === 'ativo');
                  if (periodos.length > 0) {
                    setPeriodoAquisitivoId(periodos[0].id);
                  }
                }
              }}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-teal-500"
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
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-teal-500"
                >
                  <option value="">Selecione...</option>
                  {periodosAquisitivos
                    .filter(p => p.colaboradorId === colaboradorId && p.status === 'ativo')
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {p.anoBase}/{p.anoBase + 1} - {p.diasDisponiveis - p.diasUsados} dias disponíveis
                      </option>
                    ))}
                </select>
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
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Fim
                  </label>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={e => setDataFim(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Dias
                </label>
                <input
                  type="number"
                  value={dias}
                  onChange={e => setDias(parseInt(e.target.value) || 0)}
                  max={periodoSelecionado ? periodoSelecionado.diasDisponiveis - periodoSelecionado.diasUsados : undefined}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-teal-500"
                />
              </div>
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
            className="px-4 py-2 border border-slate-200 text-slate-600 bg-slate-50 rounded-xl text-xs font-semibold hover:bg-slate-100 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!colaboradorId || (type === 'ferias' && (!periodoAquisitivoId || !dataInicio || !dataFim)) || (type === 'folga' && (!dataInicio || !motivo))}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold rounded-xl text-xs transition disabled:opacity-50"
          >
            Salvar
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
