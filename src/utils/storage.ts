/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Empresa,
  Setor,
  Cargo,
  Lider,
  Colaborador,
  TimelineRegistro,
  Tarefa,
  SupabaseConfig,
  GoogleScriptConfig,
  DataSourceProvider,
  Usuario,
  OnboardingItem,
  OnboardingChecklist,
  AlertaInteligente,
  ConfiguracaoAlertas,
  Documento,
  TipoReconhecimento,
  Reconhecimento,
  ConfiguracaoReconhecimento,
  MetaLideranca,
  MetaSetor,
  AcompanhamentoRealizado,
  Ferias,
  DayOff,
  Folga,
  PeriodoAquisitivo,
  ConfiguracaoGestaoPessoas,
} from '../types';

// Chaves para o LocalStorage
const KEYS = {
  EMPRESAS: 'gc_empresas',
  SETORES: 'gc_setores',
  CARGOS: 'gc_cargos',
  LIDERES: 'gc_lideres',
  COLABORADORES: 'gc_colaboradores',
  TIMELINE: 'gc_timeline',
  TAREFAS: 'gc_tarefas',
  USUARIOS: 'gc_usuarios',
  SUPABASE: 'gc_supabase_config',
  GOOGLESCRIPT: 'gc_googlescript_config',
  PROVIDER: 'gc_datasource_provider',
  ONBOARDING_ITEMS: 'gc_onboarding_items',
  ONBOARDING_CHECKLISTS: 'gc_onboarding_checklists',
  AVALIACOES_EXPERIENCIA: 'gc_avaliacoes_experiencia',
  ALERTAS: 'gc_alertas_inteligentes',
  CONFIG_ALERTAS: 'gc_config_alertas',
  // P3: Documentos
  DOCUMENTOS: 'gc_documentos',
  // P4: Reconhecimento
  CONFIG_RECONHECIMENTO: 'gc_config_reconhecimento',
  RECONHECIMENTOS: 'gc_reconhecimentos',
  // P5: Metas
  METAS_LIDERANCA: 'gc_metas_lideranca',
  METAS_SETOR: 'gc_metas_setor',
  ACOMPANHAMENTOS: 'gc_acompanhamentos',
  // P6: Gestão de Pessoas
  FERIAS: 'gc_ferias',
  DAYOFFS: 'gc_dayoffs',
  FOLGAS: 'gc_folgas',
  PERIODOS_AQUISITIVOS: 'gc_periodos_aquisitivos',
  CONFIG_GESTAO_PESSOAS: 'gc_config_gestao_pessoas',
};

// Dados Iniciais para o Seed
const SEED_EMPRESAS: Empresa[] = [
  { id: 'emp-1', nome: 'Inovação Tech S.A.' },
  { id: 'emp-2', nome: 'Global Solutions Ltda' }
];

const SEED_SETORES: Setor[] = [
  { id: 'set-1', nome: 'Tecnologia & Engenharia' },
  { id: 'set-2', nome: 'Design de Produto' },
  { id: 'set-3', nome: 'Suporte & CS' },
  { id: 'set-4', nome: 'Marketing & Crescimento' },
  { id: 'set-5', nome: 'Recursos Humanos' }
];

const SEED_CARGOS: Cargo[] = [
  { id: 'car-1', nome: 'Desenvolvedor Frontend Sênior' },
  { id: 'car-2', nome: 'Desenvolvedor Backend Pleno' },
  { id: 'car-3', nome: 'Product Designer Lead' },
  { id: 'car-4', nome: 'Analista de Suporte Pleno' },
  { id: 'car-5', nome: 'Gerente de Marketing' },
  { id: 'car-6', nome: 'Tech Lead' },
  { id: 'car-7', nome: 'Estagiário de DevOps' }
];

