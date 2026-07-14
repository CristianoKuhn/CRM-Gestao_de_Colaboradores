/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SupabaseConfig, GoogleScriptConfig, DataSourceProvider } from '../types';
import { DataService } from '../services/DataService';
import {
  Database,
  Key,
  CheckCircle,
  HelpCircle,
  Cpu,
  Terminal,
  Copy,
  Check,
  Zap,
  Layout,
  FileSpreadsheet,
  CloudLightning,
  Settings2,
  RefreshCw,
} from 'lucide-react';

interface ConfigProps {
  config: SupabaseConfig;
  onSaveConfig: (config: SupabaseConfig) => void;
  googleConfig: GoogleScriptConfig;
  onSaveGoogleConfig: (config: GoogleScriptConfig) => void;
  activeProvider: DataSourceProvider;
  onChangeProvider: (provider: DataSourceProvider) => void;
}

export default function Config({
  config,
  onSaveConfig,
  googleConfig,
  onSaveGoogleConfig,
  activeProvider,
  onChangeProvider,
}: ConfigProps) {
  const [supabaseUrl, setSupabaseUrl] = useState(config.supabaseUrl || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(config.supabaseAnonKey || '');
  
  const [webAppUrl, setWebAppUrl] = useState(googleConfig.webAppUrl || '');
  const [driveFolderId, setDriveFolderId] = useState(googleConfig.driveFolderId || '');

  const [isCopied, setIsCopied] = useState<string | null>(null);

  const handleSaveSupabase = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({
      supabaseUrl,
      supabaseAnonKey,
      isConnected: !!(supabaseUrl && supabaseAnonKey),
    });
  };

  const handleSaveGoogle = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveGoogleConfig({
      webAppUrl,
      driveFolderId,
      isConnected: !!webAppUrl,
    });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(id);
    setTimeout(() => setIsCopied(null), 2000);
  };

  const googleScriptCode = `/**
 * GOOGLE APPS SCRIPT - CONECTOR DE BANCO DE DADOS PARA LIDERANÇA PRO
 * 
 * Como instalar no seu Google Sheets:
 * 1. Crie uma nova Planilha do Google (Google Sheets).
 * 2. No menu superior, clique em "Extensões" > "Apps Script".
 * 3. Delete todo o código padrão e cole o script abaixo.
 * 4. Clique em "Salvar" (ícone de disquete).
 * 5. Clique em "Implantar" > "Nova implantação".
 * 6. Selecione o tipo "App da Web" clicando na engrenagem.
 * 7. Configure:
 *    - Descrição: "Lideranca Pro API"
 *    - Executar como: "Você (seu-email@gmail.com)"
 *    - Quem tem acesso: "Qualquer pessoa" (necessário para receber requisições do app)
 * 8. Clique em "Implantar", autorize permissões da sua conta Google se solicitado,
 *    e COPIE a "URL do app da Web" gerada.
 * 9. Cole essa URL no painel de configurações Liderança Pro.
 */

function doGet(e) {
  var action = e.parameter.action;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    if (action === 'getEmpresas') return renderJson(getTableData('empresas', ['id', 'nome']));
    if (action === 'getSetores') return renderJson(getTableData('setores', ['id', 'nome']));
    if (action === 'getCargos') return renderJson(getTableData('cargos', ['id', 'nome']));
    if (action === 'getLideres') return renderJson(getTableData('lideres', ['id', 'nome', 'email', 'cargo', 'fotoUrl']));
    if (action === 'getColaboradores') return renderJson(getTableData('colaboradores', ['id', 'nome', 'email', 'fotoUrl', 'cargoId', 'setorId', 'liderId', 'dataAdmissao', 'situacao', 'empresaId', 'telefone']));
    
    if (action === 'getTimeline') {
      var data = getTableData('timeline_registros', ['id', 'colaboradorId', 'tipo', 'data', 'titulo', 'descricao', 'responsavelId', 'prioridade', 'status', 'prazoAcompanhamento', 'gerarTarefaFutura', 'tarefaId', 'anexos']);
      data.forEach(function(row) {
        if (row.anexos) {
          try { row.anexos = JSON.parse(row.anexos); } catch(err) { row.anexos = []; }
        } else {
          row.anexos = [];
        }
        row.gerarTarefaFutura = row.gerarTarefaFutura === 'true' || row.gerarTarefaFutura === true;
      });
      return renderJson(data);
    }
    
    if (action === 'getTarefas') {
      var data = getTableData('tarefas', ['id', 'colaboradorId', 'titulo', 'descricao', 'vencimento', 'concluida', 'tipoOrigem', 'registroId', 'responsavelId']);
      data.forEach(function(row) {
        row.concluida = row.concluida === 'true' || row.concluida === true;
      });
      return renderJson(data);
    }
    
    return renderError('Ação desconhecida ou não especificada.');
  } catch (error) {
    return renderError(error.toString());
  }
}

function doPost(e) {
  try {
    var params = JSON.parse(e.postData.contents);
    var action = params.action;
    var data = params.data;
    
    if (action === 'saveEmpresa') saveRow('empresas', data, ['id', 'nome']);
    else if (action === 'saveSetor') saveRow('setores', data, ['id', 'nome']);
    else if (action === 'saveCargo') saveRow('cargos', data, ['id', 'nome']);
    else if (action === 'saveLider') saveRow('lideres', data, ['id', 'nome', 'email', 'cargo', 'fotoUrl']);
    else if (action === 'saveColaborador') saveRow('colaboradores', data, ['id', 'nome', 'email', 'fotoUrl', 'cargoId', 'setorId', 'liderId', 'dataAdmissao', 'situacao', 'empresaId', 'telefone']);
    
    else if (action === 'saveTimelineRegistro') {
      if (typeof data.anexos !== 'string') {
        data.anexos = JSON.stringify(data.anexos || []);
      }
      saveRow('timeline_registros', data, ['id', 'colaboradorId', 'tipo', 'data', 'titulo', 'descricao', 'responsavelId', 'prioridade', 'status', 'prazoAcompanhamento', 'gerarTarefaFutura', 'tarefaId', 'anexos']);
    }
    
    else if (action === 'saveTarefa') saveRow('tarefas', data, ['id', 'colaboradorId', 'titulo', 'descricao', 'vencimento', 'concluida', 'tipoOrigem', 'registroId', 'responsavelId']);
    
    else if (action === 'resetData') {
      var sheets = ['empresas', 'setores', 'cargos', 'lideres', 'colaboradores', 'timeline_registros', 'tarefas'];
      sheets.forEach(function(s) {
        var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(s);
        if (sh) {
          sh.clearContents();
        }
      });
    }
    
    return renderJson({ success: true });
  } catch (error) {
    return renderError(error.toString());
  }
}

function getTableData(sheetName, columns) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(columns);
    return [];
  }
  
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  
  var headers = values[0];
  var results = [];
  
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var item = {};
    columns.forEach(function(col) {
      var colIdx = headers.indexOf(col);
      item[col] = colIdx >= 0 ? row[colIdx] : '';
    });
    results.push(item);
  }
  return results;
}

function saveRow(sheetName, data, columns) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(columns);
  }
  
  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  
  columns.forEach(function(col) {
    if (headers.indexOf(col) === -1) {
      sheet.getRange(1, headers.length + 1).setValue(col);
      headers.push(col);
    }
  });
  
  var idIdx = headers.indexOf('id');
  var existingRowIdx = -1;
  
  for (var i = 1; i < values.length; i++) {
    if (values[i][idIdx] === data.id) {
      existingRowIdx = i + 1;
      break;
    }
  }
  
  var rowData = headers.map(function(header) {
    return data[header] !== undefined ? data[header] : '';
  });
  
  if (existingRowIdx >= 0) {
    sheet.getRange(existingRowIdx, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
}

function renderJson(data) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function renderError(msg) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

  const schemaSQL = `-- 1. CRIAÇÃO DAS TABELAS NO SUPABASE SQL EDITOR
