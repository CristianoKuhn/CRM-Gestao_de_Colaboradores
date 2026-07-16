/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Colaborador,
  TimelineRegistro,
  Tarefa,
  Usuario,
  AlertaInteligente,
  ConfiguracaoAlertas,
  AvaliacaoExperiencia,
  RespostaAvaliacao180,
  PeriodoAquisitivo,
  Ferias,
  AlertaFerias,
} from '../types';
import {
  MessageSquare,
  AlertTriangle,
  Award,
  Calendar,
  CheckCircle2,
  Users2,
  ListTodo,
  TrendingUp,
  FileSpreadsheet,
  PlusCircle,
  Clock,
  ArrowRight,
  Sparkles,
  Cake,
  ClipboardCheck,
  Bell,
  BellOff,
  X,
  Settings,
  CalendarClock,
  UserX,
  Gift,
  Target,
  Check,
  Star,
} from 'lucide-react';
import { OnboardingItem, OnboardingChecklist } from '../types';
import { DataService } from '../services/DataService';
import ModalAvaliacao180 from './ModalAvaliacao180';

interface DashboardProps {
  colaboradores: Colaborador[];
  timeline: TimelineRegistro[];
  tarefas: Tarefa[];
  onNavigateToList: (tab: string, filter?: any) => void;
  onSelectColaborador: (id: string) => void;
  onOpenNewRegistroModal: (colaboradorId?: string) => void;
  currentUser: Usuario;
  onUpdateColaborador: (col: Colaborador) => void;
  onboardingItems: OnboardingItem[];
  onboardingChecklists: OnboardingChecklist[];
  onSaveOnboardingChecklist: (checklist: OnboardingChecklist) => void;
  // Avaliações de Experiência
  avaliacoesExperiencia?: AvaliacaoExperiencia[];
  onUpdateAvaliacaoExperiencia?: (avaliacao: AvaliacaoExperiencia) => void;
  // Configuração de Alertas
  configuracaoAlertas?: ConfiguracaoAlertas;
  // Callback para tratar tarefa (abrir registro)
  onTreatTask?: (tarefa: Tarefa, colaborador: Colaborador) => void;
  // Callback para marcar tarefa como concluída
  onCompleteTask?: (tarefaId: string) => void;
}

// Função para obter a data atual real
function getDataAtual(): Date {
  return new Date();
}

