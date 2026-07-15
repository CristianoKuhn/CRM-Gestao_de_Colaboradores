/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  SupabaseConfig, 
  GoogleScriptConfig, 
  DataSourceProvider, 
  Setor, 
  OnboardingItem,
  Usuario,
  Empresa,
  Cargo,
  Lider,
  Colaborador,
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
  ClipboardList,
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
} from 'lucide-react';

interface ConfigProps {
  config: SupabaseConfig;
  onSaveConfig: (config: SupabaseConfig) => void;
  googleConfig: GoogleScriptConfig;
  onSaveGoogleConfig: (config: GoogleScriptConfig) => void;
  activeProvider: DataSourceProvider;
  onChangeProvider: (provider: DataSourceProvider) => void;
  setores: Setor[];
  onboardingItems: OnboardingItem[];
  onAddOnboardingItem: (item: OnboardingItem) => void;
  onDeleteOnboardingItem: (id: string) => void;
  currentUser: Usuario;
  // Novos props para o Dashboard Admin
  empresas?: Empresa[];
  cargos?: Cargo[];
  lideres?: Lider[];
  colaboradores?: Colaborador[];
  onAddEmpresa?: (nome: string) => void;
  onAddSetor?: (nome: string) => void;
  onAddCargo?: (nome: string) => void;
  onAddLider?: (lider: Lider) => void;
  onUpdateSetor?: (setor: Setor) => void;
  onUpdateCargo?: (cargo: Cargo) => void;
  onUpdateLider?: (lider: Lider) => void;
}

