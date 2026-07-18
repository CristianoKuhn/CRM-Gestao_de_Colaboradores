/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
  TipoRegistro,
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
  AlertaFerias,
  ConfiguracaoFerias,
} from '../types';
import { StorageAPI } from '../utils/storage';

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

// Redimensiona/comprime imagens (fotos de colaboradores) no navegador antes do upload.
// Mantém o payload pequeno (mais rápido, menos chance de esbarrar em limites do
// Apps Script) sem depender de nada no servidor. Para arquivos não-imagem (ex.: PDF
// em "documentos"), retorna o base64 original sem tocar no conteúdo.
async function fileToOptimizedBase64(
  file: File,
  maxDimension = 800,
  quality = 0.85
): Promise<{ base64: string; mimeType: string }> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    const base64 = await fileToBase64(file);
    return { base64, mimeType: file.type };
  }

  try {
    const original = await fileToBase64(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = original;
    });

    let { width, height } = img;
    if (width > maxDimension || height > maxDimension) {
      if (width >= height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { base64: original, mimeType: file.type };
    ctx.drawImage(img, 0, 0, width, height);

    const outputType = 'image/jpeg';
    const compressed = canvas.toDataURL(outputType, quality);

    // Só usa a versão comprimida se realmente for menor.
    if (compressed.length < original.length) {
      return { base64: compressed, mimeType: outputType };
    }
    return { base64: original, mimeType: file.type };
  } catch {
    // Se algo falhar na compressão (ex.: navegador sem suporte), usa o original.
    const base64 = await fileToBase64(file);
    return { base64, mimeType: file.type };
  }
}

function parseSetoresPermitidos(value: unknown, setorId: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map(String).filter(Boolean);
      }
    } catch {
      return value.split(',').map((id) => id.trim()).filter(Boolean);
    }
  }

  const setorLegado = String(setorId || '').trim();
  return setorLegado ? [setorLegado] : [];
}

export interface IDataService {
  getEmpresas(): Promise<Empresa[]>;
  getSetores(): Promise<Setor[]>;
  getCargos(): Promise<Cargo[]>;
  getLideres(): Promise<Lider[]>;
  getColaboradores(): Promise<Colaborador[]>;
  getTimeline(): Promise<TimelineRegistro[]>;
  getTarefas(): Promise<Tarefa[]>;
  getUsuarios(): Promise<Usuario[]>;

  saveEmpresa(empresa: Empresa): Promise<void>;
  saveSetor(setor: Setor): Promise<void>;
  saveCargo(cargo: Cargo): Promise<void>;
  saveLider(lider: Lider): Promise<void>;
  saveColaborador(colaborador: Colaborador): Promise<void>;
  deleteColaborador(id: string): Promise<void>;
  saveTimelineRegistro(registro: TimelineRegistro): Promise<void>;
  saveTarefa(tarefa: Tarefa): Promise<void>;
  toggleTarefa(id: string): Promise<Tarefa | undefined>;
  saveUsuario(usuario: Usuario): Promise<void>;
  deleteUsuario(id: string): Promise<void>;

  getOnboardingItems(): Promise<OnboardingItem[]>;
  saveOnboardingItem(item: OnboardingItem): Promise<void>;
  deleteOnboardingItem(id: string): Promise<void>;
  getOnboardingChecklists(): Promise<OnboardingChecklist[]>;
  saveOnboardingChecklist(checklist: OnboardingChecklist): Promise<void>;

  // Avaliações de Experiência (15, 30, 60, 90 dias)
  getAvaliacoesExperiencia(): Promise<any[]>;
  saveAvaliacaoExperiencia(avaliacao: any): Promise<void>;
  deleteAvaliacaoExperiencia(id: string): Promise<void>;

  // Avaliação 180°
  getResultados180(): Promise<any[]>;
  saveResultado180(resultado: any): Promise<void>;
  deleteResultado180(id: string): Promise<void>;

  // Alertas Inteligentes
  getAlertasInteligentes(): Promise<AlertaInteligente[]>;
  saveAlertaInteligente(alerta: AlertaInteligente): Promise<void>;
  deleteAlertaInteligente(id: string): Promise<void>;
  getConfiguracaoAlertas(): Promise<ConfiguracaoAlertas>;
  saveConfiguracaoAlertas(config: ConfiguracaoAlertas): Promise<void>;
  gerarIdAlerta(): Promise<string>;

  // P3: Documentos
  getDocumentos(): Promise<Documento[]>;
  saveDocumento(doc: Documento): Promise<void>;
  deleteDocumento(id: string): Promise<void>;

  // P4: Reconhecimento
  getConfiguracaoReconhecimento(): Promise<ConfiguracaoReconhecimento>;
  saveConfiguracaoReconhecimento(config: ConfiguracaoReconhecimento): Promise<void>;
  getReconhecimentos(): Promise<Reconhecimento[]>;
  saveReconhecimento(rec: Reconhecimento): Promise<void>;
  deleteReconhecimento(id: string): Promise<void>;

  // P5: Metas
  getMetasLideranca(): Promise<MetaLideranca[]>;
  saveMetaLideranca(meta: MetaLideranca): Promise<void>;
  deleteMetaLideranca(id: string): Promise<void>;
  getMetasSetor(): Promise<MetaSetor[]>;
  saveMetaSetor(meta: MetaSetor): Promise<void>;
  deleteMetaSetor(id: string): Promise<void>;
  getAcompanhamentos(): Promise<AcompanhamentoRealizado[]>;
  saveAcompanhamento(acomp: AcompanhamentoRealizado): Promise<void>;
  deleteAcompanhamento(id: string): Promise<void>;

  // P6: Gestão de Pessoas
  getFerias(): Promise<Ferias[]>;
  saveFerias(ferias: Ferias): Promise<void>;
  deleteFerias(id: string): Promise<void>;
  getDayOffs(): Promise<DayOff[]>;
  saveDayOff(dayoff: DayOff): Promise<void>;
  deleteDayOff(id: string): Promise<void>;
  getFolgas(): Promise<Folga[]>;
  saveFolga(folga: Folga): Promise<void>;
  deleteFolga(id: string): Promise<void>;
  getPeriodosAquisitivos(): Promise<PeriodoAquisitivo[]>;
  savePeriodoAquisitivo(periodo: PeriodoAquisitivo): Promise<void>;
  deletePeriodoAquisitivo(id: string): Promise<void>;
  getConfiguracaoGestaoPessoas(): Promise<ConfiguracaoGestaoPessoas>;
  saveConfiguracaoGestaoPessoas(config: ConfiguracaoGestaoPessoas): Promise<void>;

  // Férias Inteligentes
  getAlertasFerias(): Promise<AlertaFerias[]>;
  saveAlertaFerias(alerta: AlertaFerias): Promise<void>;
  deleteAlertaFerias(id: string): Promise<void>;
  getConfiguracaoFerias(): Promise<ConfiguracaoFerias>;
  saveConfiguracaoFerias(config: ConfiguracaoFerias): Promise<void>;

  uploadFile(
    file: File,
    folderName: 'Fotos Colaboradores' | 'Anexos' | 'documentos',
    colaboradorNome: string
  ): Promise<string>;

  resetData(): Promise<void>;
}

// -----------------------------------------------------------------
// 1. IMPLEMENTAÇÃO LOCALSTORAGE (MODO DEMO / CACHE)
// -----------------------------------------------------------------
export class LocalDataService implements IDataService {
  async getEmpresas(): Promise<Empresa[]> {
    return StorageAPI.getEmpresas();
  }
  async getSetores(): Promise<Setor[]> {
    return StorageAPI.getSetores();
  }
  async getCargos(): Promise<Cargo[]> {
    return StorageAPI.getCargos();
  }
  async getLideres(): Promise<Lider[]> {
    return StorageAPI.getLideres();
  }
  async getColaboradores(): Promise<Colaborador[]> {
    return StorageAPI.getColaboradores();
  }
  async getTimeline(): Promise<TimelineRegistro[]> {
    return StorageAPI.getTimeline();
  }
  async getTarefas(): Promise<Tarefa[]> {
    return StorageAPI.getTarefas();
  }
  async getUsuarios(): Promise<Usuario[]> {
    return StorageAPI.getUsuarios();
  }

