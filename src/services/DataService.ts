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
    const url = new URL('/api/googlescript', window.location.origin);
    url.searchParams.set('action', action);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.webAppUrl) {
      headers['x-google-script-url'] = this.config.webAppUrl;
    }

    const options: RequestInit = {
      method: payload ? 'POST' : 'GET',
      mode: 'cors',
      headers,
    };

    if (payload) {
      options.body = JSON.stringify({
        action,
        ...payload,
      });
    }

    const response = await fetch(url.toString(), options);
    if (!response.ok) {
      throw new Error(`Erro na chamada do Google Apps Script: ${response.statusText}`);
    }

    const result = await response.json();
    if (result.status === 'error' || result.success === false) {
      throw new Error(result.message || 'Erro reportado pelo Google Apps Script.');
    }

    return result.data as T;
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

        return {
          id: String(c.id || ''),
          nome: String(c.nome || ''),
          email: String(c.email || ''),
          fotoUrl: String(c.foto_url || c.fotoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'),
          cargoId: String(c.cargo_id || c.cargoId || ''),
          setorId: String(c.setor_id || c.setorId || ''),
          liderId: String(c.lider_id || c.liderId || ''),
          dataAdmissao: String(c.data_admissao || c.dataAdmissao || ''),
          situacao: (c.situacao || (c.ativo === false ? 'Desligado' : 'Ativo')) as any,
          empresaId: String(c.empresa_id || c.empresaId || ''),
          telefone: String(c.telefone || ''),
          cidadeBase: String(c.cidade_base || c.cidadeBase || ''),
          prazoAvaliacao180: Number(c.prazo_avaliacao_180 ?? c.prazoAvaliacao180 ?? 6),
          realizarExperiencia: c.realizar_experiencia === true || c.realizar_experiencia === 'true' || c.realizar_experiencia === 1 || c.realizar_experiencia === '1' || c.realizar_experiencia === undefined || c.realizarExperiencia === true,
          avaliacoesCompletas: completed,
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
    await this.localFallback.saveColaborador(colaborador);
    const body = {
      id: colaborador.id,
      nome: colaborador.nome,
      email: colaborador.email,
      telefone: colaborador.telefone || '',
      cargo_id: colaborador.cargoId,
      setor_id: colaborador.setorId,
      lider_id: colaborador.liderId,
      data_admissao: colaborador.dataAdmissao,
      situacao: colaborador.situacao,
      empresa_id: colaborador.empresaId,
      foto_url: colaborador.fotoUrl,
      ativo: colaborador.situacao !== 'Desligado',
      cidade_base: colaborador.cidadeBase || '',
      prazo_avaliacao_180: colaborador.prazoAvaliacao180 ?? 6,
      realizar_experiencia: colaborador.realizarExperiencia ?? true,
      avaliacoes_completas: colaborador.avaliacoesCompletas || [],
    };

    try {
      await this.request('saveColaborador', { data: body });
    } catch (err) {
      try {
        await this.request('salvarColaborador', { data: body });
      } catch (err2) {
        try {
          await this.request('novoColaborador', body);
        } catch (err3) {
          console.warn('Erro ao sincronizar colaborador com GoogleScript (usando fallback local):', err3);
        }
      }
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
        setorId: String(i.setor_id || i.setorId || ''),
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
        setor_id: item.setorId,
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

  async uploadFile(
    file: File,
    folderName: 'Fotos Colaboradores' | 'Anexos' | 'documentos',
    colaboradorNome: string
  ): Promise<string> {
    const base64Data = await fileToBase64(file);
    if (!this.config.webAppUrl) {
      return base64Data;
    }
    try {
      const response = await this.request<{ url: string }>('salvarArquivoDrive', {
        folderName,
        colaboradorNome,
        fileName: file.name,
        fileData: base64Data,
        mimeType: file.type
      });
      return response.url;
    } catch (e) {
      console.warn('Erro ao salvar arquivo no Drive via Apps Script:', e);
      return this.localFallback.uploadFile(file, folderName, colaboradorNome);
    }
  }
}

// -----------------------------------------------------------------
// 3. IMPLEMENTAÇÃO SUPABASE REST CLIENT (PRONTA PARA FUTURO SWAP)
// -----------------------------------------------------------------
export class SupabaseDataService implements IDataService {
  private config: SupabaseConfig;
  private localFallback = new LocalDataService();

  constructor(config: SupabaseConfig) {
    this.config = config;
  }

  private async request<T>(
    table: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
    body?: any,
    queryParam = ''
  ): Promise<T> {
    if (!this.config.supabaseUrl || !this.config.supabaseAnonKey) {
      throw new Error('URL ou Chave Anon do Supabase não configuradas.');
    }

    const url = `${this.config.supabaseUrl}/rest/v1/${table}${queryParam}`;
    const headers: HeadersInit = {
      'apikey': this.config.supabaseAnonKey,
      'Authorization': `Bearer ${this.config.supabaseAnonKey}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation' : 'count=exact',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`Erro de rede no Supabase (${table}): ${response.statusText}`);
    }

    return await response.json();
  }

  async getEmpresas(): Promise<Empresa[]> {
    try {
      return await this.request<Empresa[]>('empresas');
    } catch (e) {
      console.warn('Erro ao consultar Supabase, usando local:', e);
      return this.localFallback.getEmpresas();
    }
  }

  async getSetores(): Promise<Setor[]> {
    try {
      return await this.request<Setor[]>('setores');
    } catch (e) {
      console.warn('Erro ao consultar Supabase, usando local:', e);
      return this.localFallback.getSetores();
    }
  }

  async getCargos(): Promise<Cargo[]> {
    try {
      return await this.request<Cargo[]>('cargos');
    } catch (e) {
      console.warn('Erro ao consultar Supabase, usando local:', e);
      return this.localFallback.getCargos();
    }
  }

  async getLideres(): Promise<Lider[]> {
    try {
      return await this.request<Lider[]>('lideres');
    } catch (e) {
      console.warn('Erro ao consultar Supabase, usando local:', e);
      return this.localFallback.getLideres();
    }
  }

  async getColaboradores(): Promise<Colaborador[]> {
    try {
      const raw = await this.request<any[]>('colaboradores');
      return raw.map(c => ({
        id: c.id,
        nome: c.nome,
        email: c.email,
        fotoUrl: c.foto_url,
        cargoId: c.cargo_id,
        setorId: c.setor_id,
        liderId: c.lider_id,
        dataAdmissao: c.data_admissao,
        situacao: c.situacao,
        empresaId: c.empresa_id,
        telefone: c.telefone
      }));
    } catch (e) {
      console.warn('Erro ao consultar Supabase, usando local:', e);
      return this.localFallback.getColaboradores();
    }
  }

  async getTimeline(): Promise<TimelineRegistro[]> {
    try {
      const raw = await this.request<any[]>('timeline_registros');
      return raw.map(r => ({
        id: r.id,
        colaboradorId: r.colaborador_id,
        tipo: r.tipo,
        data: r.data,
        titulo: r.titulo,
        descricao: r.descricao,
        responsavelId: r.responsavel_id,
        prioridade: r.prioridade,
        status: r.status,
        prazoAcompanhamento: r.prazo_acompanhamento,
        gerarTarefaFutura: r.gerar_tarefa_futura,
        anexos: typeof r.anexos === 'string' ? JSON.parse(r.anexos) : (r.anexos || []),
        tarefaId: r.tarefa_id
      }));
    } catch (e) {
      console.warn('Erro ao consultar Supabase, usando local:', e);
      return this.localFallback.getTimeline();
    }
  }

  async getTarefas(): Promise<Tarefa[]> {
    try {
      const raw = await this.request<any[]>('tarefas');
      return raw.map(t => ({
        id: t.id,
        colaboradorId: t.colaborador_id,
        titulo: t.titulo,
        descricao: t.descricao,
        vencimento: t.vencimento,
        concluida: t.concluida,
        tipoOrigem: t.tipo_origem,
        registroId: t.registro_id,
        responsavelId: t.responsavel_id
      }));
    } catch (e) {
      console.warn('Erro ao consultar Supabase, usando local:', e);
      return this.localFallback.getTarefas();
    }
  }

  async saveEmpresa(empresa: Empresa): Promise<void> {
    await this.localFallback.saveEmpresa(empresa);
    if (this.config.supabaseUrl) {
      try {
        await this.request('empresas', 'POST', empresa);
      } catch (e) {
        console.error('Erro ao sincronizar empresa com Supabase:', e);
      }
    }
  }

  async saveSetor(setor: Setor): Promise<void> {
    await this.localFallback.saveSetor(setor);
    if (this.config.supabaseUrl) {
      try {
        await this.request('setores', 'POST', setor);
      } catch (e) {
        console.error('Erro ao sincronizar setor com Supabase:', e);
      }
    }
  }

  async saveCargo(cargo: Cargo): Promise<void> {
    await this.localFallback.saveCargo(cargo);
    if (this.config.supabaseUrl) {
      try {
        await this.request('cargos', 'POST', cargo);
      } catch (e) {
        console.error('Erro ao sincronizar cargo com Supabase:', e);
      }
    }
  }

  async saveLider(lider: Lider): Promise<void> {
    await this.localFallback.saveLider(lider);
    if (this.config.supabaseUrl) {
      try {
        const body = {
          id: lider.id,
          nome: lider.nome,
          email: lider.email,
          cargo: lider.cargo,
          foto_url: lider.fotoUrl,
        };
        await this.request('lideres', 'POST', body);
      } catch (e) {
        console.error('Erro ao sincronizar lider com Supabase:', e);
      }
    }
  }

  async saveColaborador(colaborador: Colaborador): Promise<void> {
    await this.localFallback.saveColaborador(colaborador);
    if (this.config.supabaseUrl) {
      try {
        const body = {
          id: colaborador.id,
          nome: colaborador.nome,
          email: colaborador.email,
          foto_url: colaborador.fotoUrl,
          cargo_id: colaborador.cargoId,
          setor_id: colaborador.setorId,
          lider_id: colaborador.liderId,
          data_admissao: colaborador.dataAdmissao,
          situacao: colaborador.situacao,
          empresa_id: colaborador.empresaId,
          telefone: colaborador.telefone,
        };
        await this.request('colaboradores', 'POST', body);
      } catch (e) {
        console.error('Erro ao sincronizar colaborador com Supabase:', e);
      }
    }
  }

  async saveTimelineRegistro(registro: TimelineRegistro): Promise<void> {
    await this.localFallback.saveTimelineRegistro(registro);
    if (this.config.supabaseUrl) {
      try {
        const body = {
          id: registro.id,
          colaborador_id: registro.colaboradorId,
          tipo: registro.tipo,
          data: registro.data,
          titulo: registro.titulo,
          descricao: registro.descricao,
          responsavel_id: registro.responsavelId,
          prioridade: registro.prioridade,
          status: registro.status,
          prazo_acompanhamento: registro.prazoAcompanhamento,
          gerar_tarefa_futura: registro.gerarTarefaFutura,
          anexos: JSON.stringify(registro.anexos),
          tarefa_id: registro.tarefaId,
        };
        await this.request('timeline_registros', 'POST', body);
      } catch (e) {
        console.error('Erro ao sincronizar registro com Supabase:', e);
      }
    }
  }

  async saveTarefa(tarefa: Tarefa): Promise<void> {
    await this.localFallback.saveTarefa(tarefa);
    if (this.config.supabaseUrl) {
      try {
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
        };
        await this.request('tarefas', 'POST', body);
      } catch (e) {
        console.error('Erro ao sincronizar tarefa com Supabase:', e);
      }
    }
  }

  async toggleTarefa(id: string): Promise<Tarefa | undefined> {
    const tarefa = await this.localFallback.toggleTarefa(id);
    if (tarefa && this.config.supabaseUrl) {
      try {
        await this.request(`tarefas`, 'PATCH', { concluida: tarefa.concluida }, `?id=eq.${id}`);
      } catch (e) {
        console.error('Erro ao sincronizar toggle da tarefa no Supabase:', e);
      }
    }
    return tarefa;
  }

  async resetData(): Promise<void> {
    await this.localFallback.resetData();
  }

  async getUsuarios(): Promise<Usuario[]> {
    try {
      const raw = await this.request<any[]>('usuarios');
      return raw.map(u => ({
        id: u.id,
        nome: u.nome,
        email: u.email,
        senha_hash: u.senha_hash,
        perfil: u.perfil,
        setor_id: u.setor_id,
        ativo: u.ativo,
        ultimo_login: u.ultimo_login
      }));
    } catch (e) {
      console.warn('Erro ao consultar Supabase para usuarios, usando local:', e);
      return this.localFallback.getUsuarios();
    }
  }

  async saveUsuario(usuario: Usuario): Promise<void> {
    await this.localFallback.saveUsuario(usuario);
    if (this.config.supabaseUrl) {
      try {
        const body = {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          senha_hash: usuario.senha_hash || '',
          perfil: usuario.perfil,
          setor_id: usuario.setor_id,
          ativo: usuario.ativo,
          ultimo_login: usuario.ultimo_login || null
        };
        await this.request('usuarios', 'POST', body);
      } catch (e) {
        console.error('Erro ao sincronizar usuario com Supabase:', e);
      }
    }
  }

  async deleteUsuario(id: string): Promise<void> {
    await this.localFallback.deleteUsuario(id);
    if (this.config.supabaseUrl) {
      try {
        await this.request(`usuarios`, 'DELETE', undefined, `?id=eq.${id}`);
      } catch (e) {
        console.error('Erro ao excluir usuario do Supabase:', e);
      }
    }
  }

  async getOnboardingItems(): Promise<OnboardingItem[]> {
    return this.localFallback.getOnboardingItems();
  }
  async saveOnboardingItem(item: OnboardingItem): Promise<void> {
    await this.localFallback.saveOnboardingItem(item);
  }
  async deleteOnboardingItem(id: string): Promise<void> {
    await this.localFallback.deleteOnboardingItem(id);
  }
  async getOnboardingChecklists(): Promise<OnboardingChecklist[]> {
    return this.localFallback.getOnboardingChecklists();
  }
  async saveOnboardingChecklist(checklist: OnboardingChecklist): Promise<void> {
    await this.localFallback.saveOnboardingChecklist(checklist);
  }

  async uploadFile(
    file: File,
    folderName: 'Fotos Colaboradores' | 'Anexos' | 'documentos',
    colaboradorNome: string
  ): Promise<string> {
    return this.localFallback.uploadFile(file, folderName, colaboradorNome);
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

  async resetData(): Promise<void> {
    await this.getService().resetData();
  }
}

export const DataService = new DynamicDataService();
