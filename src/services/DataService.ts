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
  ConfiguracaoEscala,
  TurnoPadrao,
  JornadaTrabalho,
  DisponibilidadeColaborador,
  RestricaoIndividual,
  FolgaFixaEscala,
  RegraCobertura,
  RotinaOperacional,
  PerfilDisponibilidadeColaborador,
  RegraDescanso,
  FeriadoEscala,
  ExcecaoEscala,
  EscalaGerada,
  TurnoEscalado,
  BancoHorasMovimento,
  FormularioTemplate,
  WorkflowDefinicao,
  FormularioInstancia,
  RespostaCampo,
  HistoricoEstadoInstancia,
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

// ═══════════════════════════════════════════════════════════════════
// ESCALA INTELIGENTE — MÓDULO 1: helper genérico de persistência local
// Usado só pelas 13 entidades novas deste módulo. Os módulos já existentes
// seguem o padrão explícito do utils/storage.ts (uma função por entidade);
// para não inflar aquele arquivo com dezenas de funções quase idênticas,
// este módulo novo usa um pequeno helper genérico, só para o fallback local
// (o "modo demo" e o cache-antes-de-sincronizar do GoogleScriptDataService).
// Ver documento de arquitetura, seção 6.
// ═══════════════════════════════════════════════════════════════════
const ESCALA_LOCAL_PREFIX = 'gc_escala_';

function escalaLocalGetArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(ESCALA_LOCAL_PREFIX + key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function escalaLocalSetArray<T>(key: string, items: T[]): void {
  localStorage.setItem(ESCALA_LOCAL_PREFIX + key, JSON.stringify(items));
}

function escalaLocalSaveItem<T extends { id: string }>(key: string, item: T): void {
  const items = escalaLocalGetArray<T>(key);
  const idx = items.findIndex((i) => i.id === item.id);
  if (idx >= 0) items[idx] = item;
  else items.push(item);
  escalaLocalSetArray(key, items);
}

function escalaLocalDeleteItem(key: string, id: string): void {
  const items = escalaLocalGetArray<{ id: string }>(key);
  escalaLocalSetArray(
    key,
    items.filter((i) => i.id !== id)
  );
}

function escalaLocalGetSingleton<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(ESCALA_LOCAL_PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function escalaLocalSetSingleton<T>(key: string, value: T): void {
  localStorage.setItem(ESCALA_LOCAL_PREFIX + key, JSON.stringify(value));
}

// ═══════════════════════════════════════════════════════════════════
// MOTOR DE FORMULÁRIOS INTELIGENTES COM WORKFLOW — helper genérico de
// persistência local (mesmo padrão do bloco "Escala Inteligente" acima,
// só com prefixo próprio). Ver documento de arquitetura, seções 2 e 8.
// ═══════════════════════════════════════════════════════════════════
const FORMULARIOS_LOCAL_PREFIX = 'gc_formularios_';

function formulariosLocalGetArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(FORMULARIOS_LOCAL_PREFIX + key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function formulariosLocalSetArray<T>(key: string, items: T[]): void {
  localStorage.setItem(FORMULARIOS_LOCAL_PREFIX + key, JSON.stringify(items));
}

function formulariosLocalSaveItem<T extends { id: string }>(key: string, item: T): void {
  const items = formulariosLocalGetArray<T>(key);
  const idx = items.findIndex((i) => i.id === item.id);
  if (idx >= 0) items[idx] = item;
  else items.push(item);
  formulariosLocalSetArray(key, items);
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

  // Escala Inteligente — Módulo 1: Base da Escala
  getConfiguracaoEscala(): Promise<ConfiguracaoEscala | null>;
  saveConfiguracaoEscala(config: ConfiguracaoEscala): Promise<void>;
  getTurnosPadrao(): Promise<TurnoPadrao[]>;
  saveTurnoPadrao(turno: TurnoPadrao): Promise<void>;
  deleteTurnoPadrao(id: string): Promise<void>;
  getJornadasTrabalho(): Promise<JornadaTrabalho[]>;
  saveJornadaTrabalho(jornada: JornadaTrabalho): Promise<void>;
  deleteJornadaTrabalho(id: string): Promise<void>;
  getDisponibilidadeColaborador(): Promise<DisponibilidadeColaborador[]>;
  saveDisponibilidadeColaborador(disp: DisponibilidadeColaborador): Promise<void>;
  deleteDisponibilidadeColaborador(id: string): Promise<void>;
  getRestricoesIndividuais(): Promise<RestricaoIndividual[]>;
  saveRestricaoIndividual(restricao: RestricaoIndividual): Promise<void>;
  deleteRestricaoIndividual(id: string): Promise<void>;
  getFolgasFixasEscala(): Promise<FolgaFixaEscala[]>;
  saveFolgaFixaEscala(folga: FolgaFixaEscala): Promise<void>;
  deleteFolgaFixaEscala(id: string): Promise<void>;
  getRegrasCobertura(): Promise<RegraCobertura[]>;
  saveRegraCobertura(regra: RegraCobertura): Promise<void>;
  deleteRegraCobertura(id: string): Promise<void>;
  getRotinasOperacionais(): Promise<RotinaOperacional[]>;
  saveRotinaOperacional(rotina: RotinaOperacional): Promise<void>;
  deleteRotinaOperacional(id: string): Promise<void>;
  getPerfisDisponibilidade(): Promise<PerfilDisponibilidadeColaborador[]>;
  savePerfilDisponibilidade(perfil: PerfilDisponibilidadeColaborador): Promise<void>;
  deletePerfilDisponibilidade(id: string): Promise<void>;
  getRegrasDescanso(): Promise<RegraDescanso[]>;
  saveRegraDescanso(regra: RegraDescanso): Promise<void>;
  deleteRegraDescanso(id: string): Promise<void>;
  getFeriadosEscala(): Promise<FeriadoEscala[]>;
  saveFeriadoEscala(feriado: FeriadoEscala): Promise<void>;
  deleteFeriadoEscala(id: string): Promise<void>;
  getExcecoesEscala(): Promise<ExcecaoEscala[]>;
  saveExcecaoEscala(excecao: ExcecaoEscala): Promise<void>;
  deleteExcecaoEscala(id: string): Promise<void>;
  getEscalasGeradas(): Promise<EscalaGerada[]>;
  saveEscalaGerada(escala: EscalaGerada): Promise<void>;
  deleteEscalaGerada(id: string): Promise<void>;
  getTurnosEscalados(escalaId: string): Promise<TurnoEscalado[]>;
  saveTurnosEscaladosBatch(escalaId: string, turnos: TurnoEscalado[]): Promise<void>;
  deleteTurnosEscaladosPorEscala(escalaId: string): Promise<void>;
  getBancoHorasMovimentos(): Promise<BancoHorasMovimento[]>;
  saveBancoHorasMovimento(mov: BancoHorasMovimento): Promise<void>;
  deleteBancoHorasMovimento(id: string): Promise<void>;

  // Motor de Formulários Inteligentes com Workflow (plataforma) — Sprint 2
  // Ver documento de arquitetura, seções 2 a 8. Avaliação de Experiência e
  // Avaliação 180° são os primeiros consumidores; qualquer processo futuro
  // usa exatamente estas mesmas ações.
  getFormularioTemplates(templateFamiliaId?: string): Promise<FormularioTemplate[]>;
  saveFormularioTemplate(template: FormularioTemplate): Promise<void>;
  getWorkflowDefinicoes(): Promise<WorkflowDefinicao[]>;
  saveWorkflowDefinicao(workflow: WorkflowDefinicao): Promise<void>;
  getFormularioInstancias(filtro?: {
    entidadeId?: string;
    tipoProcesso?: string;
    estadoWorkflow?: string;
  }): Promise<FormularioInstancia[]>;
  saveFormularioInstancia(instancia: FormularioInstancia): Promise<void>;
  getRespostasCampos(instanciaId: string): Promise<RespostaCampo[]>;
  saveRespostasCamposBatch(instanciaId: string, respostas: RespostaCampo[]): Promise<void>;
  getHistoricoEstadosInstancia(instanciaId: string): Promise<HistoricoEstadoInstancia[]>;
  saveHistoricoEstadoInstancia(historico: HistoricoEstadoInstancia): Promise<void>;

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

  // Escala Inteligente — Módulo 1: Base da Escala (fallback local / modo demo)
  async getConfiguracaoEscala(): Promise<ConfiguracaoEscala | null> {
    return escalaLocalGetSingleton<ConfiguracaoEscala>('configuracaoEscala');
  }
  async saveConfiguracaoEscala(config: ConfiguracaoEscala): Promise<void> {
    escalaLocalSetSingleton('configuracaoEscala', config);
  }
  async getTurnosPadrao(): Promise<TurnoPadrao[]> {
    return escalaLocalGetArray<TurnoPadrao>('turnosPadrao');
  }
  async saveTurnoPadrao(turno: TurnoPadrao): Promise<void> {
    escalaLocalSaveItem('turnosPadrao', turno);
  }
  async deleteTurnoPadrao(id: string): Promise<void> {
    escalaLocalDeleteItem('turnosPadrao', id);
  }
  async getJornadasTrabalho(): Promise<JornadaTrabalho[]> {
    return escalaLocalGetArray<JornadaTrabalho>('jornadasTrabalho');
  }
  async saveJornadaTrabalho(jornada: JornadaTrabalho): Promise<void> {
    escalaLocalSaveItem('jornadasTrabalho', jornada);
  }
  async deleteJornadaTrabalho(id: string): Promise<void> {
    escalaLocalDeleteItem('jornadasTrabalho', id);
  }
  async getDisponibilidadeColaborador(): Promise<DisponibilidadeColaborador[]> {
    return escalaLocalGetArray<DisponibilidadeColaborador>('disponibilidadeColaborador');
  }
  async saveDisponibilidadeColaborador(disp: DisponibilidadeColaborador): Promise<void> {
    escalaLocalSaveItem('disponibilidadeColaborador', disp);
  }
  async deleteDisponibilidadeColaborador(id: string): Promise<void> {
    escalaLocalDeleteItem('disponibilidadeColaborador', id);
  }
  async getRestricoesIndividuais(): Promise<RestricaoIndividual[]> {
    return escalaLocalGetArray<RestricaoIndividual>('restricoesIndividuais');
  }
  async saveRestricaoIndividual(restricao: RestricaoIndividual): Promise<void> {
    escalaLocalSaveItem('restricoesIndividuais', restricao);
  }
  async deleteRestricaoIndividual(id: string): Promise<void> {
    escalaLocalDeleteItem('restricoesIndividuais', id);
  }
  async getFolgasFixasEscala(): Promise<FolgaFixaEscala[]> {
    return escalaLocalGetArray<FolgaFixaEscala>('folgasFixasEscala');
  }
  async saveFolgaFixaEscala(folga: FolgaFixaEscala): Promise<void> {
    escalaLocalSaveItem('folgasFixasEscala', folga);
  }
  async deleteFolgaFixaEscala(id: string): Promise<void> {
    escalaLocalDeleteItem('folgasFixasEscala', id);
  }
  async getRegrasCobertura(): Promise<RegraCobertura[]> {
    return escalaLocalGetArray<RegraCobertura>('regrasCobertura');
  }
  async saveRegraCobertura(regra: RegraCobertura): Promise<void> {
    escalaLocalSaveItem('regrasCobertura', regra);
  }
  async deleteRegraCobertura(id: string): Promise<void> {
    escalaLocalDeleteItem('regrasCobertura', id);
  }
  async getRotinasOperacionais(): Promise<RotinaOperacional[]> {
    return escalaLocalGetArray<RotinaOperacional>('rotinasOperacionais');
  }
  async saveRotinaOperacional(rotina: RotinaOperacional): Promise<void> {
    escalaLocalSaveItem('rotinasOperacionais', rotina);
  }
  async deleteRotinaOperacional(id: string): Promise<void> {
    escalaLocalDeleteItem('rotinasOperacionais', id);
  }
  async getPerfisDisponibilidade(): Promise<PerfilDisponibilidadeColaborador[]> {
    return escalaLocalGetArray<PerfilDisponibilidadeColaborador>('perfisDisponibilidade');
  }
  async savePerfilDisponibilidade(perfil: PerfilDisponibilidadeColaborador): Promise<void> {
    escalaLocalSaveItem('perfisDisponibilidade', perfil);
  }
  async deletePerfilDisponibilidade(id: string): Promise<void> {
    escalaLocalDeleteItem('perfisDisponibilidade', id);
  }
  async getRegrasDescanso(): Promise<RegraDescanso[]> {
    return escalaLocalGetArray<RegraDescanso>('regrasDescanso');
  }
  async saveRegraDescanso(regra: RegraDescanso): Promise<void> {
    escalaLocalSaveItem('regrasDescanso', regra);
  }
  async deleteRegraDescanso(id: string): Promise<void> {
    escalaLocalDeleteItem('regrasDescanso', id);
  }
  async getFeriadosEscala(): Promise<FeriadoEscala[]> {
    return escalaLocalGetArray<FeriadoEscala>('feriadosEscala');
  }
  async saveFeriadoEscala(feriado: FeriadoEscala): Promise<void> {
    escalaLocalSaveItem('feriadosEscala', feriado);
  }
  async deleteFeriadoEscala(id: string): Promise<void> {
    escalaLocalDeleteItem('feriadosEscala', id);
  }
  async getExcecoesEscala(): Promise<ExcecaoEscala[]> {
    return escalaLocalGetArray<ExcecaoEscala>('excecoesEscala');
  }
  async saveExcecaoEscala(excecao: ExcecaoEscala): Promise<void> {
    escalaLocalSaveItem('excecoesEscala', excecao);
  }
  async deleteExcecaoEscala(id: string): Promise<void> {
    escalaLocalDeleteItem('excecoesEscala', id);
  }
  async getEscalasGeradas(): Promise<EscalaGerada[]> {
    return escalaLocalGetArray<EscalaGerada>('escalasGeradas');
  }
  async saveEscalaGerada(escala: EscalaGerada): Promise<void> {
    escalaLocalSaveItem('escalasGeradas', escala);
  }
  async deleteEscalaGerada(id: string): Promise<void> {
    escalaLocalDeleteItem('escalasGeradas', id);
    escalaLocalSetArray(
      'turnosEscalados',
      escalaLocalGetArray<TurnoEscalado>('turnosEscalados').filter((t) => t.escalaId !== id)
    );
  }
  async getTurnosEscalados(escalaId: string): Promise<TurnoEscalado[]> {
    return escalaLocalGetArray<TurnoEscalado>('turnosEscalados').filter((t) => t.escalaId === escalaId);
  }
  async saveTurnosEscaladosBatch(escalaId: string, turnos: TurnoEscalado[]): Promise<void> {
    const outros = escalaLocalGetArray<TurnoEscalado>('turnosEscalados').filter((t) => t.escalaId !== escalaId);
    escalaLocalSetArray('turnosEscalados', [...outros, ...turnos]);
  }
  async deleteTurnosEscaladosPorEscala(escalaId: string): Promise<void> {
    escalaLocalSetArray(
      'turnosEscalados',
      escalaLocalGetArray<TurnoEscalado>('turnosEscalados').filter((t) => t.escalaId !== escalaId)
    );
  }
  async getBancoHorasMovimentos(): Promise<BancoHorasMovimento[]> {
    return escalaLocalGetArray<BancoHorasMovimento>('bancoHorasMovimentos');
  }
  async saveBancoHorasMovimento(mov: BancoHorasMovimento): Promise<void> {
    escalaLocalSaveItem('bancoHorasMovimentos', mov);
  }
  async deleteBancoHorasMovimento(id: string): Promise<void> {
    escalaLocalDeleteItem('bancoHorasMovimentos', id);
  }

  // ── Motor de Formulários Inteligentes com Workflow — Sprint 2 ──────────
  async getFormularioTemplates(templateFamiliaId?: string): Promise<FormularioTemplate[]> {
    const todos = formulariosLocalGetArray<FormularioTemplate>('formularioTemplates');
    return templateFamiliaId ? todos.filter((t) => t.templateFamiliaId === templateFamiliaId) : todos;
  }
  async saveFormularioTemplate(template: FormularioTemplate): Promise<void> {
    // Regra de negócio: um template já vinculado a alguma instância nunca é
    // sobrescrito — só a implementação Apps Script (fonte de verdade) recusa
    // de fato o save; aqui, no fallback local, só preservamos o mesmo formato.
    formulariosLocalSaveItem('formularioTemplates', template);
  }
  async getWorkflowDefinicoes(): Promise<WorkflowDefinicao[]> {
    return formulariosLocalGetArray<WorkflowDefinicao>('workflowDefinicoes');
  }
  async saveWorkflowDefinicao(workflow: WorkflowDefinicao): Promise<void> {
    formulariosLocalSaveItem('workflowDefinicoes', workflow);
  }
  async getFormularioInstancias(filtro?: {
    entidadeId?: string;
    tipoProcesso?: string;
    estadoWorkflow?: string;
  }): Promise<FormularioInstancia[]> {
    let instancias = formulariosLocalGetArray<FormularioInstancia>('formularioInstancias');
    if (filtro?.entidadeId) instancias = instancias.filter((i) => i.entidadeId === filtro.entidadeId);
    if (filtro?.tipoProcesso) instancias = instancias.filter((i) => i.tipoProcesso === filtro.tipoProcesso);
    if (filtro?.estadoWorkflow) instancias = instancias.filter((i) => i.estadoWorkflow === filtro.estadoWorkflow);
    return instancias;
  }
  async saveFormularioInstancia(instancia: FormularioInstancia): Promise<void> {
    formulariosLocalSaveItem('formularioInstancias', instancia);
  }
  async getRespostasCampos(instanciaId: string): Promise<RespostaCampo[]> {
    return formulariosLocalGetArray<RespostaCampo>('respostasCampos').filter(
      (r) => r.instanciaId === instanciaId
    );
  }
  async saveRespostasCamposBatch(instanciaId: string, respostas: RespostaCampo[]): Promise<void> {
    const outras = formulariosLocalGetArray<RespostaCampo>('respostasCampos').filter(
      (r) => r.instanciaId !== instanciaId
    );
    formulariosLocalSetArray('respostasCampos', [...outras, ...respostas]);
  }
  async getHistoricoEstadosInstancia(instanciaId: string): Promise<HistoricoEstadoInstancia[]> {
    return formulariosLocalGetArray<HistoricoEstadoInstancia>('historicoEstadosInstancias').filter(
      (h) => h.instanciaId === instanciaId
    );
  }
  async saveHistoricoEstadoInstancia(historico: HistoricoEstadoInstancia): Promise<void> {
    formulariosLocalSaveItem('historicoEstadosInstancias', historico);
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

    // Erro "de aplicação": a requisição chegou ao servidor e ele respondeu, mas com
    // status de erro (ex.: permissão negada no Drive, ação desconhecida, etc). Nesse
    // caso, tentar de novo via GET não vai resolver — e para payloads grandes (fotos)
    // o GET vai falhar com 413, mascarando o erro real. Então marcamos esse tipo de
    // erro para NÃO cair no fallback de GET.
    class AppError extends Error {
      isAppError = true;
    }

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
          throw new AppError(result.message || 'Erro reportado.');
        }
        
        console.log(`[request] Sucesso via proxy`);
        return (result.data || result) as T;
      } catch (err: any) {
        if (err?.isAppError) {
          // O proxy chegou ao Apps Script e ele respondeu com erro real — não
          // adianta tentar de novo pela chamada direta, é o mesmo backend.
          throw err;
        }
        console.warn('API proxy request falhou, tentando chamada direta:', err);
        // Continua para tentar chamada direta abaixo (falha de rede/proxy)
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
        throw new AppError(result.message || 'Erro reportado.');
      }
      
      return (result.data || result) as T;
    } catch (err: any) {
      if (err?.isAppError) {
        // Erro real vindo do Apps Script (ex.: "Acesso negado: DriveApp").
        // Repetir via GET não resolve e, para payloads grandes, só gera um
        // segundo erro (413) que mascara a causa raiz. Propaga direto.
        console.error('Google Apps Script respondeu com erro de aplicação:', err.message);
        throw err;
      }

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
        lideresSupervisionados: parseSetoresPermitidos(u.lideres_supervisionados ?? u.lideresSupervisionados, undefined),
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
      lideres_supervisionados: JSON.stringify(usuario.lideresSupervisionados || []),
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

  // Alertas Inteligentes (sincronizados com o Google Sheets — compartilhados entre gestores)
  async getAlertasInteligentes(): Promise<AlertaInteligente[]> {
    try {
      const raw = await this.request<any[]>('getAlertasInteligentes');
      return (raw || []).map((r) => ({
        id: r.id,
        tipo: r.tipo,
        colaboradorId: r.colaborador_id,
        titulo: r.titulo,
        descricao: r.descricao,
        dataReferencia: r.data_referencia,
        diasRestantes: Number(r.dias_restantes) || 0,
        status: r.status,
        dataCriacao: r.data_criacao,
        dataReconhecimento: r.data_reconhecimento || undefined,
        dataResolucao: r.data_resolucao || undefined,
        parametroDias: r.parametro_dias !== '' ? Number(r.parametro_dias) : undefined,
      }));
    } catch (e) {
      return this.localFallback.getAlertasInteligentes();
    }
  }
  async saveAlertaInteligente(alerta: AlertaInteligente): Promise<void> {
    await this.localFallback.saveAlertaInteligente(alerta);
    try {
      const body = {
        id: alerta.id,
        tipo: alerta.tipo,
        colaborador_id: alerta.colaboradorId,
        titulo: alerta.titulo,
        descricao: alerta.descricao,
        data_referencia: alerta.dataReferencia,
        dias_restantes: alerta.diasRestantes,
        status: alerta.status,
        data_criacao: alerta.dataCriacao,
        data_reconhecimento: alerta.dataReconhecimento || '',
        data_resolucao: alerta.dataResolucao || '',
        parametro_dias: alerta.parametroDias ?? '',
      };
      await this.request('saveAlertaInteligente', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar alerta inteligente no GoogleScript:', e);
    }
  }
  async deleteAlertaInteligente(id: string): Promise<void> {
    await this.localFallback.deleteAlertaInteligente(id);
    try {
      await this.request('deleteAlertaInteligente', { id });
    } catch (e) {
      console.warn('Erro ao excluir alerta inteligente no GoogleScript:', e);
    }
  }
  async getConfiguracaoAlertas(): Promise<ConfiguracaoAlertas> {
    try {
      const raw = await this.request<any>('getConfiguracaoAlertas');
      if (!raw) return this.localFallback.getConfiguracaoAlertas();
      return {
        diasSemInteracao: Number(raw.dias_sem_interacao) || 14,
        diasAntecedenciaAniversario: Number(raw.dias_antecedencia_aniversario) || 15,
        diasAntecedenciaAvaliacao180: Number(raw.dias_antecedencia_avaliacao180) || 30,
        alertasPersistentes: raw.alertas_persistentes === true || raw.alertas_persistentes === 'true' || raw.alertas_persistentes === 1,
      };
    } catch (e) {
      return this.localFallback.getConfiguracaoAlertas();
    }
  }
  async saveConfiguracaoAlertas(config: ConfiguracaoAlertas): Promise<void> {
    await this.localFallback.saveConfiguracaoAlertas(config);
    try {
      const body = {
        dias_sem_interacao: config.diasSemInteracao,
        dias_antecedencia_aniversario: config.diasAntecedenciaAniversario,
        dias_antecedencia_avaliacao180: config.diasAntecedenciaAvaliacao180,
        alertas_persistentes: config.alertasPersistentes,
      };
      await this.request('saveConfiguracaoAlertas', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar configuração de alertas no GoogleScript:', e);
    }
  }
  async gerarIdAlerta(): Promise<string> {
    return this.localFallback.gerarIdAlerta();
  }

  // P3: Documentos (sincronizados com o Google Sheets)
  async getDocumentos(): Promise<Documento[]> {
    try {
      const raw = await this.request<any[]>('getDocumentos');
      return (raw || []).map((r) => ({
        id: r.id,
        colaboradorId: r.colaborador_id,
        nome: r.nome,
        categoria: r.categoria,
        tipoArquivo: r.tipo_arquivo,
        url: r.url,
        driveFileId: r.drive_file_id || undefined,
        tamanho: r.tamanho,
        uploadedPor: r.uploaded_por,
        dataUpload: r.data_upload,
        descricao: r.descricao || undefined,
      }));
    } catch (e) {
      return this.localFallback.getDocumentos();
    }
  }
  async saveDocumento(doc: Documento): Promise<void> {
    await this.localFallback.saveDocumento(doc);
    try {
      const body = {
        id: doc.id,
        colaborador_id: doc.colaboradorId,
        nome: doc.nome,
        categoria: doc.categoria,
        tipo_arquivo: doc.tipoArquivo,
        url: doc.url,
        drive_file_id: doc.driveFileId || '',
        tamanho: doc.tamanho,
        uploaded_por: doc.uploadedPor,
        data_upload: doc.dataUpload,
        descricao: doc.descricao || '',
      };
      await this.request('saveDocumento', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar documento no GoogleScript:', e);
    }
  }
  async deleteDocumento(id: string): Promise<void> {
    await this.localFallback.deleteDocumento(id);
    try {
      await this.request('deleteDocumento', { id });
    } catch (e) {
      console.warn('Erro ao excluir documento no GoogleScript:', e);
    }
  }

  // P4: Reconhecimento (sincronizado com o Google Sheets)
  async getConfiguracaoReconhecimento(): Promise<ConfiguracaoReconhecimento> {
    try {
      const raw = await this.request<any>('getConfiguracaoReconhecimento');
      if (!raw) return this.localFallback.getConfiguracaoReconhecimento();
      return {
        tipos: raw.tipos || [],
        permitirIndicacaoPeer: raw.permitir_indicacao_peer === true || raw.permitir_indicacao_peer === 'true',
        permiteUploadCertificado: raw.permite_upload_certificado === true || raw.permite_upload_certificado === 'true',
        notificacoesAutomaticas: raw.notificacoes_automaticas === true || raw.notificacoes_automaticas === 'true',
      };
    } catch (e) {
      return this.localFallback.getConfiguracaoReconhecimento();
    }
  }
  async saveConfiguracaoReconhecimento(config: ConfiguracaoReconhecimento): Promise<void> {
    await this.localFallback.saveConfiguracaoReconhecimento(config);
    try {
      const body = {
        tipos: config.tipos || [],
        permitir_indicacao_peer: config.permitirIndicacaoPeer,
        permite_upload_certificado: config.permiteUploadCertificado,
        notificacoes_automaticas: config.notificacoesAutomaticas,
      };
      await this.request('saveConfiguracaoReconhecimento', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar configuração de reconhecimento no GoogleScript:', e);
    }
  }
  async getReconhecimentos(): Promise<Reconhecimento[]> {
    try {
      const raw = await this.request<any[]>('getReconhecimentos');
      return (raw || []).map((r) => ({
        id: r.id,
        colaboradorId: r.colaborador_id,
        tipoId: r.tipo_id,
        titulo: r.titulo,
        descricao: r.descricao,
        concedidoPor: r.concedido_por,
        dataConcessao: r.data_concessao,
        visibleEquipe: r.visivel_equipe === true || r.visivel_equipe === 'true',
        arquivoUrl: r.arquivo_url || undefined,
      }));
    } catch (e) {
      return this.localFallback.getReconhecimentos();
    }
  }
  async saveReconhecimento(rec: Reconhecimento): Promise<void> {
    await this.localFallback.saveReconhecimento(rec);
    try {
      const body = {
        id: rec.id,
        colaborador_id: rec.colaboradorId,
        tipo_id: rec.tipoId,
        titulo: rec.titulo,
        descricao: rec.descricao,
        concedido_por: rec.concedidoPor,
        data_concessao: rec.dataConcessao,
        visivel_equipe: rec.visibleEquipe,
        arquivo_url: rec.arquivoUrl || '',
      };
      await this.request('saveReconhecimento', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar reconhecimento no GoogleScript:', e);
    }
  }
  async deleteReconhecimento(id: string): Promise<void> {
    await this.localFallback.deleteReconhecimento(id);
    try {
      await this.request('deleteReconhecimento', { id });
    } catch (e) {
      console.warn('Erro ao excluir reconhecimento no GoogleScript:', e);
    }
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

  // ── Etapa 0 (pré-requisito da Escala Inteligente): Gestão de Pessoas migrada
  // para o Google Sheets — antes só existia em localStorage. Ver documento de
  // arquitetura, seção 0. Mesmo padrão salvar-local-primeiro-depois-sincronizar
  // já usado em getResultados180/saveResultado180 acima.
  async getFerias(): Promise<Ferias[]> {
    try {
      const raw = await this.request<any[]>('getFerias');
      return (raw || []).map((r) => ({
        id: r.id,
        colaboradorId: r.colaborador_id,
        periodoAquisitivoId: r.periodo_aquisitivo_id,
        dataInicio: r.data_inicio,
        dataFim: r.data_fim,
        dias: Number(r.dias) || 0,
        status: r.status,
        observacoes: r.observacoes || undefined,
        createdAt: r.created_at,
        tipo: r.tipo || undefined,
        periodosUsados: Array.isArray(r.periodos_usados) ? r.periodos_usados : undefined,
      }));
    } catch (e) {
      return this.localFallback.getFerias();
    }
  }
  async saveFerias(ferias: Ferias): Promise<void> {
    await this.localFallback.saveFerias(ferias);
    try {
      const body = {
        id: ferias.id,
        colaborador_id: ferias.colaboradorId,
        periodo_aquisitivo_id: ferias.periodoAquisitivoId,
        data_inicio: ferias.dataInicio,
        data_fim: ferias.dataFim,
        dias: ferias.dias,
        status: ferias.status,
        observacoes: ferias.observacoes || '',
        created_at: ferias.createdAt,
        tipo: ferias.tipo || '',
        periodos_usados: JSON.stringify(ferias.periodosUsados || []),
      };
      await this.request('saveFerias', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar férias no GoogleScript:', e);
    }
  }
  async deleteFerias(id: string): Promise<void> {
    await this.localFallback.deleteFerias(id);
    try {
      await this.request('deleteFerias', { id });
    } catch (e) {
      console.warn('Erro ao excluir férias no GoogleScript:', e);
    }
  }
  async getDayOffs(): Promise<DayOff[]> {
    try {
      const raw = await this.request<any[]>('getDayOff');
      return (raw || []).map((r) => ({
        id: r.id,
        colaboradorId: r.colaborador_id,
        ano: Number(r.ano) || 0,
        dataLimite: r.data_limite,
        dataUtilizacao: r.data_utilizacao || undefined,
        status: r.status,
        observacoes: r.observacoes || undefined,
      }));
    } catch (e) {
      return this.localFallback.getDayOffs();
    }
  }
  async saveDayOff(dayoff: DayOff): Promise<void> {
    await this.localFallback.saveDayOff(dayoff);
    try {
      const body = {
        id: dayoff.id,
        colaborador_id: dayoff.colaboradorId,
        ano: dayoff.ano,
        data_limite: dayoff.dataLimite,
        data_utilizacao: dayoff.dataUtilizacao || '',
        status: dayoff.status,
        observacoes: dayoff.observacoes || '',
      };
      await this.request('saveDayOff', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar day off no GoogleScript:', e);
    }
  }
  async deleteDayOff(id: string): Promise<void> {
    await this.localFallback.deleteDayOff(id);
    try {
      await this.request('deleteDayOff', { id });
    } catch (e) {
      console.warn('Erro ao excluir day off no GoogleScript:', e);
    }
  }
  async getFolgas(): Promise<Folga[]> {
    try {
      const raw = await this.request<any[]>('getFolgas');
      return (raw || []).map((r) => ({
        id: r.id,
        colaboradorId: r.colaborador_id,
        data: r.data,
        motivo: r.motivo,
        status: r.status,
        observacoes: r.observacoes || undefined,
        createdAt: r.created_at,
      }));
    } catch (e) {
      return this.localFallback.getFolgas();
    }
  }
  async saveFolga(folga: Folga): Promise<void> {
    await this.localFallback.saveFolga(folga);
    try {
      const body = {
        id: folga.id,
        colaborador_id: folga.colaboradorId,
        data: folga.data,
        motivo: folga.motivo,
        status: folga.status,
        observacoes: folga.observacoes || '',
        created_at: folga.createdAt,
      };
      await this.request('saveFolga', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar folga no GoogleScript:', e);
    }
  }
  async deleteFolga(id: string): Promise<void> {
    await this.localFallback.deleteFolga(id);
    try {
      await this.request('deleteFolga', { id });
    } catch (e) {
      console.warn('Erro ao excluir folga no GoogleScript:', e);
    }
  }
  async getPeriodosAquisitivos(): Promise<PeriodoAquisitivo[]> {
    try {
      const raw = await this.request<any[]>('getPeriodosAquisitivos');
      return (raw || []).map((r) => ({
        id: r.id,
        colaboradorId: r.colaborador_id,
        anoBase: Number(r.ano_base) || 0,
        dataInicio: r.data_inicio,
        dataFim: r.data_fim,
        diasDisponiveis: Number(r.dias_disponiveis) || 0,
        diasUsados: Number(r.dias_usados) || 0,
        diasRestantes: Number(r.dias_restantes) || 0,
        status: r.status,
        dataConclusao: r.data_conclusao || undefined,
        marcaComoUtilizado: r.marca_como_utilizado === true || r.marca_como_utilizado === 'true',
        observacoes: r.observacoes || undefined,
      }));
    } catch (e) {
      return this.localFallback.getPeriodosAquisitivos();
    }
  }
  async savePeriodoAquisitivo(periodo: PeriodoAquisitivo): Promise<void> {
    await this.localFallback.savePeriodoAquisitivo(periodo);
    try {
      const body = {
        id: periodo.id,
        colaborador_id: periodo.colaboradorId,
        ano_base: periodo.anoBase,
        data_inicio: periodo.dataInicio,
        data_fim: periodo.dataFim,
        dias_disponiveis: periodo.diasDisponiveis,
        dias_usados: periodo.diasUsados,
        dias_restantes: periodo.diasRestantes,
        status: periodo.status,
        data_conclusao: periodo.dataConclusao || '',
        marca_como_utilizado: !!periodo.marcaComoUtilizado,
        observacoes: periodo.observacoes || '',
      };
      await this.request('savePeriodoAquisitivo', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar período aquisitivo no GoogleScript:', e);
    }
  }
  async deletePeriodoAquisitivo(id: string): Promise<void> {
    await this.localFallback.deletePeriodoAquisitivo(id);
    try {
      await this.request('deletePeriodoAquisitivo', { id });
    } catch (e) {
      console.warn('Erro ao excluir período aquisitivo no GoogleScript:', e);
    }
  }
  async getConfiguracaoGestaoPessoas(): Promise<ConfiguracaoGestaoPessoas> {
    return this.localFallback.getConfiguracaoGestaoPessoas();
  }
  async saveConfiguracaoGestaoPessoas(config: ConfiguracaoGestaoPessoas): Promise<void> {
    await this.localFallback.saveConfiguracaoGestaoPessoas(config);
  }

  // Férias Inteligentes (Alertas de Férias sincronizados com o Google Sheets)
  async getAlertasFerias(): Promise<AlertaFerias[]> {
    try {
      const raw = await this.request<any[]>('getAlertasFerias');
      return (raw || []).map((r) => ({
        id: r.id,
        colaboradorId: r.colaborador_id,
        tipo: r.tipo,
        titulo: r.titulo,
        descricao: r.descricao,
        severidade: r.severidade,
        diasRestantes: r.dias_restantes !== '' ? Number(r.dias_restantes) : undefined,
        dataReferencia: r.data_referencia || undefined,
        recomendacao: r.recomendacao || undefined,
        status: r.status,
        createdAt: r.created_at,
      }));
    } catch (e) {
      return this.localFallback.getAlertasFerias();
    }
  }
  async saveAlertaFerias(alerta: AlertaFerias): Promise<void> {
    await this.localFallback.saveAlertaFerias(alerta);
    try {
      const body = {
        id: alerta.id,
        colaborador_id: alerta.colaboradorId,
        tipo: alerta.tipo,
        titulo: alerta.titulo,
        descricao: alerta.descricao,
        severidade: alerta.severidade,
        dias_restantes: alerta.diasRestantes ?? '',
        data_referencia: alerta.dataReferencia || '',
        recomendacao: alerta.recomendacao || '',
        status: alerta.status,
        created_at: alerta.createdAt,
      };
      await this.request('saveAlertaFerias', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar alerta de férias no GoogleScript:', e);
    }
  }
  async deleteAlertaFerias(id: string): Promise<void> {
    await this.localFallback.deleteAlertaFerias(id);
    try {
      await this.request('deleteAlertaFerias', { id });
    } catch (e) {
      console.warn('Erro ao excluir alerta de férias no GoogleScript:', e);
    }
  }
  async getConfiguracaoFerias(): Promise<ConfiguracaoFerias> {
    return this.localFallback.getConfiguracaoFerias();
  }
  async saveConfiguracaoFerias(config: ConfiguracaoFerias): Promise<void> {
    await this.localFallback.saveConfiguracaoFerias(config);
  }

  // ── Escala Inteligente — Módulo 1: Base da Escala ──────────────────────────
  async getConfiguracaoEscala(): Promise<ConfiguracaoEscala | null> {
    try {
      const raw = await this.request<any>('getConfiguracaoEscala');
      if (!raw) return this.localFallback.getConfiguracaoEscala();
      return {
        empresaId: raw.empresa_id,
        cargaHorariaSemanal: Number(raw.carga_horaria_semanal) || 44,
        permiteBancoHoras: raw.permite_banco_horas === true || raw.permite_banco_horas === 'true',
        permiteHoraExtraSemana: raw.permite_hora_extra_semana === true || raw.permite_hora_extra_semana === 'true',
        domingoContaHoraExtra: raw.domingo_conta_hora_extra === true || raw.domingo_conta_hora_extra === 'true',
        intervaloMinimoInterjornadaHoras: Number(raw.intervalo_minimo_interjornada_horas) || 11,
        maxDiasConsecutivos: Number(raw.max_dias_consecutivos) || 6,
        diasAntecedenciaPublicacao: Number(raw.dias_antecedencia_publicacao) || 0,
      };
    } catch (e) {
      return this.localFallback.getConfiguracaoEscala();
    }
  }
  async saveConfiguracaoEscala(config: ConfiguracaoEscala): Promise<void> {
    await this.localFallback.saveConfiguracaoEscala(config);
    try {
      const body = {
        empresa_id: config.empresaId,
        carga_horaria_semanal: config.cargaHorariaSemanal,
        permite_banco_horas: config.permiteBancoHoras,
        permite_hora_extra_semana: config.permiteHoraExtraSemana,
        domingo_conta_hora_extra: config.domingoContaHoraExtra,
        intervalo_minimo_interjornada_horas: config.intervaloMinimoInterjornadaHoras,
        max_dias_consecutivos: config.maxDiasConsecutivos,
        dias_antecedencia_publicacao: config.diasAntecedenciaPublicacao,
      };
      await this.request('saveConfiguracaoEscala', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar configuração da escala no GoogleScript:', e);
    }
  }

  async getTurnosPadrao(): Promise<TurnoPadrao[]> {
    try {
      const raw = await this.request<any[]>('getTurnosPadrao');
      return (raw || []).map((r) => ({
        id: r.id,
        empresaId: r.empresa_id,
        nome: r.nome,
        horaInicio: r.hora_inicio,
        horaFim: r.hora_fim,
        diasSemana: Array.isArray(r.dias_semana) ? r.dias_semana : [],
        setorId: r.setor_id || undefined,
        ativo: r.ativo === true || r.ativo === 'true',
      }));
    } catch (e) {
      return this.localFallback.getTurnosPadrao();
    }
  }
  async saveTurnoPadrao(turno: TurnoPadrao): Promise<void> {
    await this.localFallback.saveTurnoPadrao(turno);
    try {
      const body = {
        id: turno.id,
        empresa_id: turno.empresaId,
        nome: turno.nome,
        hora_inicio: turno.horaInicio,
        hora_fim: turno.horaFim,
        dias_semana: JSON.stringify(turno.diasSemana || []),
        setor_id: turno.setorId || '',
        ativo: turno.ativo,
      };
      await this.request('saveTurnoPadrao', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar turno padrão no GoogleScript:', e);
    }
  }
  async deleteTurnoPadrao(id: string): Promise<void> {
    await this.localFallback.deleteTurnoPadrao(id);
    try {
      await this.request('deleteTurnoPadrao', { id });
    } catch (e) {
      console.warn('Erro ao excluir turno padrão no GoogleScript:', e);
    }
  }

  async getJornadasTrabalho(): Promise<JornadaTrabalho[]> {
    try {
      const raw = await this.request<any[]>('getJornadasTrabalho');
      return (raw || []).map((r) => ({
        id: r.id,
        colaboradorId: r.colaborador_id,
        tipoJornada: r.tipo_jornada,
        cargaSemanalHoras: Number(r.carga_semanal_horas) || 0,
        turnoPadraoId: r.turno_padrao_id || undefined,
        dataInicioVigencia: r.data_inicio_vigencia,
        dataFimVigencia: r.data_fim_vigencia || undefined,
        ativo: r.ativo === true || r.ativo === 'true',
      }));
    } catch (e) {
      return this.localFallback.getJornadasTrabalho();
    }
  }
  async saveJornadaTrabalho(jornada: JornadaTrabalho): Promise<void> {
    await this.localFallback.saveJornadaTrabalho(jornada);
    try {
      const body = {
        id: jornada.id,
        colaborador_id: jornada.colaboradorId,
        tipo_jornada: jornada.tipoJornada,
        carga_semanal_horas: jornada.cargaSemanalHoras,
        turno_padrao_id: jornada.turnoPadraoId || '',
        data_inicio_vigencia: jornada.dataInicioVigencia,
        data_fim_vigencia: jornada.dataFimVigencia || '',
        ativo: jornada.ativo,
      };
      await this.request('saveJornadaTrabalho', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar jornada de trabalho no GoogleScript:', e);
    }
  }
  async deleteJornadaTrabalho(id: string): Promise<void> {
    await this.localFallback.deleteJornadaTrabalho(id);
    try {
      await this.request('deleteJornadaTrabalho', { id });
    } catch (e) {
      console.warn('Erro ao excluir jornada de trabalho no GoogleScript:', e);
    }
  }

  async getDisponibilidadeColaborador(): Promise<DisponibilidadeColaborador[]> {
    try {
      const raw = await this.request<any[]>('getDisponibilidadeColaborador');
      return (raw || []).map((r) => ({
        id: r.id,
        colaboradorId: r.colaborador_id,
        diaSemana: Number(r.dia_semana) as DisponibilidadeColaborador['diaSemana'],
        horaInicio: r.hora_inicio,
        horaFim: r.hora_fim,
        tipo: r.tipo,
        observacoes: r.observacoes || undefined,
      }));
    } catch (e) {
      return this.localFallback.getDisponibilidadeColaborador();
    }
  }
  async saveDisponibilidadeColaborador(disp: DisponibilidadeColaborador): Promise<void> {
    await this.localFallback.saveDisponibilidadeColaborador(disp);
    try {
      const body = {
        id: disp.id,
        colaborador_id: disp.colaboradorId,
        dia_semana: disp.diaSemana,
        hora_inicio: disp.horaInicio,
        hora_fim: disp.horaFim,
        tipo: disp.tipo,
        observacoes: disp.observacoes || '',
      };
      await this.request('saveDisponibilidadeColaborador', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar disponibilidade no GoogleScript:', e);
    }
  }
  async deleteDisponibilidadeColaborador(id: string): Promise<void> {
    await this.localFallback.deleteDisponibilidadeColaborador(id);
    try {
      await this.request('deleteDisponibilidadeColaborador', { id });
    } catch (e) {
      console.warn('Erro ao excluir disponibilidade no GoogleScript:', e);
    }
  }

  async getRestricoesIndividuais(): Promise<RestricaoIndividual[]> {
    try {
      const raw = await this.request<any[]>('getRestricoesIndividuais');
      return (raw || []).map((r) => ({
        id: r.id,
        colaboradorId: r.colaborador_id,
        tipo: r.tipo,
        detalhes: typeof r.detalhes === 'object' && r.detalhes !== null ? r.detalhes : {},
        dataInicio: r.data_inicio,
        dataFim: r.data_fim || undefined,
        observacoes: r.observacoes || undefined,
      }));
    } catch (e) {
      return this.localFallback.getRestricoesIndividuais();
    }
  }
  async saveRestricaoIndividual(restricao: RestricaoIndividual): Promise<void> {
    await this.localFallback.saveRestricaoIndividual(restricao);
    try {
      const body = {
        id: restricao.id,
        colaborador_id: restricao.colaboradorId,
        tipo: restricao.tipo,
        detalhes: JSON.stringify(restricao.detalhes || {}),
        data_inicio: restricao.dataInicio,
        data_fim: restricao.dataFim || '',
        observacoes: restricao.observacoes || '',
      };
      await this.request('saveRestricaoIndividual', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar restrição individual no GoogleScript:', e);
    }
  }
  async deleteRestricaoIndividual(id: string): Promise<void> {
    await this.localFallback.deleteRestricaoIndividual(id);
    try {
      await this.request('deleteRestricaoIndividual', { id });
    } catch (e) {
      console.warn('Erro ao excluir restrição individual no GoogleScript:', e);
    }
  }

  async getFolgasFixasEscala(): Promise<FolgaFixaEscala[]> {
    try {
      const raw = await this.request<any[]>('getFolgasFixasEscala');
      return (raw || []).map((r) => ({
        id: r.id,
        colaboradorId: r.colaborador_id,
        diaSemana: r.dia_semana !== '' && r.dia_semana != null ? (Number(r.dia_semana) as FolgaFixaEscala['diaSemana']) : undefined,
        recorrente: r.recorrente === true || r.recorrente === 'true',
        dataEspecifica: r.data_especifica || undefined,
        motivo: r.motivo || undefined,
      }));
    } catch (e) {
      return this.localFallback.getFolgasFixasEscala();
    }
  }
  async saveFolgaFixaEscala(folga: FolgaFixaEscala): Promise<void> {
    await this.localFallback.saveFolgaFixaEscala(folga);
    try {
      const body = {
        id: folga.id,
        colaborador_id: folga.colaboradorId,
        dia_semana: folga.diaSemana !== undefined ? folga.diaSemana : '',
        recorrente: folga.recorrente,
        data_especifica: folga.dataEspecifica || '',
        motivo: folga.motivo || '',
      };
      await this.request('saveFolgaFixaEscala', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar folga fixa no GoogleScript:', e);
    }
  }
  async deleteFolgaFixaEscala(id: string): Promise<void> {
    await this.localFallback.deleteFolgaFixaEscala(id);
    try {
      await this.request('deleteFolgaFixaEscala', { id });
    } catch (e) {
      console.warn('Erro ao excluir folga fixa no GoogleScript:', e);
    }
  }

  async getRegrasCobertura(): Promise<RegraCobertura[]> {
    try {
      const raw = await this.request<any[]>('getRegrasCobertura');
      return (raw || []).map((r) => ({
        id: r.id,
        empresaId: r.empresa_id,
        setorId: r.setor_id || undefined,
        cargoId: r.cargo_id || undefined,
        diaSemana: r.dia_semana === 'todos' || r.dia_semana === 'domingo' ? r.dia_semana : Number(r.dia_semana),
        horaInicio: r.hora_inicio,
        horaFim: r.hora_fim,
        quantidadeMinima: Number(r.quantidade_minima) || 0,
        prioridade: Number(r.prioridade) || 0,
      }));
    } catch (e) {
      return this.localFallback.getRegrasCobertura();
    }
  }
  async saveRegraCobertura(regra: RegraCobertura): Promise<void> {
    await this.localFallback.saveRegraCobertura(regra);
    try {
      const body = {
        id: regra.id,
        empresa_id: regra.empresaId,
        setor_id: regra.setorId || '',
        cargo_id: regra.cargoId || '',
        dia_semana: regra.diaSemana,
        hora_inicio: regra.horaInicio,
        hora_fim: regra.horaFim,
        quantidade_minima: regra.quantidadeMinima,
        prioridade: regra.prioridade,
      };
      await this.request('saveRegraCobertura', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar regra de cobertura no GoogleScript:', e);
    }
  }
  async deleteRegraCobertura(id: string): Promise<void> {
    await this.localFallback.deleteRegraCobertura(id);
    try {
      await this.request('deleteRegraCobertura', { id });
    } catch (e) {
      console.warn('Erro ao excluir regra de cobertura no GoogleScript:', e);
    }
  }

  async getRotinasOperacionais(): Promise<RotinaOperacional[]> {
    try {
      const raw = await this.request<any[]>('getRotinasOperacionais');
      return (raw || []).map((r) => ({
        id: r.id,
        empresaId: r.empresa_id,
        setorId: r.setor_id,
        nome: r.nome,
        tipoDia: r.tipo_dia,
        horaInicio: r.hora_inicio,
        horaFim: r.hora_fim,
        quantidadeMinima: Number(r.quantidade_minima) || 0,
        cargosPermitidos: Array.isArray(r.cargos_permitidos) ? r.cargos_permitidos : [],
        prioridade: r.prioridade || 'media',
        obrigatoria: r.obrigatoria === true || r.obrigatoria === 'true',
        ativo: r.ativo === true || r.ativo === 'true',
        cor: r.cor || undefined,
      }));
    } catch (e) {
      return this.localFallback.getRotinasOperacionais();
    }
  }
  async saveRotinaOperacional(rotina: RotinaOperacional): Promise<void> {
    await this.localFallback.saveRotinaOperacional(rotina);
    try {
      const body = {
        id: rotina.id,
        empresa_id: rotina.empresaId,
        setor_id: rotina.setorId,
        nome: rotina.nome,
        tipo_dia: rotina.tipoDia,
        hora_inicio: rotina.horaInicio,
        hora_fim: rotina.horaFim,
        quantidade_minima: rotina.quantidadeMinima,
        cargos_permitidos: JSON.stringify(rotina.cargosPermitidos || []),
        prioridade: rotina.prioridade,
        obrigatoria: rotina.obrigatoria,
        ativo: rotina.ativo,
        cor: rotina.cor || '',
      };
      await this.request('saveRotinaOperacional', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar rotina operacional no GoogleScript:', e);
    }
  }
  async deleteRotinaOperacional(id: string): Promise<void> {
    await this.localFallback.deleteRotinaOperacional(id);
    try {
      await this.request('deleteRotinaOperacional', { id });
    } catch (e) {
      console.warn('Erro ao excluir rotina operacional no GoogleScript:', e);
    }
  }

  async getPerfisDisponibilidade(): Promise<PerfilDisponibilidadeColaborador[]> {
    try {
      const raw = await this.request<any[]>('getPerfisDisponibilidade');
      return (raw || []).map((r) => ({
        id: r.id,
        colaboradorId: r.colaborador_id,
        jornadaContratual: r.jornada_contratual || {
          diasNormais: [],
          horaEntradaPadrao: '',
          horaSaidaPadrao: '',
          horaInicioAlmoco: '',
          horaFimAlmoco: '',
          cargaHorariaDiaria: 0,
          cargaHorariaSemanal: 0,
        },
        disponibilidadesFlexiveis: Array.isArray(r.disponibilidades_flexiveis) ? r.disponibilidades_flexiveis : [],
        preferencias: Array.isArray(r.preferencias) ? r.preferencias : [],
        competencias: Array.isArray(r.competencias) ? r.competencias : [],
        restricoes: Array.isArray(r.restricoes) ? r.restricoes : [],
        prioridadeUtilizacao: r.prioridade_utilizacao || 'flexivel',
        atualizadoEm: r.atualizado_em || undefined,
      }));
    } catch (e) {
      return this.localFallback.getPerfisDisponibilidade();
    }
  }
  async savePerfilDisponibilidade(perfil: PerfilDisponibilidadeColaborador): Promise<void> {
    await this.localFallback.savePerfilDisponibilidade(perfil);
    try {
      const body = {
        id: perfil.id,
        colaborador_id: perfil.colaboradorId,
        jornada_contratual: JSON.stringify(perfil.jornadaContratual || {}),
        disponibilidades_flexiveis: JSON.stringify(perfil.disponibilidadesFlexiveis || []),
        preferencias: JSON.stringify(perfil.preferencias || []),
        competencias: JSON.stringify(perfil.competencias || []),
        restricoes: JSON.stringify(perfil.restricoes || []),
        prioridade_utilizacao: perfil.prioridadeUtilizacao,
        atualizado_em: perfil.atualizadoEm || new Date().toISOString(),
      };
      await this.request('savePerfilDisponibilidade', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar perfil de disponibilidade no GoogleScript:', e);
    }
  }
  async deletePerfilDisponibilidade(id: string): Promise<void> {
    await this.localFallback.deletePerfilDisponibilidade(id);
    try {
      await this.request('deletePerfilDisponibilidade', { id });
    } catch (e) {
      console.warn('Erro ao excluir perfil de disponibilidade no GoogleScript:', e);
    }
  }

  async getRegrasDescanso(): Promise<RegraDescanso[]> {
    try {
      const raw = await this.request<any[]>('getRegrasDescanso');
      return (raw || []).map((r) => ({
        id: r.id,
        empresaId: r.empresa_id,
        intervaloMinimoInterjornadaHoras: Number(r.intervalo_minimo_interjornada_horas) || 11,
        maxDiasConsecutivosTrabalho: Number(r.max_dias_consecutivos_trabalho) || 6,
        descansoSemanalRemuneradoDia:
          r.descanso_semanal_remunerado_dia !== '' && r.descanso_semanal_remunerado_dia != null
            ? (Number(r.descanso_semanal_remunerado_dia) as RegraDescanso['descansoSemanalRemuneradoDia'])
            : undefined,
      }));
    } catch (e) {
      return this.localFallback.getRegrasDescanso();
    }
  }
  async saveRegraDescanso(regra: RegraDescanso): Promise<void> {
    await this.localFallback.saveRegraDescanso(regra);
    try {
      const body = {
        id: regra.id,
        empresa_id: regra.empresaId,
        intervalo_minimo_interjornada_horas: regra.intervaloMinimoInterjornadaHoras,
        max_dias_consecutivos_trabalho: regra.maxDiasConsecutivosTrabalho,
        descanso_semanal_remunerado_dia: regra.descansoSemanalRemuneradoDia !== undefined ? regra.descansoSemanalRemuneradoDia : '',
      };
      await this.request('saveRegraDescanso', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar regra de descanso no GoogleScript:', e);
    }
  }
  async deleteRegraDescanso(id: string): Promise<void> {
    await this.localFallback.deleteRegraDescanso(id);
    try {
      await this.request('deleteRegraDescanso', { id });
    } catch (e) {
      console.warn('Erro ao excluir regra de descanso no GoogleScript:', e);
    }
  }

  async getFeriadosEscala(): Promise<FeriadoEscala[]> {
    try {
      const raw = await this.request<any[]>('getFeriadosEscala');
      return (raw || []).map((r) => ({
        id: r.id,
        empresaId: r.empresa_id,
        data: r.data,
        nome: r.nome,
        tipo: r.tipo,
        afetaCobertura: r.afeta_cobertura === true || r.afeta_cobertura === 'true',
      }));
    } catch (e) {
      return this.localFallback.getFeriadosEscala();
    }
  }
  async saveFeriadoEscala(feriado: FeriadoEscala): Promise<void> {
    await this.localFallback.saveFeriadoEscala(feriado);
    try {
      const body = {
        id: feriado.id,
        empresa_id: feriado.empresaId,
        data: feriado.data,
        nome: feriado.nome,
        tipo: feriado.tipo,
        afeta_cobertura: feriado.afetaCobertura,
      };
      await this.request('saveFeriadoEscala', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar feriado no GoogleScript:', e);
    }
  }
  async deleteFeriadoEscala(id: string): Promise<void> {
    await this.localFallback.deleteFeriadoEscala(id);
    try {
      await this.request('deleteFeriadoEscala', { id });
    } catch (e) {
      console.warn('Erro ao excluir feriado no GoogleScript:', e);
    }
  }

  async getExcecoesEscala(): Promise<ExcecaoEscala[]> {
    try {
      const raw = await this.request<any[]>('getExcecoesEscala');
      return (raw || []).map((r) => ({
        id: r.id,
        colaboradorId: r.colaborador_id || undefined,
        data: r.data,
        tipo: r.tipo,
        detalhes: typeof r.detalhes === 'object' && r.detalhes !== null ? r.detalhes : {},
        motivo: r.motivo,
        aprovadoPor: r.aprovado_por || undefined,
      }));
    } catch (e) {
      return this.localFallback.getExcecoesEscala();
    }
  }
  async saveExcecaoEscala(excecao: ExcecaoEscala): Promise<void> {
    await this.localFallback.saveExcecaoEscala(excecao);
    try {
      const body = {
        id: excecao.id,
        colaborador_id: excecao.colaboradorId || '',
        data: excecao.data,
        tipo: excecao.tipo,
        detalhes: JSON.stringify(excecao.detalhes || {}),
        motivo: excecao.motivo,
        aprovado_por: excecao.aprovadoPor || '',
      };
      await this.request('saveExcecaoEscala', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar exceção no GoogleScript:', e);
    }
  }
  async deleteExcecaoEscala(id: string): Promise<void> {
    await this.localFallback.deleteExcecaoEscala(id);
    try {
      await this.request('deleteExcecaoEscala', { id });
    } catch (e) {
      console.warn('Erro ao excluir exceção no GoogleScript:', e);
    }
  }

  async getEscalasGeradas(): Promise<EscalaGerada[]> {
    try {
      const raw = await this.request<any[]>('getEscalasGeradas');
      return (raw || []).map((r) => ({
        id: r.id,
        empresaId: r.empresa_id,
        periodoInicio: r.periodo_inicio,
        periodoFim: r.periodo_fim,
        status: r.status,
        geradoEm: r.gerado_em,
        geradoPor: r.gerado_por,
        parametrosSnapshot: typeof r.parametros_snapshot === 'object' && r.parametros_snapshot !== null ? r.parametros_snapshot : {},
        resumoValidacoes: typeof r.resumo_validacoes === 'object' && r.resumo_validacoes !== null ? r.resumo_validacoes : undefined,
      }));
    } catch (e) {
      return this.localFallback.getEscalasGeradas();
    }
  }
  async saveEscalaGerada(escala: EscalaGerada): Promise<void> {
    await this.localFallback.saveEscalaGerada(escala);
    try {
      const body = {
        id: escala.id,
        empresa_id: escala.empresaId,
        periodo_inicio: escala.periodoInicio,
        periodo_fim: escala.periodoFim,
        status: escala.status,
        gerado_em: escala.geradoEm,
        gerado_por: escala.geradoPor,
        parametros_snapshot: JSON.stringify(escala.parametrosSnapshot || {}),
        resumo_validacoes: JSON.stringify(escala.resumoValidacoes || {}),
      };
      await this.request('saveEscalaGerada', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar escala gerada no GoogleScript:', e);
    }
  }
  async deleteEscalaGerada(id: string): Promise<void> {
    await this.localFallback.deleteEscalaGerada(id);
    try {
      // O backend já remove os turnos escalados associados (ver deleteTurnosPorEscala_ no .gs).
      await this.request('deleteEscalaGerada', { id });
    } catch (e) {
      console.warn('Erro ao excluir escala gerada no GoogleScript:', e);
    }
  }

  // TurnosEscalados usa persistência em LOTE, não o padrão upsert-por-linha — ver
  // documento de arquitetura, seções 6 e 7. Uma geração de escala mensal facilmente
  // passa de 600-1000 turnos; salvar/excluir um a um arriscaria o timeout do Apps Script.
  async getTurnosEscalados(escalaId: string): Promise<TurnoEscalado[]> {
    try {
      const raw = await this.request<any[]>('getTurnosEscalados', { escalaId });
      return (raw || []).map((r) => ({
        id: r.id,
        escalaId: r.escala_id,
        colaboradorId: r.colaborador_id,
        data: r.data,
        horaInicio: r.hora_inicio,
        horaFim: r.hora_fim,
        intervaloInicio: r.intervalo_inicio || undefined,
        intervaloFim: r.intervalo_fim || undefined,
        setorId: r.setor_id,
        cargoId: r.cargo_id,
        tipoTurno: r.tipo_turno,
        origem: r.origem,
        status: r.status,
        observacoes: r.observacoes || undefined,
        rotinaId: r.rotina_id || undefined,
        rotinaNome: r.rotina_nome || undefined,
        rotinaCor: r.rotina_cor || undefined,
        justificativas: Array.isArray(r.justificativas) ? r.justificativas : [],
      }));
    } catch (e) {
      return this.localFallback.getTurnosEscalados(escalaId);
    }
  }
  async saveTurnosEscaladosBatch(escalaId: string, turnos: TurnoEscalado[]): Promise<void> {
    await this.localFallback.saveTurnosEscaladosBatch(escalaId, turnos);
    try {
      const turnosBody = turnos.map((t) => ({
        id: t.id,
        escala_id: escalaId,
        colaborador_id: t.colaboradorId,
        data: t.data,
        hora_inicio: t.horaInicio,
        hora_fim: t.horaFim,
        intervalo_inicio: t.intervaloInicio || '',
        intervalo_fim: t.intervaloFim || '',
        setor_id: t.setorId,
        cargo_id: t.cargoId,
        tipo_turno: t.tipoTurno,
        origem: t.origem,
        status: t.status,
        observacoes: t.observacoes || '',
        rotina_id: t.rotinaId || '',
        rotina_nome: t.rotinaNome || '',
        rotina_cor: t.rotinaCor || '',
        justificativas: JSON.stringify(t.justificativas || []),
      }));
      await this.request('saveTurnosEscaladosBatch', { data: { escalaId, turnos: turnosBody } });
    } catch (e) {
      console.warn('Erro ao gravar turnos escalados em lote no GoogleScript:', e);
    }
  }
  async deleteTurnosEscaladosPorEscala(escalaId: string): Promise<void> {
    await this.localFallback.deleteTurnosEscaladosPorEscala(escalaId);
    try {
      await this.request('deleteTurnosEscaladosPorEscala', { escalaId });
    } catch (e) {
      console.warn('Erro ao excluir turnos escalados no GoogleScript:', e);
    }
  }

  async getBancoHorasMovimentos(): Promise<BancoHorasMovimento[]> {
    try {
      const raw = await this.request<any[]>('getBancoHorasMovimentos');
      return (raw || []).map((r) => ({
        id: r.id,
        colaboradorId: r.colaborador_id,
        data: r.data,
        tipo: r.tipo,
        horas: Number(r.horas) || 0,
        origemTurnoId: r.origem_turno_id || undefined,
        saldoApos: Number(r.saldo_apos) || 0,
        observacoes: r.observacoes || undefined,
      }));
    } catch (e) {
      return this.localFallback.getBancoHorasMovimentos();
    }
  }
  async saveBancoHorasMovimento(mov: BancoHorasMovimento): Promise<void> {
    await this.localFallback.saveBancoHorasMovimento(mov);
    try {
      const body = {
        id: mov.id,
        colaborador_id: mov.colaboradorId,
        data: mov.data,
        tipo: mov.tipo,
        horas: mov.horas,
        origem_turno_id: mov.origemTurnoId || '',
        saldo_apos: mov.saldoApos,
        observacoes: mov.observacoes || '',
      };
      await this.request('saveBancoHorasMovimento', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar movimento de banco de horas no GoogleScript:', e);
    }
  }
  async deleteBancoHorasMovimento(id: string): Promise<void> {
    await this.localFallback.deleteBancoHorasMovimento(id);
    try {
      await this.request('deleteBancoHorasMovimento', { id });
    } catch (e) {
      console.warn('Erro ao excluir movimento de banco de horas no GoogleScript:', e);
    }
  }

  // ── Motor de Formulários Inteligentes com Workflow — Sprint 2 ──────────
  // Ver documento de arquitetura, seções 2 a 8. Segue exatamente o mesmo
  // padrão de mapeamento camelCase (front) <-> snake_case (planilha) e de
  // fallback local usado pelo restante desta classe.
  async getFormularioTemplates(templateFamiliaId?: string): Promise<FormularioTemplate[]> {
    try {
      const raw = await this.request<any[]>('getFormularioTemplates', { templateFamiliaId });
      return (raw || []).map((t) => ({
        id: t.id,
        templateFamiliaId: t.template_familia_id,
        versao: Number(t.versao) || 1,
        nome: t.nome,
        descricao: t.descricao || undefined,
        tipoProcesso: t.tipo_processo,
        workflowId: t.workflow_id,
        ativo: t.ativo === true || t.ativo === 'true',
        permiteAutoavaliacao: t.permite_autoavaliacao === true || t.permite_autoavaliacao === 'true',
        categorias: Array.isArray(t.categorias) ? t.categorias : [],
        regrasCalculo: Array.isArray(t.regras_calculo) ? t.regras_calculo : [],
        aparencia: t.aparencia && typeof t.aparencia === 'object' ? t.aparencia : undefined,
        criadoEm: t.criado_em,
        criadoPor: t.criado_por,
      }));
    } catch (e) {
      return this.localFallback.getFormularioTemplates(templateFamiliaId);
    }
  }
  async saveFormularioTemplate(template: FormularioTemplate): Promise<void> {
    await this.localFallback.saveFormularioTemplate(template);
    try {
      const body = {
        id: template.id,
        template_familia_id: template.templateFamiliaId,
        versao: template.versao,
        nome: template.nome,
        descricao: template.descricao || '',
        tipo_processo: template.tipoProcesso,
        workflow_id: template.workflowId,
        ativo: template.ativo,
        permite_autoavaliacao: !!template.permiteAutoavaliacao,
        categorias: JSON.stringify(template.categorias || []),
        regras_calculo: JSON.stringify(template.regrasCalculo || []),
        aparencia: JSON.stringify(template.aparencia || {}),
        criado_em: template.criadoEm,
        criado_por: template.criadoPor,
      };
      // O backend recusa o save (erro explícito) se este `id` já tiver
      // FormularioInstancia vinculada — ver regra de versionamento na
      // arquitetura, seção 2.1. Deixamos o erro subir para quem chamou.
      await this.request('saveFormularioTemplate', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar template de formulário no GoogleScript:', e);
      throw e;
    }
  }
  async getWorkflowDefinicoes(): Promise<WorkflowDefinicao[]> {
    try {
      const raw = await this.request<any[]>('getWorkflowDefinicoes');
      return (raw || []).map((w) => ({
        id: w.id,
        nome: w.nome,
        estados: Array.isArray(w.estados) ? w.estados : [],
        transicoes: Array.isArray(w.transicoes) ? w.transicoes : [],
      }));
    } catch (e) {
      return this.localFallback.getWorkflowDefinicoes();
    }
  }
  async saveWorkflowDefinicao(workflow: WorkflowDefinicao): Promise<void> {
    await this.localFallback.saveWorkflowDefinicao(workflow);
    try {
      const body = {
        id: workflow.id,
        nome: workflow.nome,
        estados: JSON.stringify(workflow.estados || []),
        transicoes: JSON.stringify(workflow.transicoes || []),
      };
      await this.request('saveWorkflowDefinicao', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar workflow no GoogleScript:', e);
    }
  }
  async getFormularioInstancias(filtro?: {
    entidadeId?: string;
    tipoProcesso?: string;
    estadoWorkflow?: string;
  }): Promise<FormularioInstancia[]> {
    try {
      const raw = await this.request<any[]>('getFormularioInstancias', filtro || {});
      return (raw || []).map((i) => ({
        id: i.id,
        templateId: i.template_id,
        templateFamiliaId: i.template_familia_id,
        tipoProcesso: i.tipo_processo,
        workflowId: i.workflow_id,
        entidadeTipo: i.entidade_tipo,
        entidadeId: i.entidade_id,
        responsavelId: i.responsavel_id,
        estadoWorkflow: i.estado_workflow,
        dataLimite: i.data_limite || undefined,
        dataInicio: i.data_inicio || undefined,
        dataConclusao: i.data_conclusao || undefined,
        resultado: i.resultado_json && typeof i.resultado_json === 'object' ? i.resultado_json : undefined,
        origem: i.origem || 'sistema',
        justificativaAtraso: i.justificativa_atraso || undefined,
        dataReagendamento: i.data_reagendamento || undefined,
        setorId: i.setor_id || undefined,
        cargoId: i.cargo_id || undefined,
        liderId: i.lider_id || undefined,
        empresaId: i.empresa_id || undefined,
        iaParecerTecnico: i.ia_parecer_tecnico || undefined,
        iaFeedbackGestor: i.ia_feedback_gestor || undefined,
        iaFeedbackColaborador: i.ia_feedback_colaborador || undefined,
        iaPontosFortes: Array.isArray(i.ia_pontos_fortes) ? i.ia_pontos_fortes : undefined,
        iaPontosMelhoria: Array.isArray(i.ia_pontos_melhoria) ? i.ia_pontos_melhoria : undefined,
        iaSugestoesPdi: Array.isArray(i.ia_sugestoes_pdi) ? i.ia_sugestoes_pdi : undefined,
        iaRecomendacoesTreinamento: Array.isArray(i.ia_recomendacoes_treinamento)
          ? i.ia_recomendacoes_treinamento
          : undefined,
        iaGeradoEm: i.ia_gerado_em || undefined,
        iaModeloUsado: i.ia_modelo_usado || undefined,
      }));
    } catch (e) {
      return this.localFallback.getFormularioInstancias(filtro);
    }
  }
  async saveFormularioInstancia(instancia: FormularioInstancia): Promise<void> {
    await this.localFallback.saveFormularioInstancia(instancia);
    try {
      const body = {
        id: instancia.id,
        template_id: instancia.templateId,
        template_familia_id: instancia.templateFamiliaId,
        tipo_processo: instancia.tipoProcesso,
        workflow_id: instancia.workflowId,
        entidade_tipo: instancia.entidadeTipo,
        entidade_id: instancia.entidadeId,
        responsavel_id: instancia.responsavelId,
        estado_workflow: instancia.estadoWorkflow,
        data_limite: instancia.dataLimite || '',
        data_inicio: instancia.dataInicio || '',
        data_conclusao: instancia.dataConclusao || '',
        resultado_json: JSON.stringify(instancia.resultado || {}),
        origem: instancia.origem,
        justificativa_atraso: instancia.justificativaAtraso || '',
        data_reagendamento: instancia.dataReagendamento || '',
        setor_id: instancia.setorId || '',
        cargo_id: instancia.cargoId || '',
        lider_id: instancia.liderId || '',
        empresa_id: instancia.empresaId || '',
        ia_parecer_tecnico: instancia.iaParecerTecnico || '',
        ia_feedback_gestor: instancia.iaFeedbackGestor || '',
        ia_feedback_colaborador: instancia.iaFeedbackColaborador || '',
        ia_pontos_fortes: JSON.stringify(instancia.iaPontosFortes || []),
        ia_pontos_melhoria: JSON.stringify(instancia.iaPontosMelhoria || []),
        ia_sugestoes_pdi: JSON.stringify(instancia.iaSugestoesPdi || []),
        ia_recomendacoes_treinamento: JSON.stringify(instancia.iaRecomendacoesTreinamento || []),
        ia_gerado_em: instancia.iaGeradoEm || '',
        ia_modelo_usado: instancia.iaModeloUsado || '',
      };
      await this.request('saveFormularioInstancia', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar instância de formulário no GoogleScript:', e);
    }
  }
  async getRespostasCampos(instanciaId: string): Promise<RespostaCampo[]> {
    try {
      const raw = await this.request<any[]>('getRespostasCampos', { instanciaId });
      return (raw || []).map((r) => ({
        id: r.id,
        instanciaId: r.instancia_id,
        perguntaId: r.pergunta_id,
        papel: r.papel,
        valor: r.valor_json !== undefined ? r.valor_json : null,
        comentario: r.comentario || undefined,
        atualizadoEm: r.atualizado_em,
      }));
    } catch (e) {
      return this.localFallback.getRespostasCampos(instanciaId);
    }
  }
  async saveRespostasCamposBatch(instanciaId: string, respostas: RespostaCampo[]): Promise<void> {
    await this.localFallback.saveRespostasCamposBatch(instanciaId, respostas);
    try {
      const respostasBody = respostas.map((r) => ({
        id: r.id,
        instancia_id: instanciaId,
        pergunta_id: r.perguntaId,
        papel: r.papel,
        valor_json: JSON.stringify(r.valor === undefined ? null : r.valor),
        comentario: r.comentario || '',
        atualizado_em: r.atualizadoEm,
      }));
      await this.request('saveRespostasCamposBatch', { data: { instanciaId, respostas: respostasBody } });
    } catch (e) {
      console.warn('Erro ao gravar respostas de formulário em lote no GoogleScript:', e);
    }
  }
  async getHistoricoEstadosInstancia(instanciaId: string): Promise<HistoricoEstadoInstancia[]> {
    try {
      const raw = await this.request<any[]>('getHistoricoEstadosInstancia', { instanciaId });
      return (raw || []).map((h) => ({
        id: h.id,
        instanciaId: h.instancia_id,
        estadoAnterior: h.estado_anterior,
        estadoNovo: h.estado_novo,
        alteradoPor: h.alterado_por,
        data: h.data,
        observacao: h.observacao || undefined,
      }));
    } catch (e) {
      return this.localFallback.getHistoricoEstadosInstancia(instanciaId);
    }
  }
  async saveHistoricoEstadoInstancia(historico: HistoricoEstadoInstancia): Promise<void> {
    await this.localFallback.saveHistoricoEstadoInstancia(historico);
    try {
      const body = {
        id: historico.id,
        instancia_id: historico.instanciaId,
        estado_anterior: historico.estadoAnterior,
        estado_novo: historico.estadoNovo,
        alterado_por: historico.alteradoPor,
        data: historico.data,
        observacao: historico.observacao || '',
      };
      await this.request('saveHistoricoEstadoInstancia', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar histórico de estado de instância no GoogleScript:', e);
    }
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

  // ── Escala Inteligente — Módulo 1: Base da Escala ──────────────────────────
  async getConfiguracaoEscala(): Promise<ConfiguracaoEscala | null> {
    return this.getService().getConfiguracaoEscala();
  }
  async saveConfiguracaoEscala(config: ConfiguracaoEscala): Promise<void> {
    await this.getService().saveConfiguracaoEscala(config);
  }
  async getTurnosPadrao(): Promise<TurnoPadrao[]> {
    return this.getService().getTurnosPadrao();
  }
  async saveTurnoPadrao(turno: TurnoPadrao): Promise<void> {
    await this.getService().saveTurnoPadrao(turno);
  }
  async deleteTurnoPadrao(id: string): Promise<void> {
    await this.getService().deleteTurnoPadrao(id);
  }
  async getJornadasTrabalho(): Promise<JornadaTrabalho[]> {
    return this.getService().getJornadasTrabalho();
  }
  async saveJornadaTrabalho(jornada: JornadaTrabalho): Promise<void> {
    await this.getService().saveJornadaTrabalho(jornada);
  }
  async deleteJornadaTrabalho(id: string): Promise<void> {
    await this.getService().deleteJornadaTrabalho(id);
  }
  async getDisponibilidadeColaborador(): Promise<DisponibilidadeColaborador[]> {
    return this.getService().getDisponibilidadeColaborador();
  }
  async saveDisponibilidadeColaborador(disp: DisponibilidadeColaborador): Promise<void> {
    await this.getService().saveDisponibilidadeColaborador(disp);
  }
  async deleteDisponibilidadeColaborador(id: string): Promise<void> {
    await this.getService().deleteDisponibilidadeColaborador(id);
  }
  async getRestricoesIndividuais(): Promise<RestricaoIndividual[]> {
    return this.getService().getRestricoesIndividuais();
  }
  async saveRestricaoIndividual(restricao: RestricaoIndividual): Promise<void> {
    await this.getService().saveRestricaoIndividual(restricao);
  }
  async deleteRestricaoIndividual(id: string): Promise<void> {
    await this.getService().deleteRestricaoIndividual(id);
  }
  async getFolgasFixasEscala(): Promise<FolgaFixaEscala[]> {
    return this.getService().getFolgasFixasEscala();
  }
  async saveFolgaFixaEscala(folga: FolgaFixaEscala): Promise<void> {
    await this.getService().saveFolgaFixaEscala(folga);
  }
  async deleteFolgaFixaEscala(id: string): Promise<void> {
    await this.getService().deleteFolgaFixaEscala(id);
  }
  async getRegrasCobertura(): Promise<RegraCobertura[]> {
    return this.getService().getRegrasCobertura();
  }
  async saveRegraCobertura(regra: RegraCobertura): Promise<void> {
    await this.getService().saveRegraCobertura(regra);
  }
  async deleteRegraCobertura(id: string): Promise<void> {
    await this.getService().deleteRegraCobertura(id);
  }
  async getRotinasOperacionais(): Promise<RotinaOperacional[]> {
    return this.getService().getRotinasOperacionais();
  }
  async saveRotinaOperacional(rotina: RotinaOperacional): Promise<void> {
    await this.getService().saveRotinaOperacional(rotina);
  }
  async deleteRotinaOperacional(id: string): Promise<void> {
    await this.getService().deleteRotinaOperacional(id);
  }
  async getPerfisDisponibilidade(): Promise<PerfilDisponibilidadeColaborador[]> {
    return this.getService().getPerfisDisponibilidade();
  }
  async savePerfilDisponibilidade(perfil: PerfilDisponibilidadeColaborador): Promise<void> {
    await this.getService().savePerfilDisponibilidade(perfil);
  }
  async deletePerfilDisponibilidade(id: string): Promise<void> {
    await this.getService().deletePerfilDisponibilidade(id);
  }
  async getRegrasDescanso(): Promise<RegraDescanso[]> {
    return this.getService().getRegrasDescanso();
  }
  async saveRegraDescanso(regra: RegraDescanso): Promise<void> {
    await this.getService().saveRegraDescanso(regra);
  }
  async deleteRegraDescanso(id: string): Promise<void> {
    await this.getService().deleteRegraDescanso(id);
  }
  async getFeriadosEscala(): Promise<FeriadoEscala[]> {
    return this.getService().getFeriadosEscala();
  }
  async saveFeriadoEscala(feriado: FeriadoEscala): Promise<void> {
    await this.getService().saveFeriadoEscala(feriado);
  }
  async deleteFeriadoEscala(id: string): Promise<void> {
    await this.getService().deleteFeriadoEscala(id);
  }
  async getExcecoesEscala(): Promise<ExcecaoEscala[]> {
    return this.getService().getExcecoesEscala();
  }
  async saveExcecaoEscala(excecao: ExcecaoEscala): Promise<void> {
    await this.getService().saveExcecaoEscala(excecao);
  }
  async deleteExcecaoEscala(id: string): Promise<void> {
    await this.getService().deleteExcecaoEscala(id);
  }
  async getEscalasGeradas(): Promise<EscalaGerada[]> {
    return this.getService().getEscalasGeradas();
  }
  async saveEscalaGerada(escala: EscalaGerada): Promise<void> {
    await this.getService().saveEscalaGerada(escala);
  }
  async deleteEscalaGerada(id: string): Promise<void> {
    await this.getService().deleteEscalaGerada(id);
  }
  async getTurnosEscalados(escalaId: string): Promise<TurnoEscalado[]> {
    return this.getService().getTurnosEscalados(escalaId);
  }
  async saveTurnosEscaladosBatch(escalaId: string, turnos: TurnoEscalado[]): Promise<void> {
    await this.getService().saveTurnosEscaladosBatch(escalaId, turnos);
  }
  async deleteTurnosEscaladosPorEscala(escalaId: string): Promise<void> {
    await this.getService().deleteTurnosEscaladosPorEscala(escalaId);
  }
  async getBancoHorasMovimentos(): Promise<BancoHorasMovimento[]> {
    return this.getService().getBancoHorasMovimentos();
  }
  async saveBancoHorasMovimento(mov: BancoHorasMovimento): Promise<void> {
    await this.getService().saveBancoHorasMovimento(mov);
  }
  async deleteBancoHorasMovimento(id: string): Promise<void> {
    await this.getService().deleteBancoHorasMovimento(id);
  }

  // ── Motor de Formulários Inteligentes com Workflow — Sprint 2 ──────────
  async getFormularioTemplates(templateFamiliaId?: string): Promise<FormularioTemplate[]> {
    return this.getService().getFormularioTemplates(templateFamiliaId);
  }
  async saveFormularioTemplate(template: FormularioTemplate): Promise<void> {
    await this.getService().saveFormularioTemplate(template);
  }
  async getWorkflowDefinicoes(): Promise<WorkflowDefinicao[]> {
    return this.getService().getWorkflowDefinicoes();
  }
  async saveWorkflowDefinicao(workflow: WorkflowDefinicao): Promise<void> {
    await this.getService().saveWorkflowDefinicao(workflow);
  }
  async getFormularioInstancias(filtro?: {
    entidadeId?: string;
    tipoProcesso?: string;
    estadoWorkflow?: string;
  }): Promise<FormularioInstancia[]> {
    return this.getService().getFormularioInstancias(filtro);
  }
  async saveFormularioInstancia(instancia: FormularioInstancia): Promise<void> {
    await this.getService().saveFormularioInstancia(instancia);
  }
  async getRespostasCampos(instanciaId: string): Promise<RespostaCampo[]> {
    return this.getService().getRespostasCampos(instanciaId);
  }
  async saveRespostasCamposBatch(instanciaId: string, respostas: RespostaCampo[]): Promise<void> {
    await this.getService().saveRespostasCamposBatch(instanciaId, respostas);
  }
  async getHistoricoEstadosInstancia(instanciaId: string): Promise<HistoricoEstadoInstancia[]> {
    return this.getService().getHistoricoEstadosInstancia(instanciaId);
  }
  async saveHistoricoEstadoInstancia(historico: HistoricoEstadoInstancia): Promise<void> {
    await this.getService().saveHistoricoEstadoInstancia(historico);
  }

  async resetData(): Promise<void> {
    await this.getService().resetData();
  }
}

export const DataService = new DynamicDataService();
