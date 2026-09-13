/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DataService } from '../services/DataService';
import { 
  SupabaseConfig, 
  GoogleScriptConfig, 
  DataSourceProvider, 
  Setor, 
  Usuario,
  Empresa,
  Cargo,
  Lider,
  Colaborador,
  EscalaDominio,
  GrauDominio,
  MatrizVersao,
  MatrizCapacidadeCargo,
  CapacidadeBiblioteca,
  CompetenciaBiblioteca,
  TipoEvidenciaCapacidade,
  GravidadeOcorrencia,
} from '../types';
import {
  Key,
  CheckCircle,
  HelpCircle,
  FileSpreadsheet,
  Settings2,
  RefreshCw,
  Server,
  AlertCircle,
  PlusCircle,
  Trash2,
  Building2,
  Users,
  Briefcase,
  UserCircle,
  ChevronDown,
  ChevronUp,
  Edit2,
  X,
  Save,
  Shield,
  LayoutDashboard,
  Eye,
  GitBranch,
  Layers,
  Award,
  ChevronRight,
} from 'lucide-react';

interface ConfigProps {
  config: SupabaseConfig;
  onSaveConfig: (config: SupabaseConfig) => void;
  googleConfig: GoogleScriptConfig;
  onSaveGoogleConfig: (config: GoogleScriptConfig) => void;
  activeProvider: DataSourceProvider;
  onChangeProvider: (provider: DataSourceProvider) => void;
  setores: Setor[];
  currentUser: Usuario;
  // Novos props para o Dashboard Admin
  empresas?: Empresa[];
  cargos?: Cargo[];
  lideres?: Lider[];
  colaboradores?: Colaborador[];
  onAddEmpresa?: (nome: string) => void;
  onAddSetor?: (nome: string) => void;
  onAddCargo?: (nome: string, setorId: string) => void;
  onAddLider?: (lider: Lider) => void;
  onUpdateSetor?: (setor: Setor) => void;
  onUpdateCargo?: (cargo: Cargo) => void;
  onUpdateLider?: (lider: Lider) => void;
  // Trilha & Matriz
  escalas?: EscalaDominio[];
  graus?: GrauDominio[];
  matrizVersoes?: MatrizVersao[];
  matrizCapacidades?: MatrizCapacidadeCargo[];
  capacidades?: CapacidadeBiblioteca[];
  competencias?: CompetenciaBiblioteca[];
  tiposEvidencia?: TipoEvidenciaCapacidade[];
  gravidadesOcorrencia?: GravidadeOcorrencia[];
  onSaveEscala?: (escala: EscalaDominio) => void;
  onSaveGrau?: (grau: GrauDominio) => void;
  onDeleteGrau?: (id: string) => void;
  onSaveMatrizVersao?: (versao: MatrizVersao) => void;
  onSaveMatrizCapacidadeCargo?: (item: MatrizCapacidadeCargo) => void;
  onDeleteMatrizCapacidadeCargo?: (id: string) => void;
  onSaveCapacidade?: (cap: CapacidadeBiblioteca) => void;
  onSaveCompetencia?: (comp: CompetenciaBiblioteca) => void;
  onSaveTipoEvidencia?: (tipo: TipoEvidenciaCapacidade) => void;
  onSaveGravidadeOcorrencia?: (grav: GravidadeOcorrencia) => void;
}