// Função para formatar data para comparison (YYYY-MM-DD)
function formatarDataISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Função para calcular diferença em dias
function calcularDiasRestantes(dataFutura: Date, hoje: Date): number {
  const diffTime = dataFutura.getTime() - hoje.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Função para calcular próxima ocorrência de uma data no ano atual/seguinte
function proximaOcorrencia(dataAniversario: Date, anoAtual: number, hoje: Date): Date {
  const esteAno = new Date(anoAtual, dataAniversario.getMonth(), dataAniversario.getDate());
  const proximoAno = new Date(anoAtual + 1, dataAniversario.getMonth(), dataAniversario.getDate());
  
  if (esteAno >= hoje) {
    return esteAno;
  }
  return proximoAno;
}

export default function Dashboard({
  colaboradores,
  timeline,
  tarefas,
  onNavigateToList,
  onSelectColaborador,
  onOpenNewRegistroModal,
  currentUser,
  onUpdateColaborador,
  onboardingItems,
  onboardingChecklists,
  onSaveOnboardingChecklist,
  onTreatTask,
  onCompleteTask,
}: DashboardProps) {
  const HOJE = getDataAtual();
  const ANO_ATUAL = HOJE.getFullYear();
  
  // Data de início do processo: janeiro de 2026
  // Colaboradores admitidos antes desta data não terão avaliação 180° retroativa
  const DATA_INICIO_PROCESSO = new Date('2026-01-01');

  // Estados para alertas inteligentes
  const [alertas, setAlertas] = useState<AlertaInteligente[]>([]);
  const [configAlertas, setConfigAlertas] = useState<ConfiguracaoAlertas>({
    diasSemInteracao: 14,
    diasAntecedenciaAniversario: 15,
    diasAntecedenciaAvaliacao180: 30,
    alertasPersistentes: true,
  });
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAlertasModal, setShowAlertasModal] = useState(false);
  
  // Estados para Férias
  const [periodosAquisitivos, setPeriodosAquisitivos] = useState<PeriodoAquisitivo[]>([]);
  const [ferias, setFerias] = useState<Ferias[]>([]);
  const [alertasFerias, setAlertasFerias] = useState<AlertaFerias[]>([]);

  // Estado para Modal de Avaliação 180°
  const [modalAvaliacao180, setModalAvaliacao180] = useState<{
    isOpen: boolean;
    colaborador: Colaborador | null;
    milestone: string;
  }>({ isOpen: false, colaborador: null, milestone: '' });

  // Carregar alertas e configurações
  useEffect(() => {
    const carregarDados = async () => {
      try {
        const [alertasData, configData, periodosData, feriasData, alertasFeriasData] = await Promise.all([
          DataService.getAlertasInteligentes(),
          DataService.getConfiguracaoAlertas(),
          DataService.getPeriodosAquisitivos(),
          DataService.getFerias(),
          DataService.getAlertasFerias(),
        ]);
        setAlertas(alertasData);
        setConfigAlertas(configData);
        setPeriodosAquisitivos(periodosData);
        setFerias(feriasData);
        setAlertasFerias(alertasFeriasData);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    };
    carregarDados();
  }, []);

  // Gerar ID único para alertas
  const gerarIdUnico = (): string => {
    return `alerta-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Gerar alertas automaticamente
  const gerarAlertas = useCallback(async () => {
    const novosAlertas: AlertaInteligente[] = [];

    // 1. Alertas de Dias Sem Interação
    for (const col of colaboradores) {
      if (col.situacao === 'Desligado') continue;

      const registrosColaborador = timeline.filter(r => r.colaboradorId === col.id);
      if (registrosColaborador.length === 0) continue;

      // Encontrar o registro mais recente
      const ultimoRegistro = registrosColaborador
        .map(r => new Date(r.data))
        .sort((a, b) => b.getTime() - a.getTime())[0];

      const diasSemInteracao = calcularDiasRestantes(HOJE, ultimoRegistro) * -1;

      if (diasSemInteracao >= configAlertas.diasSemInteracao) {
        // Verificar se já existe alerta similar pendente
        const alertaExistente = alertas.find(
          a => a.colaboradorId === col.id && a.tipo === 'sem_interacao' && a.status !== 'resolvido'
        );

        if (!alertaExistente) {
          novosAlertas.push({
            id: gerarIdUnico(),
            tipo: 'sem_interacao',
            colaboradorId: col.id,
            titulo: 'Sem interação há muito tempo',
            descricao: `${col.nome} não tem interação registrada há ${diasSemInteracao} dias. Última interação em ${ultimoRegistro.toLocaleDateString('pt-BR')}.`,
            dataReferencia: formatarDataISO(ultimoRegistro),
            diasRestantes: diasSemInteracao,
            status: 'pendente',
            dataCriacao: formatarDataISO(HOJE),
            parametroDias: configAlertas.diasSemInteracao,
          });
        }
      }
    }

    // 2. Alertas de Aniversário de Nascimento
    for (const col of colaboradores) {
      if (!col.dataNascimento || col.situacao === 'Desligado') continue;

      const dataNasc = new Date(col.dataNascimento);
      const proximoAniversario = proximaOcorrencia(dataNasc, ANO_ATUAL, HOJE);
      const diasRestantes = calcularDiasRestantes(proximoAniversario, HOJE);

      if (diasRestantes >= 0 && diasRestantes <= configAlertas.diasAntecedenciaAniversario) {
        const alertaExistente = alertas.find(
          a => a.colaboradorId === col.id && a.tipo === 'aniversario_nascimento' && a.status !== 'resolvido'
        );

        if (!alertaExistente) {
          novosAlertas.push({
            id: gerarIdUnico(),
            tipo: 'aniversario_nascimento',
            colaboradorId: col.id,
            titulo: `Aniversário de ${col.nome} em breve!`,
            descricao: `${col.nome} faz aniversário no dia ${proximoAniversario.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}. Faltam ${diasRestantes} dia(s).`,
            dataReferencia: formatarDataISO(proximoAniversario),
            diasRestantes: diasRestantes,
            status: 'pendente',
            dataCriacao: formatarDataISO(HOJE),
            parametroDias: configAlertas.diasAntecedenciaAniversario,
          });
        }
      }
    }

    // 3. Alertas de Aniversário de Casa (Admissão)
    for (const col of colaboradores) {
      if (col.situacao === 'Desligado') continue;

      const dataAdmissao = new Date(col.dataAdmissao);
      const proximoAniversario = proximaOcorrencia(dataAdmissao, ANO_ATUAL, HOJE);
      const diasRestantes = calcularDiasRestantes(proximoAniversario, HOJE);

      if (diasRestantes >= 0 && diasRestantes <= configAlertas.diasAntecedenciaAniversario) {
        const alertaExistente = alertas.find(
          a => a.colaboradorId === col.id && a.tipo === 'aniversario_casa' && a.status !== 'resolvido'
        );

        if (!alertaExistente) {
          novosAlertas.push({
            id: gerarIdUnico(),
            tipo: 'aniversario_casa',
            colaboradorId: col.id,
            titulo: `Aniversário de casa: ${col.nome}`,
            descricao: `${col.nome} completa ${proximoAniversario.getFullYear() - dataAdmissao.getFullYear()} ano(s) de empresa em ${proximoAniversario.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}. Faltam ${diasRestantes} dia(s).`,
            dataReferencia: formatarDataISO(proximoAniversario),
            diasRestantes: diasRestantes,
            status: 'pendente',
            dataCriacao: formatarDataISO(HOJE),
            parametroDias: configAlertas.diasAntecedenciaAniversario,
          });
        }
      }
    }

    // 4. Alertas de Avaliação 180º
    for (const col of colaboradores) {
      if (col.situacao === 'Desligado' || col.realizarExperiencia === false) continue;

      const dataAdmissao = new Date(col.dataAdmissao);
      
      // Ignorar colaboradores admitidos antes de janeiro de 2026
      // (data de início do processo de avaliação 180°)
      if (dataAdmissao < DATA_INICIO_PROCESSO) continue;

      const prazoMeses = col.prazoAvaliacao180 || 6;
      const dataAvaliacao180 = new Date(dataAdmissao);
      dataAvaliacao180.setMonth(dataAvaliacao180.getMonth() + prazoMeses);

      // Verificar se já não foi feita
      if (col.avaliacoesCompletas?.includes('180')) continue;

      const diasRestantes = calcularDiasRestantes(dataAvaliacao180, HOJE);

      if (diasRestantes >= 0 && diasRestantes <= configAlertas.diasAntecedenciaAvaliacao180) {
        const alertaExistente = alertas.find(
          a => a.colaboradorId === col.id && a.tipo === 'avaliacao_180' && a.status !== 'resolvido'
        );

        if (!alertaExistente) {
          novosAlertas.push({
            id: gerarIdUnico(),
            tipo: 'avaliacao_180',
            colaboradorId: col.id,
            titulo: `Avaliação 180º pendente: ${col.nome}`,
            descricao: `A avaliação de ${prazoMeses} meses de ${col.nome} vence em ${dataAvaliacao180.toLocaleDateString('pt-BR')}. Faltam ${diasRestantes} dia(s).`,
            dataReferencia: formatarDataISO(dataAvaliacao180),
            diasRestantes: diasRestantes,
            status: 'pendente',
            dataCriacao: formatarDataISO(HOJE),
            parametroDias: configAlertas.diasAntecedenciaAvaliacao180,
          });
        }
      }
    }

    // 5. Alertas de Férias - Períodos Aquisitivos
    for (const col of colaboradores) {
      if (col.situacao === 'Desligado') continue;
      
      // Filtrar períodos do colaborador
      const periodosColaborador = periodosAquisitivos.filter(p => p.colaboradorId === col.id);
      
      for (const periodo of periodosColaborador) {
        if (periodo.status !== 'ativo') continue;
        
        const dataFim = new Date(periodo.dataFim);
        const diasRestantes = Math.ceil((dataFim.getTime() - HOJE.getTime()) / (1000 * 60 * 60 * 24));
        
        // Verificar se já existe alerta para este período
        const alertaExistente = alertasFerias.find(
          a => a.colaboradorId === col.id && a.tipo === 'prazo_concessivo_vencendo' && a.status !== 'resolvido'
        );
        
        if (!alertaExistente && diasRestantes <= 90 && diasRestantes >= 0) {
          const novoAlertaFerias: AlertaFerias = {
            id: gerarIdUnico(),
            colaboradorId: col.id,
            tipo: 'prazo_concessivo_vencendo',
            titulo: diasRestantes <= 30 ? '🔴 Restam 30 dias para vencer prazo de férias' :
                    diasRestantes <= 60 ? '🔴 Restam 60 dias para vencer prazo de férias' :
                    diasRestantes <= 90 ? '🟡 Restam 90 dias para vencer prazo de férias' :
                    '🟢 Novo período aquisitivo em breve',
            descricao: `${col.nome} possui prazo concessivo de férias terminando em ${dataFim.toLocaleDateString('pt-BR')}. Restam ${diasRestantes} dia(s).`,
            severidade: diasRestantes <= 30 ? 'vermelho' : diasRestantes <= 60 ? 'vermelho' : 'amarelo',
            diasRestantes,
            dataReferencia: formatarDataISO(dataFim),
            status: 'pendente',
            createdAt: formatarDataISO(HOJE),
          };
          
          await DataService.saveAlertaFerias(novoAlertaFerias);
          setAlertasFerias(prev => [...prev, novoAlertaFerias]);
        }
        
        // Alerta de período vencido
        if (diasRestantes < 0) {
          const alertaVencido = alertasFerias.find(
            a => a.colaboradorId === col.id && a.tipo === 'ferias_vencendo' && a.status !== 'resolvido'
          );
          
          if (!alertaVencido) {
            const alertaVencidoObj: AlertaFerias = {
              id: gerarIdUnico(),
              colaboradorId: col.id,
              tipo: 'ferias_vencendo',
              titulo: '⛔ Prazo de férias vencido',
              descricao: `${col.nome} possui prazo concessivo de férias vencido desde ${dataFim.toLocaleDateString('pt-BR')}. O período aquisitivo não foi gozado dentro do prazo legal.`,
              severidade: 'vermelho',
              diasRestantes: 0,
              dataReferencia: formatarDataISO(dataFim),
              status: 'pendente',
              createdAt: formatarDataISO(HOJE),
            };
            
            await DataService.saveAlertaFerias(alertaVencidoObj);
            setAlertasFerias(prev => [...prev, alertaVencidoObj]);
          }
        }
      }
    }

    // Salvar novos alertas
    for (const alerta of novosAlertas) {
      await DataService.saveAlertaInteligente(alerta);
    }

    // Atualizar estado local
    if (novosAlertas.length > 0) {
      setAlertas(prev => [...prev, ...novosAlertas]);
    }
  }, [colaboradores, timeline, alertas, configAlertas, HOJE, ANO_ATUAL]);

  // Gerar alertas ao carregar e periodicamente
  useEffect(() => {
    gerarAlertas();
    const interval = setInterval(gerarAlertas, 60000); // A cada minuto
    return () => clearInterval(interval);
  }, [gerarAlertas]);

  // Funções para gerenciar alertas
  const reconhecerAlerta = async (id: string) => {
    const alerta = alertas.find(a => a.id === id);
    if (!alerta) return;

    const alertaAtualizado: AlertaInteligente = {
      ...alerta,
      status: 'reconhecido',
      dataReconhecimento: formatarDataISO(HOJE),
    };

    await DataService.saveAlertaInteligente(alertaAtualizado);
    setAlertas(prev => prev.map(a => a.id === id ? alertaAtualizado : a));
  };

  const resolverAlerta = async (id: string) => {
    const alerta = alertas.find(a => a.id === id);
    if (!alerta) return;

    const alertaAtualizado: AlertaInteligente = {
      ...alerta,
      status: 'resolvido',
      dataResolucao: formatarDataISO(HOJE),
    };

    await DataService.saveAlertaInteligente(alertaAtualizado);
    setAlertas(prev => prev.map(a => a.id === id ? alertaAtualizado : a));
  };

  const ignorarAlerta = async (id: string) => {
    await DataService.deleteAlertaInteligente(id);
    setAlertas(prev => prev.filter(a => a.id !== id));
  };

  // Salvar configurações de alertas
  const salvarConfigAlertas = async (novaConfig: ConfiguracaoAlertas) => {
    await DataService.saveConfiguracaoAlertas(novaConfig);
    setConfigAlertas(novaConfig);
    setShowSettingsModal(false);
  };

  // Filtrar alertas pendentes/reconhecidos
  const alertasPendentes = alertas.filter(a => a.status === 'pendente');
  const alertasReconhecidos = alertas.filter(a => a.status === 'reconhecido');
  
  // Alertas de férias pendentes
  const alertasFeriasPendentes = alertasFerias.filter(a => a.status === 'pendente');
  const alertasFeriasReconhecidos = alertasFerias.filter(a => a.status === 'reconhecido');
  
  const todosAlertasAtivos = [...alertasPendentes, ...alertasReconhecidos].sort((a, b) => a.diasRestantes - b.diasRestantes);
  const todosAlertasFeriasAtivos = [...alertasFeriasPendentes, ...alertasFeriasReconhecidos].sort((a, b) => (a.diasRestantes || 0) - (b.diasRestantes || 0));

  // Obter ícone do tipo de alerta
  const getIconeAlerta = (tipo: string) => {
    switch (tipo) {
      case 'sem_interacao':
        return <UserX size={18} className="text-orange-500" />;
      case 'aniversario_nascimento':
        return <Cake size={18} className="text-pink-500" />;
      case 'aniversario_casa':
        return <Gift size={18} className="text-amber-500" />;
      case 'avaliacao_180':
        return <Target size={18} className="text-indigo-500" />;
      case 'prazo_concessivo_vencendo':
      case 'ferias_vencendo':
      case 'periodo_aquisitivo_vencendo':
        return <Calendar size={18} className="text-blue-500" />;
      default:
        return <Bell size={18} className="text-slate-500" />;
    }
  };

  // Obter cor do badge de status
  const getBadgeColor = (tipo: string) => {
    switch (tipo) {
      case 'sem_interacao':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'aniversario_nascimento':
        return 'bg-pink-100 text-pink-700 border-pink-200';
      case 'aniversario_casa':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'avaliacao_180':
        return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'prazo_concessivo_vencendo':
      case 'ferias_vencendo':
      case 'periodo_aquisitivo_vencendo':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Calcular lembretes de avaliação e período de experiência para o líder direto
  const calculateReminders = () => {
    const list: {
      id: string;
      colaborador: Colaborador;
      milestone: string;
      titulo: string;
      prazoData: string;
      atrasado: boolean;
      diasRestantes: number;
    }[] = [];

    colaboradores.forEach((col) => {
      if (col.situacao === 'Desligado') return;

      const isMyColaborador =
        currentUser.perfil === 'Administrador' ||
        currentUser.perfil === 'Coordenador' ||
        currentUser.perfil === 'Supervisor' ||
        col.liderId === currentUser.id ||
        col.liderId?.replace('lid-', 'usu-') === currentUser.id ||
        (col.liderId === 'lid-1' && currentUser.nome.includes('Carlos'));

      if (!isMyColaborador) return;

      const admissao = new Date(col.dataAdmissao);
      if (isNaN(admissao.getTime())) return;

      // Período de Experiência (15, 30, 60, 90 dias)
      // Apenas para colaboradores admitidos a partir de janeiro de 2026
      if (col.realizarExperiencia !== false && admissao >= DATA_INICIO_PROCESSO) {
        const milestones = [15, 30, 60, 90];
        milestones.forEach((days) => {
          const completed = col.avaliacoesCompletas?.includes(String(days));
          if (completed) return;

          const dueDate = new Date(admissao);
          dueDate.setDate(dueDate.getDate() + days);

          const diffTime = dueDate.getTime() - HOJE.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays <= 15) {
            list.push({
              id: `${col.id}-exp-${days}`,
              colaborador: col,
              milestone: String(days),
              titulo: `Avaliação de Experiência - ${days} Dias`,
              prazoData: dueDate.toISOString().split('T')[0],
              atrasado: diffDays < 0,
              diasRestantes: diffDays,
            });
          }
        });
      }

      // Avaliação 180º - Apenas para colaboradores admitidos a partir de janeiro de 2026
      if (admissao >= DATA_INICIO_PROCESSO) {
        const prazoMeses = col.prazoAvaliacao180 || 6;
        const completed180 = col.avaliacoesCompletas?.includes('180');
        if (!completed180) {
          const dueDate180 = new Date(admissao);
          dueDate180.setMonth(dueDate180.getMonth() + prazoMeses);

          const diffTime180 = dueDate180.getTime() - HOJE.getTime();
          const diffDays180 = Math.ceil(diffTime180 / (1000 * 60 * 60 * 24));

          if (diffDays180 <= 30) {
            list.push({
              id: `${col.id}-180`,
              colaborador: col,
              milestone: '180',
              titulo: `Avaliação 180º (${prazoMeses} Meses)`,
              prazoData: dueDate180.toISOString().split('T')[0],
              atrasado: diffDays180 < 0,
              diasRestantes: diffDays180,
            });
          }
        }
      }
    });

    return list.sort((a, b) => a.diasRestantes - b.diasRestantes);
  };

  const lembretesAcompanhamento = calculateReminders();

  const handleCompleteMilestone = async (col: Colaborador, milestone: string) => {
    // Se for avaliação 180°, abrir o modal
    if (milestone === '180') {
      setModalAvaliacao180({
        isOpen: true,
        colaborador: col,
        milestone: milestone,
      });
      return;
    }

    // Para avaliações de experiência (15, 30, 60, 90), marcar como concluída diretamente
    const novasCompletas = [...(col.avaliacoesCompletas || [])];
    if (!novasCompletas.includes(milestone)) {
      novasCompletas.push(milestone);
    }

    const colAtualizado: Colaborador = {
      ...col,
      avaliacoesCompletas: novasCompletas,
    };

    onUpdateColaborador(colAtualizado);
  };

  // Salvar resultado da Avaliação 180°
  const handleSalvarAvaliacao180 = async (
    respostas: RespostaAvaliacao180[],
    resultado: 'aprovado' | 'reprovado',
    observacoes: string
  ) => {
    if (!modalAvaliacao180.colaborador) return;

    const col = modalAvaliacao180.colaborador;
    const milestone = modalAvaliacao180.milestone;

    // Calcular médias
    const mediaGeral = respostas.reduce((acc, r) => acc + r.nota, 0) / respostas.length;
    const mediaPonderada = respostas.reduce((acc, r) => acc + r.nota, 0) / respostas.length; // Simplificado

    // Salvar resultado da avaliação 180°
    await DataService.saveResultado180({
      id: `resultado-180-${col.id}-${Date.now()}`,
      colaboradorId: col.id,
      dataRealizacao: new Date().toISOString(),
      resultado,
      mediaGeral,
      mediaPonderada,
      respostas,
      observacoes,
      avaliadorId: currentUser.id,
      tipo: '180',
    });

    // Marcar como concluída no colaborador
    const novasCompletas = [...(col.avaliacoesCompletas || [])];
    if (!novasCompletas.includes(milestone)) {
      novasCompletas.push(milestone);
    }

    const colAtualizado: Colaborador = {
      ...col,
      avaliacoesCompletas: novasCompletas,
    };

    onUpdateColaborador(colAtualizado);

    // Fechar modal
    setModalAvaliacao180({ isOpen: false, colaborador: null, milestone: '' });
  };

  // Feedbacks Pendentes
  const feedbacksPendentes = timeline.filter(
    (r) =>
      (r.tipo === 'Feedback Corretivo' || r.tipo === 'Feedback Positivo') &&
      r.status !== 'Concluído'
  );

  // Feedbacks Vencidos
  const feedbacksVencidos = timeline.filter((r) => {
    if ((r.tipo === 'Feedback Corretivo' || r.tipo === 'Feedback Positivo') && r.status !== 'Concluído' && r.prazoAcompanhamento) {
      const prazo = new Date(r.prazoAcompanhamento);
      return prazo < HOJE;
    }
    return false;
  });

  // PDIs Ativos
  const pdisAtivos = timeline.filter(
    (r) => r.tipo === 'Plano de Desenvolvimento Individual (PDI)' && r.status !== 'Concluído'
  );

  // PDIs Vencidos
  const pdisVencidos = timeline.filter((r) => {
    if (r.tipo === 'Plano de Desenvolvimento Individual (PDI)' && r.status !== 'Concluído' && r.prazoAcompanhamento) {
      const prazo = new Date(r.prazoAcompanhamento);
      return prazo < HOJE;
    }
    return false;
  });

  // Reconhecimentos do Mês
  const reconhecimentosMes = timeline.filter((r) => {
    const isReconhecimento =
      r.tipo === 'Reconhecimento' || r.tipo === 'Elogio de Cliente' || r.tipo === 'Feedback Positivo';
    if (!isReconhecimento) return false;
    const dataReg = new Date(r.data);
    return dataReg.getFullYear() === ANO_ATUAL && dataReg.getMonth() === HOJE.getMonth();
  });

  // Advertências e Suspensões
  const advertencias = timeline.filter(
    (r) => r.tipo === 'Advertência' || r.tipo === 'Suspensão'
  );

  // Aniversários de admissão do mês
  const aniversariosMes = colaboradores.filter((c) => {
    const dataAdmissao = new Date(c.dataAdmissao);
    return dataAdmissao.getMonth() === HOJE.getMonth();
  });

  // Aniversários de nascimento do mês
  const aniversariantesNascimento = colaboradores.filter((c) => {
    if (!c.dataNascimento) return false;
    const dataNasc = new Date(c.dataNascimento);
    return dataNasc.getMonth() === HOJE.getMonth();
  });

  // Colaboradores em Acompanhamento
  const colAcompanhamento = colaboradores.filter((c) => c.situacao === 'Em Acompanhamento');

  // Tarefas Pendentes
  const tarefasPendentes = tarefas.filter((t) => !t.concluida);

  // Onboarding Automático
  const calculateOnboardingReminders = () => {
    const list: {
      colaborador: Colaborador;
      checklist: OnboardingChecklist;
      itemsPendentes: OnboardingItem[];
    }[] = [];

    colaboradores.forEach(col => {
      if (col.situacao === 'Desligado') return;
      
      const admissao = new Date(col.dataAdmissao);
      const diffTime = HOJE.getTime() - admissao.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 60) return; // Só mostra nos primeiros 60 dias
      
      const setoresDoColaborador = [col.setorId];
      const itensRelevantes = onboardingItems.filter(item => 
        item.setorIds.some(s => setoresDoColaborador.includes(s))
      );
      
      let checklist = onboardingChecklists.find(c => c.colaboradorId === col.id);
      
      if (!checklist) {
        checklist = {
          id: `checklist-${col.id}-${Date.now()}`,
          colaboradorId: col.id,
          itemsConcluidos: [],
          dataCriacao: formatarDataISO(admissao),
        };
        onSaveOnboardingChecklist(checklist);
      }
      
      const itemsPendentes = itensRelevantes.filter(item => 
        !checklist!.itemsConcluidos.includes(item.id)
      );
      
      if (itemsPendentes.length > 0) {
        list.push({ colaborador: col, checklist: checklist!, itemsPendentes });
      }
    });
    
    return list;
  };

  const onboardingReminders = calculateOnboardingReminders();

  // Últimos eventos da timeline
  const ultimosEventos = [...timeline]
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, 5);

  // Cálculos para cards
  const totalAtivos = colaboradores.filter(c => c.situacao !== 'Desligado').length;
  const totalNovos = colaboradores.filter(c => {
    const admissao = new Date(c.dataAdmissao);
    const diffTime = HOJE.getTime() - admissao.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  }).length;

  return (
    <div className="space-y-8 animate-fade-in p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Olá, {currentUser.nome.split(' ')[0]}! 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {HOJE.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Botão de Alertas */}
          <button
            onClick={() => setShowAlertasModal(true)}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition cursor-pointer ${
              todosAlertasAtivos.length > 0
                ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            {todosAlertasAtivos.length > 0 ? (
              <Bell size={18} className="text-amber-600" />
            ) : (
              <BellOff size={18} />
            )}
            Alertas
            {todosAlertasAtivos.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {todosAlertasAtivos.length}
              </span>
            )}
          </button>

          {/* Botão de Configurações */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl font-semibold text-sm hover:bg-slate-100 transition cursor-pointer"
          >
            <Settings size={18} />
            Configurar Alertas
          </button>

          <button
            id="btn-new-registro-top"
            onClick={() => onOpenNewRegistroModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-500 text-slate-950 font-bold rounded-xl text-sm hover:bg-teal-400 shadow-md shadow-teal-500/10 transition cursor-pointer"
          >
            <PlusCircle size={18} />
            Novo Registro
          </button>
        </div>
      </div>

      {/* Modal de Alertas */}
      {showAlertasModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-start justify-center p-4 pt-12 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full animate-scale-up border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center">
                  <Bell size={20} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Central de Alertas</h3>
                  <p className="text-xs text-slate-500">{todosAlertasAtivos.length} alerta(s) pendente(s)</p>
                </div>
              </div>
              <button
                onClick={() => setShowAlertasModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold text-2xl"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {todosAlertasAtivos.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-3" />
                  <p className="text-lg font-semibold text-slate-600">Tudo em dia!</p>
                  <p className="text-sm">Não há alertas pendentes no momento.</p>
                </div>
              ) : (
                todosAlertasAtivos.map((alerta) => {
                  const col = colaboradores.find(c => c.id === alerta.colaboradorId);
                  return (
                    <div
                      key={alerta.id}
                      className={`p-4 rounded-2xl border transition ${
                        alerta.status === 'pendente'
                          ? 'bg-amber-50 border-amber-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-100 shrink-0">
                          {getIconeAlerta(alerta.tipo)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-slate-900 text-sm">{alerta.titulo}</h4>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${getBadgeColor(alerta.tipo)}`}>
                              {alerta.diasRestantes === 0 ? 'HOJE' : alerta.diasRestantes < 0 ? 'ATRASADO' : `${alerta.diasRestantes}d`}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mb-2">{alerta.descricao}</p>
                          {col && (
                            <div className="flex items-center gap-2 mb-3">
                              <img src={col.fotoUrl} alt={col.nome} className="w-5 h-5 rounded-full" />
                              <span className="text-xs font-medium text-slate-500">{col.nome}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            {alerta.status === 'pendente' && (
                              <button
                                onClick={() => reconhecerAlerta(alerta.id)}
                                className="px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg hover:bg-blue-200 transition cursor-pointer"
                              >
                                Reconhecer
                              </button>
                            )}
                            <button
                              onClick={() => {
                                onSelectColaborador(alerta.colaboradorId);
                                setShowAlertasModal(false);
                              }}
                              className="px-3 py-1.5 bg-teal-100 text-teal-700 text-xs font-semibold rounded-lg hover:bg-teal-200 transition cursor-pointer"
                            >
                              Ver Colaborador
                            </button>
                            <button
                              onClick={() => ignorarAlerta(alerta.id)}
                              className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-200 transition cursor-pointer"
                            >
                              Ignorar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-slate-100 p-4 flex justify-end">
              <button
                onClick={() => setShowAlertasModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-200 transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configurações */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full animate-scale-up border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center">
                  <Settings size={20} className="text-slate-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Configurar Alertas Inteligentes</h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold text-2xl"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  <div className="flex items-center gap-2">
                    <CalendarClock size={16} className="text-orange-500" />
                    Dias sem interação para alertar
                  </div>
                </label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={configAlertas.diasSemInteracao}
                  onChange={(e) => setConfigAlertas(prev => ({ ...prev, diasSemInteracao: parseInt(e.target.value) || 14 }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
                <p className="text-xs text-slate-400 mt-1">Alerta quando um colaborador não tem interação registrada por X dias</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Cake size={16} className="text-pink-500" />
                    Dias de antecedência para aniversários
                  </div>
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={configAlertas.diasAntecedenciaAniversario}
                  onChange={(e) => setConfigAlertas(prev => ({ ...prev, diasAntecedenciaAniversario: parseInt(e.target.value) || 15 }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
                <p className="text-xs text-slate-400 mt-1">Alerta X dias antes de aniversários de nascimento e casa</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Target size={16} className="text-indigo-500" />
                    Dias de antecedência para avaliação 180º
                  </div>
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={configAlertas.diasAntecedenciaAvaliacao180}
                  onChange={(e) => setConfigAlertas(prev => ({ ...prev, diasAntecedenciaAvaliacao180: parseInt(e.target.value) || 30 }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
                <p className="text-xs text-slate-400 mt-1">Alerta X dias antes do vencimento da avaliação de 180º</p>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <p className="font-bold text-slate-700 text-sm">Alertas Persistentes</p>
                  <p className="text-xs text-slate-400">Manter alertas até serem resolvidos</p>
                </div>
                <button
                  onClick={() => setConfigAlertas(prev => ({ ...prev, alertasPersistentes: !prev.alertasPersistentes }))}
                  className={`w-12 h-6 rounded-full transition cursor-pointer ${
                    configAlertas.alertasPersistentes ? 'bg-teal-500' : 'bg-slate-300'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition transform ${
                    configAlertas.alertasPersistentes ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            </div>

            <div className="border-t border-slate-100 p-4 flex justify-end gap-3">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 bg-slate-50 rounded-xl text-sm font-semibold hover:bg-slate-100 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => salvarConfigAlertas(configAlertas)}
                className="px-4 py-2 bg-teal-500 text-slate-950 font-bold rounded-xl text-sm hover:bg-teal-400 transition cursor-pointer"
              >
                Salvar Configurações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Seção de Alertas Rápidos (Cards de Resumo) */}
      {(todosAlertasAtivos.length > 0 || todosAlertasFeriasAtivos.length > 0) && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bell size={20} className="text-amber-600" />
              <h2 className="text-lg font-bold text-amber-900">Alertas Pendentes</h2>
            </div>
            <button
              onClick={() => setShowAlertasModal(true)}
              className="text-xs font-semibold text-amber-700 hover:text-amber-800 cursor-pointer"
            >
              Ver todos ({todosAlertasAtivos.length + todosAlertasFeriasAtivos.length})
            </button>
          </div>
          
          {/* Alertas de Férias */}
          {todosAlertasFeriasAtivos.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <Calendar size={16} className="text-blue-600" />
                Férias - Prazos Concessivos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {todosAlertasFeriasAtivos.slice(0, 4).map((alerta) => {
                  const col = colaboradores.find(c => c.id === alerta.colaboradorId);
                  return (
                    <div
                      key={alerta.id}
                      onClick={() => onSelectColaborador(alerta.colaboradorId)}
                      className={`bg-white rounded-xl p-4 border cursor-pointer hover:shadow-md transition ${
                        alerta.severidade === 'vermelho' ? 'border-red-200' :
                        alerta.severidade === 'amarelo' ? 'border-amber-200' : 'border-green-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar size={16} className={alerta.severidade === 'vermelho' ? 'text-red-500' : alerta.severidade === 'amarelo' ? 'text-amber-500' : 'text-green-500'} />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          {alerta.diasRestantes === 0 ? 'VENCIDO' : `${alerta.diasRestantes} dias`}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-800 truncate">{alerta.titulo}</p>
                      {col && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <img src={col.fotoUrl} alt={col.nome} className="w-4 h-4 rounded-full" />
                          <span className="text-xs text-slate-500 truncate">{col.nome}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Outros Alertas */}
          {todosAlertasAtivos.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-amber-800 mb-2">Outros Alertas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {todosAlertasAtivos.slice(0, 4).map((alerta) => {
                  const col = colaboradores.find(c => c.id === alerta.colaboradorId);
                  return (
                    <div
                      key={alerta.id}
                      onClick={() => {
                        onSelectColaborador(alerta.colaboradorId);
                      }}
                      className={`bg-white rounded-xl p-4 border cursor-pointer hover:shadow-md transition ${
                        alerta.status === 'pendente' ? 'border-amber-200' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {getIconeAlerta(alerta.tipo)}
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          {alerta.diasRestantes === 0 ? 'HOJE' : alerta.diasRestantes < 0 ? 'ATRASADO' : `${alerta.diasRestantes} dias`}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-800 truncate">{alerta.titulo}</p>
                      {col && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <img src={col.fotoUrl} alt={col.nome} className="w-4 h-4 rounded-full" />
                          <span className="text-xs text-slate-500 truncate">{col.nome}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cards de Estatísticas Rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
              <Users2 size={18} className="text-emerald-500" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Ativos</span>
          </div>
          <p className="text-3xl font-extrabold text-slate-900">{totalAtivos}</p>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
              <TrendingUp size={18} className="text-blue-500" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Novos (30d)</span>
          </div>
          <p className="text-3xl font-extrabold text-slate-900">{totalNovos}</p>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-rose-50 rounded-xl flex items-center justify-center">
              <AlertTriangle size={18} className="text-rose-500" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Acompanhamento</span>
          </div>
          <p className="text-3xl font-extrabold text-slate-900">{colAcompanhamento.length}</p>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center">
              <Award size={18} className="text-amber-500" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reconhecimentos</span>
          </div>
          <p className="text-3xl font-extrabold text-slate-900">{reconhecimentosMes.length}</p>
        </div>
      </div>

      {/* Seção de Acompanhamentos Pendentes */}
      {lembretesAcompanhamento.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ClipboardCheck size={20} className="text-indigo-600" />
              <h2 className="text-lg font-bold text-indigo-900">Acompanhamentos de Experiência</h2>
            </div>
            <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full">
              {lembretesAcompanhamento.length} pendente(s)
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lembretesAcompanhamento.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl p-5 border border-indigo-100">
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={item.colaborador.fotoUrl}
                    alt={item.colaborador.nome}
                    className="w-10 h-10 rounded-full object-cover border-2 border-indigo-100"
                  />
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{item.colaborador.nome}</p>
                    <p className="text-xs text-slate-500">{item.titulo}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                    item.atrasado
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-indigo-100 text-indigo-700'
                  }`}>
                    {item.atrasado ? `Atrasado (${Math.abs(item.diasRestantes)}d)` : `${item.diasRestantes}d restantes`}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(item.prazoData).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                {!item.atrasado && (
                  <button
                    onClick={() => handleCompleteMilestone(item.colaborador, item.milestone)}
                    className="w-full mt-3 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg cursor-pointer transition"
                  >
                    {item.milestone === '180' ? '📊 Realizar Avaliação 180°' : '✓ Marcar Concluída'}
                  </button>
                )}
                {item.atrasado && item.milestone === '180' && (
                  <button
                    onClick={() => handleCompleteMilestone(item.colaborador, item.milestone)}
                    className="w-full mt-3 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg cursor-pointer transition"
                  >
                    📊 Realizar Avaliação 180°
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-5 bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Ações Urgentes de Liderança</h2>
              <p className="text-xs text-slate-400 mt-0.5">Acompanhamentos que vencem em breve</p>
            </div>
            <button
              id="btn-view-all-tasks"
              onClick={() => onNavigateToList('tarefas')}
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer"
            >
              Ver todas ({tarefasPendentes.length})
            </button>
          </div>

          <div className="space-y-3">
            {tarefasPendentes.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <CheckCircle2 className="mx-auto text-emerald-500 mb-2" size={32} />
                <p className="text-sm font-medium">Nenhuma ação atrasada ou pendente!</p>
                <p className="text-xs">Bom trabalho mantendo o fluxo em dia.</p>
              </div>
            ) : (
              tarefasPendentes.slice(0, 4).map((task) => {
                const col = colaboradores.find((c) => c.id === task.colaboradorId);
                const isOverdue = new Date(task.vencimento) < HOJE;
                
                // Verificar se existe registro na timeline para este colaborador
                const temRegistro = col && timeline.some(r => r.colaboradorId === col.id);
                
                const handleClick = () => {
                  if (col) {
                    onSelectColaborador(col.id);
                  }
                };
                
                const handleTreat = (e: React.MouseEvent) => {
                  e.stopPropagation();
                  if (col && onTreatTask) {
                    onTreatTask(task, col);
                  } else if (col) {
                    onOpenNewRegistroModal(col.id);
                  }
                };
                
                return (
                  <div
                    key={task.id}
                    onClick={handleClick}
                    className={`p-3.5 border rounded-2xl flex items-start gap-3.5 hover:bg-slate-50 transition cursor-pointer ${
                      isOverdue ? 'border-rose-200 bg-rose-50/30' : 'border-slate-200 hover:border-teal-200'
                    }`}
                  >
                    {col && (
                      <img
                        src={col.fotoUrl}
                        alt={col.nome}
                        className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200 mt-0.5"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold text-slate-800 truncate">{task.titulo}</h4>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                            isOverdue ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isOverdue ? 'Atrasado' : 'Pendente'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">{task.descricao}</p>
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <span className="text-[11px] font-medium text-slate-400">
                          Para: <span className="text-slate-600 font-semibold">{col?.nome}</span>
                        </span>
                        <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                          Prazo: {new Date(task.vencimento).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      {/* Botão de tratar/concluir */}
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={handleTreat}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
                            temRegistro 
                              ? 'bg-teal-500 hover:bg-teal-400 text-slate-950' 
                              : 'bg-amber-100 hover:bg-amber-200 text-amber-700'
                          }`}
                        >
                          {temRegistro ? (
                            <>
                              <CheckCircle2 size={14} />
                              Concluir
                            </>
                          ) : (
                            <>
                              <AlertTriangle size={14} />
                              Tratar primeiro
                            </>
                          )}
                        </button>
                        {!temRegistro && (
                          <span className="text-[10px] text-amber-600">
                            Necessário registrar interação antes de concluir
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-7 bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Histórico de Registros Recentes</h2>
              <p className="text-xs text-slate-400 mt-0.5">Últimos feedbacks, PDIs e ocorrências lançadas</p>
            </div>
            <button
              id="btn-view-colab-timeline"
              onClick={() => onNavigateToList('colaboradores')}
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer"
            >
              Ver Timelines
            </button>
          </div>

          <div className="space-y-4 relative before:absolute before:left-6 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-100">
            {ultimosEventos.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p className="text-sm">Nenhum registro no histórico ainda.</p>
              </div>
            ) : (
              ultimosEventos.map((reg) => {
                const col = colaboradores.find((c) => c.id === reg.colaboradorId);
                return (
                  <div key={reg.id} className="flex gap-4 relative items-start group">
                    <div className="relative z-10 w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition duration-150">
                      {col ? (
                        <img
                          src={col.fotoUrl}
                          alt={col.nome}
                          className="w-9 h-9 rounded-full object-cover border border-white"
                        />
                      ) : (
                        <FileSpreadsheet size={16} className="text-slate-400" />
                      )}
                    </div>

                    <div className="flex-1 bg-slate-50/50 hover:bg-slate-50 p-4 rounded-2xl border border-slate-100 transition duration-150">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1">
                        <div>
                          <span className="text-[11px] font-bold tracking-wider text-teal-600 uppercase">
                            {reg.tipo}
                          </span>
                          <h4
                            onClick={() => col && onSelectColaborador(col.id)}
                            className="text-sm font-bold text-slate-800 hover:text-teal-600 cursor-pointer mt-0.5"
                          >
                            {col?.nome} &middot; {reg.titulo}
                          </h4>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium shrink-0">
                          {new Date(reg.data).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{reg.descricao}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal de Avaliação 180° */}
      {modalAvaliacao180.isOpen && modalAvaliacao180.colaborador && (
        <ModalAvaliacao180
          isOpen={modalAvaliacao180.isOpen}
          onClose={() => setModalAvaliacao180({ isOpen: false, colaborador: null, milestone: '' })}
          colaborador={modalAvaliacao180.colaborador}
          avaliacao={{
            id: `avaliacao-180-${modalAvaliacao180.colaborador.id}`,
            colaboradorId: modalAvaliacao180.colaborador.id,
            dias: 180,
            dataVencimento: new Date(
              new Date(modalAvaliacao180.colaborador.dataAdmissao).getTime() +
              (180 * 24 * 60 * 60 * 1000)
            ).toISOString(),
            status: 'pendente',
          }}
          onSave={handleSalvarAvaliacao180}
        />
      )}
    </div>
  );
}
