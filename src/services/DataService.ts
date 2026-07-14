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
} from '../types';
import { StorageAPI } from '../utils/storage';

export interface IDataService {
  getEmpresas(): Promise<Empresa[]>;
  getSetores(): Promise<Setor[]>;
  getCargos(): Promise<Cargo[]>;
  getLideres(): Promise<Lider[]>;
  getColaboradores(): Promise<Colaborador[]>;
  getTimeline(): Promise<TimelineRegistro[]>;
  getTarefas(): Promise<Tarefa[]>;

  saveEmpresa(empresa: Empresa): Promise<void>;
  saveSetor(setor: Setor): Promise<void>;
  saveCargo(cargo: Cargo): Promise<void>;
  saveLider(lider: Lider): Promise<void>;
  saveColaborador(colaborador: Colaborador): Promise<void>;
  saveTimelineRegistro(registro: TimelineRegistro): Promise<void>;
  saveTarefa(tarefa: Tarefa): Promise<void>;
  toggleTarefa(id: string): Promise<Tarefa | undefined>;

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
  async toggleTarefa(id: string): Promise<Tarefa | undefined> {
    return StorageAPI.toggleTarefa(id);
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
    if (!this.config.webAppUrl) {
      throw new Error('URL do Google Apps Script não configurada.');
    }

    const url = new URL(this.config.webAppUrl);
    url.searchParams.set('action', action);

    const options: RequestInit = {
      method: payload ? 'POST' : 'GET',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      },
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
    if (result.status === 'error') {
      throw new Error(result.message || 'Erro reportado pelo Google Apps Script.');
    }

    return result.data as T;
  }

  async getEmpresas(): Promise<Empresa[]> {
    try {
      return await this.request<Empresa[]>('getEmpresas');
    } catch (e) {
      console.warn('Erro ao conectar ao Google Sheets, usando fallback local:', e);
      return this.localFallback.getEmpresas();
    }
  }

  async getSetores(): Promise<Setor[]> {
    try {
      return await this.request<Setor[]>('getSetores');
    } catch (e) {
      console.warn('Erro ao conectar ao Google Sheets, usando fallback local:', e);
      return this.localFallback.getSetores();
    }
  }

  async getCargos(): Promise<Cargo[]> {
    try {
      return await this.request<Cargo[]>('getCargos');
    } catch (e) {
      console.warn('Erro ao conectar ao Google Sheets, usando fallback local:', e);
      return this.localFallback.getCargos();
    }
  }

  async getLideres(): Promise<Lider[]> {
    try {
      return await this.request<Lider[]>('getLideres');
    } catch (e) {
      console.warn('Erro ao conectar ao Google Sheets, usando fallback local:', e);
      return this.localFallback.getLideres();
    }
  }

  async getColaboradores(): Promise<Colaborador[]> {
    try {
      return await this.request<Colaborador[]>('getColaboradores');
    } catch (e) {
      console.warn('Erro ao conectar ao Google Sheets, usando fallback local:', e);
      return this.localFallback.getColaboradores();
    }
  }

  async getTimeline(): Promise<TimelineRegistro[]> {
    try {
      return await this.request<TimelineRegistro[]>('getTimeline');
    } catch (e) {
      console.warn('Erro ao conectar ao Google Sheets, usando fallback local:', e);
      return this.localFallback.getTimeline();
    }
  }

  async getTarefas(): Promise<Tarefa[]> {
    try {
      return await this.request<Tarefa[]>('getTarefas');
    } catch (e) {
      console.warn('Erro ao conectar ao Google Sheets, usando fallback local:', e);
      return this.localFallback.getTarefas();
    }
  }

  async saveEmpresa(empresa: Empresa): Promise<void> {
    // Atualiza localmente primeiro como cache
    await this.localFallback.saveEmpresa(empresa);
    if (this.config.webAppUrl) {
      try {
        await this.request('saveEmpresa', { data: empresa });
      } catch (e) {
        console.error('Falha ao sincronizar salvamento com o Google Sheets:', e);
      }
    }
  }

  async saveSetor(setor: Setor): Promise<void> {
    await this.localFallback.saveSetor(setor);
    if (this.config.webAppUrl) {
      try {
        await this.request('saveSetor', { data: setor });
      } catch (e) {
        console.error('Falha ao sincronizar salvamento com o Google Sheets:', e);
      }
    }
  }

  async saveCargo(cargo: Cargo): Promise<void> {
    await this.localFallback.saveCargo(cargo);
    if (this.config.webAppUrl) {
      try {
        await this.request('saveCargo', { data: cargo });
      } catch (e) {
        console.error('Falha ao sincronizar salvamento com o Google Sheets:', e);
      }
    }
  }

  async saveLider(lider: Lider): Promise<void> {
    await this.localFallback.saveLider(lider);
    if (this.config.webAppUrl) {
      try {
        await this.request('saveLider', { data: lider });
      } catch (e) {
        console.error('Falha ao sincronizar salvamento com o Google Sheets:', e);
      }
    }
  }

  async saveColaborador(colaborador: Colaborador): Promise<void> {
    await this.localFallback.saveColaborador(colaborador);
    if (this.config.webAppUrl) {
      try {
        await this.request('saveColaborador', { data: colaborador });
      } catch (e) {
        console.error('Falha ao sincronizar salvamento com o Google Sheets:', e);
      }
    }
  }

  async saveTimelineRegistro(registro: TimelineRegistro): Promise<void> {
    await this.localFallback.saveTimelineRegistro(registro);
    if (this.config.webAppUrl) {
      try {
        await this.request('saveTimelineRegistro', { data: registro });
      } catch (e) {
        console.error('Falha ao sincronizar salvamento com o Google Sheets:', e);
      }
    }
  }

  async saveTarefa(tarefa: Tarefa): Promise<void> {
    await this.localFallback.saveTarefa(tarefa);
    if (this.config.webAppUrl) {
      try {
        await this.request('saveTarefa', { data: tarefa });
      } catch (e) {
        console.error('Falha ao sincronizar salvamento com o Google Sheets:', e);
      }
    }
  }

  async toggleTarefa(id: string): Promise<Tarefa | undefined> {
    const tarefa = await this.localFallback.toggleTarefa(id);
    if (tarefa && this.config.webAppUrl) {
      try {
        await this.request('saveTarefa', { data: tarefa });
      } catch (e) {
        console.error('Falha ao sincronizar alternância de tarefa com o Google Sheets:', e);
      }
    }
    return tarefa;
  }

  async resetData(): Promise<void> {
    await this.localFallback.resetData();
    if (this.config.webAppUrl) {
      try {
        await this.request('resetData');
      } catch (e) {
        console.error('Falha ao sincronizar reset com o Google Sheets:', e);
      }
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
      // Mapeia snake_case para camelCase
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
        // Use upsert via POST with Prefer: resolution=merge-duplicates or do PATCH if existing
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
}

// -----------------------------------------------------------------
// 4. DESPACHANTE DINÂMICO (FACADE / UNIFIED DISPATCHER)
// -----------------------------------------------------------------
class DynamicDataService implements IDataService {
  private getService(): IDataService {
    const provider = StorageAPI.getDataSourceProvider();
    if (provider === 'googlescript') {
      const config = StorageAPI.getGoogleScriptConfig();
      return new GoogleScriptDataService(config);
    } else if (provider === 'supabase') {
      const config = StorageAPI.getSupabaseConfig();
      return new SupabaseDataService(config);
    }
    return new LocalDataService();
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
  async resetData(): Promise<void> {
    await this.getService().resetData();
  }
}

export const DataService = new DynamicDataService();