  async saveEmpresa(empresa: Empresa): Promise<void> {
    StorageAPI.saveEmpresa(empresa);
  }
  async saveSetor(setor: Setor): Promise<void> {
    StorageAPI.saveSetor(setor);
  }
  async saveCargo(cargo: Cargo): Promise<void> {
    StorageAPI.saveCargo(cargo);
  }
  async saveLider(lider: Lider): Promise<void> {
    StorageAPI.saveLider(lider);
  }
  async saveColaborador(colaborador: Colaborador): Promise<void> {
    StorageAPI.saveColaborador(colaborador);
  }
  async deleteColaborador(id: string): Promise<void> {
    StorageAPI.deleteColaborador(id);
  }
  async saveTimelineRegistro(registro: TimelineRegistro): Promise<void> {
    StorageAPI.saveTimelineRegistro(registro);
  }
  async saveTarefa(tarefa: Tarefa): Promise<void> {
    StorageAPI.saveTarefa(tarefa);
  }
  async saveUsuario(usuario: Usuario): Promise<void> {
    StorageAPI.saveUsuario(usuario);
  }
  async deleteUsuario(id: string): Promise<void> {
    StorageAPI.deleteUsuario(id);
  }
  async getOnboardingItems(): Promise<OnboardingItem[]> {
    return StorageAPI.getOnboardingItems();
  }
  async saveOnboardingItem(item: OnboardingItem): Promise<void> {
    StorageAPI.saveOnboardingItem(item);
  }
  async deleteOnboardingItem(id: string): Promise<void> {
    StorageAPI.deleteOnboardingItem(id);
  }
  async getOnboardingChecklists(): Promise<OnboardingChecklist[]> {
    return StorageAPI.getOnboardingChecklists();
  }
  async saveOnboardingChecklist(checklist: OnboardingChecklist): Promise<void> {
    StorageAPI.saveOnboardingChecklist(checklist);
  }
  async toggleTarefa(id: string): Promise<Tarefa | undefined> {
    return StorageAPI.toggleTarefa(id);
  }

  // Avaliações de Experiência
  async getAvaliacoesExperiencia(): Promise<any[]> {
    return StorageAPI.getAvaliacoesExperiencia();
  }
  async saveAvaliacaoExperiencia(avaliacao: any): Promise<void> {
    StorageAPI.saveAvaliacaoExperiencia(avaliacao);
  }
  async deleteAvaliacaoExperiencia(id: string): Promise<void> {
    StorageAPI.deleteAvaliacaoExperiencia(id);
  }

  // Resultados Avaliação 180°
  async getResultados180(): Promise<any[]> {
    return StorageAPI.getResultados180();
  }
  async saveResultado180(resultado: any): Promise<void> {
    StorageAPI.saveResultado180(resultado);
  }
  async deleteResultado180(id: string): Promise<void> {
    StorageAPI.deleteResultado180(id);
  }
  
  // Alertas Inteligentes
  async getAlertasInteligentes(): Promise<AlertaInteligente[]> {
    return StorageAPI.getAlertasInteligentes();
  }
  async saveAlertaInteligente(alerta: AlertaInteligente): Promise<void> {
    StorageAPI.saveAlertaInteligente(alerta);
  }
  async deleteAlertaInteligente(id: string): Promise<void> {
    StorageAPI.deleteAlertaInteligente(id);
  }
  async getConfiguracaoAlertas(): Promise<ConfiguracaoAlertas> {
    return StorageAPI.getConfiguracaoAlertas();
  }
  async saveConfiguracaoAlertas(config: ConfiguracaoAlertas): Promise<void> {
    StorageAPI.saveConfiguracaoAlertas(config);
  }
  async gerarIdAlerta(): Promise<string> {
    return StorageAPI.gerarIdAlerta();
  }

  // P3: Documentos
  async getDocumentos(): Promise<Documento[]> {
    return StorageAPI.getDocumentos();
  }
  async saveDocumento(doc: Documento): Promise<void> {
    StorageAPI.saveDocumento(doc);
  }
  async deleteDocumento(id: string): Promise<void> {
    StorageAPI.deleteDocumento(id);
  }

  // P4: Reconhecimento
  async getConfiguracaoReconhecimento(): Promise<ConfiguracaoReconhecimento> {
    return StorageAPI.getConfiguracaoReconhecimento();
  }
  async saveConfiguracaoReconhecimento(config: ConfiguracaoReconhecimento): Promise<void> {
    StorageAPI.saveConfiguracaoReconhecimento(config);
  }
  async getReconhecimentos(): Promise<Reconhecimento[]> {
    return StorageAPI.getReconhecimentos();
  }
  async saveReconhecimento(rec: Reconhecimento): Promise<void> {
    StorageAPI.saveReconhecimento(rec);
  }
  async deleteReconhecimento(id: string): Promise<void> {
    StorageAPI.deleteReconhecimento(id);
  }

  // P5: Metas
  async getMetasLideranca(): Promise<MetaLideranca[]> {
    return StorageAPI.getMetasLideranca();
  }
  async saveMetaLideranca(meta: MetaLideranca): Promise<void> {
    StorageAPI.saveMetaLideranca(meta);
  }
  async deleteMetaLideranca(id: string): Promise<void> {
    StorageAPI.deleteMetaLideranca(id);
  }
  async getMetasSetor(): Promise<MetaSetor[]> {
    return StorageAPI.getMetasSetor();
  }
  async saveMetaSetor(meta: MetaSetor): Promise<void> {
    StorageAPI.saveMetaSetor(meta);
  }
  async deleteMetaSetor(id: string): Promise<void> {
    StorageAPI.deleteMetaSetor(id);
  }
  async getAcompanhamentos(): Promise<AcompanhamentoRealizado[]> {
    return StorageAPI.getAcompanhamentos();
  }
  async saveAcompanhamento(acomp: AcompanhamentoRealizado): Promise<void> {
    StorageAPI.saveAcompanhamento(acomp);
  }
  async deleteAcompanhamento(id: string): Promise<void> {
    StorageAPI.deleteAcompanhamento(id);
  }

  // P6: Gestão de Pessoas
  async getFerias(): Promise<Ferias[]> {
    return StorageAPI.getFerias();
  }
  async saveFerias(ferias: Ferias): Promise<void> {
    StorageAPI.saveFerias(ferias);
  }
  async deleteFerias(id: string): Promise<void> {
    StorageAPI.deleteFerias(id);
  }
  async getDayOffs(): Promise<DayOff[]> {
    return StorageAPI.getDayOffs();
  }
  async saveDayOff(dayoff: DayOff): Promise<void> {
    StorageAPI.saveDayOff(dayoff);
  }
  async deleteDayOff(id: string): Promise<void> {
    StorageAPI.deleteDayOff(id);
  }
  async getFolgas(): Promise<Folga[]> {
    return StorageAPI.getFolgas();
  }
  async saveFolga(folga: Folga): Promise<void> {
    StorageAPI.saveFolga(folga);
  }
  async deleteFolga(id: string): Promise<void> {
    StorageAPI.deleteFolga(id);
  }
  async getPeriodosAquisitivos(): Promise<PeriodoAquisitivo[]> {
    return StorageAPI.getPeriodosAquisitivos();
  }
  async savePeriodoAquisitivo(periodo: PeriodoAquisitivo): Promise<void> {
    StorageAPI.savePeriodoAquisitivo(periodo);
  }
  async deletePeriodoAquisitivo(id: string): Promise<void> {
    StorageAPI.deletePeriodoAquisitivo(id);
  }
  async getConfiguracaoGestaoPessoas(): Promise<ConfiguracaoGestaoPessoas> {
    return StorageAPI.getConfiguracaoGestaoPessoas();
  }
  async saveConfiguracaoGestaoPessoas(config: ConfiguracaoGestaoPessoas): Promise<void> {
    StorageAPI.saveConfiguracaoGestaoPessoas(config);
  }