export default function Config({
  config,
  onSaveConfig,
  googleConfig,
  onSaveGoogleConfig,
  activeProvider,
  onChangeProvider,
  setores,
  onboardingItems,
  onAddOnboardingItem,
  onDeleteOnboardingItem,
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
}: ConfigProps) {
  const [webAppUrl, setWebAppUrl] = useState(googleConfig.webAppUrl || '');
  const [newOnboardingSetores, setNewOnboardingSetores] = useState<string[]>([]);
  const [newOnboardingTitulo, setNewOnboardingTitulo] = useState('');
  const [newOnboardingDesc, setNewOnboardingDesc] = useState('');

  const canManageOnboarding = currentUser.perfil === 'Administrador' || 
                             currentUser.perfil === 'Coordenador' || 
                             currentUser.perfil === 'Supervisor';

  // Perfil que pode ver o Dashboard Admin
  const canViewAdminDashboard = currentUser.perfil === 'Administrador' || 
                                currentUser.perfil === 'Coordenador';

  const [driveFolderId, setDriveFolderId] = useState(googleConfig.driveFolderId || '');
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Estado para Dashboard Admin
  const [adminTab, setAdminTab] = useState<'empresas' | 'setores' | 'cargos' | 'lideres'>('setores');
  const [isAddingSetor, setIsAddingSetor] = useState(false);
  const [isAddingCargo, setIsAddingCargo] = useState(false);
  const [isAddingLider, setIsAddingLider] = useState(false);
  const [editingSetor, setEditingSetor] = useState<string | null>(null);
  const [editingCargo, setEditingCargo] = useState<string | null>(null);
  const [editingLider, setEditingLider] = useState<string | null>(null);
  const [newSetorNome, setNewSetorNome] = useState('');
  const [newCargoNome, setNewCargoNome] = useState('');
  const [newLiderNome, setNewLiderNome] = useState('');
  const [newLiderEmail, setNewLiderEmail] = useState('');
  const [editSetorNome, setEditSetorNome] = useState('');
  const [editCargoNome, setEditCargoNome] = useState('');
  const [editLiderNome, setEditLiderNome] = useState('');
  const [editLiderEmail, setEditLiderEmail] = useState('');

  const handleSaveGoogle = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveGoogleConfig({
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

  const handleAddOnboarding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOnboardingTitulo || newOnboardingSetores.length === 0) return;

    onAddOnboardingItem({
      id: `onb-${Date.now()}`,
      setorIds: newOnboardingSetores,
      titulo: newOnboardingTitulo,
      descricao: newOnboardingDesc,
    });
    setNewOnboardingTitulo('');
    setNewOnboardingDesc('');
    setNewOnboardingSetores([]);
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
    if (!newCargoNome.trim() || !onAddCargo) return;
    onAddCargo(newCargoNome.trim());
    setNewCargoNome('');
    setIsAddingCargo(false);
  };

  const handleSaveEditCargo = () => {
    if (!editingCargo || !editCargoNome.trim() || !onUpdateCargo) return;
    const cargo = cargos.find(c => c.id === editingCargo);
    if (cargo) {
      onUpdateCargo({ ...cargo, nome: editCargoNome.trim() });
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
                    Gerencie os cargos da organização. Cada cargo define a função do colaborador.
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

                {/* Form de adição */}
                {isAddingCargo && (
                  <form onSubmit={handleAddCargo} className="flex gap-2 bg-teal-50 p-4 rounded-xl border border-teal-100">
                    <input
                      type="text"
                      value={newCargoNome}
                      onChange={(e) => setNewCargoNome(e.target.value)}
                      placeholder="Nome do novo cargo"
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
                      onClick={() => { setIsAddingCargo(false); setNewCargoNome(''); }}
                      className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-300 transition cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </form>
                )}

                {/* Lista de Cargos */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {cargos.map(cargo => (
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
                              <p className="text-xs text-slate-400 mt-0.5">
                                {colaboradores.filter(c => c.cargoId === cargo.id).length} colaboradores
                              </p>
                            </div>
                            <button
                              onClick={() => { setEditingCargo(cargo.id); setEditCargoNome(cargo.nome); }}
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
          </div>
        </div>
      )}

      {/* Seção de Onboarding - Mantida */}
      {canManageOnboarding && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
            <ClipboardList size={18} className="text-teal-600" />
            <h2 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Parametrização de Onboarding</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Form to add new item */}
            <form onSubmit={handleAddOnboarding} className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-xs font-bold text-slate-700 uppercase">Novo Item de Check-in</h3>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Setores Alvo (Selecione um ou mais)</label>
                <div className="flex flex-wrap gap-1.5 p-2.5 bg-white border border-slate-200 rounded-xl max-h-32 overflow-y-auto">
                  {setores.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setNewOnboardingSetores(prev => 
                          prev.includes(s.id) 
                            ? prev.filter(id => id !== s.id) 
                            : [...prev, s.id]
                        );
                      }}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                        newOnboardingSetores.includes(s.id)
                          ? 'bg-teal-500 text-white border-teal-500'
                          : 'bg-slate-50 text-slate-500 border-slate-100 hover:border-teal-300'
                      }`}
                    >
                      {s.nome}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Título da Ação</label>
                <input
                  type="text"
                  value={newOnboardingTitulo}
                  onChange={(e) => setNewOnboardingTitulo(e.target.value)}
                  placeholder="Ex: Entrega de Equipamentos"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Descrição / Instrução</label>
                <textarea
                  value={newOnboardingDesc}
                  onChange={(e) => setNewOnboardingDesc(e.target.value)}
                  placeholder="Ex: Entregar notebook, mouse e configurar e-mail corporativo."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 h-20 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-extrabold rounded-xl text-xs shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <PlusCircle size={14} />
                Adicionar ao Setor
              </button>
            </form>

            {/* List of current items by sector */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase">Itens Cadastrados</h3>
              <div className="max-h-[350px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {onboardingItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-2.5 bg-white border border-slate-100 rounded-xl hover:border-slate-200 transition-all group">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{item.titulo}</p>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {item.setorIds.map(sid => (
                          <span key={sid} className="px-1 py-0.5 bg-slate-50 text-slate-400 rounded text-[8px] font-bold">
                            {setores.find(s => s.id === sid)?.nome || sid}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => onDeleteOnboardingItem(item.id)}
                      className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors cursor-pointer"
                      title="Remover Item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {onboardingItems.length === 0 && (
                  <div className="text-center py-10 text-slate-400">
                    <p className="text-xs">Nenhum item de onboarding configurado ainda.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
