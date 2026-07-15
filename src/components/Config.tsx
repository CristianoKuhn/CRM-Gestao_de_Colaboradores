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
  Usuario 
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
  ClipboardList
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
}: ConfigProps) {
  const [webAppUrl, setWebAppUrl] = useState(googleConfig.webAppUrl || '');
  const [newOnboardingSetor, setNewOnboardingSetor] = useState(setores[0]?.id || '');
  const [newOnboardingTitulo, setNewOnboardingTitulo] = useState('');
  const [newOnboardingDesc, setNewOnboardingDesc] = useState('');

  const canManageOnboarding = currentUser.perfil === 'Administrador' || 
                             currentUser.perfil === 'Coordenador' || 
                             currentUser.perfil === 'Supervisor';
  const [driveFolderId, setDriveFolderId] = useState(googleConfig.driveFolderId || '');
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

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
      // Faz uma requisição de teste para o endpoint de proxy do backend
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
      // Salva automaticamente se o teste for bem-sucedido
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
    if (!newOnboardingTitulo) return;
    onAddOnboardingItem({
      id: `onb-${Date.now()}`,
      setorId: newOnboardingSetor,
      titulo: newOnboardingTitulo,
      descricao: newOnboardingDesc,
    });
    setNewOnboardingTitulo('');
    setNewOnboardingDesc('');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6 animate-fade-in">
      {/* Header Panel */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Conexão com Banco de Dados</h1>
          <p className="text-sm text-slate-500 mt-1">
            Esta aplicação está configurada para persistência direta em nuvem corporativa via Google Sheets e Google Drive.
          </p>
        </div>
        <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
          <FileSpreadsheet size={24} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Connection Form */}
        <div className="md:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
            <Settings2 size={18} className="text-emerald-600" />
            <h2 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Parâmetros do Google Sheets</h2>
          </div>

          <form onSubmit={handleSaveGoogle} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <FileSpreadsheet size={12} /> URL do Web App Apps Script
              </label>
              <input
                type="url"
                value={webAppUrl}
                onChange={(e) => setWebAppUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                required
              />
              <p className="text-[10px] text-slate-400 mt-1">
                A URL gerada ao implantar o script como App da Web na sua planilha do Google Sheets.
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Key size={12} /> Drive Folder ID (Opcional - para Anexos)
              </label>
              <input
                type="text"
                value={driveFolderId}
                onChange={(e) => setDriveFolderId(e.target.value)}
                placeholder="Ex: 1aBcD...eFgHiJ"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                O identificador de pasta do Google Drive usado para armazenar anexos de advertências ou reconhecimentos.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="flex-1 py-3 border border-slate-200 hover:border-emerald-500 text-slate-700 hover:text-emerald-600 font-extrabold rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isTesting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Testando...
                  </>
                ) : (
                  <>
                    <Server size={14} />
                    Testar Conexão
                  </>
                )}
              </button>

              <button
                type="submit"
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle size={14} />
                Salvar Configurações
              </button>
            </div>
          </form>

          {/* Status Display */}
          {testStatus === 'success' && (
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-start gap-3 mt-4 animate-scale-up">
              <CheckCircle size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-emerald-800">Conexão Efetuada com Sucesso!</p>
                <p className="text-[10px] text-emerald-600 mt-1">
                  A comunicação de teste com o Google Sheets foi validada. O aplicativo já está operando com persistência em tempo real.
                </p>
              </div>
            </div>
          )}

          {testStatus === 'error' && (
            <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-start gap-3 mt-4 animate-scale-up">
              <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-rose-800">Falha na Conexão</p>
                <p className="text-[10px] text-rose-600 mt-1">{errorMessage}</p>
              </div>
            </div>
          )}
        </div>

        {/* Integration Details Panel */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-3 text-emerald-600">
            <FileSpreadsheet size={18} />
            <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Status do Conector</h3>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-2xl space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Motor de Persistência:</span>
                <span className="font-bold text-slate-800">Google Sheets API</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Modo de Operação:</span>
                <span className="font-bold text-slate-800">Direto (Sem Cache Local)</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Estado do Proxy:</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle size={12} /> Ativo (Full-Stack)
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-500 leading-relaxed space-y-2">
              <p>
                <strong>Segurança Backend:</strong> Todas as requisições para a planilha do Google Sheets são roteadas de forma segura através do proxy local da aplicação.
              </p>
              <p>
                Sua chave de conexão e URL do Apps Script nunca são expostas ao navegador do usuário final, permanecendo seguras do lado do servidor.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Onboarding Parametrization Panel (Only for Supervisors/Admins) */}
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
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Setor Alvo</label>
                <select
                  value={newOnboardingSetor}
                  onChange={(e) => setNewOnboardingSetor(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
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
                {setores.map(setor => {
                  const itemsSetor = onboardingItems.filter(i => i.setorId === setor.id);
                  if (itemsSetor.length === 0) return null;
                  return (
                    <div key={setor.id} className="space-y-2">
                      <div className="text-[10px] font-extrabold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md inline-block uppercase tracking-wider">
                        {setor.nome}
                      </div>
                      <div className="space-y-1.5">
                        {itemsSetor.map(item => (
                          <div key={item.id} className="flex items-center justify-between p-2.5 bg-white border border-slate-100 rounded-xl hover:border-slate-200 transition-all group">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">{item.titulo}</p>
                              <p className="text-[10px] text-slate-400 line-clamp-1">{item.descricao}</p>
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
                      </div>
                    </div>
                  );
                })}
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