  // Férias Inteligentes
  async getAlertasFerias(): Promise<AlertaFerias[]> {
    return StorageAPI.getAlertasFerias();
  }
  async saveAlertaFerias(alerta: AlertaFerias): Promise<void> {
    StorageAPI.saveAlertaFerias(alerta);
  }
  async deleteAlertaFerias(id: string): Promise<void> {
    StorageAPI.deleteAlertaFerias(id);
  }
  async getConfiguracaoFerias(): Promise<ConfiguracaoFerias> {
    return StorageAPI.getConfiguracaoFerias();
  }
  async saveConfiguracaoFerias(config: ConfiguracaoFerias): Promise<void> {
    StorageAPI.saveConfiguracaoFerias(config);
  }

  async uploadFile(
    file: File,
    folderName: 'Fotos Colaboradores' | 'Anexos' | 'documentos',
    colaboradorNome: string
  ): Promise<string> {
    return fileToBase64(file);
  }
  async resetData(): Promise<void> {
    StorageAPI.resetData();
  }
}

// -----------------------------------------------------------------
// 2. IMPLEMENTAÇÃO GOOGLE APPS SCRIPT (GOOGLE SHEETS + DRIVE)
// -----------------------------------------------------------------
export class GoogleScriptDataService implements IDataService {
  private config: GoogleScriptConfig;
  private localFallback = new LocalDataService();

  constructor(config: GoogleScriptConfig) {
    this.config = config;
  }