const SEED_LIDERES: Lider[] = [
  { id: 'lid-1', nome: 'Carlos Silva', email: 'carlos.silva@inovacao.com', cargo: 'Diretor de Tecnologia', fotoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200' },
  { id: 'lid-2', nome: 'Mariana Santos', email: 'mariana.santos@inovacao.com', cargo: 'Head de Design', fotoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200' },
  { id: 'lid-3', nome: 'Roberto Souza', email: 'roberto.souza@inovacao.com', cargo: 'Gerente de Customer Success', fotoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200' }
];

const SEED_USUARIOS: Usuario[] = [
  { id: 'usu-1', nome: 'Carlos Silva', email: 'carlos.silva@inovacao.com', perfil: 'Administrador', setor_id: 'set-1', ativo: true, ultimo_login: '13/07/2026 10:00:00', senha_hash: '123456' },
  { id: 'usu-2', nome: 'Mariana Santos', email: 'mariana.santos@inovacao.com', perfil: 'Coordenador', setor_id: 'set-2', ativo: true, ultimo_login: '13/07/2026 09:15:00', senha_hash: '123456' },
  { id: 'usu-3', nome: 'Roberto Souza', email: 'roberto.souza@inovacao.com', perfil: 'Supervisor', setor_id: 'set-3', ativo: true, ultimo_login: '12/07/2026 15:30:00', senha_hash: '123456' }
];

const SEED_COLABORADORES: Colaborador[] = [
  {
    id: 'col-1',
    nome: 'Aline Meireles',
    email: 'aline.meireles@inovacao.com',
    fotoUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200',
    cargoId: 'car-3',
    setorId: 'set-2',
    liderId: 'lid-2',
    dataAdmissao: '2024-03-10',
    situacao: 'Ativo',
    empresaId: 'emp-1',
    telefone: '(11) 98888-1111',
    cidadeBase: 'São Paulo - SP',
    prazoAvaliacao180: 6,
    realizarExperiencia: true,
    avaliacoesCompletas: ['15', '30', '60', '90', '180']
  },
  {
    id: 'col-2',
    nome: 'Bruno Carvalho',
    email: 'bruno.carvalho@inovacao.com',
    fotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    cargoId: 'car-1',
    setorId: 'set-1',
    liderId: 'lid-1',
    dataAdmissao: '2023-01-15',
    situacao: 'Ativo',
    empresaId: 'emp-1',
    telefone: '(11) 98888-2222',
    cidadeBase: 'Belo Horizonte - MG',
    prazoAvaliacao180: 6,
    realizarExperiencia: false,
    avaliacoesCompletas: []
  },
  {
    id: 'col-3',
    nome: 'Clarice Mendes',
    email: 'clarice.mendes@inovacao.com',
    fotoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200',
    cargoId: 'car-4',
    setorId: 'set-3',
    liderId: 'lid-3',
    dataAdmissao: '2025-05-20',
    situacao: 'Em Acompanhamento',
    empresaId: 'emp-1',
    telefone: '(11) 98888-3333',
    cidadeBase: 'Rio de Janeiro - RJ',
    prazoAvaliacao180: 6,
    realizarExperiencia: true,
    avaliacoesCompletas: ['15', '30']
  },
  {
    id: 'col-4',
    nome: 'Daniel Mendes',
    email: 'daniel.mendes@inovacao.com',
    fotoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
    cargoId: 'car-2',
    setorId: 'set-1',
    liderId: 'lid-1',
    dataAdmissao: '2024-09-01',
    situacao: 'Ativo',
    empresaId: 'emp-1',
    telefone: '(11) 98888-4444',
    cidadeBase: 'São Paulo - SP',
    prazoAvaliacao180: 6,
    realizarExperiencia: true,
    avaliacoesCompletas: ['15', '30', '60', '90']
  },
  {
    id: 'col-5',
    nome: 'Eduarda Lima',
    email: 'eduarda.lima@inovacao.com',
    fotoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    cargoId: 'car-5',
    setorId: 'set-4',
    liderId: 'lid-1',
    dataAdmissao: '2022-11-10',
    situacao: 'Ativo',
    empresaId: 'emp-1',
    telefone: '(11) 98888-5555',
    cidadeBase: 'Curitiba - PR',
    prazoAvaliacao180: 6,
    realizarExperiencia: true,
    avaliacoesCompletas: ['15', '30', '60', '90', '180']
  }
];

const SEED_TIMELINE: TimelineRegistro[] = [
  {
    id: 'reg-1',
    colaboradorId: 'col-1',
    tipo: 'Feedback Positivo',
    data: '2026-06-15',
    titulo: 'Excepcional entrega do Redesign do Fluxo de Checkout',
    descricao: 'Aline demonstrou uma excelente liderança técnica ao conduzir os workshops de co-criação com os desenvolvedores, garantindo que as especificações do Figma fossem perfeitamente compreendidas. A entrega ocorreu antes do prazo com métricas iniciais excelentes.',
    responsavelId: 'lid-2',
    prioridade: 'Média',
    status: 'Concluído',
    gerarTarefaFutura: false,
    anexos: [
      { id: 'anx-1', nome: 'Apresentacao_checkout_v3.pdf', tipo: 'pdf', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=400', tamanho: '4.2 MB' }
    ]
  },
  {
    id: 'reg-2',
    colaboradorId: 'col-1',
    tipo: 'Conversa Individual (1:1)',
    data: '2026-07-02',
    titulo: '1:1 Alinhamento de Carreira e Feedbacks gerais',
    descricao: 'Alinhamos os próximos desafios de design. Aline manifestou desejo de participar de projetos mais estratégicos de pesquisa. Acordamos de inseri-la no projeto de Discovery do Q3.',
    responsavelId: 'lid-2',
    prioridade: 'Baixa',
    status: 'Concluído',
    prazoAcompanhamento: '2026-08-02',
    gerarTarefaFutura: true,
    tarefaId: 'tar-1',
    anexos: []
  },
  {
    id: 'reg-3',
    colaboradorId: 'col-2',
    tipo: 'Feedback Corretivo',
    data: '2026-06-10',
    titulo: 'Atrasos recorrentes em Code Reviews e estimativas de tempo',
    descricao: 'Bruno tem tido dificuldades em priorizar revisões de pull requests da equipe, gerando gargalos no fluxo de entrega. Conversamos sobre a importância de destinar pelo menos 1 hora do dia para essa atividade e revisar a estimativa de suas próprias tarefas.',
    responsavelId: 'lid-1',
    prioridade: 'Alta',
    status: 'Em Andamento',
    prazoAcompanhamento: '2026-07-20',
    gerarTarefaFutura: true,
    tarefaId: 'tar-2',
    anexos: []
  },
  {
    id: 'reg-4',
    colaboradorId: 'col-2',
    tipo: 'Plano de Desenvolvimento Individual (PDI)',
    data: '2026-07-05',
    titulo: 'PDI: Transição para Liderança Técnica (Tech Lead)',
    descricao: 'Objetivo de capacitar Bruno para assumir um papel de referência arquitetural e facilitação técnica. Foco em mentoria de desenvolvedores juniores e design de sistemas robustos.',
    responsavelId: 'lid-1',
    prioridade: 'Alta',
    status: 'Em Andamento',
    prazoAcompanhamento: '2026-10-05',
    gerarTarefaFutura: true,
    tarefaId: 'tar-3',
    anexos: [
      { id: 'anx-2', nome: 'Plano_Lideranca_Bruno.pdf', tipo: 'pdf', url: '#', tamanho: '180 KB' }
    ]
  },
  {
    id: 'reg-5',
    colaboradorId: 'col-3',
    tipo: 'Reclamação de Cliente',
    data: '2026-06-25',
    titulo: 'Incidente de comunicação ríspida com cliente VIP',
    descricao: 'Cliente relatou que Clarice foi impaciente ao tratar um ticket complexo de faturamento. Analisando o histórico do chat, constatamos que houve um tom excessivamente formal e falta de empatia.',
    responsavelId: 'lid-3',
    prioridade: 'Crítica',
    status: 'Pendente',
    prazoAcompanhamento: '2026-07-15',
    gerarTarefaFutura: true,
    tarefaId: 'tar-4',
    anexos: [
      { id: 'anx-3', nome: 'Transcricao_Ticket_4091.pdf', tipo: 'pdf', url: '#', tamanho: '95 KB' }
    ]
  },
  {
    id: 'reg-6',
    colaboradorId: 'col-3',
    tipo: 'Advertência',
    data: '2026-07-01',
    titulo: 'Advertência Formal: Descumprimento de acordos de SLAs',
    descricao: 'Aplicação de advertência por descumprimento injustificado de SLAs de atendimento por três semanas consecutivas, mesmo após alinhamentos e conversas informais de treinamento.',
    responsavelId: 'lid-3',
    prioridade: 'Crítica',
    status: 'Pendente',
    prazoAcompanhamento: '2026-07-16',
    gerarTarefaFutura: true,
    tarefaId: 'tar-5',
    anexos: []
  },
  {
    id: 'reg-7',
    colaboradorId: 'col-4',
    tipo: 'Reconhecimento',
    data: '2026-07-10',
    titulo: 'Destaque em Resolução de Bug Crítico de Produção',
    descricao: 'Daniel identificou um vazamento de memória complexo no microsserviço de autenticação que causava lentidões diárias. Trabalhou proativamente durante a noite para entregar uma correção definitiva, demonstrando alto comprometimento.',
    responsavelId: 'lid-1',
    prioridade: 'Média',
    status: 'Concluído',
    gerarTarefaFutura: false,
    anexos: []
  },
  {
    id: 'reg-8',
    colaboradorId: 'col-5',
    tipo: 'Elogio de Cliente',
    data: '2026-07-12',
    titulo: 'Feedback entusiasmado de cliente sobre Campanha de Q2',
    descricao: 'A diretoria da empresa parceira Global Solutions entrou em contato elogiando as artes, copies e a estratégia conduzida pela Eduarda na última campanha. O ROI da campanha aumentou 35%.',
    responsavelId: 'lid-1',
    prioridade: 'Baixa',
    status: 'Concluído',
    gerarTarefaFutura: false,
    anexos: []
  }
];

const SEED_TAREFAS: Tarefa[] = [
  {
    id: 'tar-1',
    colaboradorId: 'col-1',
    titulo: 'Incluir Aline no Discovery de Produto Q3',
    descricao: 'Agendar kickoff e adicionar aos canais de pesquisa.',
    vencimento: '2026-07-28',
    concluida: false,
    tipoOrigem: 'Conversa Individual (1:1)',
    registroId: 'reg-2',
    responsavelId: 'lid-2'
  },
  {
    id: 'tar-2',
    colaboradorId: 'col-2',
    titulo: 'Revisar métricas de PRs de Bruno Carvalho',
    descricao: 'Acompanhar se o tempo de resposta diminuiu para abaixo de 24 horas.',
    vencimento: '2026-07-20',
    concluida: false,
    tipoOrigem: 'Feedback Corretivo',
    registroId: 'reg-3',
    responsavelId: 'lid-1'
  },
  {
    id: 'tar-3',
    colaboradorId: 'col-2',
    titulo: 'Definir mentoria técnica para desenvolvedores juniores',
    descricao: 'Identificar as pessoas que serão mentoradas por Bruno no PDI.',
    vencimento: '2026-08-05',
    concluida: false,
    tipoOrigem: 'Plano de Desenvolvimento Individual (PDI)',
    registroId: 'reg-4',
    responsavelId: 'lid-1'
  },
  {
    id: 'tar-4',
    colaboradorId: 'col-3',
    titulo: 'Reunião de alinhamento com Clarice pós-reclamação',
    descricao: 'Ouvir a versão da colaboradora, repassar diretrizes de atendimento humanizado.',
    vencimento: '2026-07-15',
    concluida: false,
    tipoOrigem: 'Reclamação de Cliente',
    registroId: 'reg-5',
    responsavelId: 'lid-3'
  },
  {
    id: 'tar-5',
    colaboradorId: 'col-3',
    titulo: 'Reavaliar SLAs de Clarice Mendes',
    descricao: 'Verificar se houve melhora no tempo de resposta dos tickets após a advertência.',
    vencimento: '2026-07-16',
    concluida: false,
    tipoOrigem: 'Advertência',
    registroId: 'reg-6',
    responsavelId: 'lid-3'
  }
];

const DEFAULT_SUPABASE: SupabaseConfig = {
  supabaseUrl: '',
  supabaseAnonKey: '',
  isConnected: false,
};

const DEFAULT_GOOGLESCRIPT: GoogleScriptConfig = {
  webAppUrl: 'https://script.google.com/macros/s/AKfycbz8iGKX9f9VNECQL1fcQttiMaEuT3a61YS3hE3HYi13SUvx3ShxF3RF69u7LkQhac0V/exec',
  driveFolderId: '',
  isConnected: true,
};

const DEFAULT_PROVIDER: DataSourceProvider = 'googlescript';

// ========== P3: DOCUMENTOS SEED ==========
const SEED_DOCUMENTOS: Documento[] = [];

// ========== P4: RECONHECIMENTO SEED ==========
const SEED_TIPOS_RECONHECIMENTO: TipoReconhecimento[] = [
  { id: 'tipo-1', nome: 'MVP do Mês', icone: 'Trophy', cor: '#fbbf24', ativo: true, criterios: 'Colaborador que se destacou em resultados e entregas.' },
  { id: 'tipo-2', nome: 'Inovador', icone: 'Lightbulb', cor: '#f97316', ativo: true, criterios: 'Colaborador que propõe ideias inovadoras.' },
  { id: 'tipo-3', nome: 'Team Player', icone: 'Users', cor: '#22c55e', ativo: true, criterios: 'Colaborador que ajuda e collaborate com o time.' },
  { id: 'tipo-4', nome: 'Cliente Primero', icone: 'Heart', cor: '#ec4899', ativo: true, criterios: 'Colaborador que entrega excelente experiência ao cliente.' },
  { id: 'tipo-5', nome: 'Crescimento', icone: 'TrendingUp', cor: '#8b5cf6', ativo: true, criterios: 'Colaborador em constante desenvolvimento.' },
];

const DEFAULT_CONFIG_RECONHECIMENTO: ConfiguracaoReconhecimento = {
  tipos: SEED_TIPOS_RECONHECIMENTO,
  permitirIndicacaoPeer: true,
  permiteUploadCertificado: true,
  notificacoesAutomaticas: true,
};

const SEED_RECONHECIMENTOS: Reconhecimento[] = [];

// ========== P5: METAS SEED ==========
const SEED_METAS_LIDERANCA: MetaLideranca[] = [
  { id: 'meta-lid-1', liderId: 'lid-1', tipoInteracao: 'feedback', titulo: 'Feedbacks Mensais', descricao: 'Realizar no mínimo 4 feedbacks por mês', quantidadeMinima: 4, periodo: 'mensal', ativo: true },
  { id: 'meta-lid-2', liderId: 'lid-1', tipoInteracao: 'conversa_alinhamento', titulo: 'Conversas de Alinhamento', descricao: 'No mínimo 2 conversas de alinhamento por mês', quantidadeMinima: 2, periodo: 'mensal', ativo: true },
  { id: 'meta-lid-3', liderId: 'lid-2', tipoInteracao: 'conversa_desenvolvimento', titulo: 'Conversas de Desenvolvimento', descricao: 'Realizar 2 conversas de desenvolvimento por mês', quantidadeMinima: 2, periodo: 'mensal', ativo: true },
];

const SEED_METAS_SETOR: MetaSetor[] = [
  { id: 'meta-set-1', setorId: 'set-1', tipoInteracao: 'feedback', titulo: 'Feedbacks por Setor Tech', descricao: 'Mínimo de 8 feedbacks no setor de TI por mês', quantidadeMinima: 8, periodo: 'mensal', ativo: true },
  { id: 'meta-set-2', setorId: 'set-2', tipoInteracao: 'conversa_informal', titulo: 'Check-ins Informais', descricao: 'Mínimo de 12 check-ins informais por setor por mês', quantidadeMinima: 12, periodo: 'mensal', ativo: true },
];

const SEED_ACOMPANHAMENTOS: AcompanhamentoRealizado[] = [];

// ========== P6: GESTÃO DE PESSOAS SEED ==========
const SEED_PERIODOS_AQUISITIVOS: PeriodoAquisitivo[] = [
  // Aline - Contratada em 2024-03-10
  { id: 'pa-1', colaboradorId: 'col-1', anoBase: 2024, dataInicio: '2024-03-10', dataFim: '2025-03-09', diasDisponiveis: 30, diasUsados: 0, status: 'vencido' },
  { id: 'pa-2', colaboradorId: 'col-1', anoBase: 2025, dataInicio: '2025-03-10', dataFim: '2026-03-09', diasDisponiveis: 30, diasUsados: 10, status: 'ativo' },
  // Bruno - Contratado em 2023-01-15
  { id: 'pa-3', colaboradorId: 'col-2', anoBase: 2023, dataInicio: '2023-01-15', dataFim: '2024-01-14', diasDisponiveis: 30, diasUsados: 30, status: 'vencido' },
  { id: 'pa-4', colaboradorId: 'col-2', anoBase: 2024, dataInicio: '2024-01-15', dataFim: '2025-01-14', diasDisponiveis: 30, diasUsados: 20, status: 'vencido' },
  { id: 'pa-5', colaboradorId: 'col-2', anoBase: 2025, dataInicio: '2025-01-15', dataFim: '2026-01-14', diasDisponiveis: 30, diasUsados: 0, status: 'ativo' },
  // Clarice - Contratada em 2025-05-20
  { id: 'pa-6', colaboradorId: 'col-3', anoBase: 2025, dataInicio: '2025-05-20', dataFim: '2026-05-19', diasDisponiveis: 30, diasUsados: 0, status: 'ativo' },
  // Daniel - Contratado em 2024-09-01
  { id: 'pa-7', colaboradorId: 'col-4', anoBase: 2024, dataInicio: '2024-09-01', dataFim: '2025-08-31', diasDisponiveis: 30, diasUsados: 15, status: 'vencido' },
  { id: 'pa-8', colaboradorId: 'col-4', anoBase: 2025, dataInicio: '2025-09-01', dataFim: '2026-08-31', diasDisponiveis: 30, diasUsados: 0, status: 'ativo' },
  // Eduarda - Contratada em 2022-11-10
  { id: 'pa-9', colaboradorId: 'col-5', anoBase: 2024, dataInicio: '2024-11-10', dataFim: '2025-11-09', diasDisponiveis: 30, diasUsados: 30, status: 'vencido' },
  { id: 'pa-10', colaboradorId: 'col-5', anoBase: 2025, dataInicio: '2025-11-10', dataFim: '2026-11-09', diasDisponiveis: 30, diasUsados: 0, status: 'ativo' },
];

const SEED_FERIAS: Ferias[] = [
  { id: 'fer-1', colaboradorId: 'col-1', periodoAquisitivoId: 'pa-2', dataInicio: '2026-07-20', dataFim: '2026-07-29', dias: 10, status: 'planejada', observacoes: 'Férias de meio de ano', createdAt: '2026-06-15' },
  { id: 'fer-2', colaboradorId: 'col-2', periodoAquisitivoId: 'pa-5', dataInicio: '2026-08-01', dataFim: '2026-08-15', dias: 15, status: 'planejada', observacoes: '', createdAt: '2026-06-20' },
];

const SEED_DAYOFFS: DayOff[] = [
  { id: 'do-1', colaboradorId: 'col-1', ano: 2026, dataLimite: '2026-07-15', status: 'disponivel', observacoes: '' },
  { id: 'do-2', colaboradorId: 'col-2', ano: 2026, dataLimite: '2026-01-30', dataUtilizacao: '2026-01-15', status: 'utilizado' },
  { id: 'do-3', colaboradorId: 'col-3', ano: 2026, dataLimite: '2026-06-20', status: 'disponivel' },
  { id: 'do-4', colaboradorId: 'col-4', ano: 2026, dataLimite: '2026-09-15', status: 'disponivel' },
  { id: 'do-5', colaboradorId: 'col-5', ano: 2026, dataLimite: '2026-11-25', status: 'disponivel' },
];

const SEED_FOLGAS: Folga[] = [
  { id: 'fol-1', colaboradorId: 'col-1', data: '2026-07-10', motivo: 'Compensação por fim de semana trabalhado', status: 'aprovada', observacoes: '', createdAt: '2026-07-01' },
  { id: 'fol-2', colaboradorId: 'col-2', data: '2026-07-18', motivo: 'Acompanhamento médico', status: 'aprovada', createdAt: '2026-07-15' },
];

const DEFAULT_CONFIG_GESTAO_PESSOAS: ConfiguracaoGestaoPessoas = {
  diasAntecedenciaFerias: 30,
  permitirFeriasProlongadas: false,
  maximoDiasFolga: 5,
  obrigarPeriodoAquisitivo: true,
  anteciparAniversario: false,
  notificacoes: {
    ferias90dias: true,
    feriasVencendo: true,
    dayoffPendente: true,
    folgasPendentes: true,
    aniversarioProximo: true,
    aniversarioEmpresaProximo: true,
  },
};

// Funções de Inicialização e Leitura/Escrita
export function initializeStorage() {
  if (!localStorage.getItem(KEYS.EMPRESAS)) {
    localStorage.setItem(KEYS.EMPRESAS, JSON.stringify(SEED_EMPRESAS));
  }
  if (!localStorage.getItem(KEYS.SETORES)) {
    localStorage.setItem(KEYS.SETORES, JSON.stringify(SEED_SETORES));
  }
  if (!localStorage.getItem(KEYS.CARGOS)) {
    localStorage.setItem(KEYS.CARGOS, JSON.stringify(SEED_CARGOS));
  }
  if (!localStorage.getItem(KEYS.LIDERES)) {
    localStorage.setItem(KEYS.LIDERES, JSON.stringify(SEED_LIDERES));
  }
  if (!localStorage.getItem(KEYS.COLABORADORES)) {
    localStorage.setItem(KEYS.COLABORADORES, JSON.stringify(SEED_COLABORADORES));
  }
  if (!localStorage.getItem(KEYS.TIMELINE)) {
    localStorage.setItem(KEYS.TIMELINE, JSON.stringify(SEED_TIMELINE));
  }
  if (!localStorage.getItem(KEYS.TAREFAS)) {
    localStorage.setItem(KEYS.TAREFAS, JSON.stringify(SEED_TAREFAS));
  }
  if (!localStorage.getItem(KEYS.USUARIOS)) {
    localStorage.setItem(KEYS.USUARIOS, JSON.stringify(SEED_USUARIOS));
  }
  if (!localStorage.getItem(KEYS.SUPABASE)) {
    localStorage.setItem(KEYS.SUPABASE, JSON.stringify(DEFAULT_SUPABASE));
  }
  
  const existingGoogleConfig = localStorage.getItem(KEYS.GOOGLESCRIPT);
  if (!existingGoogleConfig) {
    localStorage.setItem(KEYS.GOOGLESCRIPT, JSON.stringify(DEFAULT_GOOGLESCRIPT));
  } else {
    try {
      const parsed = JSON.parse(existingGoogleConfig);
      if (!parsed.webAppUrl || parsed.webAppUrl !== DEFAULT_GOOGLESCRIPT.webAppUrl) {
        localStorage.setItem(KEYS.GOOGLESCRIPT, JSON.stringify(DEFAULT_GOOGLESCRIPT));
      }
    } catch (e) {
      localStorage.setItem(KEYS.GOOGLESCRIPT, JSON.stringify(DEFAULT_GOOGLESCRIPT));
    }
  }

  if (!localStorage.getItem(KEYS.PROVIDER)) {
    localStorage.setItem(KEYS.PROVIDER, JSON.stringify(DEFAULT_PROVIDER));
  }

  // P3: Documentos
  if (!localStorage.getItem(KEYS.DOCUMENTOS)) {
    localStorage.setItem(KEYS.DOCUMENTOS, JSON.stringify(SEED_DOCUMENTOS));
  }

  // P4: Reconhecimento
  if (!localStorage.getItem(KEYS.CONFIG_RECONHECIMENTO)) {
    localStorage.setItem(KEYS.CONFIG_RECONHECIMENTO, JSON.stringify(DEFAULT_CONFIG_RECONHECIMENTO));
  }
  if (!localStorage.getItem(KEYS.RECONHECIMENTOS)) {
    localStorage.setItem(KEYS.RECONHECIMENTOS, JSON.stringify(SEED_RECONHECIMENTOS));
  }

  // P5: Metas
  if (!localStorage.getItem(KEYS.METAS_LIDERANCA)) {
    localStorage.setItem(KEYS.METAS_LIDERANCA, JSON.stringify(SEED_METAS_LIDERANCA));
  }
  if (!localStorage.getItem(KEYS.METAS_SETOR)) {
    localStorage.setItem(KEYS.METAS_SETOR, JSON.stringify(SEED_METAS_SETOR));
  }
  if (!localStorage.getItem(KEYS.ACOMPANHAMENTOS)) {
    localStorage.setItem(KEYS.ACOMPANHAMENTOS, JSON.stringify(SEED_ACOMPANHAMENTOS));
  }

  // P6: Gestão de Pessoas
  if (!localStorage.getItem(KEYS.PERIODOS_AQUISITIVOS)) {
    localStorage.setItem(KEYS.PERIODOS_AQUISITIVOS, JSON.stringify(SEED_PERIODOS_AQUISITIVOS));
  }
  if (!localStorage.getItem(KEYS.FERIAS)) {
    localStorage.setItem(KEYS.FERIAS, JSON.stringify(SEED_FERIAS));
  }
  if (!localStorage.getItem(KEYS.DAYOFFS)) {
    localStorage.setItem(KEYS.DAYOFFS, JSON.stringify(SEED_DAYOFFS));
  }
  if (!localStorage.getItem(KEYS.FOLGAS)) {
    localStorage.setItem(KEYS.FOLGAS, JSON.stringify(SEED_FOLGAS));
  }
  if (!localStorage.getItem(KEYS.CONFIG_GESTAO_PESSOAS)) {
    localStorage.setItem(KEYS.CONFIG_GESTAO_PESSOAS, JSON.stringify(DEFAULT_CONFIG_GESTAO_PESSOAS));
  }
}

// Genéricas para ler/gravar
function get<T>(key: string): T[] {
  initializeStorage();
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function set<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Métodos de Acesso Específicos
export const StorageAPI = {
  getEmpresas: (): Empresa[] => get<Empresa>(KEYS.EMPRESAS),
  getSetores: (): Setor[] => get<Setor>(KEYS.SETORES),
  getCargos: (): Cargo[] => get<Cargo>(KEYS.CARGOS),
  getLideres: (): Lider[] => get<Lider>(KEYS.LIDERES),
  getColaboradores: (): Colaborador[] => get<Colaborador>(KEYS.COLABORADORES),
  getTimeline: (): TimelineRegistro[] => get<TimelineRegistro>(KEYS.TIMELINE),
  getTarefas: (): Tarefa[] => get<Tarefa>(KEYS.TAREFAS),
  getUsuarios: (): Usuario[] => get<Usuario>(KEYS.USUARIOS),
  
  getSupabaseConfig: (): SupabaseConfig => {
    initializeStorage();
    const config = localStorage.getItem(KEYS.SUPABASE);
    return config ? JSON.parse(config) : DEFAULT_SUPABASE;
  },

  getGoogleScriptConfig(): GoogleScriptConfig {
    // Prioriza a variável de ambiente da Vercel (VITE_GOOGLE_SCRIPT_URL)
    // Se não existir, mantém o fallback para o localStorage
    const envUrl = (window as any).VITE_GOOGLE_SCRIPT_URL; // Fallback para window em ambientes restritos
    const stored = localStorage.getItem(KEYS.GOOGLESCRIPT);
    const config = stored ? JSON.parse(stored) : { webAppUrl: '', driveFolderId: '', isConnected: false };

    return {
      ...config,
      webAppUrl: envUrl || config.webAppUrl,
      isConnected: !!(envUrl || config.webAppUrl)
    };
  },

  getDataSourceProvider: (): DataSourceProvider => {
    initializeStorage();
    const provider = localStorage.getItem(KEYS.PROVIDER);
    return (provider as DataSourceProvider) || DEFAULT_PROVIDER;
  },

  saveEmpresa: (empresa: Empresa) => {
    const list = StorageAPI.getEmpresas();
    set(KEYS.EMPRESAS, [...list, empresa]);
  },

  saveSetor: (setor: Setor) => {
    const list = StorageAPI.getSetores();
    set(KEYS.SETORES, [...list, setor]);
  },

  saveCargo: (cargo: Cargo) => {
    const list = StorageAPI.getCargos();
    set(KEYS.CARGOS, [...list, cargo]);
  },

  saveLider: (lider: Lider) => {
    const list = StorageAPI.getLideres();
    set(KEYS.LIDERES, [...list, lider]);
  },

  saveColaborador: (colaborador: Colaborador) => {
    const list = StorageAPI.getColaboradores();
    const index = list.findIndex(c => c.id === colaborador.id);
    if (index >= 0) {
      list[index] = colaborador;
      set(KEYS.COLABORADORES, list);
    } else {
      set(KEYS.COLABORADORES, [...list, colaborador]);
    }
  },

  deleteColaborador: (id: string) => {
    const list = StorageAPI.getColaboradores();
    set(KEYS.COLABORADORES, list.filter(c => c.id !== id));
  },

  saveTimelineRegistro: (registro: TimelineRegistro) => {
    const list = StorageAPI.getTimeline();
    const index = list.findIndex(r => r.id === registro.id);
    if (index >= 0) {
      list[index] = registro;
      set(KEYS.TIMELINE, list);
    } else {
      set(KEYS.TIMELINE, [registro, ...list]);
    }
  },

  saveTarefa: (tarefa: Tarefa) => {
    const list = StorageAPI.getTarefas();
    const index = list.findIndex(t => t.id === tarefa.id);
    if (index >= 0) {
      list[index] = tarefa;
      set(KEYS.TAREFAS, list);
    } else {
      set(KEYS.TAREFAS, [...list, tarefa]);
    }
  },

  saveUsuario: (usuario: Usuario) => {
    const list = StorageAPI.getUsuarios();
    const index = list.findIndex(u => u.id === usuario.id);
    if (index >= 0) {
      list[index] = usuario;
      set(KEYS.USUARIOS, list);
    } else {
      set(KEYS.USUARIOS, [...list, usuario]);
    }
  },

  deleteUsuario: (id: string) => {
    const list = StorageAPI.getUsuarios();
    const filtered = list.filter(u => u.id !== id);
    set(KEYS.USUARIOS, filtered);
  },

  toggleTarefa: (id: string): Tarefa | undefined => {
    const list = StorageAPI.getTarefas();
    const index = list.findIndex(t => t.id === id);
    if (index >= 0) {
      list[index].concluida = !list[index].concluida;
      set(KEYS.TAREFAS, list);
      return list[index];
    }
    return undefined;
  },

  saveSupabaseConfig: (config: SupabaseConfig) => {
    localStorage.setItem(KEYS.SUPABASE, JSON.stringify(config));
  },

  saveGoogleScriptConfig: (config: GoogleScriptConfig) => {
    localStorage.setItem(KEYS.GOOGLESCRIPT, JSON.stringify(config));
  },

  saveDataSourceProvider: (provider: DataSourceProvider) => {
    localStorage.setItem(KEYS.PROVIDER, provider);
  },

  // --- Onboarding ---
  getOnboardingItems: (): OnboardingItem[] => {
    return get(KEYS.ONBOARDING_ITEMS) || [];
  },
  saveOnboardingItem: (item: OnboardingItem) => {
    const items = StorageAPI.getOnboardingItems();
    const index = items.findIndex((i) => i.id === item.id);
    if (index >= 0) items[index] = item;
    else items.push(item);
    set(KEYS.ONBOARDING_ITEMS, items);
  },
  deleteOnboardingItem: (id: string) => {
    const items = StorageAPI.getOnboardingItems().filter((i) => i.id !== id);
    set(KEYS.ONBOARDING_ITEMS, items);
  },
  getOnboardingChecklists: (): OnboardingChecklist[] => {
    return get(KEYS.ONBOARDING_CHECKLISTS) || [];
  },
  saveOnboardingChecklist: (checklist: OnboardingChecklist) => {
    const lists = StorageAPI.getOnboardingChecklists();
    const index = lists.findIndex((l) => l.id === checklist.id);
    if (index >= 0) lists[index] = checklist;
    else lists.push(checklist);
    set(KEYS.ONBOARDING_CHECKLISTS, lists);
  },

  // Avaliações de Experiência (15, 30, 60, 90 dias)
  getAvaliacoesExperiencia: (): any[] => {
    return get(KEYS.AVALIACOES_EXPERIENCIA) || [];
  },
  saveAvaliacaoExperiencia: (avaliacao: any) => {
    const avaliacoes = StorageAPI.getAvaliacoesExperiencia();
    const index = avaliacoes.findIndex((a) => a.id === avaliacao.id);
    if (index >= 0) avaliacoes[index] = avaliacao;
    else avaliacoes.push(avaliacao);
    set(KEYS.AVALIACOES_EXPERIENCIA, avaliacoes);
  },
  deleteAvaliacaoExperiencia: (id: string) => {
    const avaliacoes = StorageAPI.getAvaliacoesExperiencia().filter((a) => a.id !== id);
    set(KEYS.AVALIACOES_EXPERIENCIA, avaliacoes);
  },

  // Resetar para valores padrão
  resetData: () => {
    localStorage.removeItem(KEYS.EMPRESAS);
    localStorage.removeItem(KEYS.SETORES);
    localStorage.removeItem(KEYS.CARGOS);
    localStorage.removeItem(KEYS.LIDERES);
    localStorage.removeItem(KEYS.COLABORADORES);
    localStorage.removeItem(KEYS.TIMELINE);
    localStorage.removeItem(KEYS.TAREFAS);
    localStorage.removeItem(KEYS.USUARIOS);
    initializeStorage();
  },

  // ========== ALERTAS INTELIGENTES ==========
  
  // Configuração padrão de alertas
  getConfiguracaoAlertas: (): ConfiguracaoAlertas => {
    initializeStorage();
    const config = localStorage.getItem(KEYS.CONFIG_ALERTAS);
    if (config) {
      return JSON.parse(config);
    }
    // Valores padrão
    return {
      diasSemInteracao: 14,
      diasAntecedenciaAniversario: 15,
      diasAntecedenciaAvaliacao180: 30,
      alertasPersistentes: true,
    };
  },

  saveConfiguracaoAlertas: (config: ConfiguracaoAlertas) => {
    localStorage.setItem(KEYS.CONFIG_ALERTAS, JSON.stringify(config));
  },

  getAlertasInteligentes: (): AlertaInteligente[] => {
    initializeStorage();
    const alertas = localStorage.getItem(KEYS.ALERTAS);
    return alertas ? JSON.parse(alertas) : [];
  },

  saveAlertaInteligente: (alerta: AlertaInteligente) => {
    const alertas = StorageAPI.getAlertasInteligentes();
    const index = alertas.findIndex(a => a.id === alerta.id);
    if (index >= 0) {
      alertas[index] = alerta;
    } else {
      alertas.push(alerta);
    }
    localStorage.setItem(KEYS.ALERTAS, JSON.stringify(alertas));
  },

  deleteAlertaInteligente: (id: string) => {
    const alertas = StorageAPI.getAlertasInteligentes();
    const filtrados = alertas.filter(a => a.id !== id);
    localStorage.setItem(KEYS.ALERTAS, JSON.stringify(filtrados));
  },

  limparAlertasResolvidos: () => {
    const alertas = StorageAPI.getAlertasInteligentes();
    const ativos = alertas.filter(a => a.status !== 'resolvido');
    localStorage.setItem(KEYS.ALERTAS, JSON.stringify(ativos));
  },

  gerarIdAlerta: (): string => {
    return `alerta-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  // ========== P3: DOCUMENTOS ==========
  getDocumentos: (): Documento[] => {
    return get<Documento>(KEYS.DOCUMENTOS);
  },

  getDocumentosPorColaborador: (colaboradorId: string): Documento[] => {
    return StorageAPI.getDocumentos().filter(d => d.colaboradorId === colaboradorId);
  },

  saveDocumento: (documento: Documento) => {
    const docs = StorageAPI.getDocumentos();
    const index = docs.findIndex(d => d.id === documento.id);
    if (index >= 0) {
      docs[index] = documento;
    } else {
      docs.push(documento);
    }
    set(KEYS.DOCUMENTOS, docs);
  },

  deleteDocumento: (id: string) => {
    const docs = StorageAPI.getDocumentos().filter(d => d.id !== id);
    set(KEYS.DOCUMENTOS, docs);
  },

  // ========== P4: RECONHECIMENTO ==========
  getConfiguracaoReconhecimento: (): ConfiguracaoReconhecimento => {
    initializeStorage();
    const config = localStorage.getItem(KEYS.CONFIG_RECONHECIMENTO);
    return config ? JSON.parse(config) : DEFAULT_CONFIG_RECONHECIMENTO;
  },

  saveConfiguracaoReconhecimento: (config: ConfiguracaoReconhecimento) => {
    localStorage.setItem(KEYS.CONFIG_RECONHECIMENTO, JSON.stringify(config));
  },

  getReconhecimentos: (): Reconhecimento[] => {
    return get<Reconhecimento>(KEYS.RECONHECIMENTOS);
  },

  getReconhecimentosPorColaborador: (colaboradorId: string): Reconhecimento[] => {
    return StorageAPI.getReconhecimentos().filter(r => r.colaboradorId === colaboradorId);
  },

  saveReconhecimento: (reconhecimento: Reconhecimento) => {
    const recs = StorageAPI.getReconhecimentos();
    const index = recs.findIndex(r => r.id === reconhecimento.id);
    if (index >= 0) {
      recs[index] = reconhecimento;
    } else {
      recs.push(reconhecimento);
    }
    set(KEYS.RECONHECIMENTOS, recs);
  },

  deleteReconhecimento: (id: string) => {
    const recs = StorageAPI.getReconhecimentos().filter(r => r.id !== id);
    set(KEYS.RECONHECIMENTOS, recs);
  },

  // ========== P5: METAS ==========
  getMetasLideranca: (): MetaLideranca[] => {
    return get<MetaLideranca>(KEYS.METAS_LIDERANCA);
  },

  getMetasLiderancaPorLider: (liderId: string): MetaLideranca[] => {
    return StorageAPI.getMetasLideranca().filter(m => m.liderId === liderId);
  },

  saveMetaLideranca: (meta: MetaLideranca) => {
    const metas = StorageAPI.getMetasLideranca();
    const index = metas.findIndex(m => m.id === meta.id);
    if (index >= 0) {
      metas[index] = meta;
    } else {
      metas.push(meta);
    }
    set(KEYS.METAS_LIDERANCA, metas);
  },

  deleteMetaLideranca: (id: string) => {
    const metas = StorageAPI.getMetasLideranca().filter(m => m.id !== id);
    set(KEYS.METAS_LIDERANCA, metas);
  },

  getMetasSetor: (): MetaSetor[] => {
    return get<MetaSetor>(KEYS.METAS_SETOR);
  },

  getMetasSetorPorSetor: (setorId: string): MetaSetor[] => {
    return StorageAPI.getMetasSetor().filter(m => m.setorId === setorId);
  },

  saveMetaSetor: (meta: MetaSetor) => {
    const metas = StorageAPI.getMetasSetor();
    const index = metas.findIndex(m => m.id === meta.id);
    if (index >= 0) {
      metas[index] = meta;
    } else {
      metas.push(meta);
    }
    set(KEYS.METAS_SETOR, metas);
  },

  deleteMetaSetor: (id: string) => {
    const metas = StorageAPI.getMetasSetor().filter(m => m.id !== id);
    set(KEYS.METAS_SETOR, metas);
  },

  getAcompanhamentos: (): AcompanhamentoRealizado[] => {
    return get<AcompanhamentoRealizado>(KEYS.ACOMPANHAMENTOS);
  },

  getAcompanhamentosPorLider: (liderId: string, periodo?: string): AcompanhamentoRealizado[] => {
    let acs = StorageAPI.getAcompanhamentos().filter(a => a.liderId === liderId);
    if (periodo) {
      acs = acs.filter(a => a.data.startsWith(periodo));
    }
    return acs;
  },

  getAcompanhamentosPorColaborador: (colaboradorId: string): AcompanhamentoRealizado[] => {
    return StorageAPI.getAcompanhamentos().filter(a => a.colaboradorId === colaboradorId);
  },

  saveAcompanhamento: (acomp: AcompanhamentoRealizado) => {
    const acs = StorageAPI.getAcompanhamentos();
    const index = acs.findIndex(a => a.id === acomp.id);
    if (index >= 0) {
      acs[index] = acomp;
    } else {
      acs.push(acomp);
    }
    set(KEYS.ACOMPANHAMENTOS, acs);
  },

  deleteAcompanhamento: (id: string) => {
    const acs = StorageAPI.getAcompanhamentos().filter(a => a.id !== id);
    set(KEYS.ACOMPANHAMENTOS, acs);
  },

  // Contar interações por tipo no período
  contarInteracoesPorTipo: (liderId: string, tipoInteracao: string, periodo: string): number => {
    return StorageAPI.getAcompanhamentosPorLider(liderId, periodo)
      .filter(a => a.tipoInteracao === tipoInteracao).length;
  },

  // ========== P6: GESTÃO DE PESSOAS ==========
  
  // Períodos Aquisitivos
  getPeriodosAquisitivos: (): PeriodoAquisitivo[] => {
    return get<PeriodoAquisitivo>(KEYS.PERIODOS_AQUISITIVOS);
  },

  getPeriodosAquisitivosPorColaborador: (colaboradorId: string): PeriodoAquisitivo[] => {
    return StorageAPI.getPeriodosAquisitivos().filter(p => p.colaboradorId === colaboradorId);
  },

  getPeriodoAquisitivoAtivo: (colaboradorId: string): PeriodoAquisitivo | undefined => {
    return StorageAPI.getPeriodosAquisitivosPorColaborador(colaboradorId)
      .find(p => p.status === 'ativo');
  },

  savePeriodoAquisitivo: (periodo: PeriodoAquisitivo) => {
    const periodos = StorageAPI.getPeriodosAquisitivos();
    const index = periodos.findIndex(p => p.id === periodo.id);
    if (index >= 0) {
      periodos[index] = periodo;
    } else {
      periodos.push(periodo);
    }
    set(KEYS.PERIODOS_AQUISITIVOS, periodos);
  },

  deletePeriodoAquisitivo: (id: string) => {
    const periodos = StorageAPI.getPeriodosAquisitivos().filter(p => p.id !== id);
    set(KEYS.PERIODOS_AQUISITIVOS, periodos);
  },

  // Férias
  getFerias: (): Ferias[] => {
    return get<Ferias>(KEYS.FERIAS);
  },

  getFeriasPorColaborador: (colaboradorId: string): Ferias[] => {
    return StorageAPI.getFerias().filter(f => f.colaboradorId === colaboradorId);
  },

  getFeriasPlanejadas: (): Ferias[] => {
    return StorageAPI.getFerias().filter(f => f.status === 'planejada');
  },

  saveFerias: (ferias: Ferias) => {
    const feriasList = StorageAPI.getFerias();
    const index = feriasList.findIndex(f => f.id === ferias.id);
    if (index >= 0) {
      feriasList[index] = ferias;
    } else {
      feriasList.push(ferias);
    }
    set(KEYS.FERIAS, feriasList);
  },

  deleteFerias: (id: string) => {
    const ferias = StorageAPI.getFerias().filter(f => f.id !== id);
    set(KEYS.FERIAS, ferias);
  },

  // DayOffs
  getDayOffs: (): DayOff[] => {
    return get<DayOff>(KEYS.DAYOFFS);
  },

  getDayOffsPorColaborador: (colaboradorId: string): DayOff[] => {
    return StorageAPI.getDayOffs().filter(d => d.colaboradorId === colaboradorId);
  },

  getDayOffDisponivel: (colaboradorId: string, ano: number): DayOff | undefined => {
    return StorageAPI.getDayOffsPorColaborador(colaboradorId)
      .find(d => d.ano === ano && d.status === 'disponivel');
  },

  saveDayOff: (dayoff: DayOff) => {
    const dayoffs = StorageAPI.getDayOffs();
    const index = dayoffs.findIndex(d => d.id === dayoff.id);
    if (index >= 0) {
      dayoffs[index] = dayoff;
    } else {
      dayoffs.push(dayoff);
    }
    set(KEYS.DAYOFFS, dayoffs);
  },

  deleteDayOff: (id: string) => {
    const dayoffs = StorageAPI.getDayOffs().filter(d => d.id !== id);
    set(KEYS.DAYOFFS, dayoffs);
  },

  // Folgas
  getFolgas: (): Folga[] => {
    return get<Folga>(KEYS.FOLGAS);
  },

  getFolgasPorColaborador: (colaboradorId: string): Folga[] => {
    return StorageAPI.getFolgas().filter(f => f.colaboradorId === colaboradorId);
  },

  getFolgasPendentes: (): Folga[] => {
    return StorageAPI.getFolgas().filter(f => f.status === 'pendente');
  },

  saveFolga: (folga: Folga) => {
    const folgas = StorageAPI.getFolgas();
    const index = folgas.findIndex(f => f.id === folga.id);
    if (index >= 0) {
      folgas[index] = folga;
    } else {
      folgas.push(folga);
    }
    set(KEYS.FOLGAS, folgas);
  },

  deleteFolga: (id: string) => {
    const folgas = StorageAPI.getFolgas().filter(f => f.id !== id);
    set(KEYS.FOLGAS, folgas);
  },

  // Configuração de Gestão de Pessoas
  getConfiguracaoGestaoPessoas: (): ConfiguracaoGestaoPessoas => {
    initializeStorage();
    const config = localStorage.getItem(KEYS.CONFIG_GESTAO_PESSOAS);
    return config ? JSON.parse(config) : DEFAULT_CONFIG_GESTAO_PESSOAS;
  },

  saveConfiguracaoGestaoPessoas: (config: ConfiguracaoGestaoPessoas) => {
    localStorage.setItem(KEYS.CONFIG_GESTAO_PESSOAS, JSON.stringify(config));
  },
};