export default function Config({
  config,
  onSaveConfig,
  googleConfig,
  onSaveGoogleConfig,
  activeProvider,
  onChangeProvider,
  setores,
  currentUser,
  empresas = [],
  cargos = [],
  lideres = [],
  colaboradores = [],
  onAddEmpresa,
  onAddSetor,
  onAddCargo,
  onAddLider,
  onUpdateSetor,
  onUpdateCargo,
  onUpdateLider,
  escalas = [],
  graus = [],
  matrizVersoes = [],
  matrizCapacidades = [],
  capacidades = [],
  competencias = [],
  tiposEvidencia = [],
  gravidadesOcorrencia = [],
  onSaveEscala,
  onSaveGrau,
  onDeleteGrau,
  onSaveMatrizVersao,
  onSaveMatrizCapacidadeCargo,
  onDeleteMatrizCapacidadeCargo,
  onSaveCapacidade,
  onSaveCompetencia,
  onSaveTipoEvidencia,
  onSaveGravidadeOcorrencia,
}: ConfigProps) {
  const [webAppUrl, setWebAppUrl] = useState(googleConfig.webAppUrl || '');

  // Perfil que pode ver o Dashboard Admin
  const canViewAdminDashboard = currentUser.perfil === 'Administrador' || 
                                currentUser.perfil === 'Coordenador';

  const [driveFolderId, setDriveFolderId] = useState(googleConfig.driveFolderId || '');
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Estado para Dashboard Admin
  const [adminTab, setAdminTab] = useState<'empresas' | 'setores' | 'cargos' | 'lideres' | 'trilha'>('setores');
  // Sub-aba da nova Trilha & Matriz
  const [trilhaSubTab, setTrilhaSubTab] = useState<'competencias' | 'escalas' | 'matriz' | 'catalogo'>('competencias');
  // Modal inline da Matriz: qual célula (capacidade × cargo) está sendo editada
  const [matrizModalAberto, setMatrizModalAberto] = useState(false);
  const [matrizModalCapId, setMatrizModalCapId] = useState('');
  const [matrizModalCargoId, setMatrizModalCargoId] = useState('');
  const [matrizModalVersaoId, setMatrizModalVersaoId] = useState('');
  const [matrizModalSetorId, setMatrizModalSetorId] = useState('');
  const [matrizModalEscalaId, setMatrizModalEscalaId] = useState('');
  const [matrizModalGrauId, setMatrizModalGrauId] = useState('');
  const [matrizModalObrigatorio, setMatrizModalObrigatorio] = useState(true);
  const [matrizModalSalvando, setMatrizModalSalvando] = useState(false);
  const [isAddingSetor, setIsAddingSetor] = useState(false);
  const [isAddingCargo, setIsAddingCargo] = useState(false);
  const [isAddingLider, setIsAddingLider] = useState(false);
  const [editingSetor, setEditingSetor] = useState<string | null>(null);
  const [editingCargo, setEditingCargo] = useState<string | null>(null);
  const [editingLider, setEditingLider] = useState<string | null>(null);
  const [newSetorNome, setNewSetorNome] = useState('');
  const [newCargoNome, setNewCargoNome] = useState('');
  // Todo cargo criado a partir de agora precisa nascer vinculado a um Setor
  // (ver arquitetura: Cargo vinculado a Setor). Cargos criados antes desta
  // mudança ficam sem setorId até serem editados aqui.
  const [newCargoSetorId, setNewCargoSetorId] = useState('');
  const [newLiderNome, setNewLiderNome] = useState('');
  const [newLiderEmail, setNewLiderEmail] = useState('');
  const [editSetorNome, setEditSetorNome] = useState('');
  const [editCargoNome, setEditCargoNome] = useState('');
  const [editCargoSetorId, setEditCargoSetorId] = useState('');
  const [editLiderNome, setEditLiderNome] = useState('');
  const [editLiderEmail, setEditLiderEmail] = useState('');

  const handleSaveGoogle = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveGoogleConfig({
      ...googleConfig,
      webAppUrl,
      driveFolderId,
      isConnected: !!webAppUrl,
    });
  };

  const handleTestConnection = async () => {
    if (!webAppUrl) {
      setTestStatus('error');
      setErrorMessage('Por favor, informe a URL do Web App antes de testar.');
      return;
    }

    setIsTesting(true);
    setTestStatus('idle');
    setErrorMessage('');

    try {
      const url = new URL('/api/googlescript', window.location.origin);
      url.searchParams.set('action', 'getEmpresas');

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-google-script-url': webAppUrl
        }
      });

      if (!response.ok) {
        throw new Error(`Servidor respondeu com status ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.status === 'error' || result.success === false) {
        throw new Error(result.message || 'O Google Sheets retornou uma mensagem de erro.');
      }

      setTestStatus('success');
      onSaveGoogleConfig({
        ...googleConfig,
        webAppUrl,
        driveFolderId,
        isConnected: true,
      });
    } catch (err: any) {
      console.error(err);
      setTestStatus('error');
      setErrorMessage(err.message || 'Erro desconhecido ao tentar se conectar ao Google Sheets.');
    } finally {
      setIsTesting(false);
    }
  };

  // Handlers para Dashboard Admin
  const handleAddSetor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetorNome.trim() || !onAddSetor) return;
    onAddSetor(newSetorNome.trim());
    setNewSetorNome('');
    setIsAddingSetor(false);
  };

  const handleSaveEditSetor = () => {
    if (!editingSetor || !editSetorNome.trim() || !onUpdateSetor) return;
    const setor = setores.find(s => s.id === editingSetor);
    if (setor) {
      onUpdateSetor({ ...setor, nome: editSetorNome.trim() });
    }
    setEditingSetor(null);
  };

  const handleAddCargo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCargoNome.trim() || !newCargoSetorId || !onAddCargo) return;
    onAddCargo(newCargoNome.trim(), newCargoSetorId);
    setNewCargoNome('');
    setNewCargoSetorId('');
    setIsAddingCargo(false);
  };

  const handleSaveEditCargo = () => {
    if (!editingCargo || !editCargoNome.trim() || !editCargoSetorId || !onUpdateCargo) return;
    const cargo = cargos.find(c => c.id === editingCargo);
    if (cargo) {
      onUpdateCargo({ ...cargo, nome: editCargoNome.trim(), setorId: editCargoSetorId });
    }
    setEditingCargo(null);
  };

  const handleAddLider = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLiderNome.trim() || !onAddLider) return;
    onAddLider({
      id: `lid-${Date.now()}`,
      nome: newLiderNome.trim(),
      email: newLiderEmail.trim(),
    });
    setNewLiderNome('');
    setNewLiderEmail('');
    setIsAddingLider(false);
  };

  const handleSaveEditLider = () => {
    if (!editingLider || !editLiderNome.trim() || !onUpdateLider) return;
    const lider = lideres.find(l => l.id === editingLider);
    if (lider) {
      onUpdateLider({ ...lider, nome: editLiderNome.trim(), email: editLiderEmail.trim() });
    }
    setEditingLider(null);
  };

  // Obter colaboradores por líder
  const getColaboradoresByLider = (liderId: string) => {
    return colaboradores.filter(c => c.liderId === liderId);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-6 animate-fade-in">
      {/* Header Panel */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Configurações Gerais</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gerencie a estrutura organizacional e parâmetros do sistema.
          </p>
        </div>
        <div className="h-12 w-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600">
          <Settings2 size={24} />
        </div>
      </div>

      {/* Dashboard Admin - Apenas para Administrador, Gerente ou Coordenador */}
      {canViewAdminDashboard && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                <Shield size={20} />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">Painel Administrativo</h2>
                <p className="text-xs text-slate-500">Gerencie empresas, setores, cargos e líderes</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">
              {currentUser.perfil}
            </span>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-slate-100 pb-3">
            <button
              onClick={() => setAdminTab('setores')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                adminTab === 'setores'
                  ? 'bg-teal-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <LayoutDashboard size={14} />
              Setores ({setores.length})
            </button>
            <button
              onClick={() => setAdminTab('cargos')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                adminTab === 'cargos'
                  ? 'bg-teal-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Briefcase size={14} />
              Cargos ({cargos.length})
            </button>
            <button
              onClick={() => setAdminTab('lideres')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                adminTab === 'lideres'
                  ? 'bg-teal-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <UserCircle size={14} />
              Líderes ({lideres.length})
            </button>
            <button
              onClick={() => setAdminTab('empresas')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                adminTab === 'empresas'
                  ? 'bg-teal-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Building2 size={14} />
              Empresas ({empresas.length})
            </button>
            <button
              onClick={() => setAdminTab('trilha')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                adminTab === 'trilha'
                  ? 'bg-teal-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <GitBranch size={14} />
              Trilha &amp; Matriz
            </button>
          </div>

          {/* Conteúdo das Tabs */}
          <div className="min-h-[300px]">
            {/* TAB: SETORES */}
            {adminTab === 'setores' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-slate-500">
                    Gerencie os setores da organização. Cada setor agrupa colaboradores e possui pemimpinhes próprios.
                  </p>
                  {!isAddingSetor && (
                    <button
                      onClick={() => setIsAddingSetor(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 text-white rounded-lg text-xs font-bold hover:bg-teal-600 transition cursor-pointer"
                    >
                      <PlusCircle size={14} />
                      Novo Setor
                    </button>
                  )}
                </div>

                {/* Form de adição */}
                {isAddingSetor && (
                  <form onSubmit={handleAddSetor} className="flex gap-2 bg-teal-50 p-4 rounded-xl border border-teal-100">
                    <input
                      type="text"
                      value={newSetorNome}
                      onChange={(e) => setNewSetorNome(e.target.value)}
                      placeholder="Nome do novo setor"
                      className="flex-1 px-3 py-2 bg-white border border-teal-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-teal-500 text-white rounded-lg text-xs font-bold hover:bg-teal-600 transition cursor-pointer"
                    >
                      <Save size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsAddingSetor(false); setNewSetorNome(''); }}
                      className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-300 transition cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </form>
                )}

                {/* Lista de Setores */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {setores.map(setor => (
                    <div key={setor.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4 group hover:border-teal-200 transition">
                      {editingSetor === setor.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editSetorNome}
                            onChange={(e) => setEditSetorNome(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-teal-200 rounded-lg text-xs focus:outline-none"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleSaveEditSetor}
                              className="flex-1 py-1.5 bg-teal-500 text-white rounded-lg text-xs font-bold hover:bg-teal-600 transition cursor-pointer"
                            >
                              Salvar
                            </button>
                            <button
                              onClick={() => setEditingSetor(null)}
                              className="px-3 py-1.5 bg-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-300 transition cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-bold text-slate-800 text-sm">{setor.nome}</h4>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {colaboradores.filter(c => c.setorId === setor.id).length} colaboradores
                              </p>
                            </div>
                            <button
                              onClick={() => { setEditingSetor(setor.id); setEditSetorNome(setor.nome); }}
                              className="p-1.5 text-slate-300 hover:text-teal-500 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                            >
                              <Edit2 size={14} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: CARGOS */}
            {adminTab === 'cargos' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-slate-500">
                    Gerencie os cargos da organização. Todo cargo precisa estar vinculado a um setor.
                  </p>
                  {!isAddingCargo && (
                    <button
                      onClick={() => setIsAddingCargo(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 text-white rounded-lg text-xs font-bold hover:bg-teal-600 transition cursor-pointer"
                    >
                      <PlusCircle size={14} />
                      Novo Cargo
                    </button>
                  )}
                </div>

                {/* Cargos sem Setor vinculado ainda (cadastrados antes desta
                    mudança) — aviso para lembrar de editá-los. */}
                {cargos.some(c => !c.setorId) && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                    <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">
                      {cargos.filter(c => !c.setorId).length} cargo(s) ainda não têm um setor vinculado. Clique no lápis de cada um para editar e escolher o setor.
                    </p>
                  </div>
                )}

                {/* Form de adição */}
                {isAddingCargo && (
                  <form onSubmit={handleAddCargo} className="flex flex-col sm:flex-row gap-2 bg-teal-50 p-4 rounded-xl border border-teal-100">
                    <input
                      type="text"
                      value={newCargoNome}
                      onChange={(e) => setNewCargoNome(e.target.value)}
                      placeholder="Nome do novo cargo"
                      className="flex-1 px-3 py-2 bg-white border border-teal-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                      autoFocus
                    />
                    <select
                      required
                      value={newCargoSetorId}
                      onChange={(e) => setNewCargoSetorId(e.target.value)}
                      className="px-3 py-2 bg-white border border-teal-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                    >
                      <option value="">Selecione o setor...</option>
                      {setores.map(setor => (
                        <option key={setor.id} value={setor.id}>{setor.nome}</option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-teal-500 text-white rounded-lg text-xs font-bold hover:bg-teal-600 transition cursor-pointer"
                    >
                      <Save size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsAddingCargo(false); setNewCargoNome(''); setNewCargoSetorId(''); }}
                      className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-300 transition cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </form>
                )}

                {/* Lista de Cargos */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {cargos.map(cargo => {
                    const setorDoCargo = setores.find(s => s.id === cargo.setorId);
                    return (
                    <div key={cargo.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4 group hover:border-teal-200 transition">
                      {editingCargo === cargo.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editCargoNome}
                            onChange={(e) => setEditCargoNome(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-teal-200 rounded-lg text-xs focus:outline-none"
                            autoFocus
                          />
                          <select
                            required
                            value={editCargoSetorId}
                            onChange={(e) => setEditCargoSetorId(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-teal-200 rounded-lg text-xs focus:outline-none cursor-pointer"
                          >
                            <option value="">Selecione o setor...</option>
                            {setores.map(setor => (
                              <option key={setor.id} value={setor.id}>{setor.nome}</option>
                            ))}
                          </select>
                          <div className="flex gap-2">
                            <button
                              onClick={handleSaveEditCargo}
                              className="flex-1 py-1.5 bg-teal-500 text-white rounded-lg text-xs font-bold hover:bg-teal-600 transition cursor-pointer"
                            >
                              Salvar
                            </button>
                            <button
                              onClick={() => setEditingCargo(null)}
                              className="px-3 py-1.5 bg-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-300 transition cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-bold text-slate-800 text-sm">{cargo.nome}</h4>
                              {setorDoCargo ? (
                                <span className="inline-block mt-1 text-[10px] font-semibold text-teal-700 bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded">
                                  {setorDoCargo.nome}
                                </span>
                              ) : (
                                <span className="inline-block mt-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">
                                  Sem setor vinculado
                                </span>
                              )}
                              <p className="text-xs text-slate-400 mt-1">
                                {colaboradores.filter(c => c.cargoId === cargo.id).length} colaboradores
                              </p>
                            </div>
                            <button
                              onClick={() => { setEditingCargo(cargo.id); setEditCargoNome(cargo.nome); setEditCargoSetorId(cargo.setorId || ''); }}
                              className="p-1.5 text-slate-300 hover:text-teal-500 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                            >
                              <Edit2 size={14} />
                            </button>
                          </div>

                        </>
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB: LÍDERES */}
            {adminTab === 'lideres' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-slate-500">
                    Gerencie os líderes da organização. Cada líder gerencia um ou mais colaboradores.
                  </p>
                  {!isAddingLider && (
                    <button
                      onClick={() => setIsAddingLider(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 text-white rounded-lg text-xs font-bold hover:bg-teal-600 transition cursor-pointer"
                    >
                      <PlusCircle size={14} />
                      Novo Líder
                    </button>
                  )}
                </div>

                {/* Form de adição */}
                {isAddingLider && (
                  <form onSubmit={handleAddLider} className="bg-teal-50 p-4 rounded-xl border border-teal-100 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nome</label>
                        <input
                          type="text"
                          value={newLiderNome}
                          onChange={(e) => setNewLiderNome(e.target.value)}
                          placeholder="Nome do líder"
                          className="w-full px-3 py-2 bg-white border border-teal-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">E-mail</label>
                        <input
                          type="email"
                          value={newLiderEmail}
                          onChange={(e) => setNewLiderEmail(e.target.value)}
                          placeholder="email@empresa.com"
                          className="w-full px-3 py-2 bg-white border border-teal-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-teal-500 text-white rounded-lg text-xs font-bold hover:bg-teal-600 transition cursor-pointer"
                      >
                        <Save size={14} className="inline mr-1" />
                        Salvar
                      </button>
                      <button
                        type="button"
                        onClick={() => { setIsAddingLider(false); setNewLiderNome(''); setNewLiderEmail(''); }}
                        className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-300 transition cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}

                {/* Lista de Líderes */}
                <div className="space-y-3">
                  {lideres.map(lider => {
                    const colsDoLider = getColaboradoresByLider(lider.id);
                    return (
                      <div key={lider.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4 hover:border-teal-200 transition">
                        {editingLider === lider.id ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <input
                                type="text"
                                value={editLiderNome}
                                onChange={(e) => setEditLiderNome(e.target.value)}
                                className="px-3 py-2 bg-white border border-teal-200 rounded-lg text-xs focus:outline-none"
                                autoFocus
                              />
                              <input
                                type="email"
                                value={editLiderEmail}
                                onChange={(e) => setEditLiderEmail(e.target.value)}
                                className="px-3 py-2 bg-white border border-teal-200 rounded-lg text-xs focus:outline-none"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={handleSaveEditLider}
                                className="px-4 py-1.5 bg-teal-500 text-white rounded-lg text-xs font-bold hover:bg-teal-600 transition cursor-pointer"
                              >
                                Salvar
                              </button>
                              <button
                                onClick={() => setEditingLider(null)}
                                className="px-3 py-1.5 bg-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-300 transition cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-indigo-100 border-2 border-indigo-200 flex items-center justify-center text-indigo-600 font-bold text-sm">
                                  {lider.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <h4 className="font-bold text-slate-800 text-sm">{lider.nome}</h4>
                                  <p className="text-xs text-slate-400">{lider.email || 'Sem e-mail'}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => { setEditingLider(lider.id); setEditLiderNome(lider.nome); setEditLiderEmail(lider.email); }}
                                className="p-1.5 text-slate-300 hover:text-teal-500 transition cursor-pointer"
                              >
                                <Edit2 size={14} />
                              </button>
                            </div>
                            
                            {/* Colaboradores do Líder */}
                            {colsDoLider.length > 0 ? (
                              <div className="bg-white rounded-lg p-3 border border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">
                                  <Users size={10} className="inline mr-1" />
                                  {colsDoLider.length} Colaborador(es) atribuído(s)
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {colsDoLider.map(col => (
                                    <span key={col.id} className="px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-semibold text-slate-600">
                                      {col.nome}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="bg-white rounded-lg p-3 border border-slate-100 text-center">
                                <p className="text-xs text-slate-400">Nenhum colaborador atribuído</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                  {lideres.length === 0 && (
                    <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-100">
                      <UserCircle size={40} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-sm text-slate-500 font-semibold">Nenhum líder cadastrado</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: EMPRESAS */}
            {adminTab === 'empresas' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-slate-500">
                    Gerencie as empresas do sistema. Cada empresa agrupa colaboradores e имеет свою структуру.
                  </p>
                  <button
                    onClick={() => onAddEmpresa && onAddEmpresa('Nova Empresa')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 text-white rounded-lg text-xs font-bold hover:bg-teal-600 transition cursor-pointer"
                  >
                    <PlusCircle size={14} />
                    Nova Empresa
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {empresas.map(empresa => (
                    <div key={empresa.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                          <Building2 size={18} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">{empresa.nome}</h4>
                          <p className="text-xs text-slate-400">
                            {colaboradores.filter(c => c.empresaId === empresa.id).length} colaboradores
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: TRILHA & MATRIZ */}
            {adminTab === 'trilha' && (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <p className="text-xs text-slate-500 max-w-xl">
                    Configure Competências, Capacidades, Escalas de Domínio e a Matriz de Requisitos por Cargo.
                    Cada setor pode ter sua própria estrutura — nada aqui é global ou fixo.
                  </p>
                  {/* Sub-abas */}
                  <div className="flex flex-wrap gap-1">
                    {(['competencias', 'escalas', 'matriz', 'catalogo'] as const).map((tab) => {
                      const labels: Record<string, string> = {
                        competencias: 'Competências & Capacidades',
                        escalas: 'Escalas de Domínio',
                        matriz: 'Matriz por Cargo',
                        catalogo: 'Catálogos'
                      };
                      return (
                        <button
                          key={tab}
                          onClick={() => setTrilhaSubTab(tab)}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                            trilhaSubTab === tab ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {labels[tab]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sub-aba: Competências & Capacidades */}
                {trilhaSubTab === 'competencias' && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700 flex items-start gap-2">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      <span>
                        <strong>Direção correta:</strong> uma Competência agrupa várias Capacidades (a Capacidade é quem pertence à Competência, não o contrário).
                        Cada item pode ter um Setor vinculado (exclusivo daquele setor) ou nenhum (compartilhado entre todos).
                      </span>
                    </div>

                    {/* Competências */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                          <Layers size={16} className="text-teal-600" />
                          Competências ({competencias.length})
                        </h4>
                        <button
                          onClick={() => {
                            const nome = prompt('Nome da nova Competência:');
                            if (!nome?.trim()) return;
                            const setorEscolhido = prompt('Setor vinculado (deixe em branco para compartilhada entre todos):');
                            const setor = setores.find(s => s.nome.toLowerCase() === (setorEscolhido || '').toLowerCase());
                            onSaveCompetencia?.({ id: `comp-${Date.now()}`, nome: nome.trim(), niveis: [], ativo: true, setorId: setor?.id });
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-teal-500 text-white rounded-lg text-xs font-bold hover:bg-teal-600 cursor-pointer"
                        >
                          <PlusCircle size={13} />
                          Nova Competência
                        </button>
                      </div>
                      <div className="space-y-2">
                        {competencias.map(comp => {
                          const capsDaComp = capacidades.filter(c => c.competenciaId === comp.id);
                          const setorComp = setores.find(s => s.id === comp.setorId);
                          return (
                            <div key={comp.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-slate-800 text-sm">{comp.nome}</span>
                                    {setorComp
                                      ? <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded">{setorComp.nome}</span>
                                      : <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Compartilhada</span>
                                    }
                                    {!comp.ativo && <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">Inativa</span>}
                                  </div>
                                  <p className="text-xs text-slate-400 mt-1">{capsDaComp.length} capacidade(s) vinculada(s)</p>
                                </div>
                                <button
                                  onClick={() => onSaveCompetencia?.({ ...comp, ativo: !comp.ativo })}
                                  className="text-[10px] font-bold text-slate-400 hover:text-teal-600 cursor-pointer"
                                >
                                  {comp.ativo ? 'Inativar' : 'Ativar'}
                                </button>
                              </div>

                              {/* Capacidades desta Competência */}
                              <div className="mt-3 space-y-1.5 pl-4 border-l-2 border-slate-200">
                                {capsDaComp.map(cap => (
                                  <div key={cap.id} className="flex items-center justify-between bg-white border border-slate-100 rounded-lg px-3 py-2">
                                    <div>
                                      <span className="text-xs font-semibold text-slate-700">{cap.nome}</span>
                                      {!cap.ativo && <span className="ml-2 text-[10px] text-rose-500">Inativa</span>}
                                    </div>
                                    <button
                                      onClick={() => onSaveCapacidade?.({ ...cap, ativo: !cap.ativo })}
                                      className="text-[10px] text-slate-400 hover:text-teal-600 cursor-pointer"
                                    >
                                      {cap.ativo ? 'Inativar' : 'Ativar'}
                                    </button>
                                  </div>
                                ))}
                                <button
                                  onClick={() => {
                                    const nome = prompt(`Nova Capacidade dentro de "${comp.nome}":`);
                                    if (!nome?.trim()) return;
                                    onSaveCapacidade?.({ id: `cap-${Date.now()}`, nome: nome.trim(), ativo: true, competenciaId: comp.id, setorId: comp.setorId });
                                  }}
                                  className="flex items-center gap-1 text-[11px] font-semibold text-teal-600 hover:text-teal-700 cursor-pointer mt-1"
                                >
                                  <PlusCircle size={12} /> Adicionar Capacidade
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        {competencias.length === 0 && (
                          <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
                            <Layers size={28} className="mx-auto text-slate-300 mb-2" />
                            <p className="text-xs text-slate-400">Nenhuma Competência cadastrada ainda. Cada setor pode ter as suas próprias.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-aba: Escalas de Domínio */}
                {trilhaSubTab === 'escalas' && (
                  <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700 flex items-start gap-2">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      <span>
                        Cada Escala de Domínio tem seus próprios graus, nomes e ordem — nenhum departamento é obrigado a usar a mesma escala.
                        Setor vinculado vazio = escala compartilhada entre todos os setores.
                      </span>
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          const nome = prompt('Nome da nova Escala (ex.: "Escala Suporte 2026"):');
                          if (!nome?.trim()) return;
                          const setorEscolhido = prompt('Setor vinculado (deixe em branco para compartilhada):');
                          const setor = setores.find(s => s.nome.toLowerCase() === (setorEscolhido || '').toLowerCase());
                          onSaveEscala?.({ id: `escala-${Date.now()}`, nome: nome.trim(), ativo: true, setorId: setor?.id });
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-teal-500 text-white rounded-lg text-xs font-bold hover:bg-teal-600 cursor-pointer"
                      >
                        <PlusCircle size={13} /> Nova Escala
                      </button>
                    </div>
                    <div className="space-y-3">
                      {escalas.map(escala => {
                        const grausDaEscala = graus.filter(g => g.escalaId === escala.id).sort((a, b) => a.ordem - b.ordem);
                        const setorEscala = setores.find(s => s.id === escala.setorId);
                        return (
                          <div key={escala.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-800 text-sm">{escala.nome}</span>
                                {setorEscala
                                  ? <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded">{setorEscala.nome}</span>
                                  : <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Compartilhada</span>
                                }
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {grausDaEscala.map((grau, idx) => (
                                <div key={grau.id} className="flex items-center gap-1.5 bg-white border border-slate-100 rounded-lg px-3 py-1.5">
                                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: grau.cor || '#94a3b8' }} />
                                  <span className="text-xs font-semibold text-slate-700">{grau.nome}</span>
                                  <span className="text-[10px] text-slate-400">({idx})</span>
                                  <button onClick={() => onDeleteGrau?.(grau.id)} className="text-slate-300 hover:text-rose-500 cursor-pointer ml-1"><X size={11} /></button>
                                </div>
                              ))}
                              <button
                                onClick={() => {
                                  const nome = prompt('Nome do novo grau (ex.: "Especialista"):');
                                  if (!nome?.trim()) return;
                                  const cor = prompt('Cor hex (ex.: #0d9488 — deixe em branco para padrão):') || '#94a3b8';
                                  onSaveGrau?.({ id: `grau-${Date.now()}`, escalaId: escala.id, ordem: grausDaEscala.length, nome: nome.trim(), cor, ativo: true });
                                }}
                                className="flex items-center gap-1 text-[11px] font-semibold text-teal-600 hover:text-teal-700 cursor-pointer bg-white border border-dashed border-teal-200 rounded-lg px-3 py-1.5"
                              >
                                <PlusCircle size={12} /> Adicionar Grau
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {escalas.length === 0 && (
                        <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
                          <Award size={28} className="mx-auto text-slate-300 mb-2" />
                          <p className="text-xs text-slate-400">Nenhuma Escala de Domínio cadastrada. Crie uma para cada setor ou uma compartilhada entre todos.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Sub-aba: Matriz por Cargo */}
                {trilhaSubTab === 'matriz' && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700 flex items-start gap-2">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      <span>
                        A Matriz define quais Capacidades (e em qual grau mínimo) cada Cargo precisa demonstrar.
                        Cada versão pertence a um Setor e nunca pode ser alterada depois que houver avaliações vinculadas — crie uma nova versão nesses casos.
                      </span>
                    </div>

                    {setores.map(setor => {
                      const versoesDoSetor = matrizVersoes.filter(v => v.setorId === setor.id);
                      const versaoAtiva = versoesDoSetor.find(v => v.ativa);
                      const cargosDoSetor = cargos.filter(c => c.setorId === setor.id);
                      const itensAtivos = versaoAtiva ? matrizCapacidades.filter(m => m.matrizVersaoId === versaoAtiva.id) : [];
                      const capsDoSetor = capacidades.filter(c => c.setorId === setor.id || !c.setorId);

                      return (
                        <div key={setor.id} className="border border-slate-100 rounded-2xl overflow-hidden">
                          <div className="bg-slate-50 px-4 py-3 flex items-center justify-between">
                            <div>
                              <h4 className="font-bold text-slate-800 text-sm">{setor.nome}</h4>
                              <p className="text-xs text-slate-400">
                                {versaoAtiva ? `Versão ativa: ${versaoAtiva.nome}` : 'Nenhuma versão ativa'}
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                const nome = prompt(`Nome da nova versão para ${setor.nome} (ex.: "2026.1"):`);
                                if (!nome?.trim()) return;
                                onSaveMatrizVersao?.({ id: `mv-${Date.now()}`, setorId: setor.id, nome: nome.trim(), vigenteDesde: new Date().toISOString().split('T')[0], ativa: true });
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 bg-teal-500 text-white rounded-lg text-xs font-bold hover:bg-teal-600 cursor-pointer"
                            >
                              <PlusCircle size={13} /> Nova Versão
                            </button>
                          </div>

                          {versaoAtiva && cargosDoSetor.length > 0 && capsDoSetor.length > 0 && (
                            <div className="p-4 overflow-x-auto"><div style={{ minWidth: 'max-content' }}>
                              <table className="text-xs border-collapse" style={{ borderSpacing: 0 }}>
                                <thead>
                                  <tr>
                                    <th className="text-left text-slate-500 font-bold py-2 px-3 bg-slate-50 border-r border-slate-100 whitespace-nowrap" style={{ minWidth: 180, position: 'sticky', left: 0, zIndex: 1 }}>Capacidade</th>
                                    {cargosDoSetor.map(cargo => (
                                      <th key={cargo.id} style={{ minWidth: 110, maxWidth: 150 }} className="text-center text-slate-500 font-bold pb-2 pt-2 px-2 bg-slate-50 align-bottom">
                                        <div style={{ fontSize: 10, lineHeight: 1.3, wordBreak: 'break-word', maxWidth: 140 }} title={cargo.nome}>{cargo.nome}</div>
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {capsDoSetor.map(cap => (
                                    <tr key={cap.id} className="border-t border-slate-50 hover:bg-slate-50">
                                      <td className="py-2 px-3 font-semibold text-slate-700 whitespace-nowrap text-xs bg-white border-r border-slate-100" style={{ position: 'sticky', left: 0, zIndex: 1 }}>{cap.nome}</td>
                                      {cargosDoSetor.map(cargo => {
                                        const item = itensAtivos.find(m => m.capacidadeId === cap.id && m.cargoId === cargo.id);
                                        const grauItem = item ? graus.find(g => g.id === item.grauMinimo) : null;
                                        return (
                                          <td key={cargo.id} className="text-center py-2 px-2 border-l border-slate-50" style={{ minWidth: 110, maxWidth: 150 }}>
                                            {item ? (
                                              <div className="flex flex-col items-center gap-0.5">
                                                <div className="flex items-center gap-1">
                                                  {grauItem && <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: grauItem.cor || '#94a3b8' }} />}
                                                  <span className="font-bold text-teal-700 text-[11px]">{grauItem?.nome || '—'}</span>
                                                </div>
                                                {item.obrigatorio && <span className="text-[9px] text-rose-500 font-bold">OBR</span>}
                                                <button
                                                  onClick={() => onDeleteMatrizCapacidadeCargo?.(item.id)}
                                                  className="text-slate-300 hover:text-rose-500 cursor-pointer mt-0.5"
                                                  title="Remover"
                                                >
                                                  <X size={10} />
                                                </button>
                                              </div>
                                            ) : (
                                              <button
                                                onClick={() => {
                                                  const escalasDisp = escalas.filter(e => !e.setorId || e.setorId === setor.id);
                                                  if (escalasDisp.length === 0) { alert('Nenhuma Escala de Domínio configurada para este setor. Vá em "Escalas de Domínio" e crie uma primeiro.'); return; }
                                                  const primeiraEscala = escalasDisp[0];
                                                  const primeiroGrau = graus.filter(g => g.escalaId === primeiraEscala.id).sort((a, b) => a.ordem - b.ordem)[0];
                                                  if (!primeiroGrau) { alert('A escala não tem graus configurados ainda. Vá em "Escalas de Domínio" e adicione os graus.'); return; }
                                                  setMatrizModalCapId(cap.id);
                                                  setMatrizModalCargoId(cargo.id);
                                                  setMatrizModalVersaoId(versaoAtiva.id);
                                                  setMatrizModalSetorId(setor.id);
                                                  setMatrizModalEscalaId(primeiraEscala.id);
                                                  setMatrizModalGrauId(primeiroGrau.id);
                                                  setMatrizModalObrigatorio(true);
                                                  setMatrizModalAberto(true);
                                                }}
                                                className="text-slate-300 hover:text-teal-500 cursor-pointer transition"
                                                title="Definir grau mínimo"
                                              >
                                                <PlusCircle size={15} />
                                              </button>
                                            )}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
</div>
                            </div>
                          )}

                          {!versaoAtiva && <div className="p-4 text-center text-xs text-slate-400">Crie uma versão de Matriz para este setor antes de configurar os requisitos por cargo.</div>}
                          {versaoAtiva && cargosDoSetor.length === 0 && <div className="p-4 text-center text-xs text-slate-400">Nenhum cargo vinculado a este setor ainda. Configure cargos na aba "Cargos".</div>}
                          {versaoAtiva && cargosDoSetor.length > 0 && capsDoSetor.length === 0 && <div className="p-4 text-center text-xs text-slate-400">Nenhuma capacidade cadastrada para este setor. Configure capacidades na aba "Competências &amp; Capacidades".</div>}
                        </div>
                      );
                    })}

                    {/* MODAL INLINE: Definir grau mínimo da célula da Matriz */}
                    {matrizModalAberto && (() => {
                      const escalasDisp2 = escalas.filter(e => !e.setorId || e.setorId === matrizModalSetorId);
                      const grausModal = graus.filter(g => g.escalaId === matrizModalEscalaId).sort((a, b) => a.ordem - b.ordem);
                      const capNome = capacidades.find(c => c.id === matrizModalCapId)?.nome || '';
                      const cargoNome = cargos.find(c => c.id === matrizModalCargoId)?.nome || '';
                      return (
                        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100 space-y-5">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-extrabold text-slate-900">Definir Grau Mínimo</h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  <span className="font-semibold text-slate-600">{capNome}</span>
                                  {' → '}
                                  <span className="font-semibold text-slate-600">{cargoNome}</span>
                                </p>
                              </div>
                              <button onClick={() => setMatrizModalAberto(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold text-2xl">&times;</button>
                            </div>

                            <div className="space-y-4">
                              {escalasDisp2.length > 1 && (
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Escala de Domínio</label>
                                  <select
                                    value={matrizModalEscalaId}
                                    onChange={e => {
                                      const nova = e.target.value;
                                      setMatrizModalEscalaId(nova);
                                      const primeiro = graus.filter(g => g.escalaId === nova).sort((a, b) => a.ordem - b.ordem)[0];
                                      if (primeiro) setMatrizModalGrauId(primeiro.id);
                                    }}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                                  >
                                    {escalasDisp2.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                                  </select>
                                </div>
                              )}

                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Grau Mínimo Exigido</label>
                                <div className="grid grid-cols-2 gap-2">
                                  {grausModal.map(grau => (
                                    <button
                                      key={grau.id}
                                      type="button"
                                      onClick={() => setMatrizModalGrauId(grau.id)}
                                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                                        matrizModalGrauId === grau.id
                                          ? 'border-teal-500 bg-teal-50 text-teal-700 ring-1 ring-teal-300'
                                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                      }`}
                                    >
                                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: grau.cor || '#94a3b8' }} />
                                      {grau.nome}
                                    </button>
                                  ))}
                                </div>
                                {grausModal.length === 0 && <p className="text-xs text-amber-600 mt-1">Esta escala não tem graus configurados.</p>}
                              </div>

                              <div className="flex items-start gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                                <input
                                  type="checkbox"
                                  id="mmc-obr"
                                  checked={matrizModalObrigatorio}
                                  onChange={e => setMatrizModalObrigatorio(e.target.checked)}
                                  className="w-4 h-4 text-teal-600 border-slate-300 rounded cursor-pointer mt-0.5"
                                />
                                <label htmlFor="mmc-obr" className="text-xs font-semibold text-slate-700 cursor-pointer">
                                  Capacidade <strong>obrigatória</strong> para o cargo
                                  <span className="block font-normal text-slate-400 mt-0.5">Obrigatórias impactam o índice de Prontidão (🟢🟡🔴).</span>
                                </label>
                              </div>
                            </div>

                            <div className="flex gap-3 pt-1 border-t border-slate-100">
                              <button type="button" onClick={() => setMatrizModalAberto(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 bg-slate-50 rounded-xl text-sm font-semibold hover:bg-slate-100 cursor-pointer">Cancelar</button>
                              <button
                                type="button"
                                disabled={!matrizModalGrauId || matrizModalSalvando}
                                onClick={async () => {
                                  if (!matrizModalGrauId) return;
                                  setMatrizModalSalvando(true);
                                  try {
                                    await onSaveMatrizCapacidadeCargo?.({ id: `mc-${Date.now()}`, matrizVersaoId: matrizModalVersaoId, cargoId: matrizModalCargoId, capacidadeId: matrizModalCapId, escalaId: matrizModalEscalaId, grauMinimo: matrizModalGrauId, obrigatorio: matrizModalObrigatorio });
                                    setMatrizModalAberto(false);
                                  } finally {
                                    setMatrizModalSalvando(false);
                                  }
                                }}
                                className="flex-1 px-4 py-2.5 bg-teal-500 text-slate-950 font-bold rounded-xl text-sm hover:bg-teal-400 cursor-pointer disabled:opacity-50"
                              >
                                {matrizModalSalvando ? 'Salvando...' : 'Salvar'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Sub-aba: Catálogos */}
                {trilhaSubTab === 'catalogo' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Tipos de Evidência */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-700">Tipos de Evidência de Capacidade</h4>
                        <button
                          onClick={() => {
                            const nome = prompt('Nome do novo tipo (ex.: "Situação real observada"):');
                            if (!nome?.trim()) return;
                            const ehTreinamento = confirm('Este tipo conta como TREINAMENTO (exposição à teoria) e não como demonstração prática?\n\nOK = apenas treinamento (não evolui grau)\nCancelar = demonstração prática (pode evoluir grau)');
                            const setorEscolhido = prompt('Setor vinculado (vazio = compartilhado):');
                            const setor = setores.find(s => s.nome.toLowerCase() === (setorEscolhido || '').toLowerCase());
                            onSaveTipoEvidencia?.({ id: `te-${Date.now()}`, nome: nome.trim(), ativo: true, setorId: setor?.id, contaComoTreinamento: ehTreinamento });
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-teal-500 text-white rounded-lg text-xs font-bold hover:bg-teal-600 cursor-pointer"
                        >
                          <PlusCircle size={12} />
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        <strong>Conta como treinamento:</strong> ao validar, só marca "Treinado" — nunca evolui grau.<br/>
                        <strong>Demonstração prática:</strong> ao validar, pode evoluir o grau de domínio da capacidade.
                      </p>
                      <div className="space-y-1.5">
                        {tiposEvidencia.map(te => (
                          <div key={te.id} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                            <div>
                              <span className="text-xs font-semibold text-slate-700">{te.nome}</span>
                              <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${te.contaComoTreinamento ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                {te.contaComoTreinamento ? 'Treinamento' : 'Demonstração'}
                              </span>
                              {te.setorId && <span className="ml-1 text-[10px] text-slate-400">{setores.find(s => s.id === te.setorId)?.nome}</span>}
                            </div>
                            <button onClick={() => onSaveTipoEvidencia?.({ ...te, ativo: !te.ativo })} className="text-[10px] text-slate-400 hover:text-rose-500 cursor-pointer">
                              {te.ativo ? 'Inativar' : 'Ativar'}
                            </button>
                          </div>
                        ))}
                        {tiposEvidencia.length === 0 && <p className="text-xs text-slate-400 text-center py-4 border-2 border-dashed border-slate-200 rounded-xl">Nenhum tipo cadastrado.</p>}
                      </div>
                    </div>

                    {/* Gravidades de Ocorrência */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-700">Gravidades de Ocorrência</h4>
                        <button
                          onClick={() => {
                            const nome = prompt('Nome da nova gravidade (ex.: "Alta"):');
                            if (!nome?.trim()) return;
                            const cor = prompt('Cor hex (ex.: #ef4444):') || '#94a3b8';
                            const setorEscolhido = prompt('Setor vinculado (vazio = compartilhada):');
                            const setor = setores.find(s => s.nome.toLowerCase() === (setorEscolhido || '').toLowerCase());
                            onSaveGravidadeOcorrencia?.({ id: `grav-${Date.now()}`, nome: nome.trim(), cor, ordem: gravidadesOcorrencia.length, ativo: true, setorId: setor?.id });
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-teal-500 text-white rounded-lg text-xs font-bold hover:bg-teal-600 cursor-pointer"
                        >
                          <PlusCircle size={12} />
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {gravidadesOcorrencia.sort((a, b) => a.ordem - b.ordem).map(grav => (
                          <div key={grav.id} className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: grav.cor || '#94a3b8' }} />
                            <span className="text-xs font-semibold text-slate-700 flex-1">{grav.nome}</span>
                            {grav.setorId && <span className="text-[10px] text-slate-400">{setores.find(s => s.id === grav.setorId)?.nome}</span>}
                          </div>
                        ))}
                        {gravidadesOcorrencia.length === 0 && <p className="text-xs text-slate-400 text-center py-4 border-2 border-dashed border-slate-200 rounded-xl">Nenhuma gravidade cadastrada.</p>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