  private async request<T>(action: string, payload?: any): Promise<T> {
    // URL padrão do Google Apps Script (fallback)
    const DEFAULT_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbz8iGKX9f9VNECQL1fcQttiMaEuT3a61YS3hE3HYi13SUvx3ShxF3RF69u7LkQhac0V/exec';
    
    // Usa a URL configurada ou a padrão
    const webAppUrl = this.config.webAppUrl || DEFAULT_WEBAPP_URL;
    
    // O payload pode ser diretamente os dados (para saveColaborador) ou { data: dados }
    // Precisamos extrair os dados para enviar como 'data' para o Google Apps Script
    const dataToSend = payload?.data || payload;

    // IMPORTANTE: usamos SEMPRE POST com corpo JSON (nunca mais GET com dados na URL).
    // Motivo: dados grandes (fotos em base64, anexos, textos com acentuação) estouram o
    // limite de tamanho de URL e faziam a chamada falhar silenciosamente, caindo no
    // fallback local. O Content-Type 'text/plain' é usado de propósito: é um dos poucos
    // tipos "simples" que o navegador NÃO faz preflight (OPTIONS) antes de enviar, e o
    // Google Apps Script não trata OPTIONS — então precisamos evitar o preflight.
    const bodyStr = JSON.stringify({ action, data: dataToSend });

    console.log(`[request] action=${action}, hasData=${!!dataToSend}, bodySize=${bodyStr.length}, webAppUrl=${webAppUrl}`);
    
    // Verifica se deve usar o proxy API
    const shouldUseProxy = this.config.useApiProxy !== false && 
                           (typeof window !== 'undefined') &&
                           (window.location.hostname === 'localhost' || 
                            window.location.hostname === '127.0.0.1' ||
                            this.config.useApiProxy === true);
    
    if (shouldUseProxy) {
      try {
        const apiUrl = new URL('/api/googlescript', window.location.origin);

        console.log(`[request] Usando proxy (POST): ${apiUrl.toString()}`);
        
        const response = await fetch(apiUrl.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
            'x-google-script-url': webAppUrl
          },
          body: bodyStr,
        });
        
        if (!response.ok) {
          throw new Error(`Erro na chamada: ${response.statusText}`);
        }
        
        const result = await response.json();
        if (result.status === 'error' || result.success === false) {
          throw new Error(result.message || 'Erro reportado.');
        }
        
        console.log(`[request] Sucesso via proxy`);
        return (result.data || result) as T;
      } catch (err) {
        console.warn('API proxy request falhou, tentando chamada direta:', err);
        // Continua para tentar chamada direta abaixo
      }
    }
    
    // Chamada direta ao Google Apps Script (POST, sem preflight)
    console.log(`[request] Chamada direta (POST) action=${action}, bodySize=${bodyStr.length}`);
    
    try {
      const response = await fetch(webAppUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: bodyStr,
      });
      
      if (!response.ok) {
        throw new Error(`Erro na chamada: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.status === 'error' || result.success === false) {
        throw new Error(result.message || 'Erro reportado.');
      }
      
      return (result.data || result) as T;
    } catch (err) {
      console.error('Google Apps Script request (POST) falhou, tentando GET como último recurso:', err);

      // Último recurso: GET com dados na URL. Só funciona para payloads pequenos,
      // mas mantemos como fallback para não quebrar leituras (get*) em ambientes
      // onde o POST por algum motivo seja bloqueado (proxy corporativo, etc).
      try {
        const url = new URL(webAppUrl);
        url.searchParams.set('action', action);
        if (dataToSend) {
          url.searchParams.set('data', encodeURIComponent(JSON.stringify(dataToSend)));
        }
        const response = await fetch(url.toString(), { method: 'GET' });
        if (!response.ok) throw new Error(`Erro na chamada: ${response.statusText}`);
        const result = await response.json();
        if (result.status === 'error' || result.success === false) {
          throw new Error(result.message || 'Erro reportado.');
        }
        return (result.data || result) as T;
      } catch (fallbackErr) {
        console.error('Google Apps Script request (GET fallback) também falhou:', fallbackErr);
        throw err;
      }
    }
  }

  async getEmpresas(): Promise<Empresa[]> {
    try {
      const raw = await this.request<any[]>('getEmpresas');
      return raw.map(e => ({
        id: String(e.id || ''),
        nome: String(e.nome || ''),
      }));
    } catch (e) {
      console.warn('GoogleScript getEmpresas falhou, usando LocalStorage fallback:', e);
      return this.localFallback.getEmpresas();
    }
  }

  async getSetores(): Promise<Setor[]> {
    try {
      const raw = await this.request<any[]>('getSetores');
      return raw.map(s => ({
        id: String(s.id || ''),
        nome: String(s.nome || ''),
      }));
    } catch (e) {
      console.warn('GoogleScript getSetores falhou, usando LocalStorage fallback:', e);
      return this.localFallback.getSetores();
    }
  }

  async getCargos(): Promise<Cargo[]> {
    try {
      const raw = await this.request<any[]>('getCargos');
      return raw.map(c => ({
        id: String(c.id || ''),
        nome: String(c.nome || ''),
      }));
    } catch (e) {
      console.warn('GoogleScript getCargos falhou, usando LocalStorage fallback:', e);
      return this.localFallback.getCargos();
    }
  }

  async getLideres(): Promise<Lider[]> {
    try {
      const raw = await this.request<any[]>('getLideres');
      return raw.map(l => ({
        id: String(l.id || ''),
        nome: String(l.nome || ''),
        email: String(l.email || ''),
        cargo: String(l.cargo || ''),
        fotoUrl: String(l.fotoUrl || l.foto_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200'),
      }));
    } catch (e) {
      console.warn('GoogleScript getLideres falhou, usando LocalStorage fallback:', e);
      return this.localFallback.getLideres();
    }
  }

  async getColaboradores(): Promise<Colaborador[]> {
    try {
      let raw: any[];
      try {
        raw = await this.request<any[]>('listarColaboradores');
      } catch (err) {
        raw = await this.request<any[]>('getColaboradores');
      }

      // Filtra colaboradores com IDs vazios ou inválidos (linhas vazias no sheet)
      raw = raw.filter(c => c && c.id && String(c.id).trim() !== '');

      return raw.map(c => {
        let completed: string[] = [];
        if (typeof c.avaliacoes_completas === 'string') {
          try {
            completed = JSON.parse(c.avaliacoes_completas);
          } catch (e) {
            completed = [];
          }
        } else if (Array.isArray(c.avaliacoes_completas)) {
          completed = c.avaliacoes_completas;
        } else if (Array.isArray(c.avaliacoesCompletas)) {
          completed = c.avaliacoesCompletas;
        }
        
        // Função para extrair apenas YYYY-MM-DD de qualquer formato de data
        const extractDate = (dateStr: unknown): string => {
          if (!dateStr) return '';
          
          // Se já for um Date object, converte direto
          if (dateStr instanceof Date) {
            if (isNaN(dateStr.getTime())) return '';
            return dateStr.toISOString().split('T')[0];
          }
          
          const str = String(dateStr);
          
          // Se já está no formato YYYY-MM-DD, retorna direto
          if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
          
          // Tenta extrair a parte da data de formatos ISO ou outros
          const match = str.match(/^\d{4}-\d{2}-\d{2}/);
          if (match) return match[0];
          
          // Tenta criar Date de string
          try {
            const date = new Date(str);
            if (!isNaN(date.getTime())) {
              return date.toISOString().split('T')[0];
            }
          } catch (e) {
            // ignora
          }
          
          // Se for um timestamp ou número, tenta converter
          if (typeof dateStr === 'number' || /^\d+$/.test(str)) {
            try {
              const date = new Date(Number(dateStr));
              if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
              }
            } catch (e) {
              // ignora
            }
          }
          
          return str;
        };

        return {
          id: String(c.id || ''),
          nome: String(c.nome || ''),
          email: String(c.email || ''),
          fotoUrl: String(c.foto_url || c.fotoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'),
          cargoId: String(c.cargo_id || c.cargoId || ''),
          setorId: String(c.setor_id || c.setorId || ''),
          liderId: String(c.lider_id || c.liderId || ''),
          dataAdmissao: extractDate(c.data_admissao || c.dataAdmissao || ''),
          situacao: (c.situacao || (c.ativo === false ? 'Desligado' : 'Ativo')) as any,
          empresaId: String(c.empresa_id || c.empresaId || ''),
          telefone: String(c.telefone || ''),
          cidadeBase: String(c.cidade_base || c.cidadeBase || ''),
          prazoAvaliacao180: Number(c.prazo_avaliacao_180 ?? c.prazoAvaliacao180 ?? 6),
          realizarExperiencia: c.realizar_experiencia === true || c.realizar_experiencia === 'true' || c.realizar_experiencia === 1 || c.realizar_experiencia === '1' || c.realizar_experiencia === undefined || c.realizarExperiencia === true,
          avaliacoesCompletas: completed,
          dataNascimento: extractDate(c.data_nascimento || c.dataNascimento || ''),
        };
      });
    } catch (e) {
      console.warn('GoogleScript getColaboradores falhou, usando LocalStorage fallback:', e);
      return this.localFallback.getColaboradores();
    }
  }

  async getTimeline(): Promise<TimelineRegistro[]> {
    try {
      let raw: any[];
      try {
        raw = await this.request<any[]>('getTimeline');
      } catch (err) {
        raw = await this.request<any[]>('listarRegistros');
      }

      // Filtra registros com IDs vazios
      raw = raw.filter(r => r && r.id && String(r.id).trim() !== '');

      return raw.map(r => {
        let titulo = r.titulo || '';
        if (!titulo) {
          if (r.tipo?.includes('Feedback')) titulo = r.Feedback;
          else if (r.tipo?.includes('Reconhecimento')) titulo = r.Reconhecimento;
          else if (r.tipo?.includes('Advertência') || r.tipo?.includes('Suspensão') || r.tipo?.includes('Advertencia')) {
            titulo = r.Advertência || r.Advertencia;
          } else if (r.tipo?.includes('PDI')) titulo = r.PDI;
          else if (r.tipo?.includes('1:1')) titulo = r['1:1'];
          else titulo = r.Observação || r.Observacao;
        }

        return {
          id: String(r.id || ''),
          colaboradorId: String(r.colaborador_id || r.colaboradorId || ''),
          tipo: String(r.tipo || '') as TipoRegistro,
          data: String(r.data || r.criado_em || ''),
          titulo: String(titulo || ''),
          descricao: String(r.descricao || ''),
          responsavelId: String(r.lider || r.responsavel_id || r.responsavelId || ''),
          prioridade: (r.prioridade || 'Baixa') as any,
          status: (r.status || 'Concluído') as any,
          prazoAcompanhamento: String(r.prazo || r.prazo_acompanhamento || r.prazoAcompanhamento || ''),
          gerarTarefaFutura: r.gerar_tarefa_futura === true || r.gerar_tarefa_futura === 'true',
          anexos: typeof r.anexos === 'string' ? JSON.parse(r.anexos) : (r.anexos || []),
          tarefaId: String(r.tarefa_id || r.tarefaId || '')
        };
      });
    } catch (e) {
      console.warn('GoogleScript getTimeline falhou, usando LocalStorage fallback:', e);
      return this.localFallback.getTimeline();
    }
  }

  async getTarefas(): Promise<Tarefa[]> {
    try {
      let raw: any[];
      try {
        raw = await this.request<any[]>('getTarefas');
      } catch (err) {
        raw = await this.request<any[]>('listarTarefas');
      }

      // Filtra tarefas com IDs vazios
      raw = raw.filter(t => t && t.id && String(t.id).trim() !== '');

      return raw.map(t => ({
        id: String(t.id || ''),
        colaboradorId: String(t.colaborador_id || t.colaboradorId || ''),
        titulo: String(t.titulo || ''),
        descricao: String(t.descricao || ''),
        vencimento: String(t.vencimento || t.prazo || ''),
        concluida: t.concluida === true || t.concluida === 'true' || t.status === 'Concluído',
        tipoOrigem: String(t.tipo_origem || t.tipoOrigem || '') as TipoRegistro,
        registroId: String(t.registro_id || t.registroId || ''),
        responsavelId: String(t.responsavel_id || t.responsavelId || t.lider || '')
      }));
    } catch (e) {
      console.warn('GoogleScript getTarefas falhou, usando LocalStorage fallback:', e);
      return this.localFallback.getTarefas();
    }
  }

  async saveEmpresa(empresa: Empresa): Promise<void> {
    await this.localFallback.saveEmpresa(empresa);
    try {
      await this.request('saveEmpresa', { data: empresa });
    } catch (e) {
      try {
        await this.request('salvarEmpresa', { data: empresa });
      } catch (e2) {
        console.warn('Erro ao sincronizar empresa com GoogleScript (usando fallback local):', e2);
      }
    }
  }

  async saveSetor(setor: Setor): Promise<void> {
    await this.localFallback.saveSetor(setor);
    try {
      await this.request('saveSetor', { data: setor });
    } catch (e) {
      try {
        await this.request('salvarSetor', { data: setor });
      } catch (e2) {
        console.warn('Erro ao sincronizar setor com GoogleScript (usando fallback local):', e2);
      }
    }
  }

  async saveCargo(cargo: Cargo): Promise<void> {
    await this.localFallback.saveCargo(cargo);
    try {
      await this.request('saveCargo', { data: cargo });
    } catch (e) {
      try {
        await this.request('salvarCargo', { data: cargo });
      } catch (e2) {
        console.warn('Erro ao sincronizar cargo com GoogleScript (usando fallback local):', e2);
      }
    }
  }

  async saveLider(lider: Lider): Promise<void> {
    await this.localFallback.saveLider(lider);
    try {
      const body = {
        id: lider.id,
        nome: lider.nome,
        email: lider.email,
        cargo: lider.cargo,
        foto_url: lider.fotoUrl,
        perfil: 'Lider',
        setor_id: lider.setoresPermitidos?.[0] || '',
        setores_permitidos: JSON.stringify(lider.setoresPermitidos || []),
        ativo: true,
      };
      await this.request('saveLider', { data: body });
    } catch (e) {
      try {
        const body = {
          id: lider.id,
          nome: lider.nome,
          email: lider.email,
          cargo: lider.cargo,
          foto_url: lider.fotoUrl,
        };
        await this.request('salvarLider', { data: body });
      } catch (e2) {
        console.warn('Erro ao sincronizar lider com GoogleScript (usando fallback local):', e2);
      }
    }
  }

  async saveColaborador(colaborador: Colaborador): Promise<void> {
    // Sempre salva no local primeiro
    await this.localFallback.saveColaborador(colaborador);
    
    // Função para formatar data como YYYY-MM-DD
    const formatDate = (dateStr: any): string => {
      if (!dateStr || dateStr === 'undefined' || dateStr === 'null' || dateStr === 'Invalid Date') return '';
      try {
        if (dateStr instanceof Date) {
          if (isNaN(dateStr.getTime())) return '';
          return dateStr.toISOString().split('T')[0];
        }
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '';
        return date.toISOString().split('T')[0];
      } catch {
        return '';
      }
    };
    
    // Proteção contra fotos antigas que ficaram salvas como base64 gigante no
    // localStorage (efeito do bug anterior, quando o upload para o Drive falhava
    // silenciosamente). Uma célula do Google Sheets tem limite de ~50.000
    // caracteres; enviar um base64 desse tamanho quebraria o saveColaborador
    // inteiro. Nesse caso, não reenviamos a foto (mantém a existente na planilha)
    // e avisamos no console para o usuário reenviar a foto pela tela normal.
    const MAX_SHEET_CELL_CHARS = 45000;
    let fotoUrlParaEnviar = String(colaborador.fotoUrl || '');
    if (fotoUrlParaEnviar.startsWith('data:') && fotoUrlParaEnviar.length > MAX_SHEET_CELL_CHARS) {
      console.warn(
        '[saveColaborador] foto_url é um base64 muito grande (upload antigo que falhou). ' +
        'Não será enviada para a planilha nesta chamada — refaça o upload da foto na tela do colaborador.'
      );
      fotoUrlParaEnviar = '';
    }

    const body = {
      id: String(colaborador.id || ''),
      nome: String(colaborador.nome || ''),
      email: String(colaborador.email || ''),
      telefone: String(colaborador.telefone || ''),
      cargo_id: String(colaborador.cargoId || ''),
      setor_id: String(colaborador.setorId || ''),
      lider_id: String(colaborador.liderId || ''),
      data_admissao: formatDate(colaborador.dataAdmissao),
      situacao: String(colaborador.situacao || 'Ativo'),
      empresa_id: String(colaborador.empresaId || ''),
      foto_url: fotoUrlParaEnviar,
      ativo: colaborador.situacao !== 'Desligado',
      cidade_base: String(colaborador.cidadeBase || ''),
      prazo_avaliacao_180: Number(colaborador.prazoAvaliacao180 ?? 6),
      realizar_experiencia: colaborador.realizarExperiencia ?? true,
      avaliacoes_completas: Array.isArray(colaborador.avaliacoesCompletas) 
        ? JSON.stringify(colaborador.avaliacoesCompletas) 
        : '[]',
      data_nascimento: formatDate(colaborador.dataNascimento || ''),
    };

    // Log detalhado para debug
    console.log('[saveColaborador] Salvando colaborador:', {
      id: body.id,
      nome: body.nome,
      email: body.email,
      cargo_id: body.cargo_id,
      setor_id: body.setor_id,
      lider_id: body.lider_id,
      foto_url: body.foto_url ? '(presente)' : '(vazio)',
      data_nascimento: body.data_nascimento
    });

    // Tenta diferentes actions para garantir compatibilidade
    // IMPORTANTE: Enviamos body diretamente, o request() extrai data se necessário
    const actions = ['saveColaborador', 'salvarColaborador', 'novoColaborador'];
    let ultimoErro: any = null;
    
    for (const action of actions) {
      try {
        console.log(`[saveColaborador] Tentando action: ${action}`);
        await this.request(action, body);
        console.log(`[saveColaborador] Sucesso com action: ${action}`);
        return; // Sucesso, sai da função
      } catch (err: any) {
        console.warn(`[saveColaborador] Action ${action} falhou:`, err.message);
        ultimoErro = err;
      }
    }
    
    // Se todas falharem, loga erro mas não lança (dados já estão no local)
    console.error('Erro ao sincronizar colaborador com GoogleScript (dados salvos localmente):', ultimoErro);
  }

  async deleteColaborador(id: string): Promise<void> {
    await this.localFallback.deleteColaborador(id);
    try {
      await this.request('deleteColaborador', { id });
    } catch (err) {
      console.warn('Erro ao excluir colaborador no GoogleScript (usando fallback local):', err);
    }
  }

  async saveTimelineRegistro(registro: TimelineRegistro): Promise<void> {
    await this.localFallback.saveTimelineRegistro(registro);
    // Lógica simplificada: envia apenas o título, o script cuida da coluna correta
    const body: any = {
      id: registro.id,
      colaborador_id: registro.colaboradorId,
      tipo: registro.tipo,
      titulo: registro.titulo, // Agora enviamos o título diretamente
      descricao: registro.descricao,
      status: registro.status,
      prioridade: registro.prioridade,
      data: registro.data,
      prazo: registro.prazoAcompanhamento || '',
      lider: registro.responsavelId,
      data_conclusao: registro.status === 'Concluído' ? new Date().toLocaleDateString('pt-BR') : '',
      gerar_tarefa_futura: registro.gerarTarefaFutura || false,
      anexos: registro.anexos || [],
      tarefa_id: registro.tarefaId || '',
    };

    try {
      await this.request('saveTimelineRegistro', { data: body });
    } catch (err) {
      try {
        await this.request('salvarRegistro', { data: body });
      } catch (err2) {
        console.warn('Erro ao sincronizar registro timeline com GoogleScript (usando fallback local):', err2);
      }
    }
  }

  async saveTarefa(tarefa: Tarefa): Promise<void> {
    await this.localFallback.saveTarefa(tarefa);
    const body = {
      id: tarefa.id,
      colaborador_id: tarefa.colaboradorId,
      titulo: tarefa.titulo,
      descricao: tarefa.descricao,
      vencimento: tarefa.vencimento,
      concluida: tarefa.concluida,
      tipo_origem: tarefa.tipoOrigem,
      registro_id: tarefa.registroId,
      responsavel_id: tarefa.responsavelId,
      status: tarefa.concluida ? 'Concluído' : 'Pendente',
    };

    try {
      await this.request('saveTarefa', { data: body });
    } catch (err) {
      try {
        await this.request('salvarTarefa', { data: body });
      } catch (err2) {
        console.warn('Erro ao sincronizar tarefa com GoogleScript (usando fallback local):', err2);
      }
    }
  }

  async toggleTarefa(id: string): Promise<Tarefa | undefined> {
    const resLocal = await this.localFallback.toggleTarefa(id);
    try {
      const response = await this.request<Tarefa>('toggleTarefa', { id });
      return response || resLocal;
    } catch (e) {
      console.warn('GoogleScript toggleTarefa falhou, usando local:', e);
      return resLocal;
    }
  }

  async resetData(): Promise<void> {
    await this.localFallback.resetData();
    try {
      await this.request('resetData');
    } catch (e) {
      console.warn('Erro ao resetar dados no GoogleScript (usando fallback local):', e);
    }
  }

  async getUsuarios(): Promise<Usuario[]> {
    try {
      let raw: any[];
      try {
        raw = await this.request<any[]>('getUsuarios');
      } catch (err) {
        raw = await this.request<any[]>('listarUsuarios');
      }

      // Filtra usuários com IDs vazios
      raw = raw.filter(u => u && u.id && String(u.id).trim() !== '');

      return raw.map(u => ({
        id: String(u.id || ''),
        nome: String(u.nome || ''),
        email: String(u.email || ''),
        senha_hash: String(u.senha_hash || u.senhaHash || ''),
        perfil: (u.perfil || 'Lider') as any,
        setor_id: String(u.setor_id || u.setorId || ''),
        setoresPermitidos: parseSetoresPermitidos(
          u.setores_permitidos ?? u.setoresPermitidos,
          u.setor_id ?? u.setorId
        ),
        ativo: u.ativo === true || u.ativo === 'true' || u.ativo === 1 || u.ativo === '1' || u.ativo === undefined,
        ultimo_login: String(u.ultimo_login || u.ultimoLogin || '')
      }));
    } catch (e) {
      console.warn('GoogleScript getUsuarios falhou, usando LocalStorage fallback:', e);
      return this.localFallback.getUsuarios();
    }
  }

  async saveUsuario(usuario: Usuario): Promise<void> {
    await this.localFallback.saveUsuario(usuario);
    const body = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      senha_hash: usuario.senha_hash || '',
      perfil: usuario.perfil,
      setor_id: usuario.setoresPermitidos?.[0] || usuario.setor_id || '',
      setores_permitidos: JSON.stringify(usuario.setoresPermitidos || (usuario.setor_id ? [usuario.setor_id] : [])),
      ativo: usuario.ativo,
      ultimo_login: usuario.ultimo_login || ''
    };
    try {
      await this.request('saveUsuario', { data: body });
    } catch (e) {
      try {
        await this.request('salvarUsuario', { data: body });
      } catch (e2) {
        console.warn('Erro ao sincronizar usuario com GoogleScript (usando fallback local):', e2);
      }
    }
  }

  async deleteUsuario(id: string): Promise<void> {
    await this.localFallback.deleteUsuario(id);
    try {
      await this.request('deleteUsuario', { id });
    } catch (e) {
      try {
        await this.request('excluirUsuario', { id });
      } catch (e2) {
        try {
          await this.request('deletarUsuario', { id });
        } catch (e3) {
          console.warn('Erro ao excluir usuario no GoogleScript (usando fallback local):', e3);
        }
      }
    }
  }

  async getOnboardingItems(): Promise<OnboardingItem[]> {
    try {
      const raw = await this.request<any[]>('getOnboardingItems');
      return raw.map(i => ({
        id: String(i.id || ''),
        setorIds: typeof i.setor_ids === 'string' ? JSON.parse(i.setor_ids) : (i.setorIds || [i.setorId || i.setor_id]),
        titulo: String(i.titulo || ''),
        descricao: String(i.descricao || ''),
      }));
    } catch (e) {
      return this.localFallback.getOnboardingItems();
    }
  }
  async saveOnboardingItem(item: OnboardingItem): Promise<void> {
    await this.localFallback.saveOnboardingItem(item);
    try {
    const body = {
      id: item.id,
      setor_ids: JSON.stringify(item.setorIds),
      titulo: item.titulo,
      descricao: item.descricao,
    };
      await this.request('saveOnboardingItem', { data: body });
    } catch (e) {}
  }
  async deleteOnboardingItem(id: string): Promise<void> {
    await this.localFallback.deleteOnboardingItem(id);
    try {
      await this.request('deleteOnboardingItem', { id });
    } catch (e) {}
  }
  async getOnboardingChecklists(): Promise<OnboardingChecklist[]> {
    try {
      const raw = await this.request<any[]>('getOnboardingChecklists');
      return raw.map(c => ({
        id: String(c.id || ''),
        colaboradorId: String(c.colaborador_id || c.colaboradorId || ''),
        itemsConcluidos: typeof c.items_concluidos === 'string' ? JSON.parse(c.items_concluidos) : (c.items_concluidos || []),
        dataCriacao: String(c.data_criacao || c.dataCriacao || ''),
      }));
    } catch (e) {
      return this.localFallback.getOnboardingChecklists();
    }
  }
  async saveOnboardingChecklist(checklist: OnboardingChecklist): Promise<void> {
    await this.localFallback.saveOnboardingChecklist(checklist);
    try {
      const body = {
        id: checklist.id,
        colaborador_id: checklist.colaboradorId,
        items_concluidos: JSON.stringify(checklist.itemsConcluidos),
        data_criacao: checklist.dataCriacao,
      };
      await this.request('saveOnboardingChecklist', { data: body });
    } catch (e) {}
  }

  // Avaliações de Experiência
  async getAvaliacoesExperiencia(): Promise<any[]> {
    return this.localFallback.getAvaliacoesExperiencia();
  }
  async saveAvaliacaoExperiencia(avaliacao: any): Promise<void> {
    await this.localFallback.saveAvaliacaoExperiencia(avaliacao);
  }
  async deleteAvaliacaoExperiencia(id: string): Promise<void> {
    await this.localFallback.deleteAvaliacaoExperiencia(id);
  }

  // Resultados Avaliação 180°
  async getResultados180(): Promise<any[]> {
    try {
      const raw = await this.request<any[]>('getResultados180');
      return raw || [];
    } catch (e) {
      return this.localFallback.getResultados180();
    }
  }
  async saveResultado180(resultado: any): Promise<void> {
    await this.localFallback.saveResultado180(resultado);
    try {
      const body = {
        id: resultado.id,
        colaborador_id: resultado.colaboradorId,
        data_realizacao: resultado.dataRealizacao,
        resultado: resultado.resultado,
        media_geral: resultado.mediaGeral,
        media_ponderada: resultado.mediaPonderada,
        respostas_json: JSON.stringify(resultado.respostas),
        observacoes: resultado.observacoes,
        avaliador_id: resultado.avaliadorId,
        tipo: resultado.tipo || '180',
      };
      await this.request('saveResultado180', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar resultado 180 no GoogleScript:', e);
    }
  }
  async deleteResultado180(id: string): Promise<void> {
    await this.localFallback.deleteResultado180(id);
    try {
      await this.request('deleteResultado180', { id });
    } catch (e) {
      console.warn('Erro ao excluir resultado 180 no GoogleScript:', e);
    }
  }

  // Alertas Inteligentes (usando localStorage como fallback)
  async getAlertasInteligentes(): Promise<AlertaInteligente[]> {
    return this.localFallback.getAlertasInteligentes();
  }
  async saveAlertaInteligente(alerta: AlertaInteligente): Promise<void> {
    await this.localFallback.saveAlertaInteligente(alerta);
  }
  async deleteAlertaInteligente(id: string): Promise<void> {
    await this.localFallback.deleteAlertaInteligente(id);
  }
  async getConfiguracaoAlertas(): Promise<ConfiguracaoAlertas> {
    return this.localFallback.getConfiguracaoAlertas();
  }
  async saveConfiguracaoAlertas(config: ConfiguracaoAlertas): Promise<void> {
    await this.localFallback.saveConfiguracaoAlertas(config);
  }
  async gerarIdAlerta(): Promise<string> {
    return this.localFallback.gerarIdAlerta();
  }

  // P3: Documentos
  async getDocumentos(): Promise<Documento[]> {
    return this.localFallback.getDocumentos();
  }
  async saveDocumento(doc: Documento): Promise<void> {
    await this.localFallback.saveDocumento(doc);
  }
  async deleteDocumento(id: string): Promise<void> {
    await this.localFallback.deleteDocumento(id);
  }

  // P4: Reconhecimento
  async getConfiguracaoReconhecimento(): Promise<ConfiguracaoReconhecimento> {
    return this.localFallback.getConfiguracaoReconhecimento();
  }
  async saveConfiguracaoReconhecimento(config: ConfiguracaoReconhecimento): Promise<void> {
    await this.localFallback.saveConfiguracaoReconhecimento(config);
  }
  async getReconhecimentos(): Promise<Reconhecimento[]> {
    return this.localFallback.getReconhecimentos();
  }
  async saveReconhecimento(rec: Reconhecimento): Promise<void> {
    await this.localFallback.saveReconhecimento(rec);
  }
  async deleteReconhecimento(id: string): Promise<void> {
    await this.localFallback.deleteReconhecimento(id);
  }

  // P5: Metas
  async getMetasLideranca(): Promise<MetaLideranca[]> {
    return this.localFallback.getMetasLideranca();
  }
  async saveMetaLideranca(meta: MetaLideranca): Promise<void> {
    await this.localFallback.saveMetaLideranca(meta);
  }
  async deleteMetaLideranca(id: string): Promise<void> {
    await this.localFallback.deleteMetaLideranca(id);
  }
  async getMetasSetor(): Promise<MetaSetor[]> {
    return this.localFallback.getMetasSetor();
  }
  async saveMetaSetor(meta: MetaSetor): Promise<void> {
    await this.localFallback.saveMetaSetor(meta);
  }
  async deleteMetaSetor(id: string): Promise<void> {
    await this.localFallback.deleteMetaSetor(id);
  }
  async getAcompanhamentos(): Promise<AcompanhamentoRealizado[]> {
    return this.localFallback.getAcompanhamentos();
  }
  async saveAcompanhamento(acomp: AcompanhamentoRealizado): Promise<void> {
    await this.localFallback.saveAcompanhamento(acomp);
  }
  async deleteAcompanhamento(id: string): Promise<void> {
    await this.localFallback.deleteAcompanhamento(id);
  }

  async uploadFile(
    file: File,
    folderName: 'Fotos Colaboradores' | 'Anexos' | 'documentos',
    colaboradorNome: string
  ): Promise<string> {
    try {
      // Fotos de colaboradores são redimensionadas/comprimidas no navegador antes do
      // envio (mais rápido e mais seguro contra limites de payload). Documentos e
      // anexos (podem ser PDF etc.) são enviados sem alteração.
      const { base64, mimeType } =
        folderName === 'Fotos Colaboradores'
          ? await fileToOptimizedBase64(file)
          : { base64: await fileToBase64(file), mimeType: file.type };

      // Chamar Google Apps Script para salvar no Drive
      const result = await this.request<{ url: string }>('salvarArquivoDrive', {
        folderName,
        colaboradorNome,
        fileName: file.name,
        fileData: base64,
        mimeType,
      });

      return result.url;
    } catch (err) {
      console.warn('Erro ao fazer upload no Google Drive, usando fallback local:', err);
      // Fallback: retorna base64 local
      return this.localFallback.uploadFile(file, folderName, colaboradorNome);
    }
  }

  // P6: Gestão de Pessoas - Usa fallback local (dados não sincronizados com Google Sheets)
  async getFerias(): Promise<Ferias[]> {
    return this.localFallback.getFerias();
  }
  async saveFerias(ferias: Ferias): Promise<void> {
    await this.localFallback.saveFerias(ferias);
  }
  async deleteFerias(id: string): Promise<void> {
    await this.localFallback.deleteFerias(id);
  }
  async getDayOffs(): Promise<DayOff[]> {
    return this.localFallback.getDayOffs();
  }
  async saveDayOff(dayoff: DayOff): Promise<void> {
    await this.localFallback.saveDayOff(dayoff);
  }
  async deleteDayOff(id: string): Promise<void> {
    await this.localFallback.deleteDayOff(id);
  }
  async getFolgas(): Promise<Folga[]> {
    return this.localFallback.getFolgas();
  }
  async saveFolga(folga: Folga): Promise<void> {
    await this.localFallback.saveFolga(folga);
  }
  async deleteFolga(id: string): Promise<void> {
    await this.localFallback.deleteFolga(id);
  }
  async getPeriodosAquisitivos(): Promise<PeriodoAquisitivo[]> {
    return this.localFallback.getPeriodosAquisitivos();
  }
  async savePeriodoAquisitivo(periodo: PeriodoAquisitivo): Promise<void> {
    await this.localFallback.savePeriodoAquisitivo(periodo);
  }
  async deletePeriodoAquisitivo(id: string): Promise<void> {
    await this.localFallback.deletePeriodoAquisitivo(id);
  }
  async getConfiguracaoGestaoPessoas(): Promise<ConfiguracaoGestaoPessoas> {
    return this.localFallback.getConfiguracaoGestaoPessoas();
  }
  async saveConfiguracaoGestaoPessoas(config: ConfiguracaoGestaoPessoas): Promise<void> {
    await this.localFallback.saveConfiguracaoGestaoPessoas(config);
  }

  // Férias Inteligentes
  async getAlertasFerias(): Promise<AlertaFerias[]> {
    return this.localFallback.getAlertasFerias();
  }
  async saveAlertaFerias(alerta: AlertaFerias): Promise<void> {
    await this.localFallback.saveAlertaFerias(alerta);
  }
  async deleteAlertaFerias(id: string): Promise<void> {
    await this.localFallback.deleteAlertaFerias(id);
  }
  async getConfiguracaoFerias(): Promise<ConfiguracaoFerias> {
    return this.localFallback.getConfiguracaoFerias();
  }
  async saveConfiguracaoFerias(config: ConfiguracaoFerias): Promise<void> {
    await this.localFallback.saveConfiguracaoFerias(config);
  }
}

// -----------------------------------------------------------------
// 4. DESPACHANTE DINÂMICO (FACADE / UNIFIED DISPATCHER)
// -----------------------------------------------------------------
class DynamicDataService implements IDataService {
  private getService(): IDataService {
    const config = StorageAPI.getGoogleScriptConfig();
    return new GoogleScriptDataService(config);
  }

  async getEmpresas(): Promise<Empresa[]> {
    return this.getService().getEmpresas();
  }
  async getSetores(): Promise<Setor[]> {
    return this.getService().getSetores();
  }
  async getCargos(): Promise<Cargo[]> {
    return this.getService().getCargos();
  }
  async getLideres(): Promise<Lider[]> {
    return this.getService().getLideres();
  }
  async getColaboradores(): Promise<Colaborador[]> {
    return this.getService().getColaboradores();
  }
  async getTimeline(): Promise<TimelineRegistro[]> {
    return this.getService().getTimeline();
  }
  async getTarefas(): Promise<Tarefa[]> {
    return this.getService().getTarefas();
  }
  async getUsuarios(): Promise<Usuario[]> {
    return this.getService().getUsuarios();
  }

  async saveEmpresa(empresa: Empresa): Promise<void> {
    await this.getService().saveEmpresa(empresa);
  }
  async saveSetor(setor: Setor): Promise<void> {
    await this.getService().saveSetor(setor);
  }
  async saveCargo(cargo: Cargo): Promise<void> {
    await this.getService().saveCargo(cargo);
  }
  async saveLider(lider: Lider): Promise<void> {
    await this.getService().saveLider(lider);
  }
  async saveColaborador(colaborador: Colaborador): Promise<void> {
    await this.getService().saveColaborador(colaborador);
  }
  async deleteColaborador(id: string): Promise<void> {
    await this.getService().deleteColaborador(id);
  }
  async saveTimelineRegistro(registro: TimelineRegistro): Promise<void> {
    await this.getService().saveTimelineRegistro(registro);
  }
  async saveTarefa(tarefa: Tarefa): Promise<void> {
    await this.getService().saveTarefa(tarefa);
  }
  async toggleTarefa(id: string): Promise<Tarefa | undefined> {
    return this.getService().toggleTarefa(id);
  }
  async saveUsuario(usuario: Usuario): Promise<void> {
    await this.getService().saveUsuario(usuario);
  }
  async deleteUsuario(id: string): Promise<void> {
    await this.getService().deleteUsuario(id);
  }
  async uploadFile(
    file: File,
    folderName: 'Fotos Colaboradores' | 'Anexos' | 'documentos',
    colaboradorNome: string
  ): Promise<string> {
    return this.getService().uploadFile(file, folderName, colaboradorNome);
  }
  async getOnboardingItems(): Promise<OnboardingItem[]> {
    return this.getService().getOnboardingItems();
  }
  async saveOnboardingItem(item: OnboardingItem): Promise<void> {
    await this.getService().saveOnboardingItem(item);
  }
  async deleteOnboardingItem(id: string): Promise<void> {
    await this.getService().deleteOnboardingItem(id);
  }
  async getOnboardingChecklists(): Promise<OnboardingChecklist[]> {
    return this.getService().getOnboardingChecklists();
  }
  async saveOnboardingChecklist(checklist: OnboardingChecklist): Promise<void> {
    await this.getService().saveOnboardingChecklist(checklist);
  }

  // Avaliações de Experiência
  async getAvaliacoesExperiencia(): Promise<any[]> {
    return this.getService().getAvaliacoesExperiencia();
  }
  async saveAvaliacaoExperiencia(avaliacao: any): Promise<void> {
    await this.getService().saveAvaliacaoExperiencia(avaliacao);
  }
  async deleteAvaliacaoExperiencia(id: string): Promise<void> {
    await this.getService().deleteAvaliacaoExperiencia(id);
  }

  // Resultados Avaliação 180°
  async getResultados180(): Promise<any[]> {
    return this.getService().getResultados180();
  }
  async saveResultado180(resultado: any): Promise<void> {
    await this.getService().saveResultado180(resultado);
  }
  async deleteResultado180(id: string): Promise<void> {
    await this.getService().deleteResultado180(id);
  }

  // Alertas Inteligentes
  async getAlertasInteligentes(): Promise<AlertaInteligente[]> {
    return this.getService().getAlertasInteligentes();
  }
  async saveAlertaInteligente(alerta: AlertaInteligente): Promise<void> {
    await this.getService().saveAlertaInteligente(alerta);
  }
  async deleteAlertaInteligente(id: string): Promise<void> {
    await this.getService().deleteAlertaInteligente(id);
  }
  async getConfiguracaoAlertas(): Promise<ConfiguracaoAlertas> {
    return this.getService().getConfiguracaoAlertas();
  }
  async saveConfiguracaoAlertas(config: ConfiguracaoAlertas): Promise<void> {
    await this.getService().saveConfiguracaoAlertas(config);
  }
  async gerarIdAlerta(): Promise<string> {
    return this.getService().gerarIdAlerta();
  }

  // P3: Documentos
  async getDocumentos(): Promise<Documento[]> {
    return this.getService().getDocumentos();
  }
  async saveDocumento(doc: Documento): Promise<void> {
    await this.getService().saveDocumento(doc);
  }
  async deleteDocumento(id: string): Promise<void> {
    await this.getService().deleteDocumento(id);
  }

  // P4: Reconhecimento
  async getConfiguracaoReconhecimento(): Promise<ConfiguracaoReconhecimento> {
    return this.getService().getConfiguracaoReconhecimento();
  }
  async saveConfiguracaoReconhecimento(config: ConfiguracaoReconhecimento): Promise<void> {
    await this.getService().saveConfiguracaoReconhecimento(config);
  }
  async getReconhecimentos(): Promise<Reconhecimento[]> {
    return this.getService().getReconhecimentos();
  }
  async saveReconhecimento(rec: Reconhecimento): Promise<void> {
    await this.getService().saveReconhecimento(rec);
  }
  async deleteReconhecimento(id: string): Promise<void> {
    await this.getService().deleteReconhecimento(id);
  }

  // P5: Metas
  async getMetasLideranca(): Promise<MetaLideranca[]> {
    return this.getService().getMetasLideranca();
  }
  async saveMetaLideranca(meta: MetaLideranca): Promise<void> {
    await this.getService().saveMetaLideranca(meta);
  }
  async deleteMetaLideranca(id: string): Promise<void> {
    await this.getService().deleteMetaLideranca(id);
  }
  async getMetasSetor(): Promise<MetaSetor[]> {
    return this.getService().getMetasSetor();
  }
  async saveMetaSetor(meta: MetaSetor): Promise<void> {
    await this.getService().saveMetaSetor(meta);
  }
  async deleteMetaSetor(id: string): Promise<void> {
    await this.getService().deleteMetaSetor(id);
  }
  async getAcompanhamentos(): Promise<AcompanhamentoRealizado[]> {
    return this.getService().getAcompanhamentos();
  }
  async saveAcompanhamento(acomp: AcompanhamentoRealizado): Promise<void> {
    await this.getService().saveAcompanhamento(acomp);
  }
  async deleteAcompanhamento(id: string): Promise<void> {
    await this.getService().deleteAcompanhamento(id);
  }

  // P6: Gestão de Pessoas
  async getFerias(): Promise<Ferias[]> {
    return this.getService().getFerias();
  }
  async saveFerias(ferias: Ferias): Promise<void> {
    await this.getService().saveFerias(ferias);
  }
  async deleteFerias(id: string): Promise<void> {
    await this.getService().deleteFerias(id);
  }
  async getDayOffs(): Promise<DayOff[]> {
    return this.getService().getDayOffs();
  }
  async saveDayOff(dayoff: DayOff): Promise<void> {
    await this.getService().saveDayOff(dayoff);
  }
  async deleteDayOff(id: string): Promise<void> {
    await this.getService().deleteDayOff(id);
  }
  async getFolgas(): Promise<Folga[]> {
    return this.getService().getFolgas();
  }
  async saveFolga(folga: Folga): Promise<void> {
    await this.getService().saveFolga(folga);
  }
  async deleteFolga(id: string): Promise<void> {
    await this.getService().deleteFolga(id);
  }
  async getPeriodosAquisitivos(): Promise<PeriodoAquisitivo[]> {
    return this.getService().getPeriodosAquisitivos();
  }
  async savePeriodoAquisitivo(periodo: PeriodoAquisitivo): Promise<void> {
    await this.getService().savePeriodoAquisitivo(periodo);
  }
  async deletePeriodoAquisitivo(id: string): Promise<void> {
    await this.getService().deletePeriodoAquisitivo(id);
  }
  async getConfiguracaoGestaoPessoas(): Promise<ConfiguracaoGestaoPessoas> {
    return this.getService().getConfiguracaoGestaoPessoas();
  }
  async saveConfiguracaoGestaoPessoas(config: ConfiguracaoGestaoPessoas): Promise<void> {
    await this.getService().saveConfiguracaoGestaoPessoas(config);
  }

  // Férias Inteligentes
  async getAlertasFerias(): Promise<AlertaFerias[]> {
    return this.getService().getAlertasFerias();
  }
  async saveAlertaFerias(alerta: AlertaFerias): Promise<void> {
    await this.getService().saveAlertaFerias(alerta);
  }
  async deleteAlertaFerias(id: string): Promise<void> {
    await this.getService().deleteAlertaFerias(id);
  }
  async getConfiguracaoFerias(): Promise<ConfiguracaoFerias> {
    return this.getService().getConfiguracaoFerias();
  }
  async saveConfiguracaoFerias(config: ConfiguracaoFerias): Promise<void> {
    await this.getService().saveConfiguracaoFerias(config);
  }

  async resetData(): Promise<void> {
    await this.getService().resetData();
  }
}

export const DataService = new DynamicDataService();