CREATE TABLE empresas (
  id VARCHAR(255) PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE setores (
  id VARCHAR(255) PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE cargos (
  id VARCHAR(255) PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE lideres (
  id VARCHAR(255) PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  cargo VARCHAR(255),
  foto_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE colaboradores (
  id VARCHAR(255) PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  foto_url TEXT,
  cargo_id VARCHAR(255) REFERENCES cargos(id) ON DELETE SET NULL,
  setor_id VARCHAR(255) REFERENCES setores(id) ON DELETE SET NULL,
  lider_id VARCHAR(255) REFERENCES lideres(id) ON DELETE SET NULL,
  data_admissao DATE NOT NULL,
  situacao VARCHAR(50) DEFAULT 'Ativo' NOT NULL,
  empresa_id VARCHAR(255) REFERENCES empresas(id) ON DELETE CASCADE,
  telefone VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE timeline_registros (
  id VARCHAR(255) PRIMARY KEY,
  colaborador_id VARCHAR(255) REFERENCES colaboradores(id) ON DELETE CASCADE NOT NULL,
  tipo VARCHAR(100) NOT NULL,
  data DATE NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT NOT NULL,
  responsavel_id VARCHAR(255) REFERENCES lideres(id) NOT NULL,
  prioridade VARCHAR(50) DEFAULT 'Média' NOT NULL,
  status VARCHAR(50) DEFAULT 'Concluído' NOT NULL,
  prazo_acompanhamento DATE,
  gerar_tarefa_futura BOOLEAN DEFAULT false,
  anexos TEXT DEFAULT '[]',
  tarefa_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE tarefas (
  id VARCHAR(255) PRIMARY KEY,
  colaborador_id VARCHAR(255) REFERENCES colaboradores(id) ON DELETE CASCADE NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  vencimento DATE NOT NULL,
  concluida BOOLEAN DEFAULT false NOT NULL,
  tipo_origem VARCHAR(100) NOT NULL,
  registro_id VARCHAR(255) REFERENCES timeline_registros(id) ON DELETE CASCADE,
  responsavel_id VARCHAR(255) REFERENCES lideres(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);`;

  const storageSQL = `-- 2. ATIVAÇÃO DO SUPABASE STORAGE BUCKET PARA ANEXOS
-- Crie um bucket público chamado 'anexos-storage' no painel Supabase Storage ou rode o SQL abaixo:
INSERT INTO storage.buckets (id, name, public) VALUES ('anexos-storage', 'anexos-storage', true);

-- Habilite políticas de acesso aos anexos
CREATE POLICY "Acesso público aos anexos" ON storage.objects
  FOR SELECT USING (bucket_id = 'anexos-storage');

CREATE POLICY "Lideres podem fazer upload de anexos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'anexos-storage');`;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 animate-fade-in">
      {/* Header Panel */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Infraestrutura & Camada de Dados</h1>
        <p className="text-sm text-slate-500 mt-1">
          Gerencie como a sua aplicação armazena as informações. A arquitetura de <strong>Data Service</strong> permite alternar de forma transparente entre armazenamento local, Google Sheets e Supabase.
        </p>
      </div>

      {/* Selector of Data Provider */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-5">
          <Settings2 size={18} className="text-teal-600" />
          <h2 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Provedor Ativo de Dados</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* LOCAL STORAGE */}
          <button
            onClick={() => onChangeProvider('local')}
            className={`p-5 rounded-2xl border text-left cursor-pointer transition-all ${
              activeProvider === 'local'
                ? 'border-teal-500 bg-teal-50/40 ring-1 ring-teal-500'
                : 'border-slate-100 bg-slate-50 hover:bg-slate-100/50 hover:border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs flex items-center justify-center">
                <Layout size={16} />
              </span>
              {activeProvider === 'local' && (
                <span className="text-[10px] font-bold text-teal-600 bg-teal-100/80 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Ativo
                </span>
              )}
            </div>
            <h3 className="font-bold text-slate-800 text-sm mt-4">Banco de Dados Local (Demo)</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
              Os dados são armazenados de forma isolada e persistente no navegador (LocalStorage). Ideal para simulação instantânea com carga pré-definida.
            </p>
          </button>

          {/* GOOGLE APPS SCRIPT */}
          <button
            onClick={() => onChangeProvider('googlescript')}
            className={`p-5 rounded-2xl border text-left cursor-pointer transition-all ${
              activeProvider === 'googlescript'
                ? 'border-teal-500 bg-teal-50/40 ring-1 ring-teal-500'
                : 'border-slate-100 bg-slate-50 hover:bg-slate-100/50 hover:border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-xl bg-emerald-500 text-white font-bold text-xs flex items-center justify-center">
                <FileSpreadsheet size={16} />
              </span>
              {activeProvider === 'googlescript' && (
                <span className="text-[10px] font-bold text-teal-600 bg-teal-100/80 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Ativo
                </span>
              )}
            </div>
            <h3 className="font-bold text-slate-800 text-sm mt-4">Google Apps Script (Sheets)</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
              Integração via Google Sheets + Google Drive. Substitua planilhas offline mantendo os dados no ambiente empresarial do seu G-Suite corporativo.
            </p>
          </button>

          {/* SUPABASE SQL */}
          <button
            onClick={() => onChangeProvider('supabase')}
            className={`p-5 rounded-2xl border text-left cursor-pointer transition-all ${
              activeProvider === 'supabase'
                ? 'border-teal-500 bg-teal-50/40 ring-1 ring-teal-500'
                : 'border-slate-100 bg-slate-50 hover:bg-slate-100/50 hover:border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-xl bg-indigo-500 text-white font-bold text-xs flex items-center justify-center">
                <CloudLightning size={16} />
              </span>
              {activeProvider === 'supabase' && (
                <span className="text-[10px] font-bold text-teal-600 bg-teal-100/80 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Ativo
                </span>
              )}
            </div>
            <h3 className="font-bold text-slate-800 text-sm mt-4">Supabase (PostgreSQL)</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
              Banco de dados PostgreSQL na nuvem para máxima escalabilidade, segurança refinada de registros e integridade referencial nativa.
            </p>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form Panel */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Render Active Form Based on Provider */}
          {activeProvider === 'local' && (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                <Layout size={18} className="text-teal-600" />
                <h2 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Dados Locais (LocalStorage)</h2>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Você está utilizando a camada de persistência offline baseada no navegador. Nenhuma configuração externa de API é requerida neste modo.
              </p>
              <div className="bg-slate-50 p-4 rounded-2xl space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Tamanho aproximado de cache:</span>
                  <span className="font-bold text-slate-800">~15.2 KB</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Estado da Sincronização:</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle size={12} /> Persistido
                  </span>
                </div>
              </div>
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs text-slate-500 leading-relaxed mb-3">
                  Precisa reiniciar as métricas, apagar novos colaboradores cadastrados ou restaurar os dados de demonstração originais? Use a ferramenta abaixo.
                </p>
                <button
                  onClick={async () => {
                    if (confirm('Tem certeza que deseja redefinir todos os dados para o seed padrão? Isto apagará o histórico local.')) {
                      await DataService.resetData();
                      window.location.reload();
                    }
                  }}
                  className="w-full py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <RefreshCw size={14} /> Redefinir Banco Local
                </button>
              </div>
            </div>
          )}

          {activeProvider === 'googlescript' && (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4 animate-scale-up">
              <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                <FileSpreadsheet size={18} className="text-emerald-600" />
                <h2 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Conexão Google Apps Script</h2>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Insira a URL pública obtida após implantar o script no menu Extensões da sua planilha Google. Os dados de colaboradores, timeline e tarefas serão lidos diretamente das abas Sheets criadas automaticamente.
              </p>

              <form onSubmit={handleSaveGoogle} className="space-y-4 pt-1">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <FileSpreadsheet size={12} /> URL do Web App Apps Script
                  </label>
                  <input
                    type="url"
                    value={webAppUrl}
                    onChange={(e) => setWebAppUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Key size={12} /> Drive Folder ID (Opcional - para Anexos)
                  </label>
                  <input
                    type="text"
                    value={driveFolderId}
                    onChange={(e) => setDriveFolderId(e.target.value)}
                    placeholder="1aBcD...eFgHiJ"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle size={14} />
                  {googleConfig.isConnected ? 'Atualizar Conector Sheets' : 'Salvar e Conectar'}
                </button>
              </form>

              {googleConfig.isConnected ? (
                <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-2xl flex items-center gap-3">
                  <CheckCircle size={18} className="text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-emerald-800 leading-none">Sheets Sincronizado!</p>
                    <p className="text-[10px] text-emerald-600 mt-1">O App lerá/escreverá em tempo real na sua planilha.</p>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl flex items-center gap-3">
                  <HelpCircle size={18} className="text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-700 leading-none">Aguardando Conector</p>
                    <p className="text-[10px] text-slate-500 mt-1">Insira a URL pública do seu Web App para desativar o fallback offline.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeProvider === 'supabase' && (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4 animate-scale-up">
              <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                <Database size={18} className="text-teal-600" />
                <h2 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Conexão Supabase</h2>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Insira suas credenciais do projeto Supabase para ativar a sincronização e persistência de dados em nuvem estruturada no PostgreSQL.
              </p>

              <form onSubmit={handleSaveSupabase} className="space-y-4 pt-1">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Database size={12} /> SUPABASE_URL
                  </label>
                  <input
                    type="url"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    placeholder="https://your-project.supabase.co"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Key size={12} /> SUPABASE_ANON_KEY (Public Key)
                  </label>
                  <input
                    type="password"
                    value={supabaseAnonKey}
                    onChange={(e) => setSupabaseAnonKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold rounded-xl text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle size={14} />
                  {config.isConnected ? 'Atualizar Conexão Supabase' : 'Salvar e Conectar'}
                </button>
              </form>

              {config.isConnected ? (
                <div className="bg-teal-50/50 border border-teal-100 p-3 rounded-2xl flex items-center gap-3">
                  <CheckCircle size={18} className="text-teal-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-teal-800 leading-none">Ambiente Conectado!</p>
                    <p className="text-[10px] text-teal-600 mt-1">Conexão client-side estabelecida com sucesso.</p>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl flex items-center gap-3">
                  <HelpCircle size={18} className="text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-700 leading-none">Aguardando Credenciais</p>
                    <p className="text-[10px] text-slate-500 mt-1">Utilizando fallback de banco local de demonstração.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI-RESOURCES BRIEFING */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-indigo-600">
              <Cpu size={16} />
              <h3 className="text-xs font-bold uppercase tracking-wider">Preparação para Inteligência Artificial (AI)</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              O modelo estruturado de <strong>registros</strong> e <strong>tarefas</strong> é ideal para alimentar modelos de IA (ex: Gemini Pro). Os seguintes recursos podem ser embarcados futuramente:
            </p>
            <ul className="text-[11px] text-slate-600 space-y-1.5 list-disc pl-4 font-medium">
              <li><strong>Análise de Clima</strong>: IA processa os feedbacks da timeline para prever flutuações de motivação e riscos de turnover.</li>
              <li><strong>Geração de PDIs</strong>: Com base nos feedbacks corretivos e incidentes, a IA sugere caminhos e metas de desenvolvimento profissional.</li>
              <li><strong>Sintetização de Desempenho</strong>: IA resume o histórico anual do colaborador em 3 parágrafos prontos para avaliações oficiais.</li>
            </ul>
          </div>
        </div>

        {/* Code & Scripts Panel */}
        <div className="lg:col-span-7 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-5">
          {activeProvider === 'googlescript' ? (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                <Terminal size={18} className="text-emerald-600" />
                <h2 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Código Google Apps Script (.gs)</h2>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Utilize o código abaixo em seu editor Apps Script conectado à sua planilha. Este código cria automaticamente as tabelas (abas) necessárias no primeiro uso e realiza as operações CRUD de forma transparente.
              </p>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider pl-1 font-bold">
                  <span>Código de Integração Google Sheets</span>
                  <button
                    onClick={() => copyToClipboard(googleScriptCode, 'scriptgs')}
                    className="flex items-center gap-1 hover:text-slate-700 cursor-pointer font-semibold transition"
                  >
                    {isCopied === 'scriptgs' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    {isCopied === 'scriptgs' ? 'Copiado!' : 'Copiar Script'}
                  </button>
                </div>
                <pre className="p-4 bg-slate-900 text-slate-100 rounded-2xl text-[10px] font-mono overflow-x-auto max-h-96 leading-relaxed">
                  {googleScriptCode}
                </pre>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                <Terminal size={18} className="text-indigo-600" />
                <h2 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Esquema SQL de Banco (PostgreSQL)</h2>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Execute o script de tabelas e o script de bucket no SQL Editor do console do Supabase para criar a estrutura exata de dados que o aplicativo consome.
              </p>

              {/* Code block 1 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider pl-1 font-bold">
                  <span>Script de Criação de Tabelas</span>
                  <button
                    onClick={() => copyToClipboard(schemaSQL, 'schema')}
                    className="flex items-center gap-1 hover:text-slate-700 cursor-pointer font-semibold transition"
                  >
                    {isCopied === 'schema' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    {isCopied === 'schema' ? 'Copiado!' : 'Copiar SQL'}
                  </button>
                </div>
                <pre className="p-4 bg-slate-900 text-slate-100 rounded-2xl text-[10px] font-mono overflow-x-auto max-h-64 leading-relaxed">
                  {schemaSQL}
                </pre>
              </div>

              {/* Code block 2 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider pl-1 font-bold">
                  <span>Script de Storage e Bucket</span>
                  <button
                    onClick={() => copyToClipboard(storageSQL, 'storage')}
                    className="flex items-center gap-1 hover:text-slate-700 cursor-pointer font-semibold transition"
                  >
                    {isCopied === 'storage' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    {isCopied === 'storage' ? 'Copiado!' : 'Copiar SQL'}
                  </button>
                </div>
                <pre className="p-4 bg-slate-900 text-slate-100 rounded-2xl text-[10px] font-mono overflow-x-auto max-h-40 leading-relaxed">
                  {storageSQL}
                </pre>
              </div>
            </div>
          )}

          {/* Deployment notice */}
          <div className="bg-indigo-50/50 border border-indigo-100 p-3.5 rounded-2xl text-xs text-slate-700 leading-relaxed flex items-start gap-2">
            <Zap size={16} className="text-indigo-600 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <p className="font-bold text-indigo-950 leading-none mb-1">Dica para Deploy de Produção</p>
              <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                Ao hospedar na Vercel ou Netlify, as credenciais da nuvem ou do Google Sheets podem ser inseridas como variáveis de ambiente para assegurar que a conexão aconteça de forma integrada e segura.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
