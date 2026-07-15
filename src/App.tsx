/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { StorageAPI, initializeStorage } from './utils/storage';
import { DataService } from './services/DataService';
import {
  Colaborador,
  TimelineRegistro,
  Tarefa,
  Setor,
  Cargo,
  Lider,
  Empresa,
  SupabaseConfig,
  GoogleScriptConfig,
  DataSourceProvider,
  Usuario,
  OnboardingItem,
  OnboardingChecklist,
  Documento,
  Reconhecimento,
  ConfiguracaoReconhecimento,
  MetaLideranca,
  MetaSetor,
  AcompanhamentoRealizado,
  AlertaInteligente,
  ConfiguracaoAlertas,
} from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Colaboradores from './components/Colaboradores';
import ColaboradorProfile from './components/ColaboradorProfile';
import Tarefas from './components/Tarefas';
import Analytics from './components/Analytics';
import Config from './components/Config';
import Usuarios from './components/Usuarios';
import Login from './components/Login';
import CentralDocumentos from './components/CentralDocumentos';
import SistemaReconhecimento from './components/SistemaReconhecimento';
import MetasLideranca from './components/MetasLideranca';
import SistemaNotificacoes from './components/SistemaNotificacoes';
import { Users2, X, PlusCircle } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);

  // Inicializa o LocalStorage com os dados padrões (seed) se não existirem
  useEffect(() => {
    initializeStorage();
    loadAllData();
    // Restaurar sessão de login
    const savedUser = localStorage.getItem('gc_logged_in_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Erro ao restaurar sessão de login:', e);
      }
    }
  }, []);

  const handleLoginSuccess = (user: Usuario) => {
    setCurrentUser(user);
    localStorage.setItem('gc_logged_in_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('gc_logged_in_user');
    setActiveTab('dashboard');
  };

  // Estados globais da aplicação
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [timeline, setTimeline] = useState<TimelineRegistro[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [lideres, setLideres] = useState<Lider[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>({
    supabaseUrl: '',
    supabaseAnonKey: '',
    isConnected: false,
  });
  const [googleScriptConfig, setGoogleScriptConfig] = useState<GoogleScriptConfig>({
    webAppUrl: '',
    driveFolderId: '',
    isConnected: false,
  });
  const [activeProvider, setActiveProvider] = useState<DataSourceProvider>('local');
  const [onboardingItems, setOnboardingItems] = useState<OnboardingItem[]>([]);
  const [onboardingChecklists, setOnboardingChecklists] = useState<OnboardingChecklist[]>([]);

  // P3: Documentos
  const [documentos, setDocumentos] = useState<Documento[]>([]);

  // P4: Reconhecimento
  const [reconhecimentos, setReconhecimentos] = useState<Reconhecimento[]>([]);
  const [configReconhecimento, setConfigReconhecimento] = useState<ConfiguracaoReconhecimento>({
    tipos: [],
    permitirIndicacaoPeer: true,
    permiteUploadCertificado: true,
    notificacoesAutomaticas: true,
  });

  // P5: Metas
  const [metasLideranca, setMetasLideranca] = useState<MetaLideranca[]>([]);
  const [metasSetor, setMetasSetor] = useState<MetaSetor[]>([]);
  const [acompanhamentos, setAcompanhamentos] = useState<AcompanhamentoRealizado[]>([]);

  // Sistema de Notificações e Alertas
  const [alertas, setAlertas] = useState<AlertaInteligente[]>([]);
  const [configAlertas, setConfigAlertas] = useState<ConfiguracaoAlertas>({
    diasSemInteracao: 14,
    diasAntecedenciaAniversario: 15,
    diasAntecedenciaAvaliacao180: 30,
    alertasPersistentes: true,
  });

  // Estado para colaborador selecionado (CRM detalhado)
  const [selectedColaboradorId, setSelectedColaboradorId] = useState<string | null>(null);

  // Estados para filtros pré-selecionados ao navegar de widgets clicáveis
  const [preselectedFilters, setPreselectedFilters] = useState<any>({});

  // Modal rápido de seleção de colaborador para lançar feedback
  const [isQuickFeedbackModalOpen, setIsQuickFeedbackModalOpen] = useState(false);

  // Carregar dados de forma reativa do serviço ativo
  const loadAllData = async () => {
    try {
      const [cols, timelineData, tarefasData, setoresData, cargosData, lideresData, empresasData, usuariosData, onbItems, onbChecklists, docsData, recsData, configRecData, metasLidData, metasSetData, acompData] = await Promise.all([
        DataService.getColaboradores(),
        DataService.getTimeline(),
        DataService.getTarefas(),
        DataService.getSetores(),
        DataService.getCargos(),
        DataService.getLideres(),
        DataService.getEmpresas(),
        DataService.getUsuarios(),
        DataService.getOnboardingItems(),
        DataService.getOnboardingChecklists(),
        // P3: Documentos
        DataService.getDocumentos(),
        // P4: Reconhecimento
        DataService.getReconhecimentos(),
        DataService.getConfiguracaoReconhecimento(),
        // P5: Metas
        DataService.getMetasLideranca(),
        DataService.getMetasSetor(),
        DataService.getAcompanhamentos(),
        // Sistema de Notificações
        DataService.getAlertasInteligentes(),
        DataService.getConfiguracaoAlertas(),
      ]);

      setColaboradores(cols);
      setTimeline(timelineData);
      setTarefas(tarefasData);
      setSetores(setoresData);
      setCargos(cargosData);
      setLideres(lideresData);
      setEmpresas(empresasData);
      setUsuarios(usuariosData);
      setOnboardingItems(onbItems);
      setOnboardingChecklists(onbChecklists);

      // P3: Documentos
      setDocumentos(docsData);

      // P4: Reconhecimento
      setReconhecimentos(recsData);
      setConfigReconhecimento(configRecData);

      // P5: Metas
      setMetasLideranca(metasLidData);
      setMetasSetor(metasSetData);
      setAcompanhamentos(acompData);

      // Sistema de Notificações
      setAlertas(await DataService.getAlertasInteligentes());
      setConfigAlertas(await DataService.getConfiguracaoAlertas());
      
      setSupabaseConfig(StorageAPI.getSupabaseConfig());
      setGoogleScriptConfig(StorageAPI.getGoogleScriptConfig());
      setActiveProvider(StorageAPI.getDataSourceProvider());
    } catch (error) {
      console.error('Erro ao carregar dados do DataService:', error);
    }
  };

  // Tratar alteração rápida de situação ou atualização de dados do colaborador
  const handleUpdateColaborador = async (col: Colaborador) => {
    await DataService.saveColaborador(col);
    loadAllData();
  };

  // Sincronizar ao criar colaborador
  const handleAddColaborador = async (col: Colaborador) => {
    await DataService.saveColaborador(col);
    loadAllData();
  };

  const handleDeleteColaborador = async (id: string) => {
    await DataService.deleteColaborador(id);
    loadAllData();
  };

  // Métodos rápidos para entidades auxiliares
  const handleAddEmpresa = async (nome: string) => {
    await DataService.saveEmpresa({ id: `emp-${Date.now()}`, nome });
    loadAllData();
  };

  const handleAddSetor = async (nome: string) => {
    await DataService.saveSetor({ id: `set-${Date.now()}`, nome });
    loadAllData();
  };

  const handleAddCargo = async (nome: string) => {
    await DataService.saveCargo({ id: `car-${Date.now()}`, nome });
    loadAllData();
  };

  const handleAddLider = async (lider: Lider) => {
    await DataService.saveLider(lider);
    loadAllData();
  };

  const handleAddOnboardingItem = async (item: OnboardingItem) => {
    await DataService.saveOnboardingItem(item);
    loadAllData();
  };

  const handleDeleteOnboardingItem = async (id: string) => {
    await DataService.deleteOnboardingItem(id);
    loadAllData();
  };

  const handleSaveOnboardingChecklist = async (checklist: OnboardingChecklist) => {
    await DataService.saveOnboardingChecklist(checklist);
    loadAllData();
  };

  // Tratar Toggle e Criação de Tarefas
  const handleToggleTarefa = async (id: string) => {
    await DataService.toggleTarefa(id);
    loadAllData();
  };

  const handleAddTarefa = async (task: Tarefa) => {
    await DataService.saveTarefa(task);
    loadAllData();
  };

  // Tratar inserção na Timeline + auto-geração de tarefas de acompanhamento
  const handleAddTimelineRegistro = async (reg: TimelineRegistro) => {
    // 1. Salvar o registro no histórico oficial
    await DataService.saveTimelineRegistro(reg);

    // 2. Se habilitado 'gerarTarefaFutura', criar ação pendente automática vinculada ao colaborador e líder aplicador
    if (reg.gerarTarefaFutura) {
      const col = colaboradores.find((c) => c.id === reg.colaboradorId);
      const novaTarefa: Tarefa = {
        id: `tar-${Date.now()}`,
        colaboradorId: reg.colaboradorId,
        titulo: `Acompanhamento: ${reg.tipo} - ${col?.nome || 'Colaborador'}`,
        descricao: `Plano acertado em: "${reg.titulo}" pelo responsável.`,
        vencimento: reg.prazoAcompanhamento || '2026-07-20',
        concluida: false,
        tipoOrigem: reg.tipo,
        registroId: reg.id,
        responsavelId: reg.responsavelId,
      };
      await DataService.saveTarefa(novaTarefa);
    }

    loadAllData();
  };

  // Tratar salvamento e exclusão de Usuários
  const handleSaveUsuario = async (user: Usuario) => {
    await DataService.saveUsuario(user);
    loadAllData();
  };

  const handleDeleteUsuario = async (id: string) => {
    await DataService.deleteUsuario(id);
    loadAllData();
  };

  // Tratar salvar configuração do Supabase
  const handleSaveSupabaseConfig = (config: SupabaseConfig) => {
    StorageAPI.saveSupabaseConfig(config);
    setSupabaseConfig(config);
    loadAllData();
  };

  // Tratar salvar configuração do Google Apps Script
  const handleSaveGoogleScriptConfig = (config: GoogleScriptConfig) => {
    StorageAPI.saveGoogleScriptConfig(config);
    setGoogleScriptConfig(config);
    loadAllData();
  };

  // P3: Handlers de Documentos
  const handleAddDocumento = async (doc: Documento) => {
    await DataService.saveDocumento(doc);
    loadAllData();
  };

  const handleDeleteDocumento = async (id: string) => {
    await DataService.deleteDocumento(id);
    loadAllData();
  };

  // P4: Handlers de Reconhecimento
  const handleSaveReconhecimento = async (rec: Reconhecimento) => {
    await DataService.saveReconhecimento(rec);
    loadAllData();
  };

  const handleDeleteReconhecimento = async (id: string) => {
    await DataService.deleteReconhecimento(id);
    loadAllData();
  };

  const handleSaveConfigReconhecimento = async (config: ConfiguracaoReconhecimento) => {
    await DataService.saveConfiguracaoReconhecimento(config);
    loadAllData();
  };

  // P5: Handlers de Metas
  const handleSaveMetaLideranca = async (meta: MetaLideranca) => {
    await DataService.saveMetaLideranca(meta);
    loadAllData();
  };

  const handleDeleteMetaLideranca = async (id: string) => {
    await DataService.deleteMetaLideranca(id);
    loadAllData();
  };

  const handleSaveMetaSetor = async (meta: MetaSetor) => {
    await DataService.saveMetaSetor(meta);
    loadAllData();
  };

  const handleDeleteMetaSetor = async (id: string) => {
    await DataService.deleteMetaSetor(id);
    loadAllData();
  };

  const handleSaveAcompanhamento = async (acomp: AcompanhamentoRealizado) => {
    await DataService.saveAcompanhamento(acomp);
    loadAllData();
  };

  // Handlers de Alertas
  const handleReconhecerAlerta = async (id: string) => {
    const alerta = alertas.find(a => a.id === id);
    if (alerta) {
      const atualizado = { ...alerta, status: 'reconhecido' as const, dataReconhecimento: new Date().toISOString().split('T')[0] };
      await DataService.saveAlertaInteligente(atualizado);
      loadAllData();
    }
  };

  const handleResolverAlerta = async (id: string) => {
    const alerta = alertas.find(a => a.id === id);
    if (alerta) {
      const atualizado = { ...alerta, status: 'resolvido' as const, dataResolucao: new Date().toISOString().split('T')[0] };
      await DataService.saveAlertaInteligente(atualizado);
      loadAllData();
    }
  };

  const handleIgnorarAlerta = async (id: string) => {
    await DataService.deleteAlertaInteligente(id);
    loadAllData();
  };

  const handleLimparAlertasResolvidos = async () => {
    // Remover alertas resolvidos do localStorage
    const ativos = alertas.filter(a => a.status !== 'resolvido');
    // Salvar apenas os ativos
    for (const alerta of ativos) {
      await DataService.saveAlertaInteligente(alerta);
    }
    // Recarregar
    loadAllData();
  };

  // Tratar alteração do provedor de dados ativo
  const handleChangeProvider = (provider: DataSourceProvider) => {
    StorageAPI.saveDataSourceProvider(provider);
    setActiveProvider(provider);
    loadAllData();
  };

  // Reset Geral para demonstração
  const handleResetDemoData = async () => {
    await DataService.resetData();
    setSelectedColaboradorId(null);
    setActiveTab('dashboard');
    loadAllData();
  };

  // Navegação inteligente vinda de indicadores clicáveis do Dashboard
  const handleNavigateFromDashboard = (tab: string, filters?: any) => {
    setPreselectedFilters(filters || {});
    setActiveTab(tab);
    setSelectedColaboradorId(null);
  };

  // Iniciar fluxo para lançar novo feedback
  const handleQuickFeedbackTrigger = (colaboradorId?: string) => {
    if (colaboradorId) {
      setSelectedColaboradorId(colaboradorId);
      setActiveTab('colaboradores');
      setIsQuickFeedbackModalOpen(false);
    } else {
      setIsQuickFeedbackModalOpen(true);
    }
  };

  // Selecionar colaborador para ver ficha CRM completa
  const handleSelectColaborador = (id: string) => {
    setSelectedColaboradorId(id);
    setActiveTab('colaboradores');
  };

  // Aplicar a permissão por setor em um único ponto para proteger todas as telas.
  const acessoGlobal = currentUser?.perfil !== 'Lider';
  const setoresPermitidos = currentUser?.setoresPermitidos?.length
    ? currentUser.setoresPermitidos
    : currentUser?.setor_id
      ? [currentUser.setor_id]
      : [];

  const colaboradoresVisiveis = acessoGlobal
    ? colaboradores
    : colaboradores.filter((col) => setoresPermitidos.includes(col.setorId));
  const idsColaboradoresVisiveis = new Set(colaboradoresVisiveis.map((col) => col.id));
  const timelineVisivel = acessoGlobal
    ? timeline
    : timeline.filter((registro) => idsColaboradoresVisiveis.has(registro.colaboradorId));
  const tarefasVisiveis = tarefas.filter((tarefa) => {
    const col = colaboradores.find(c => c.id === tarefa.colaboradorId);
    if (!col || col.situacao === 'Desligado') return false;
    if (acessoGlobal) return true;
    return setoresPermitidos.includes(col.setorId);
  });
  const setoresVisiveis = acessoGlobal
    ? setores
    : setores.filter((setor) => setoresPermitidos.includes(setor.id));
  const colaboradorSelecionado = selectedColaboradorId
    ? colaboradoresVisiveis.find((col) => col.id === selectedColaboradorId)
    : undefined;

  // Contadores dinâmicos para barra lateral
  const tarefasPendentesCount = tarefasVisiveis.filter((t) => !t.concluida).length;

  if (currentUser === null) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div id="app-root-layout" className="flex h-screen bg-slate-50 overflow-hidden font-sans antialiased text-slate-800">
      {/* Lateral Menu Navigation Panel */}
      <Sidebar
        activeTab={selectedColaboradorId ? 'colaboradores' : activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSelectedColaboradorId(null);
          setPreselectedFilters({});
        }}
        onReset={handleResetDemoData}
        colaboradoresCount={colaboradoresVisiveis.length}
        tarefasPendentesCount={tarefasPendentesCount}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Content View Frame */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Dynamic Nav Header Bar */}
        <header className="h-16 border-b border-slate-100 bg-white flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {selectedColaboradorId ? 'Histórico de Colaborador (CRM)' : activeTab}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Sistema de Notificações */}
            <SistemaNotificacoes
              alertas={alertas}
              configAlertas={configAlertas}
              colaboradores={colaboradores}
              timeline={timeline}
              onReconhecerAlerta={handleReconhecerAlerta}
              onResolverAlerta={handleResolverAlerta}
              onIgnorarAlerta={handleIgnorarAlerta}
              onLimparResolvidos={handleLimparAlertasResolvidos}
            />
            
            <div className="text-right">
              <span className="text-xs font-bold text-slate-900 block leading-tight">{currentUser.nome}</span>
              <span className="text-[10px] text-slate-400 font-bold block">{currentUser.email}</span>
            </div>
            <div className="h-9 w-9 rounded-full bg-slate-900 border border-slate-100 flex items-center justify-center font-bold text-xs text-teal-400 shadow-sm">
              {currentUser.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Outer view viewport scrollbar */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50">
          {/* Renders Selected View */}
          {activeTab === 'dashboard' && (
              <Dashboard
                colaboradores={colaboradoresVisiveis}
                timeline={timelineVisivel}
                tarefas={tarefasVisiveis}
                onNavigateToList={handleNavigateFromDashboard}
                onSelectColaborador={handleSelectColaborador}
                onOpenNewRegistroModal={handleQuickFeedbackTrigger}
                currentUser={currentUser}
                onUpdateColaborador={handleUpdateColaborador}
                onboardingItems={onboardingItems}
                onboardingChecklists={onboardingChecklists}
                onSaveOnboardingChecklist={handleSaveOnboardingChecklist}
              />
          )}

          {activeTab === 'colaboradores' && (
            selectedColaboradorId && colaboradorSelecionado ? (
              <ColaboradorProfile
                colaborador={colaboradorSelecionado}
                timeline={timelineVisivel}
                setores={setoresVisiveis}
                cargos={cargos}
                lideres={lideres}
                empresas={empresas}
                onBack={() => setSelectedColaboradorId(null)}
                onUpdateColaborador={handleUpdateColaborador}
                onAddTimelineRegistro={handleAddTimelineRegistro}
              />
            ) : (
              <Colaboradores
                colaboradores={colaboradoresVisiveis}
                setores={setoresVisiveis}
                cargos={cargos}
                lideres={lideres}
                empresas={empresas}
                onSelectColaborador={handleSelectColaborador}
                onAddColaborador={handleAddColaborador}
                onAddEmpresa={handleAddEmpresa}
                onAddSetor={handleAddSetor}
                onAddCargo={handleAddCargo}
                onAddLider={handleAddLider}
                onUpdateColaborador={handleUpdateColaborador}
                onDeleteColaborador={handleDeleteColaborador}
                currentUser={currentUser}
                preselectedFilters={preselectedFilters}
              />
            )
          )}

          {activeTab === 'tarefas' && (
            <Tarefas
              tarefas={tarefasVisiveis}
              colaboradores={colaboradoresVisiveis}
              lideres={lideres}
              cargos={cargos}
              onToggleTarefa={handleToggleTarefa}
              onAddTarefa={handleAddTarefa}
            />
          )}

          {activeTab === 'analytics' && (
            <Analytics
              colaboradores={colaboradoresVisiveis}
              timeline={timelineVisivel}
              setores={setoresVisiveis}
              tarefas={tarefasVisiveis}
            />
          )}

          {activeTab === 'usuarios' && (
            <Usuarios
              usuarios={usuarios}
              setores={setores}
              onSaveUsuario={handleSaveUsuario}
              onDeleteUsuario={handleDeleteUsuario}
            />
          )}

          {activeTab === 'documentos' && (
            <CentralDocumentos
              colaborador={{ id: 'todos', nome: 'Todos', email: '', fotoUrl: '', cargoId: '', setorId: '', liderId: '', dataAdmissao: '', situacao: 'Ativo', empresaId: '' } as Colaborador}
              documentos={documentos}
              onAddDocumento={handleAddDocumento}
              onDeleteDocumento={handleDeleteDocumento}
              currentUserId={currentUser?.id || ''}
            />
          )}

          {activeTab === 'reconhecimento' && (
            <SistemaReconhecimento
              reconhecimentos={reconhecimentos}
              configuracao={configReconhecimento}
              colaboradores={colaboradores}
              lideres={lideres}
              currentUserId={currentUser?.id || ''}
              onSaveReconhecimento={handleSaveReconhecimento}
              onDeleteReconhecimento={handleDeleteReconhecimento}
              onSaveConfiguracao={handleSaveConfigReconhecimento}
            />
          )}

          {activeTab === 'metas' && (
            <MetasLideranca
              metasLideranca={metasLideranca}
              metasSetor={metasSetor}
              acompanhamentos={acompanhamentos}
              lideres={lideres}
              setores={setores}
              colaboradores={colaboradores}
              currentUserId={currentUser?.id || ''}
              onSaveMetaLideranca={handleSaveMetaLideranca}
              onDeleteMetaLideranca={handleDeleteMetaLideranca}
              onSaveMetaSetor={handleSaveMetaSetor}
              onDeleteMetaSetor={handleDeleteMetaSetor}
              onSaveAcompanhamento={handleSaveAcompanhamento}
            />
          )}

          {activeTab === 'config' && (
            <Config
              config={supabaseConfig}
              onSaveConfig={setSupabaseConfig}
              googleConfig={googleScriptConfig}
              onSaveGoogleConfig={setGoogleScriptConfig}
              activeProvider={activeProvider}
              onChangeProvider={setActiveProvider}
              setores={setores}
              onboardingItems={onboardingItems}
              onAddOnboardingItem={handleAddOnboardingItem}
              onDeleteOnboardingItem={handleDeleteOnboardingItem}
              currentUser={currentUser!}
            />
          )}
        </div>
      </main>

      {/* MODAL: SELECIONAR COLABORADOR RÁPIDO PARA AVALIAR */}
      {isQuickFeedbackModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-scale-up border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-slate-950 text-sm uppercase tracking-wider flex items-center gap-1.5">
                <Users2 size={16} className="text-teal-500" /> Selecionar Colaborador
              </h3>
              <button
                onClick={() => setIsQuickFeedbackModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Escolha de qual integrante da equipe você deseja preencher o histórico agora. Você será direcionado para a timeline dele.
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {colaboradoresVisiveis.map((col) => (
                <div
                  key={col.id}
                  onClick={() => handleQuickFeedbackTrigger(col.id)}
                  className="flex items-center gap-3 p-2.5 border border-slate-100 rounded-2xl hover:bg-slate-50 hover:border-teal-100 cursor-pointer transition duration-150 group"
                >
                  <img
                    src={col.fotoUrl}
                    alt={col.nome}
                    className="w-8 h-8 rounded-full object-cover border border-slate-100"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-800 group-hover:text-teal-600 truncate">{col.nome}</h4>
                    <p className="text-[10px] text-slate-400 truncate">
                      {cargos.find((c) => c.id === col.cargoId)?.nome}
                    </p>
                  </div>
                  <PlusCircle size={14} className="text-slate-300 group-hover:text-teal-500 shrink-0" />
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4 mt-4 border-t border-slate-100">
              <button
                onClick={() => setIsQuickFeedbackModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 bg-slate-50 rounded-xl text-xs font-semibold hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
