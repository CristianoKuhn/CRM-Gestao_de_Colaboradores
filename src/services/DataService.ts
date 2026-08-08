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
  AvaliacaoExperiencia,
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
  MovimentoAusencia,
  HistoricoAlteracao,
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
  ItemOperacional,
  CategoriaItem,
  ItemEvento,
  ItemComentario,
  CapacidadeBiblioteca,
  CompetenciaBiblioteca,
  MaterialBiblioteca,
  TipoMaterialBiblioteca,
  MatrizCompetenciaCargo,
  AreaDesenvolvimento,
  Programa,
  TipoPrograma,
  ProgramaEtapaTemplate,
  Oferta,
  StatusOferta,
  Inscricao,
  EstadoWorkflowInscricao,
  OrigemInscricao,
  InscricaoEtapa,
  ResultadoConclusaoEtapa,
  ResultadoDecisaoAprovacaoEtapa,
  Evidencia,
  EntidadeTipoEvidencia,
  PerfilCompetencia,
  AvaliacaoCompetenciaResultado,
  PerfilObjetivo,
  PerfilConsolidado,
  ResultadoEvolucaoCompetencia,
  IndicadorDesenvolvimento,
  EscopoTipoIndicador,
  Insight,
  EntidadeTipoInsight,
  TipoInsight,
  StatusInsight,
  ResultadoDecisaoInsight,
  VisaoAnalitica,
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

// ═══════════════════════════════════════════════════════════════════
// MOTOR DE ITENS OPERACIONAIS — Sprint 1 — helper genérico de persistência
// local (mesmo padrão dos blocos "Escala Inteligente" e "Formulários" acima,
// só com prefixo próprio). Ver "Motor de Itens Operacionais — Proposta
// Arquitetural", seções 13 e 19.
// ═══════════════════════════════════════════════════════════════════
const ITENS_LOCAL_PREFIX = 'gc_itens_op_';

function itensLocalGetArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(ITENS_LOCAL_PREFIX + key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function itensLocalSetArray<T>(key: string, items: T[]): void {
  localStorage.setItem(ITENS_LOCAL_PREFIX + key, JSON.stringify(items));
}

function itensLocalSaveItem<T extends { id: string }>(key: string, item: T): void {
  const items = itensLocalGetArray<T>(key);
  const idx = items.findIndex((i) => i.id === item.id);
  if (idx >= 0) items[idx] = item;
  else items.push(item);
  itensLocalSetArray(key, items);
}

function itensLocalDeleteItem(key: string, id: string): void {
  const items = itensLocalGetArray<{ id: string }>(key);
  itensLocalSetArray(
    key,
    items.filter((i) => i.id !== id)
  );
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
  getAvaliacoesExperiencia(colaboradorId?: string): Promise<AvaliacaoExperiencia[]>;
  saveAvaliacaoExperiencia(avaliacao: AvaliacaoExperiencia): Promise<void>;
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
  // ── Motor de Disponibilidade Operacional — Fase 2 (Motor de Férias) ──
  getMovimentosAusencia(colaboradorId?: string): Promise<MovimentoAusencia[]>;
  saveMovimentoAusencia(movimento: MovimentoAusencia): Promise<void>;
  getHistoricoAlteracoes(entidade?: string, entidadeId?: string): Promise<HistoricoAlteracao[]>;
  saveHistoricoAlteracao(historico: HistoricoAlteracao): Promise<void>;
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

  // Motor de Itens Operacionais — Sprint 1 (evolução do módulo "Tarefas").
  // Ver "Motor de Itens Operacionais — Proposta Arquitetural", seções 13 e 19.
  // `getTarefas`/`saveTarefa`/`toggleTarefa` (acima) continuam existindo e já
  // operam sobre este mesmo motor por baixo (ver arquitetura, seção 17) — estas
  // ações novas são a base genérica que os sprints seguintes vão consumir.
  getItensOperacionais(filtro?: {
    responsavelId?: string;
    colaboradorId?: string;
    setorId?: string;
    tipoItem?: string;
    categoriaId?: string;
    estadoWorkflow?: string;
  }): Promise<ItemOperacional[]>;
  saveItemOperacional(item: ItemOperacional): Promise<void>;
  deleteItemOperacional(id: string): Promise<void>;
  getCategoriasItem(): Promise<CategoriaItem[]>;
  saveCategoriaItem(categoria: CategoriaItem): Promise<void>;
  deleteCategoriaItem(id: string): Promise<void>;
  getItensEventos(itemId: string): Promise<ItemEvento[]>;
  saveItemEvento(evento: ItemEvento): Promise<void>;
  getItensComentarios(filtro?: { itemId?: string; itemTipo?: 'item_operacional' | 'inscricao_etapa' }): Promise<ItemComentario[]>;
  saveItemComentario(comentario: ItemComentario): Promise<void>;
  migrarOnboardingParaMotorDesenvolvimento(): Promise<{ templates: unknown; checklists: unknown }>;

  // ── Motor de Desenvolvimento de Colaboradores — Biblioteca Corporativa ──
  // Ver "Especificação Arquitetural Definitiva v2" e "Modelagem Física
  // (Conceitual)". Camada base desta rodada.
  getCapacidadesBiblioteca(): Promise<CapacidadeBiblioteca[]>;
  saveCapacidadeBiblioteca(capacidade: CapacidadeBiblioteca): Promise<void>;
  getCompetenciasBiblioteca(filtro?: { capacidadeId?: string }): Promise<CompetenciaBiblioteca[]>;
  // Sem deleteCompetenciaBiblioteca — competência nunca é deletada, só inativada
  // (salve novamente com `ativo: false`).
  saveCompetenciaBiblioteca(competencia: CompetenciaBiblioteca): Promise<void>;
  getMateriaisBiblioteca(filtro?: { tipo?: TipoMaterialBiblioteca }): Promise<MaterialBiblioteca[]>;
  saveMaterialBiblioteca(material: MaterialBiblioteca): Promise<void>;
  deleteMaterialBiblioteca(id: string): Promise<void>;
  getMatrizCompetenciasCargo(filtro?: { cargoId?: string }): Promise<MatrizCompetenciaCargo[]>;
  saveMatrizCompetenciaCargo(item: MatrizCompetenciaCargo): Promise<void>;
  deleteMatrizCompetenciaCargo(id: string): Promise<void>;
  getAreasDesenvolvimento(): Promise<AreaDesenvolvimento[]>;
  saveAreaDesenvolvimento(area: AreaDesenvolvimento): Promise<void>;
  deleteAreaDesenvolvimento(id: string): Promise<void>;

  // ── Motor de Desenvolvimento de Colaboradores — Programa (definição) ──
  // Sem deleteProgramaTemplate: um Programa nunca é apagado, só inativado
  // (mesma régua de não-sobrescrita/versionamento do Princípio 17/20).
  getProgramas(filtro?: { areaDesenvolvimentoId?: string; tipoPrograma?: TipoPrograma; programaFamiliaId?: string }): Promise<Programa[]>;
  saveProgramaTemplate(programa: Programa): Promise<void>;
  getProgramaEtapasTemplate(filtro?: { programaId?: string }): Promise<ProgramaEtapaTemplate[]>;
  saveProgramaEtapaTemplate(etapa: ProgramaEtapaTemplate): Promise<void>;
  deleteProgramaEtapaTemplate(id: string): Promise<void>;

  // ── Motor de Desenvolvimento de Colaboradores — Oferta/Inscrição/Etapa/Evidência ──
  // Camada de execução real. Sem "saveInscricaoEtapa" genérico de status —
  // todo avanço passa por criarInscricao/concluirEtapa/cancelarInscricao
  // (Princípio 10 da Especificação v2).
  getOfertas(filtro?: { programaId?: string; status?: StatusOferta }): Promise<Oferta[]>;
  saveOferta(oferta: Oferta): Promise<void>;
  encerrarOferta(id: string): Promise<void>;
  cancelarOferta(id: string): Promise<void>;

  getInscricoes(filtro?: {
    colaboradorId?: string;
    ofertaId?: string;
    programaId?: string;
    estadoWorkflow?: EstadoWorkflowInscricao;
  }): Promise<Inscricao[]>;
  criarInscricao(colaboradorId: string, ofertaId: string, origem?: OrigemInscricao, usuarioId?: string): Promise<Inscricao>;
  cancelarInscricao(id: string, motivo: string, usuarioId?: string): Promise<void>;

  getInscricaoEtapas(filtro?: { inscricaoId?: string }): Promise<InscricaoEtapa[]>;
  concluirEtapa(id: string, usuarioId?: string): Promise<ResultadoConclusaoEtapa>;
  // Sprint 2 da Reestruturação ERP — aprovação formal distinta de execução.
  aprovarEtapa(id: string, usuarioId?: string): Promise<ResultadoDecisaoAprovacaoEtapa>;
  rejeitarEtapa(id: string, usuarioId?: string): Promise<ResultadoDecisaoAprovacaoEtapa>;
  // Sprint 2 — liga o resultado de uma Avaliação (Motor de Formulários) às
  // Competências. Sem "saveAvaliacaoCompetenciaResultado" unitário — sempre
  // em lote, mesmo padrão de saveRespostasCamposBatch.
  getAvaliacaoCompetenciaResultados(instanciaId: string): Promise<AvaliacaoCompetenciaResultado[]>;
  saveAvaliacaoCompetenciaResultadosBatch(
    instanciaId: string,
    resultados: AvaliacaoCompetenciaResultado[]
  ): Promise<{ instanciaId: string; totalGravado: number }>;

  getEvidencias(filtro?: { entidadeTipo?: EntidadeTipoEvidencia; entidadeId?: string }): Promise<Evidencia[]>;
  anexarEvidencia(evidencia: Evidencia): Promise<void>;
  validarEvidencia(id: string, validadoPor?: string): Promise<void>;
  rejeitarEvidencia(id: string, validadoPor?: string): Promise<void>;

  // ── Motor de Desenvolvimento de Colaboradores — Perfil (Aggregate Root) ──
  // Sem "savePerfilCompetencia" genérico: toda mudança de nível passa por
  // avaliarCompetencia, que é quem decide se altera ou não o cache (Princípio 2).
  getPerfilCompetencias(colaboradorId: string): Promise<PerfilCompetencia[]>;
  avaliarCompetencia(
    colaboradorId: string,
    competenciaId: string,
    nivel: string,
    usuarioId?: string,
    origemId?: string
  ): Promise<ResultadoEvolucaoCompetencia>;
  getPerfilObjetivos(colaboradorId: string): Promise<PerfilObjetivo[]>;
  saveObjetivo(objetivo: PerfilObjetivo): Promise<void>;
  concluirObjetivo(id: string, usuarioId?: string): Promise<void>;
  expirarObjetivo(id: string, usuarioId?: string): Promise<void>;
  getPerfilConsolidado(colaboradorId: string): Promise<PerfilConsolidado>;

  // ── Motor de Desenvolvimento de Colaboradores — Indicadores ──
  // Sem "saveIndicador": o cache só é escrito por recalcularIndicadoresDesenvolvimentoAgora
  // (Princípio 14 — Indicadores são sempre derivados).
  getIndicadoresDesenvolvimento(filtro?: {
    escopoTipo?: EscopoTipoIndicador;
    escopoId?: string;
    tipoIndicador?: string;
  }): Promise<IndicadorDesenvolvimento[]>;
  recalcularIndicadoresDesenvolvimentoAgora(): Promise<{ totalIndicadores: number }>;

  // ── Motor de Desenvolvimento de Colaboradores — Visão Analítica / Insight ──
  // Sem "saveInsight": Insights só nascem via gerarInsightsDesenvolvimentoAgora
  // (regra hoje, IA amanhã) e só mudam de estado via decidirInsight — nunca
  // por upsert cru (Princípio 15).
  getInsights(filtro?: {
    colaboradorId?: string;
    entidadeTipo?: EntidadeTipoInsight;
    entidadeId?: string;
    status?: StatusInsight;
  }): Promise<Insight[]>;
  gerarInsightsDesenvolvimentoAgora(): Promise<{ novosInsights: number }>;
  decidirInsight(id: string, decisao: 'aceito' | 'recusado', usuarioId?: string): Promise<ResultadoDecisaoInsight>;
  getVisaoAnalitica(colaboradorId: string): Promise<VisaoAnalitica>;

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
  async getAvaliacoesExperiencia(): Promise<AvaliacaoExperiencia[]> {
    return StorageAPI.getAvaliacoesExperiencia();
  }
  async saveAvaliacaoExperiencia(avaliacao: AvaliacaoExperiencia): Promise<void> {
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
  // ── Motor de Disponibilidade Operacional — Fase 2 (Motor de Férias) ──
  // Segue o mesmo helper genérico do módulo de Escala Inteligente (não o
  // StorageAPI legado usado acima) — é o padrão atual para módulos novos.
  async getMovimentosAusencia(colaboradorId?: string): Promise<MovimentoAusencia[]> {
    const todos = escalaLocalGetArray<MovimentoAusencia>('movimentosAusencia');
    return colaboradorId ? todos.filter((m) => m.colaboradorId === colaboradorId) : todos;
  }
  async saveMovimentoAusencia(movimento: MovimentoAusencia): Promise<void> {
    escalaLocalSaveItem('movimentosAusencia', movimento);
  }
  async getHistoricoAlteracoes(entidade?: string, entidadeId?: string): Promise<HistoricoAlteracao[]> {
    let todos = escalaLocalGetArray<HistoricoAlteracao>('historicoAlteracoes');
    if (entidade) todos = todos.filter((h) => h.entidade === entidade);
    if (entidadeId) todos = todos.filter((h) => h.entidadeId === entidadeId);
    return todos;
  }
  async saveHistoricoAlteracao(historico: HistoricoAlteracao): Promise<void> {
    escalaLocalSaveItem('historicoAlteracoes', historico);
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
    // Mesmo comportamento do backend remoto (Apps Script): escalaId vazio/falsy
    // significa "sem filtro" e retorna todos os turnos já escalados, não nenhum.
    const todos = escalaLocalGetArray<TurnoEscalado>('turnosEscalados');
    return escalaId ? todos.filter((t) => t.escalaId === escalaId) : todos;
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

  // ── Motor de Itens Operacionais — Sprint 1 ────────────────────────────
  async getItensOperacionais(filtro?: {
    responsavelId?: string;
    colaboradorId?: string;
    setorId?: string;
    tipoItem?: string;
    categoriaId?: string;
    estadoWorkflow?: string;
  }): Promise<ItemOperacional[]> {
    let itens = itensLocalGetArray<ItemOperacional>('itensOperacionais');
    if (filtro?.responsavelId) itens = itens.filter((i) => i.responsavelId === filtro.responsavelId);
    if (filtro?.colaboradorId) itens = itens.filter((i) => i.colaboradorId === filtro.colaboradorId);
    if (filtro?.setorId) itens = itens.filter((i) => i.setorIdPool === filtro.setorId);
    if (filtro?.tipoItem) itens = itens.filter((i) => i.tipoItem === filtro.tipoItem);
    if (filtro?.categoriaId) itens = itens.filter((i) => i.categoriaId === filtro.categoriaId);
    if (filtro?.estadoWorkflow) itens = itens.filter((i) => i.estadoWorkflow === filtro.estadoWorkflow);
    return itens;
  }
  async saveItemOperacional(item: ItemOperacional): Promise<void> {
    itensLocalSaveItem('itensOperacionais', item);
  }
  async deleteItemOperacional(id: string): Promise<void> {
    itensLocalDeleteItem('itensOperacionais', id);
  }
  async getCategoriasItem(): Promise<CategoriaItem[]> {
    return itensLocalGetArray<CategoriaItem>('categoriasItem');
  }
  async saveCategoriaItem(categoria: CategoriaItem): Promise<void> {
    itensLocalSaveItem('categoriasItem', categoria);
  }
  async deleteCategoriaItem(id: string): Promise<void> {
    itensLocalDeleteItem('categoriasItem', id);
  }
  async getItensEventos(itemId: string): Promise<ItemEvento[]> {
    return itensLocalGetArray<ItemEvento>('itensEventos').filter((ev) => ev.itemId === itemId);
  }
  async saveItemEvento(evento: ItemEvento): Promise<void> {
    itensLocalSaveItem('itensEventos', evento);
  }
  async getItensComentarios(filtro?: { itemId?: string; itemTipo?: 'item_operacional' | 'inscricao_etapa' }): Promise<ItemComentario[]> {
    let comentarios = itensLocalGetArray<ItemComentario>('itensComentarios');
    if (filtro?.itemId) comentarios = comentarios.filter((c) => c.itemId === filtro.itemId);
    if (filtro?.itemTipo) comentarios = comentarios.filter((c) => c.itemTipo === filtro.itemTipo);
    return comentarios;
  }
  async saveItemComentario(comentario: ItemComentario): Promise<void> {
    itensLocalSaveItem('itensComentarios', { ...comentario, data: comentario.data || new Date().toISOString().slice(0, 10) });
  }
  // Migração não se aplica ao modo demo (não há sistema legado local) —
  // retorna zerado para a tela não quebrar caso alguém clique no modo demo.
  async migrarOnboardingParaMotorDesenvolvimento(): Promise<{ templates: unknown; checklists: unknown }> {
    return { templates: { programasCriados: 0 }, checklists: { migradas: 0 } };
  }

  // ── Motor de Desenvolvimento de Colaboradores — Biblioteca Corporativa ──
  async getCapacidadesBiblioteca(): Promise<CapacidadeBiblioteca[]> {
    return itensLocalGetArray<CapacidadeBiblioteca>('capacidadesBiblioteca');
  }
  async saveCapacidadeBiblioteca(capacidade: CapacidadeBiblioteca): Promise<void> {
    itensLocalSaveItem('capacidadesBiblioteca', capacidade);
  }
  async getCompetenciasBiblioteca(filtro?: { capacidadeId?: string }): Promise<CompetenciaBiblioteca[]> {
    let competencias = itensLocalGetArray<CompetenciaBiblioteca>('competenciasBiblioteca');
    if (filtro?.capacidadeId) competencias = competencias.filter((c) => c.capacidadeId === filtro.capacidadeId);
    return competencias;
  }
  async saveCompetenciaBiblioteca(competencia: CompetenciaBiblioteca): Promise<void> {
    itensLocalSaveItem('competenciasBiblioteca', competencia);
  }
  async getMateriaisBiblioteca(filtro?: { tipo?: TipoMaterialBiblioteca }): Promise<MaterialBiblioteca[]> {
    let materiais = itensLocalGetArray<MaterialBiblioteca>('materiaisBiblioteca');
    if (filtro?.tipo) materiais = materiais.filter((m) => m.tipo === filtro.tipo);
    return materiais;
  }
  async saveMaterialBiblioteca(material: MaterialBiblioteca): Promise<void> {
    itensLocalSaveItem('materiaisBiblioteca', material);
  }
  async deleteMaterialBiblioteca(id: string): Promise<void> {
    itensLocalDeleteItem('materiaisBiblioteca', id);
  }
  async getMatrizCompetenciasCargo(filtro?: { cargoId?: string }): Promise<MatrizCompetenciaCargo[]> {
    let matriz = itensLocalGetArray<MatrizCompetenciaCargo>('matrizCompetenciasCargo');
    if (filtro?.cargoId) matriz = matriz.filter((m) => m.cargoId === filtro.cargoId);
    return matriz;
  }
  async saveMatrizCompetenciaCargo(item: MatrizCompetenciaCargo): Promise<void> {
    itensLocalSaveItem('matrizCompetenciasCargo', item);
  }
  async deleteMatrizCompetenciaCargo(id: string): Promise<void> {
    itensLocalDeleteItem('matrizCompetenciasCargo', id);
  }
  async getAreasDesenvolvimento(): Promise<AreaDesenvolvimento[]> {
    return itensLocalGetArray<AreaDesenvolvimento>('areasDesenvolvimento');
  }
  async saveAreaDesenvolvimento(area: AreaDesenvolvimento): Promise<void> {
    itensLocalSaveItem('areasDesenvolvimento', area);
  }
  async deleteAreaDesenvolvimento(id: string): Promise<void> {
    itensLocalDeleteItem('areasDesenvolvimento', id);
  }

  // ── Motor de Desenvolvimento de Colaboradores — Programa (definição) ──
  async getProgramas(filtro?: {
    areaDesenvolvimentoId?: string;
    tipoPrograma?: TipoPrograma;
    programaFamiliaId?: string;
  }): Promise<Programa[]> {
    let programas = itensLocalGetArray<Programa>('programas');
    if (filtro?.areaDesenvolvimentoId) programas = programas.filter((p) => p.areaDesenvolvimentoId === filtro.areaDesenvolvimentoId);
    if (filtro?.tipoPrograma) programas = programas.filter((p) => p.tipoPrograma === filtro.tipoPrograma);
    if (filtro?.programaFamiliaId) programas = programas.filter((p) => p.programaFamiliaId === filtro.programaFamiliaId);
    return programas;
  }
  async saveProgramaTemplate(programa: Programa): Promise<void> {
    itensLocalSaveItem('programas', programa);
  }
  async getProgramaEtapasTemplate(filtro?: { programaId?: string }): Promise<ProgramaEtapaTemplate[]> {
    let etapas = itensLocalGetArray<ProgramaEtapaTemplate>('programaEtapasTemplate');
    if (filtro?.programaId) etapas = etapas.filter((e) => e.programaId === filtro.programaId);
    return etapas;
  }
  async saveProgramaEtapaTemplate(etapa: ProgramaEtapaTemplate): Promise<void> {
    itensLocalSaveItem('programaEtapasTemplate', etapa);
  }
  async deleteProgramaEtapaTemplate(id: string): Promise<void> {
    itensLocalDeleteItem('programaEtapasTemplate', id);
  }

  // ── Motor de Desenvolvimento de Colaboradores — Oferta/Inscrição/Etapa/Evidência ──
  async getOfertas(filtro?: { programaId?: string; status?: StatusOferta }): Promise<Oferta[]> {
    let ofertas = itensLocalGetArray<Oferta>('ofertas');
    if (filtro?.programaId) ofertas = ofertas.filter((o) => o.programaId === filtro.programaId);
    if (filtro?.status) ofertas = ofertas.filter((o) => o.status === filtro.status);
    return ofertas;
  }
  async saveOferta(oferta: Oferta): Promise<void> {
    itensLocalSaveItem('ofertas', { ...oferta, status: oferta.status || 'aberta' });
  }
  async encerrarOferta(id: string): Promise<void> {
    const oferta = itensLocalGetArray<Oferta>('ofertas').find((o) => o.id === id);
    if (oferta) itensLocalSaveItem('ofertas', { ...oferta, status: 'encerrada' });
  }
  async cancelarOferta(id: string): Promise<void> {
    const oferta = itensLocalGetArray<Oferta>('ofertas').find((o) => o.id === id);
    if (oferta) itensLocalSaveItem('ofertas', { ...oferta, status: 'cancelada' });
  }

  async getInscricoes(filtro?: {
    colaboradorId?: string;
    ofertaId?: string;
    programaId?: string;
    estadoWorkflow?: EstadoWorkflowInscricao;
  }): Promise<Inscricao[]> {
    let inscricoes = itensLocalGetArray<Inscricao>('inscricoes');
    if (filtro?.colaboradorId) inscricoes = inscricoes.filter((i) => i.colaboradorId === filtro.colaboradorId);
    if (filtro?.ofertaId) inscricoes = inscricoes.filter((i) => i.ofertaId === filtro.ofertaId);
    if (filtro?.programaId) inscricoes = inscricoes.filter((i) => i.programaId === filtro.programaId);
    if (filtro?.estadoWorkflow) inscricoes = inscricoes.filter((i) => i.estadoWorkflow === filtro.estadoWorkflow);
    return inscricoes;
  }
  // Versão simplificada da função de negócio (sem instanciar Itens Operacionais
  // no modo demo) — suficiente para exercitar o grafo de dependência entre
  // Etapas localmente. A versão de verdade vive no Code.gs (criarInscricao_).
  async criarInscricao(colaboradorId: string, ofertaId: string, origem: OrigemInscricao = 'manual'): Promise<Inscricao> {
    const oferta = itensLocalGetArray<Oferta>('ofertas').find((o) => o.id === ofertaId);
    if (!oferta) throw new Error('Oferta não encontrada.');
    if (oferta.status !== 'aberta') throw new Error('Esta Oferta não está aberta para novas Inscrições.');
    const jaInscrito = itensLocalGetArray<Inscricao>('inscricoes').some(
      (i) => i.colaboradorId === colaboradorId && i.ofertaId === ofertaId && i.estadoWorkflow !== 'cancelada'
    );
    if (jaInscrito) throw new Error('Este colaborador já possui uma Inscrição ativa nesta Oferta.');

    const inscricao: Inscricao = {
      id: `inscricao-${Date.now()}`,
      colaboradorId,
      ofertaId,
      programaId: oferta.programaId,
      estadoWorkflow: 'em_andamento',
      origem,
      dataInicio: new Date().toISOString().slice(0, 10),
      percentualConcluido: 0,
    };
    itensLocalSaveItem('inscricoes', inscricao);

    const etapasTemplate = itensLocalGetArray<ProgramaEtapaTemplate>('programaEtapasTemplate')
      .filter((e) => e.programaId === oferta.programaId)
      .sort((a, b) => a.ordem - b.ordem);
    etapasTemplate.forEach((etapaTemplate) => {
      const semDependencia = !etapaTemplate.dependeDeIds || etapaTemplate.dependeDeIds.length === 0;
      const novaEtapa: InscricaoEtapa = {
        id: `inscricao-etapa-${Date.now()}-${etapaTemplate.ordem}`,
        inscricaoId: inscricao.id,
        etapaTemplateId: etapaTemplate.id,
        ordem: etapaTemplate.ordem,
        nome: etapaTemplate.nome,
        status: semDependencia ? 'disponivel' : 'bloqueada',
        estadoAprovacao: etapaTemplate.exigeAprovacao ? 'pendente' : 'nao_aplicavel',
      };
      itensLocalSaveItem('inscricaoEtapas', novaEtapa);
    });
    return inscricao;
  }
  async cancelarInscricao(id: string, motivo: string): Promise<void> {
    const inscricao = itensLocalGetArray<Inscricao>('inscricoes').find((i) => i.id === id);
    if (!inscricao) throw new Error('Inscrição não encontrada.');
    itensLocalSaveItem('inscricoes', { ...inscricao, estadoWorkflow: 'cancelada', motivoCancelamento: motivo });
    itensLocalGetArray<InscricaoEtapa>('inscricaoEtapas')
      .filter((e) => e.inscricaoId === id && e.status !== 'concluida')
      .forEach((e) => itensLocalSaveItem('inscricaoEtapas', { ...e, status: 'encerrada_cancelamento' }));
  }

  async getInscricaoEtapas(filtro?: { inscricaoId?: string }): Promise<InscricaoEtapa[]> {
    let etapas = itensLocalGetArray<InscricaoEtapa>('inscricaoEtapas');
    if (filtro?.inscricaoId) etapas = etapas.filter((e) => e.inscricaoId === filtro.inscricaoId);
    return etapas;
  }
  async concluirEtapa(id: string): Promise<ResultadoConclusaoEtapa> {
    const todasAsEtapas = itensLocalGetArray<InscricaoEtapa>('inscricaoEtapas');
    const etapaAlvo = todasAsEtapas.find((e) => e.id === id);
    if (!etapaAlvo) throw new Error('Etapa de inscrição não encontrada.');
    if (etapaAlvo.status === 'concluida') {
      return { id, etapasLiberadas: [], percentualConcluido: 0, inscricaoConcluida: false };
    }
    itensLocalSaveItem('inscricaoEtapas', { ...etapaAlvo, status: 'concluida', dataConclusao: new Date().toISOString().slice(0, 10) });

    const etapasDaInscricao = todasAsEtapas.filter((e) => e.inscricaoId === etapaAlvo.inscricaoId);
    const concluidosOuAgora = etapasDaInscricao
      .filter((e) => e.status === 'concluida' || e.id === id)
      .map((e) => e.etapaTemplateId);
    const templates = itensLocalGetArray<ProgramaEtapaTemplate>('programaEtapasTemplate');
    const etapasLiberadas: string[] = [];
    etapasDaInscricao
      .filter((e) => e.status === 'bloqueada')
      .forEach((etapaCandidata) => {
        const template = templates.find((t) => t.id === etapaCandidata.etapaTemplateId);
        if (!template) return;
        const satisfeita = (template.dependeDeIds || []).every((depId) => concluidosOuAgora.includes(depId));
        if (satisfeita) {
          itensLocalSaveItem('inscricaoEtapas', { ...etapaCandidata, status: 'disponivel' });
          etapasLiberadas.push(etapaCandidata.id);
        }
      });

    const total = etapasDaInscricao.length;
    const concluidasAgora = etapasDaInscricao.filter((e) => e.status === 'concluida' || e.id === id).length;
    const percentual = total > 0 ? Math.round((concluidasAgora / total) * 100) : 0;
    let inscricaoConcluida = false;
    const inscricao = itensLocalGetArray<Inscricao>('inscricoes').find((i) => i.id === etapaAlvo.inscricaoId);
    if (inscricao) {
      inscricaoConcluida = concluidasAgora >= total && total > 0;
      itensLocalSaveItem('inscricoes', {
        ...inscricao,
        percentualConcluido: percentual,
        estadoWorkflow: inscricaoConcluida ? 'concluida' : inscricao.estadoWorkflow,
        dataConclusao: inscricaoConcluida ? new Date().toISOString().slice(0, 10) : inscricao.dataConclusao,
      });
    }
    return { id, etapasLiberadas, percentualConcluido: percentual, inscricaoConcluida };
  }
  async aprovarEtapa(id: string, usuarioId?: string): Promise<ResultadoDecisaoAprovacaoEtapa> {
    return this.decidirAprovacaoEtapaLocal_(id, 'aprovado', usuarioId);
  }
  async rejeitarEtapa(id: string, usuarioId?: string): Promise<ResultadoDecisaoAprovacaoEtapa> {
    return this.decidirAprovacaoEtapaLocal_(id, 'rejeitado', usuarioId);
  }
  private async decidirAprovacaoEtapaLocal_(
    id: string,
    decisao: 'aprovado' | 'rejeitado',
    usuarioId?: string
  ): Promise<ResultadoDecisaoAprovacaoEtapa> {
    const etapa = itensLocalGetArray<InscricaoEtapa>('inscricaoEtapas').find((e) => e.id === id);
    if (!etapa) throw new Error('Etapa de inscrição não encontrada.');
    if (etapa.estadoAprovacao === 'nao_aplicavel') throw new Error('Esta Etapa não exige aprovação formal.');
    itensLocalSaveItem('inscricaoEtapas', { ...etapa, estadoAprovacao: decisao, aprovadorId: usuarioId });
    return { id, estadoAprovacao: decisao };
  }
  async getAvaliacaoCompetenciaResultados(instanciaId: string): Promise<AvaliacaoCompetenciaResultado[]> {
    return itensLocalGetArray<AvaliacaoCompetenciaResultado>('avaliacaoCompetenciaResultados').filter(
      (r) => r.formularioInstanciaId === instanciaId
    );
  }
  async saveAvaliacaoCompetenciaResultadosBatch(
    instanciaId: string,
    resultados: AvaliacaoCompetenciaResultado[]
  ): Promise<{ instanciaId: string; totalGravado: number }> {
    resultados.forEach((r) => itensLocalSaveItem('avaliacaoCompetenciaResultados', { ...r, formularioInstanciaId: instanciaId }));
    return { instanciaId, totalGravado: resultados.length };
  }

  async getEvidencias(filtro?: { entidadeTipo?: EntidadeTipoEvidencia; entidadeId?: string }): Promise<Evidencia[]> {
    let evidencias = itensLocalGetArray<Evidencia>('evidencias');
    if (filtro?.entidadeTipo) evidencias = evidencias.filter((e) => e.entidadeTipo === filtro.entidadeTipo);
    if (filtro?.entidadeId) evidencias = evidencias.filter((e) => e.entidadeId === filtro.entidadeId);
    return evidencias;
  }
  async anexarEvidencia(evidencia: Evidencia): Promise<void> {
    itensLocalSaveItem('evidencias', { ...evidencia, status: evidencia.status || 'pendente' });
  }
  async validarEvidencia(id: string, validadoPor?: string): Promise<void> {
    const evidencia = itensLocalGetArray<Evidencia>('evidencias').find((e) => e.id === id);
    if (evidencia) {
      itensLocalSaveItem('evidencias', {
        ...evidencia,
        status: 'validada',
        validadoPor,
        dataValidacao: new Date().toISOString().slice(0, 10),
      });
    }
  }
  async rejeitarEvidencia(id: string, validadoPor?: string): Promise<void> {
    const evidencia = itensLocalGetArray<Evidencia>('evidencias').find((e) => e.id === id);
    if (evidencia) {
      itensLocalSaveItem('evidencias', {
        ...evidencia,
        status: 'rejeitada',
        validadoPor,
        dataValidacao: new Date().toISOString().slice(0, 10),
      });
    }
  }

  // ── Motor de Desenvolvimento de Colaboradores — Perfil (Aggregate Root) ──
  async getPerfilCompetencias(colaboradorId: string): Promise<PerfilCompetencia[]> {
    return itensLocalGetArray<PerfilCompetencia>('perfilCompetencias').filter((p) => p.colaboradorId === colaboradorId);
  }
  async avaliarCompetencia(
    colaboradorId: string,
    competenciaId: string,
    nivel: string
  ): Promise<ResultadoEvolucaoCompetencia> {
    const competencia = itensLocalGetArray<CompetenciaBiblioteca>('competenciasBiblioteca').find((c) => c.id === competenciaId);
    const escala = competencia?.niveis || [];
    const existente = itensLocalGetArray<PerfilCompetencia>('perfilCompetencias').find(
      (p) => p.colaboradorId === colaboradorId && p.competenciaId === competenciaId
    );
    const nivelAnterior = existente?.nivelAtual || '';
    itensLocalSaveItem('perfilCompetencias', {
      id: existente?.id || `perfil-comp-${Date.now()}`,
      colaboradorId,
      competenciaId,
      nivelAtual: nivel,
      atualizadoEm: new Date().toISOString().slice(0, 10),
    });
    return { alterado: escala.indexOf(nivel) !== escala.indexOf(nivelAnterior), nivelAnterior, nivelAtual: nivel };
  }
  async getPerfilObjetivos(colaboradorId: string): Promise<PerfilObjetivo[]> {
    return itensLocalGetArray<PerfilObjetivo>('perfilObjetivos').filter((o) => o.colaboradorId === colaboradorId);
  }
  async saveObjetivo(objetivo: PerfilObjetivo): Promise<void> {
    itensLocalSaveItem('perfilObjetivos', { ...objetivo, status: objetivo.status || 'aberto' });
  }
  async concluirObjetivo(id: string): Promise<void> {
    const objetivo = itensLocalGetArray<PerfilObjetivo>('perfilObjetivos').find((o) => o.id === id);
    if (objetivo) {
      itensLocalSaveItem('perfilObjetivos', { ...objetivo, status: 'alcancado', dataConclusao: new Date().toISOString().slice(0, 10) });
    }
  }
  async expirarObjetivo(id: string): Promise<void> {
    const objetivo = itensLocalGetArray<PerfilObjetivo>('perfilObjetivos').find((o) => o.id === id);
    if (objetivo) itensLocalSaveItem('perfilObjetivos', { ...objetivo, status: 'expirado' });
  }
  async getPerfilConsolidado(colaboradorId: string): Promise<PerfilConsolidado> {
    const colaboradores = await StorageAPI.getColaboradores();
    const colaborador = colaboradores.find((c) => c.id === colaboradorId);
    const cargoId = colaborador?.cargoId || '';

    const competenciasBiblioteca = itensLocalGetArray<CompetenciaBiblioteca>('competenciasBiblioteca').filter((c) => c.ativo);
    const perfilCompetencias = itensLocalGetArray<PerfilCompetencia>('perfilCompetencias').filter((p) => p.colaboradorId === colaboradorId);
    const matrizDoCargo = itensLocalGetArray<MatrizCompetenciaCargo>('matrizCompetenciasCargo').filter((m) => m.cargoId === cargoId);

    const idsRelevantes = new Set<string>([
      ...perfilCompetencias.map((p) => p.competenciaId),
      ...matrizDoCargo.map((m) => m.competenciaId),
    ]);
    const competencias = Array.from(idsRelevantes).map((competenciaId) => {
      const competencia = competenciasBiblioteca.find((c) => c.id === competenciaId);
      const perfilItem = perfilCompetencias.find((p) => p.competenciaId === competenciaId);
      const matrizItem = matrizDoCargo.find((m) => m.competenciaId === competenciaId);
      const escala = competencia?.niveis || [];
      const posAtual = perfilItem ? escala.indexOf(perfilItem.nivelAtual) : -1;
      const posAlvo = matrizItem ? escala.indexOf(matrizItem.nivelAlvo) : -1;
      return {
        competenciaId,
        nome: competencia?.nome || 'Competência removida',
        nivelAtual: perfilItem?.nivelAtual || '',
        nivelAlvoCargo: matrizItem?.nivelAlvo || '',
        obrigatorioNoCargo: matrizItem?.obrigatorio || false,
        gap: posAlvo >= 0 && posAtual < posAlvo,
      };
    });

    const objetivos = await this.getPerfilObjetivos(colaboradorId);

    const inscricoesAtivas = itensLocalGetArray<Inscricao>('inscricoes').filter(
      (i) => i.colaboradorId === colaboradorId && i.estadoWorkflow === 'em_andamento'
    );
    const todasAsEtapas = itensLocalGetArray<InscricaoEtapa>('inscricaoEtapas');
    const programas = itensLocalGetArray<Programa>('programas');
    const ofertas = itensLocalGetArray<Oferta>('ofertas');
    const inscricoesResumo = inscricoesAtivas.map((inscricao) => {
      const programa = programas.find((p) => p.id === inscricao.programaId);
      const oferta = ofertas.find((o) => o.id === inscricao.ofertaId);
      const etapas = todasAsEtapas.filter((e) => e.inscricaoId === inscricao.id);
      const proxima = etapas.find((e) => e.status === 'disponivel' || e.status === 'em_andamento');
      return {
        inscricaoId: inscricao.id,
        programaNome: programa?.nome || '',
        ofertaNome: oferta?.nome || '',
        percentualConcluido: inscricao.percentualConcluido,
        proximaEtapa: proxima?.nome || '',
      };
    });

    return { colaboradorId, competencias, objetivos, inscricoesAtivas: inscricoesResumo };
  }

  // ── Motor de Desenvolvimento de Colaboradores — Indicadores ──
  async getIndicadoresDesenvolvimento(filtro?: {
    escopoTipo?: EscopoTipoIndicador;
    escopoId?: string;
    tipoIndicador?: string;
  }): Promise<IndicadorDesenvolvimento[]> {
    let indicadores = itensLocalGetArray<IndicadorDesenvolvimento>('indicadoresDesenvolvimento');
    if (filtro?.escopoTipo) indicadores = indicadores.filter((i) => i.escopoTipo === filtro.escopoTipo);
    if (filtro?.escopoId) indicadores = indicadores.filter((i) => i.escopoId === filtro.escopoId);
    if (filtro?.tipoIndicador) indicadores = indicadores.filter((i) => i.tipoIndicador === filtro.tipoIndicador);
    return indicadores;
  }
  // Versão simplificada, só para o modo demo ter algum dado coerente sem
  // depender do Apps Script — a régua de verdade é recalcularIndicadoresDesenvolvimento_
  // no Code.gs, que é bem mais completa (setor/cargo/programa/empresa).
  async recalcularIndicadoresDesenvolvimentoAgora(): Promise<{ totalIndicadores: number }> {
    const inscricoes = itensLocalGetArray<Inscricao>('inscricoes');
    const programas = itensLocalGetArray<Programa>('programas');
    const novoCache: IndicadorDesenvolvimento[] = programas.map((programa) => {
      const doPrograma = inscricoes.filter((i) => i.programaId === programa.id);
      const concluidas = doPrograma.filter((i) => i.estadoWorkflow === 'concluida').length;
      const taxa = doPrograma.length > 0 ? Math.round((concluidas / doPrograma.length) * 100) : 0;
      return {
        id: `indicador-taxa_conclusao-programa-${programa.id}`,
        tipoIndicador: 'taxa_conclusao',
        escopoTipo: 'programa',
        escopoId: programa.id,
        valor: taxa,
        calculadoEm: new Date().toISOString().slice(0, 10),
      };
    });
    novoCache.forEach((i) => itensLocalSaveItem('indicadoresDesenvolvimento', i));
    return { totalIndicadores: novoCache.length };
  }

  // ── Motor de Desenvolvimento de Colaboradores — Visão Analítica / Insight ──
  async getInsights(filtro?: {
    colaboradorId?: string;
    entidadeTipo?: EntidadeTipoInsight;
    entidadeId?: string;
    status?: StatusInsight;
  }): Promise<Insight[]> {
    let insights = itensLocalGetArray<Insight>('insights');
    if (filtro?.colaboradorId) insights = insights.filter((i) => i.entidadeTipo === 'colaborador' && i.entidadeId === filtro.colaboradorId);
    if (filtro?.entidadeTipo) insights = insights.filter((i) => i.entidadeTipo === filtro.entidadeTipo);
    if (filtro?.entidadeId) insights = insights.filter((i) => i.entidadeId === filtro.entidadeId);
    if (filtro?.status) insights = insights.filter((i) => i.status === filtro.status);
    return insights;
  }
  // Versão simplificada — só a regra de Gap crítico, suficiente para o modo
  // demo mostrar algo coerente. A régua completa (+ etapas atrasadas + taxa de
  // conclusão de programa) vive em gerarInsightsDesenvolvimento_ no Code.gs.
  async gerarInsightsDesenvolvimentoAgora(): Promise<{ novosInsights: number }> {
    const colaboradores = await StorageAPI.getColaboradores();
    let total = 0;
    for (const colaborador of colaboradores) {
      const perfil = await this.getPerfilConsolidado(colaborador.id);
      for (const c of perfil.competencias) {
        if (!c.gap || !c.obrigatorioNoCargo) continue;
        const jaExiste = itensLocalGetArray<Insight>('insights').some(
          (i) => i.entidadeId === colaborador.id && i.status === 'pendente' && (i.dadoReferencia as any)?.competenciaId === c.competenciaId
        );
        if (jaExiste) continue;
        itensLocalSaveItem('insights', {
          id: `insight-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          entidadeTipo: 'colaborador',
          entidadeId: colaborador.id,
          tipo: 'risco',
          origem: 'regra',
          confianca: 0.8,
          texto: `Gap crítico em "${c.nome}": nível atual "${c.nivelAtual || 'não avaliado'}", esperado "${c.nivelAlvoCargo}".`,
          dadoReferencia: { competenciaId: c.competenciaId, competenciaNome: c.nome },
          status: 'pendente',
          geradoEm: new Date().toISOString().slice(0, 10),
        } as Insight);
        total++;
      }
    }
    return { novosInsights: total };
  }
  async decidirInsight(id: string, decisao: 'aceito' | 'recusado'): Promise<ResultadoDecisaoInsight> {
    const insight = itensLocalGetArray<Insight>('insights').find((i) => i.id === id);
    if (!insight) throw new Error('Insight não encontrado.');
    if (insight.status !== 'pendente') throw new Error('Este Insight já foi decidido.');
    itensLocalSaveItem('insights', { ...insight, status: decisao, decididoEm: new Date().toISOString().slice(0, 10) });

    let efeito: { tipo: string; objetivoId?: string } | null = null;
    if (decisao === 'aceito' && insight.dadoReferencia && (insight.dadoReferencia as any).competenciaId) {
      const prazo = new Date();
      prazo.setDate(prazo.getDate() + 90);
      const objetivoId = `objetivo-${Date.now()}`;
      itensLocalSaveItem('perfilObjetivos', {
        id: objetivoId,
        colaboradorId: insight.entidadeId,
        titulo: `Desenvolver competência: ${(insight.dadoReferencia as any).competenciaNome || ''}`,
        descricao: 'Criado a partir de um Insight aceito (gap de competência).',
        competenciaId: (insight.dadoReferencia as any).competenciaId,
        prazo: prazo.toISOString().slice(0, 10),
        status: 'aberto',
      });
      efeito = { tipo: 'objetivo_criado', objetivoId };
    }
    return { id, status: decisao, efeito };
  }
  async getVisaoAnalitica(colaboradorId: string): Promise<VisaoAnalitica> {
    const perfil = await this.getPerfilConsolidado(colaboradorId);
    const colaboradores = await StorageAPI.getColaboradores();
    const colaborador = colaboradores.find((c) => c.id === colaboradorId);
    const inscricoesDoColaborador = itensLocalGetArray<Inscricao>('inscricoes').filter((i) => i.colaboradorId === colaboradorId);
    const idsInscricoes = new Set(inscricoesDoColaborador.map((i) => i.id));
    const etapasAtrasadas = itensLocalGetArray<InscricaoEtapa>('inscricaoEtapas').filter(
      (e) => e.status === 'atrasada' && idsInscricoes.has(e.inscricaoId)
    ).length;
    const indicadoresSetor = itensLocalGetArray<IndicadorDesenvolvimento>('indicadoresDesenvolvimento').filter(
      (i) => i.escopoTipo === 'setor' && i.escopoId === (colaborador?.setorId || '')
    );
    return { colaboradorId, perfil, etapasAtrasadas, indicadoresSetor };
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
        dashboardsHabilitados: parseSetoresPermitidos(u.dashboards_habilitados ?? u.dashboardsHabilitados, undefined),
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
      dashboards_habilitados: JSON.stringify(usuario.dashboardsHabilitados || []),
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

  // Avaliações de Experiência — achado da auditoria do Sprint 3: esta
  // implementação só escrevia no localStorage (this.localFallback), nunca no
  // Sheets de verdade. Corrigido para seguir o mesmo padrão write-through +
  // request() de todo o resto do arquivo.
  async getAvaliacoesExperiencia(colaboradorId?: string): Promise<AvaliacaoExperiencia[]> {
    try {
      const raw = await this.request<any[]>('getAvaliacoesExperiencia', { colaboradorId: colaboradorId || '' });
      return (raw || []).map((a) => ({
        id: a.id,
        colaboradorId: a.colaborador_id,
        dias: Number(a.dias) || 0,
        dataVencimento: a.data_vencimento,
        status: a.status,
        resultado: a.resultado || undefined,
        dataRealizacao: a.data_realizacao || undefined,
        observacoes: a.observacoes || undefined,
      }));
    } catch (e) {
      return this.localFallback.getAvaliacoesExperiencia();
    }
  }
  async saveAvaliacaoExperiencia(avaliacao: AvaliacaoExperiencia): Promise<void> {
    await this.localFallback.saveAvaliacaoExperiencia(avaliacao);
    try {
      const body = {
        id: avaliacao.id,
        colaborador_id: avaliacao.colaboradorId,
        dias: avaliacao.dias,
        data_vencimento: avaliacao.dataVencimento,
        status: avaliacao.status,
        resultado: avaliacao.resultado || '',
        data_realizacao: avaliacao.dataRealizacao || '',
        observacoes: avaliacao.observacoes || '',
      };
      await this.request('saveAvaliacaoExperiencia', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar Avaliação de Experiência no GoogleScript:', e);
      throw e;
    }
  }
  async deleteAvaliacaoExperiencia(id: string): Promise<void> {
    await this.localFallback.deleteAvaliacaoExperiencia(id);
    try {
      await this.request('deleteAvaliacaoExperiencia', { id });
    } catch (e) {
      console.warn('Erro ao excluir Avaliação de Experiência no GoogleScript:', e);
      throw e;
    }
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
  // ── Motor de Disponibilidade Operacional — Fase 2 (Motor de Férias) ──
  async getMovimentosAusencia(colaboradorId?: string): Promise<MovimentoAusencia[]> {
    try {
      const raw = await this.request<any[]>('getMovimentosAusencia', { colaboradorId: colaboradorId || '' });
      return (raw || []).map((r) => ({
        id: r.id,
        colaboradorId: r.colaborador_id,
        tipoAusencia: r.tipo_ausencia,
        tipoMovimento: r.tipo_movimento,
        periodoAquisitivoId: r.periodo_aquisitivo_id || undefined,
        ausenciaOrigemId: r.ausencia_origem_id || undefined,
        dataInicio: r.data_inicio,
        dataFim: r.data_fim,
        dias: Number(r.dias) || 0,
        observacoes: r.observacoes || undefined,
        criadoPor: r.criado_por,
        criadoEm: r.criado_em,
      }));
    } catch (e) {
      return this.localFallback.getMovimentosAusencia(colaboradorId);
    }
  }
  async saveMovimentoAusencia(movimento: MovimentoAusencia): Promise<void> {
    await this.localFallback.saveMovimentoAusencia(movimento);
    try {
      const body = {
        id: movimento.id,
        colaborador_id: movimento.colaboradorId,
        tipo_ausencia: movimento.tipoAusencia,
        tipo_movimento: movimento.tipoMovimento,
        periodo_aquisitivo_id: movimento.periodoAquisitivoId || '',
        ausencia_origem_id: movimento.ausenciaOrigemId || '',
        data_inicio: movimento.dataInicio,
        data_fim: movimento.dataFim,
        dias: movimento.dias,
        observacoes: movimento.observacoes || '',
        criado_por: movimento.criadoPor,
        criado_em: movimento.criadoEm,
      };
      await this.request('saveMovimentoAusencia', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar movimento de ausência no GoogleScript:', e);
    }
  }
  async getHistoricoAlteracoes(entidade?: string, entidadeId?: string): Promise<HistoricoAlteracao[]> {
    try {
      const raw = await this.request<any[]>('getHistoricoAlteracoes', {
        entidade: entidade || '',
        entidadeId: entidadeId || '',
      });
      return (raw || []).map((r) => ({
        id: r.id,
        entidade: r.entidade,
        entidadeId: r.entidade_id,
        acao: r.acao,
        usuarioId: r.usuario_id,
        dataHora: r.data_hora,
        estadoAnterior: r.estado_anterior || undefined,
        observacao: r.observacao || undefined,
      }));
    } catch (e) {
      return this.localFallback.getHistoricoAlteracoes(entidade, entidadeId);
    }
  }
  async saveHistoricoAlteracao(historico: HistoricoAlteracao): Promise<void> {
    await this.localFallback.saveHistoricoAlteracao(historico);
    try {
      const body = {
        id: historico.id,
        entidade: historico.entidade,
        entidade_id: historico.entidadeId,
        acao: historico.acao,
        usuario_id: historico.usuarioId,
        data_hora: historico.dataHora,
        estado_anterior: historico.estadoAnterior || '',
        observacao: historico.observacao || '',
      };
      await this.request('saveHistoricoAlteracao', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar histórico de alteração no GoogleScript:', e);
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
    try {
      const raw = await this.request<any>('getConfiguracaoFerias');
      if (!raw) return this.localFallback.getConfiguracaoFerias();
      return {
        diasAntecedenciaAlerta: Number(raw.dias_antecedencia_alerta) || 90,
        permitirFeriasProlongadas: raw.permitir_ferias_prolongadas === true || raw.permitir_ferias_prolongadas === 'true',
        maximoDiasSimultaneoSetor: Number(raw.maximo_dias_simultaneo_setor) || 3,
        maximoPercentualEquipe: Number(raw.maximo_percentual_equipe) || 35,
        diasMinimosAntecedenciaPlanejamento: Number(raw.dias_minimos_antecedencia_planejamento) || 7,
        opcoesAntecedencia: Array.isArray(raw.opcoes_antecedencia) ? raw.opcoes_antecedencia.map(Number) : [30, 60, 90, 120, 180],
        salarioMinimoDias: Number(raw.salario_minimo_dias) || 10,
        prazoConcessivoMeses: Number(raw.prazo_concessivo_meses) || 12,
        maximoParcelas: Number(raw.maximo_parcelas) || 3,
        permitirVendaFerias: raw.permitir_venda_ferias === true || raw.permitir_venda_ferias === 'true',
        diasVendidosMaximo: Number(raw.dias_vendidos_maximo) || 10,
        bloquearSobreposicao: raw.bloquear_sobreposicao === true || raw.bloquear_sobreposicao === 'true',
      };
    } catch (e) {
      return this.localFallback.getConfiguracaoFerias();
    }
  }
  async saveConfiguracaoFerias(config: ConfiguracaoFerias): Promise<void> {
    await this.localFallback.saveConfiguracaoFerias(config);
    try {
      const body = {
        dias_antecedencia_alerta: config.diasAntecedenciaAlerta,
        permitir_ferias_prolongadas: config.permitirFeriasProlongadas,
        maximo_dias_simultaneo_setor: config.maximoDiasSimultaneoSetor,
        maximo_percentual_equipe: config.maximoPercentualEquipe,
        dias_minimos_antecedencia_planejamento: config.diasMinimosAntecedenciaPlanejamento,
        opcoes_antecedencia: JSON.stringify(config.opcoesAntecedencia || []),
        salario_minimo_dias: config.salarioMinimoDias,
        prazo_concessivo_meses: config.prazoConcessivoMeses,
        maximo_parcelas: config.maximoParcelas,
        permitir_venda_ferias: config.permitirVendaFerias,
        dias_vendidos_maximo: config.diasVendidosMaximo,
        bloquear_sobreposicao: config.bloquearSobreposicao,
      };
      await this.request('saveConfiguracaoFerias', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar configuração de férias no GoogleScript:', e);
    }
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

  // ── Motor de Itens Operacionais — Sprint 1 ────────────────────────────
  // Ver "Motor de Itens Operacionais — Proposta Arquitetural", seções 13 e 19.
  // Mesmo padrão de mapeamento camelCase (front) <-> snake_case (planilha) já
  // usado acima para Formulários.
  async getItensOperacionais(filtro?: {
    responsavelId?: string;
    colaboradorId?: string;
    setorId?: string;
    tipoItem?: string;
    categoriaId?: string;
    estadoWorkflow?: string;
  }): Promise<ItemOperacional[]> {
    try {
      const raw = await this.request<any[]>('getItensOperacionais', filtro || {});
      return (raw || []).map((i) => ({
        id: i.id,
        tipoItem: i.tipo_item,
        tipoAtribuicao: i.tipo_atribuicao || 'individual',
        titulo: i.titulo,
        descricao: i.descricao || undefined,
        categoriaId: i.categoria_id || undefined,
        criticidade: i.criticidade || undefined,
        prioridade: i.prioridade || undefined,
        colaboradorId: i.colaborador_id || undefined,
        responsavelId: i.responsavel_id || undefined,
        responsavelTipo: i.responsavel_tipo || undefined,
        solicitanteId: i.solicitante_id || undefined,
        setorIdPool: i.setor_id_pool || undefined,
        papeisAlvoPool: Array.isArray(i.papeis_alvo_pool) ? i.papeis_alvo_pool : undefined,
        workflowId: i.workflow_id,
        estadoWorkflow: i.estado_workflow,
        dependeDeIds: Array.isArray(i.depende_de_ids) ? i.depende_de_ids : undefined,
        dataCriacao: i.data_criacao || undefined,
        dataPrazo: i.data_prazo || undefined,
        dataAssumida: i.data_assumida || undefined,
        dataConclusao: i.data_conclusao || undefined,
        dataValidacao: i.data_validacao || undefined,
        dataEncerramento: i.data_encerramento || undefined,
        origemRecorrenciaId: i.origem_recorrencia_id || undefined,
        origemTemplateId: i.origem_template_id || undefined,
        origemGatilhoId: i.origem_gatilho_id || undefined,
        origemEtapaId: i.origem_etapa_id || undefined,
        origemProgramaId: i.origem_programa_id || undefined,
        tipoOrigem: i.tipo_origem || undefined,
        registroId: i.registro_id || undefined,
        empresaId: i.empresa_id || undefined,
      }));
    } catch (e) {
      return this.localFallback.getItensOperacionais(filtro);
    }
  }
  async saveItemOperacional(item: ItemOperacional): Promise<void> {
    await this.localFallback.saveItemOperacional(item);
    try {
      const body = {
        id: item.id,
        tipo_item: item.tipoItem,
        tipo_atribuicao: item.tipoAtribuicao || 'individual',
        titulo: item.titulo,
        descricao: item.descricao || '',
        categoria_id: item.categoriaId || '',
        criticidade: item.criticidade || '',
        prioridade: item.prioridade || '',
        colaborador_id: item.colaboradorId || '',
        responsavel_id: item.responsavelId || '',
        responsavel_tipo: item.responsavelTipo || '',
        setor_id_pool: item.setorIdPool || '',
        papeis_alvo_pool: JSON.stringify(item.papeisAlvoPool || []),
        solicitante_id: item.solicitanteId || '',
        workflow_id: item.workflowId,
        estado_workflow: item.estadoWorkflow,
        depende_de_ids: JSON.stringify(item.dependeDeIds || []),
        data_criacao: item.dataCriacao || '',
        data_prazo: item.dataPrazo || '',
        data_assumida: item.dataAssumida || '',
        data_conclusao: item.dataConclusao || '',
        data_validacao: item.dataValidacao || '',
        data_encerramento: item.dataEncerramento || '',
        origem_recorrencia_id: item.origemRecorrenciaId || '',
        origem_template_id: item.origemTemplateId || '',
        origem_gatilho_id: item.origemGatilhoId || '',
        origem_etapa_id: item.origemEtapaId || '',
        origem_programa_id: item.origemProgramaId || '',
        tipo_origem: item.tipoOrigem || '',
        registro_id: item.registroId || '',
        empresa_id: item.empresaId || '',
      };
      await this.request('saveItemOperacional', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar item operacional no GoogleScript:', e);
      throw e;
    }
  }
  async deleteItemOperacional(id: string): Promise<void> {
    await this.localFallback.deleteItemOperacional(id);
    try {
      await this.request('deleteItemOperacional', { id });
    } catch (e) {
      console.warn('Erro ao excluir item operacional no GoogleScript:', e);
    }
  }
  async getCategoriasItem(): Promise<CategoriaItem[]> {
    try {
      const raw = await this.request<any[]>('getCategoriasItem');
      return (raw || []).map((c) => ({
        id: c.id,
        nome: c.nome,
        criticidadePadrao: c.criticidade_padrao || undefined,
        cor: c.cor || undefined,
        ativo: c.ativo === true || c.ativo === 'true',
      }));
    } catch (e) {
      return this.localFallback.getCategoriasItem();
    }
  }
  async saveCategoriaItem(categoria: CategoriaItem): Promise<void> {
    await this.localFallback.saveCategoriaItem(categoria);
    try {
      const body = {
        id: categoria.id,
        nome: categoria.nome,
        criticidade_padrao: categoria.criticidadePadrao || '',
        cor: categoria.cor || '',
        ativo: categoria.ativo,
      };
      await this.request('saveCategoriaItem', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar categoria de item no GoogleScript:', e);
    }
  }
  async deleteCategoriaItem(id: string): Promise<void> {
    await this.localFallback.deleteCategoriaItem(id);
    try {
      await this.request('deleteCategoriaItem', { id });
    } catch (e) {
      console.warn('Erro ao excluir categoria de item no GoogleScript:', e);
    }
  }
  async getItensEventos(itemId: string): Promise<ItemEvento[]> {
    try {
      const raw = await this.request<any[]>('getItensEventos', { itemId });
      return (raw || []).map((ev) => ({
        id: ev.id,
        itemId: ev.item_id,
        tipoEvento: ev.tipo_evento,
        dadosEvento: ev.dados_evento && typeof ev.dados_evento === 'object' ? ev.dados_evento : undefined,
        autorId: ev.autor_id || undefined,
        data: ev.data,
      }));
    } catch (e) {
      return this.localFallback.getItensEventos(itemId);
    }
  }
  async saveItemEvento(evento: ItemEvento): Promise<void> {
    await this.localFallback.saveItemEvento(evento);
    try {
      const body = {
        id: evento.id,
        item_id: evento.itemId,
        tipo_evento: evento.tipoEvento,
        dados_evento: JSON.stringify(evento.dadosEvento || {}),
        autor_id: evento.autorId || '',
        data: evento.data,
      };
      await this.request('saveItemEvento', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar evento de item no GoogleScript:', e);
    }
  }
  async getItensComentarios(filtro?: { itemId?: string; itemTipo?: 'item_operacional' | 'inscricao_etapa' }): Promise<ItemComentario[]> {
    try {
      const raw = await this.request<any[]>('getItensComentarios', { itemId: filtro?.itemId || '', itemTipo: filtro?.itemTipo || '' });
      return (raw || []).map((c) => ({
        id: c.id,
        itemId: c.item_id,
        itemTipo: c.item_tipo,
        autorId: c.autor_id || undefined,
        texto: c.texto,
        anexos: Array.isArray(c.anexos) ? c.anexos : undefined,
        data: c.data || undefined,
      }));
    } catch (e) {
      return this.localFallback.getItensComentarios(filtro);
    }
  }
  async saveItemComentario(comentario: ItemComentario): Promise<void> {
    await this.localFallback.saveItemComentario(comentario);
    try {
      const body = {
        id: comentario.id,
        item_id: comentario.itemId,
        item_tipo: comentario.itemTipo,
        autor_id: comentario.autorId || '',
        texto: comentario.texto,
        anexos: JSON.stringify(comentario.anexos || []),
        data: comentario.data || '',
      };
      await this.request('saveItemComentario', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar observação no GoogleScript:', e);
      throw e;
    }
  }
  // Sprint 1 da Reestruturação ERP — dispara as migrações de Onboarding
  // legado (aditivas, idempotentes). O erro precisa chegar até quem chamou:
  // é uma ação administrativa deliberada, não um autosave silencioso.
  async migrarOnboardingParaMotorDesenvolvimento(): Promise<{ templates: unknown; checklists: unknown }> {
    try {
      return await this.request<{ templates: unknown; checklists: unknown }>('migrarOnboardingParaMotorDesenvolvimento');
    } catch (e) {
      console.warn('Erro ao migrar Onboarding legado no GoogleScript:', e);
      throw e;
    }
  }

  // ── Motor de Desenvolvimento de Colaboradores — Biblioteca Corporativa ──
  // Ver "Especificação Arquitetural Definitiva v2" e "Modelagem Física
  // (Conceitual)". Mesma convenção do resto do arquivo: grava primeiro no
  // localFallback (resiliência/offline), tenta o GoogleScript depois, e
  // mapeia snake_case (planilha) ↔ camelCase (frontend) nos dois sentidos.
  async getCapacidadesBiblioteca(): Promise<CapacidadeBiblioteca[]> {
    try {
      const raw = await this.request<any[]>('getCapacidadesBiblioteca');
      return (raw || []).map((c) => ({
        id: c.id,
        nome: c.nome,
        descricao: c.descricao || undefined,
        ativo: c.ativo === true || c.ativo === 'true',
      }));
    } catch (e) {
      return this.localFallback.getCapacidadesBiblioteca();
    }
  }
  async saveCapacidadeBiblioteca(capacidade: CapacidadeBiblioteca): Promise<void> {
    await this.localFallback.saveCapacidadeBiblioteca(capacidade);
    try {
      const body = {
        id: capacidade.id,
        nome: capacidade.nome,
        descricao: capacidade.descricao || '',
        ativo: capacidade.ativo,
      };
      await this.request('saveCapacidadeBiblioteca', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar capacidade da biblioteca no GoogleScript:', e);
    }
  }
  async getCompetenciasBiblioteca(filtro?: { capacidadeId?: string }): Promise<CompetenciaBiblioteca[]> {
    try {
      const raw = await this.request<any[]>('getCompetenciasBiblioteca', {
        capacidadeId: filtro?.capacidadeId || '',
      });
      return (raw || []).map((c) => ({
        id: c.id,
        capacidadeId: c.capacidade_id || undefined,
        nome: c.nome,
        descricao: c.descricao || undefined,
        categoria: c.categoria || undefined,
        niveis: Array.isArray(c.niveis) ? c.niveis : [],
        ativo: c.ativo === true || c.ativo === 'true',
      }));
    } catch (e) {
      return this.localFallback.getCompetenciasBiblioteca(filtro);
    }
  }
  async saveCompetenciaBiblioteca(competencia: CompetenciaBiblioteca): Promise<void> {
    await this.localFallback.saveCompetenciaBiblioteca(competencia);
    try {
      const body = {
        id: competencia.id,
        capacidade_id: competencia.capacidadeId || '',
        nome: competencia.nome,
        descricao: competencia.descricao || '',
        categoria: competencia.categoria || '',
        niveis: JSON.stringify(competencia.niveis || []),
        ativo: competencia.ativo,
      };
      await this.request('saveCompetenciaBiblioteca', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar competência da biblioteca no GoogleScript:', e);
    }
  }
  async getMateriaisBiblioteca(filtro?: { tipo?: TipoMaterialBiblioteca }): Promise<MaterialBiblioteca[]> {
    try {
      const raw = await this.request<any[]>('getMateriaisBiblioteca', { tipo: filtro?.tipo || '' });
      return (raw || []).map((m) => ({
        id: m.id,
        tipo: m.tipo,
        nome: m.nome,
        descricao: m.descricao || undefined,
        url: m.url || undefined,
        driveFileId: m.drive_file_id || undefined,
        tags: Array.isArray(m.tags) ? m.tags : undefined,
        ativo: m.ativo === true || m.ativo === 'true',
      }));
    } catch (e) {
      return this.localFallback.getMateriaisBiblioteca(filtro);
    }
  }
  async saveMaterialBiblioteca(material: MaterialBiblioteca): Promise<void> {
    await this.localFallback.saveMaterialBiblioteca(material);
    try {
      const body = {
        id: material.id,
        tipo: material.tipo,
        nome: material.nome,
        descricao: material.descricao || '',
        url: material.url || '',
        drive_file_id: material.driveFileId || '',
        tags: JSON.stringify(material.tags || []),
        ativo: material.ativo,
      };
      await this.request('saveMaterialBiblioteca', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar material da biblioteca no GoogleScript:', e);
    }
  }
  async deleteMaterialBiblioteca(id: string): Promise<void> {
    await this.localFallback.deleteMaterialBiblioteca(id);
    try {
      await this.request('deleteMaterialBiblioteca', { id });
    } catch (e) {
      console.warn('Erro ao excluir material da biblioteca no GoogleScript:', e);
    }
  }
  async getMatrizCompetenciasCargo(filtro?: { cargoId?: string }): Promise<MatrizCompetenciaCargo[]> {
    try {
      const raw = await this.request<any[]>('getMatrizCompetenciasCargo', { cargoId: filtro?.cargoId || '' });
      return (raw || []).map((m) => ({
        id: m.id,
        cargoId: m.cargo_id,
        competenciaId: m.competencia_id,
        nivelAlvo: m.nivel_alvo,
        obrigatorio: m.obrigatorio === true || m.obrigatorio === 'true',
      }));
    } catch (e) {
      return this.localFallback.getMatrizCompetenciasCargo(filtro);
    }
  }
  async saveMatrizCompetenciaCargo(item: MatrizCompetenciaCargo): Promise<void> {
    await this.localFallback.saveMatrizCompetenciaCargo(item);
    try {
      const body = {
        id: item.id,
        cargo_id: item.cargoId,
        competencia_id: item.competenciaId,
        nivel_alvo: item.nivelAlvo,
        obrigatorio: item.obrigatorio,
      };
      await this.request('saveMatrizCompetenciaCargo', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar item da matriz de competências no GoogleScript:', e);
    }
  }
  async deleteMatrizCompetenciaCargo(id: string): Promise<void> {
    await this.localFallback.deleteMatrizCompetenciaCargo(id);
    try {
      await this.request('deleteMatrizCompetenciaCargo', { id });
    } catch (e) {
      console.warn('Erro ao excluir item da matriz de competências no GoogleScript:', e);
    }
  }
  async getAreasDesenvolvimento(): Promise<AreaDesenvolvimento[]> {
    try {
      const raw = await this.request<any[]>('getAreasDesenvolvimento');
      return (raw || []).map((a) => ({
        id: a.id,
        areaPaiId: a.area_pai_id || undefined,
        nome: a.nome,
        descricao: a.descricao || undefined,
        ordem: a.ordem !== '' && a.ordem != null ? Number(a.ordem) : undefined,
        ativo: a.ativo === true || a.ativo === 'true',
      }));
    } catch (e) {
      return this.localFallback.getAreasDesenvolvimento();
    }
  }
  async saveAreaDesenvolvimento(area: AreaDesenvolvimento): Promise<void> {
    await this.localFallback.saveAreaDesenvolvimento(area);
    try {
      const body = {
        id: area.id,
        area_pai_id: area.areaPaiId || '',
        nome: area.nome,
        descricao: area.descricao || '',
        ordem: area.ordem ?? '',
        ativo: area.ativo,
      };
      await this.request('saveAreaDesenvolvimento', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar área de desenvolvimento no GoogleScript:', e);
    }
  }
  async deleteAreaDesenvolvimento(id: string): Promise<void> {
    await this.localFallback.deleteAreaDesenvolvimento(id);
    try {
      await this.request('deleteAreaDesenvolvimento', { id });
    } catch (e) {
      console.warn('Erro ao excluir área de desenvolvimento no GoogleScript:', e);
    }
  }

  // ── Motor de Desenvolvimento de Colaboradores — Programa (definição) ──
  async getProgramas(filtro?: {
    areaDesenvolvimentoId?: string;
    tipoPrograma?: TipoPrograma;
    programaFamiliaId?: string;
  }): Promise<Programa[]> {
    try {
      const raw = await this.request<any[]>('getProgramas', {
        areaDesenvolvimentoId: filtro?.areaDesenvolvimentoId || '',
        tipoPrograma: filtro?.tipoPrograma || '',
        programaFamiliaId: filtro?.programaFamiliaId || '',
      });
      return (raw || []).map((p) => ({
        id: p.id,
        programaFamiliaId: p.programa_familia_id,
        versao: Number(p.versao) || 1,
        areaDesenvolvimentoId: p.area_desenvolvimento_id || undefined,
        nome: p.nome,
        descricao: p.descricao || undefined,
        tipoPrograma: p.tipo_programa,
        modoEstrutura: p.modo_estrutura,
        criterioElegibilidade: p.criterio_elegibilidade && typeof p.criterio_elegibilidade === 'object'
          ? p.criterio_elegibilidade
          : { tipo: 'automatico' },
        ativo: p.ativo === true || p.ativo === 'true',
        criadoEm: p.criado_em || undefined,
        criadoPor: p.criado_por || undefined,
      }));
    } catch (e) {
      return this.localFallback.getProgramas(filtro);
    }
  }
  async saveProgramaTemplate(programa: Programa): Promise<void> {
    await this.localFallback.saveProgramaTemplate(programa);
    try {
      const body = {
        id: programa.id,
        programa_familia_id: programa.programaFamiliaId,
        versao: programa.versao,
        area_desenvolvimento_id: programa.areaDesenvolvimentoId || '',
        nome: programa.nome,
        descricao: programa.descricao || '',
        tipo_programa: programa.tipoPrograma,
        modo_estrutura: programa.modoEstrutura,
        criterio_elegibilidade: JSON.stringify(programa.criterioElegibilidade || { tipo: 'automatico' }),
        ativo: programa.ativo,
        criado_em: programa.criadoEm || '',
        criado_por: programa.criadoPor || '',
      };
      // O backend recusa o save (erro explícito) se este `id` já tiver Oferta
      // vinculada — ver Princípio 17/20 da Especificação v2. Deixamos o erro
      // subir para quem chamou, mesmo padrão de saveFormularioTemplate.
      await this.request('saveProgramaTemplate', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar Programa no GoogleScript:', e);
      throw e;
    }
  }
  async getProgramaEtapasTemplate(filtro?: { programaId?: string }): Promise<ProgramaEtapaTemplate[]> {
    try {
      const raw = await this.request<any[]>('getProgramaEtapasTemplate', { programaId: filtro?.programaId || '' });
      return (raw || []).map((e) => ({
        id: e.id,
        programaId: e.programa_id,
        ordem: Number(e.ordem) || 0,
        nome: e.nome,
        objetivos: e.objetivos || undefined,
        dependeDeIds: Array.isArray(e.depende_de_ids) ? e.depende_de_ids : [],
        prazoDias: e.prazo_dias !== '' && e.prazo_dias != null ? Number(e.prazo_dias) : undefined,
        prazoBase: e.prazo_base || 'admissao',
        competenciasAlvo: Array.isArray(e.competencias_alvo) ? e.competencias_alvo : [],
        itensPadrao: Array.isArray(e.itens_padrao) ? e.itens_padrao : [],
        materiaisIds: Array.isArray(e.materiais_ids) ? e.materiais_ids : [],
        exigeEvidencia: e.exige_evidencia === true || e.exige_evidencia === 'true',
        exigeValidacaoEvidencia: e.exige_validacao_evidencia === true || e.exige_validacao_evidencia === 'true',
        exigeAprovacao: e.exige_aprovacao === true || e.exige_aprovacao === 'true',
        papelAprovador: e.papel_aprovador || undefined,
      }));
    } catch (e) {
      return this.localFallback.getProgramaEtapasTemplate(filtro);
    }
  }
  async saveProgramaEtapaTemplate(etapa: ProgramaEtapaTemplate): Promise<void> {
    await this.localFallback.saveProgramaEtapaTemplate(etapa);
    try {
      const body = {
        id: etapa.id,
        programa_id: etapa.programaId,
        ordem: etapa.ordem,
        nome: etapa.nome,
        objetivos: etapa.objetivos || '',
        depende_de_ids: JSON.stringify(etapa.dependeDeIds || []),
        prazo_dias: etapa.prazoDias ?? '',
        prazo_base: etapa.prazoBase,
        competencias_alvo: JSON.stringify(etapa.competenciasAlvo || []),
        itens_padrao: JSON.stringify(etapa.itensPadrao || []),
        materiais_ids: JSON.stringify(etapa.materiaisIds || []),
        exige_evidencia: etapa.exigeEvidencia,
        exige_validacao_evidencia: etapa.exigeValidacaoEvidencia,
        exige_aprovacao: etapa.exigeAprovacao,
        papel_aprovador: etapa.papelAprovador || '',
      };
      // Mesma proteção do Programa-pai: se ele já tiver Oferta vinculada, o
      // backend recusa a alteração de estrutura. Erro sobe para quem chamou.
      await this.request('saveProgramaEtapaTemplate', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar etapa do Programa no GoogleScript:', e);
      throw e;
    }
  }
  async deleteProgramaEtapaTemplate(id: string): Promise<void> {
    await this.localFallback.deleteProgramaEtapaTemplate(id);
    try {
      await this.request('deleteProgramaEtapaTemplate', { id });
    } catch (e) {
      console.warn('Erro ao excluir etapa do Programa no GoogleScript:', e);
      throw e;
    }
  }

  // ── Motor de Desenvolvimento de Colaboradores — Oferta/Inscrição/Etapa/Evidência ──
  async getOfertas(filtro?: { programaId?: string; status?: StatusOferta }): Promise<Oferta[]> {
    try {
      const raw = await this.request<any[]>('getOfertas', { programaId: filtro?.programaId || '', status: filtro?.status || '' });
      return (raw || []).map((o) => ({
        id: o.id,
        programaId: o.programa_id,
        nome: o.nome,
        dataInicio: o.data_inicio || undefined,
        dataFim: o.data_fim || undefined,
        vagas: o.vagas !== '' && o.vagas != null ? Number(o.vagas) : undefined,
        facilitadorId: o.facilitador_id || undefined,
        status: o.status,
        criadoEm: o.criado_em || undefined,
      }));
    } catch (e) {
      return this.localFallback.getOfertas(filtro);
    }
  }
  async saveOferta(oferta: Oferta): Promise<void> {
    await this.localFallback.saveOferta(oferta);
    try {
      const body = {
        id: oferta.id,
        programa_id: oferta.programaId,
        nome: oferta.nome,
        data_inicio: oferta.dataInicio || '',
        data_fim: oferta.dataFim || '',
        vagas: oferta.vagas ?? '',
        facilitador_id: oferta.facilitadorId || '',
        status: oferta.status || 'aberta',
        criado_em: oferta.criadoEm || '',
      };
      await this.request('saveOferta', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar Oferta no GoogleScript:', e);
      throw e;
    }
  }
  async encerrarOferta(id: string): Promise<void> {
    await this.localFallback.encerrarOferta(id);
    try {
      await this.request('encerrarOferta', { id });
    } catch (e) {
      console.warn('Erro ao encerrar Oferta no GoogleScript:', e);
      throw e;
    }
  }
  async cancelarOferta(id: string): Promise<void> {
    await this.localFallback.cancelarOferta(id);
    try {
      await this.request('cancelarOferta', { id });
    } catch (e) {
      console.warn('Erro ao cancelar Oferta no GoogleScript:', e);
      throw e;
    }
  }

  async getInscricoes(filtro?: {
    colaboradorId?: string;
    ofertaId?: string;
    programaId?: string;
    estadoWorkflow?: EstadoWorkflowInscricao;
  }): Promise<Inscricao[]> {
    try {
      const raw = await this.request<any[]>('getInscricoes', {
        colaboradorId: filtro?.colaboradorId || '',
        ofertaId: filtro?.ofertaId || '',
        programaId: filtro?.programaId || '',
        estadoWorkflow: filtro?.estadoWorkflow || '',
      });
      return (raw || []).map((i) => ({
        id: i.id,
        colaboradorId: i.colaborador_id,
        ofertaId: i.oferta_id,
        programaId: i.programa_id,
        workflowId: i.workflow_id || undefined,
        estadoWorkflow: i.estado_workflow,
        origem: i.origem,
        dataInicio: i.data_inicio || undefined,
        dataPrevisaoConclusao: i.data_previsao_conclusao || undefined,
        dataConclusao: i.data_conclusao || undefined,
        percentualConcluido: Number(i.percentual_concluido) || 0,
        motivoCancelamento: i.motivo_cancelamento || undefined,
      }));
    } catch (e) {
      return this.localFallback.getInscricoes(filtro);
    }
  }
  // criarInscricao/cancelarInscricao/concluirEtapa são funções de negócio, não
  // upsert cru (Modelagem Física, seção 2) — o backend pode recusar (Oferta
  // fechada, Inscrição duplicada, Evidência faltando) e o erro precisa chegar
  // até quem chamou, nunca ser engolido em silêncio.
  async criarInscricao(colaboradorId: string, ofertaId: string, origem: OrigemInscricao = 'manual', usuarioId?: string): Promise<Inscricao> {
    try {
      const raw = await this.request<any>('criarInscricao', {
        data: { colaborador_id: colaboradorId, oferta_id: ofertaId, origem, usuario_id: usuarioId || '' },
      });
      const inscricao: Inscricao = {
        id: raw.id,
        colaboradorId: raw.colaborador_id,
        ofertaId: raw.oferta_id,
        programaId: raw.programa_id,
        workflowId: raw.workflow_id || undefined,
        estadoWorkflow: raw.estado_workflow,
        origem: raw.origem,
        dataInicio: raw.data_inicio || undefined,
        percentualConcluido: Number(raw.percentual_concluido) || 0,
      };
      await this.localFallback.criarInscricao(colaboradorId, ofertaId, origem).catch(() => undefined);
      return inscricao;
    } catch (e) {
      console.warn('Erro ao criar Inscrição no GoogleScript:', e);
      throw e;
    }
  }
  async cancelarInscricao(id: string, motivo: string, usuarioId?: string): Promise<void> {
    try {
      await this.request('cancelarInscricao', { data: { id, motivo, usuario_id: usuarioId || '' } });
      await this.localFallback.cancelarInscricao(id, motivo).catch(() => undefined);
    } catch (e) {
      console.warn('Erro ao cancelar Inscrição no GoogleScript:', e);
      throw e;
    }
  }

  async getInscricaoEtapas(filtro?: { inscricaoId?: string }): Promise<InscricaoEtapa[]> {
    try {
      const raw = await this.request<any[]>('getInscricaoEtapas', { inscricaoId: filtro?.inscricaoId || '' });
      return (raw || []).map((e) => ({
        id: e.id,
        inscricaoId: e.inscricao_id,
        etapaTemplateId: e.etapa_template_id,
        ordem: Number(e.ordem) || 0,
        nome: e.nome,
        status: e.status,
        dataPrevista: e.data_prevista || undefined,
        dataConclusao: e.data_conclusao || undefined,
        responsavelId: e.responsavel_id || undefined,
        observacoes: e.observacoes || undefined,
        aprovadorId: e.aprovador_id || undefined,
        estadoAprovacao: e.estado_aprovacao || 'nao_aplicavel',
      }));
    } catch (e) {
      return this.localFallback.getInscricaoEtapas(filtro);
    }
  }
  async concluirEtapa(id: string, usuarioId?: string): Promise<ResultadoConclusaoEtapa> {
    try {
      const raw = await this.request<any>('concluirEtapa', { data: { id, usuario_id: usuarioId || '' } });
      await this.localFallback.concluirEtapa(id).catch(() => undefined);
      return {
        id: raw.id,
        etapasLiberadas: Array.isArray(raw.etapasLiberadas) ? raw.etapasLiberadas : [],
        percentualConcluido: Number(raw.percentualConcluido) || 0,
        inscricaoConcluida: raw.inscricaoConcluida === true,
      };
    } catch (e) {
      console.warn('Erro ao concluir Etapa no GoogleScript:', e);
      throw e;
    }
  }
  // Sprint 2 da Reestruturação ERP — aprovação formal, distinta de execução.
  async aprovarEtapa(id: string, usuarioId?: string): Promise<ResultadoDecisaoAprovacaoEtapa> {
    try {
      const raw = await this.request<any>('aprovarEtapa', { data: { id, usuario_id: usuarioId || '' } });
      return { id: raw.id, estadoAprovacao: raw.estadoAprovacao };
    } catch (e) {
      console.warn('Erro ao aprovar Etapa no GoogleScript:', e);
      throw e;
    }
  }
  async rejeitarEtapa(id: string, usuarioId?: string): Promise<ResultadoDecisaoAprovacaoEtapa> {
    try {
      const raw = await this.request<any>('rejeitarEtapa', { data: { id, usuario_id: usuarioId || '' } });
      return { id: raw.id, estadoAprovacao: raw.estadoAprovacao };
    } catch (e) {
      console.warn('Erro ao rejeitar Etapa no GoogleScript:', e);
      throw e;
    }
  }
  async getAvaliacaoCompetenciaResultados(instanciaId: string): Promise<AvaliacaoCompetenciaResultado[]> {
    try {
      const raw = await this.request<any[]>('getAvaliacaoCompetenciaResultados', { instanciaId });
      return (raw || []).map((r) => ({
        id: r.id,
        formularioInstanciaId: r.formulario_instancia_id,
        competenciaId: r.competencia_id,
        nivelAtribuido: r.nivel_atribuido,
        peso: r.peso !== '' && r.peso != null ? Number(r.peso) : undefined,
      }));
    } catch (e) {
      return [];
    }
  }
  async saveAvaliacaoCompetenciaResultadosBatch(
    instanciaId: string,
    resultados: AvaliacaoCompetenciaResultado[]
  ): Promise<{ instanciaId: string; totalGravado: number }> {
    try {
      const body = resultados.map((r) => ({
        id: r.id,
        competencia_id: r.competenciaId,
        nivel_atribuido: r.nivelAtribuido,
        peso: r.peso ?? '',
      }));
      const raw = await this.request<any>('saveAvaliacaoCompetenciaResultadosBatch', {
        data: { instanciaId, resultados: body },
      });
      return { instanciaId, totalGravado: Number(raw?.totalGravado) || resultados.length };
    } catch (e) {
      console.warn('Erro ao salvar resultados de avaliação de competência no GoogleScript:', e);
      throw e;
    }
  }

  async getEvidencias(filtro?: { entidadeTipo?: EntidadeTipoEvidencia; entidadeId?: string }): Promise<Evidencia[]> {
    try {
      const raw = await this.request<any[]>('getEvidencias', {
        entidadeTipo: filtro?.entidadeTipo || '',
        entidadeId: filtro?.entidadeId || '',
      });
      return (raw || []).map((e) => ({
        id: e.id,
        entidadeTipo: e.entidade_tipo,
        entidadeId: e.entidade_id,
        tipo: e.tipo,
        url: e.url || undefined,
        driveFileId: e.drive_file_id || undefined,
        texto: e.texto || undefined,
        anexadoPor: e.anexado_por || undefined,
        data: e.data || undefined,
        status: e.status,
        validadoPor: e.validado_por || undefined,
        dataValidacao: e.data_validacao || undefined,
      }));
    } catch (e) {
      return this.localFallback.getEvidencias(filtro);
    }
  }
  async anexarEvidencia(evidencia: Evidencia): Promise<void> {
    await this.localFallback.anexarEvidencia(evidencia);
    try {
      const body = {
        id: evidencia.id,
        entidade_tipo: evidencia.entidadeTipo,
        entidade_id: evidencia.entidadeId,
        tipo: evidencia.tipo,
        url: evidencia.url || '',
        drive_file_id: evidencia.driveFileId || '',
        texto: evidencia.texto || '',
        anexado_por: evidencia.anexadoPor || '',
        data: evidencia.data || '',
        status: evidencia.status || 'pendente',
      };
      await this.request('anexarEvidencia', { data: body });
    } catch (e) {
      console.warn('Erro ao anexar Evidência no GoogleScript:', e);
      throw e;
    }
  }
  async validarEvidencia(id: string, validadoPor?: string): Promise<void> {
    await this.localFallback.validarEvidencia(id, validadoPor);
    try {
      await this.request('validarEvidencia', { data: { id, validado_por: validadoPor || '' } });
    } catch (e) {
      console.warn('Erro ao validar Evidência no GoogleScript:', e);
      throw e;
    }
  }
  async rejeitarEvidencia(id: string, validadoPor?: string): Promise<void> {
    await this.localFallback.rejeitarEvidencia(id, validadoPor);
    try {
      await this.request('rejeitarEvidencia', { data: { id, validado_por: validadoPor || '' } });
    } catch (e) {
      console.warn('Erro ao rejeitar Evidência no GoogleScript:', e);
      throw e;
    }
  }

  // ── Motor de Desenvolvimento de Colaboradores — Perfil (Aggregate Root) ──
  async getPerfilCompetencias(colaboradorId: string): Promise<PerfilCompetencia[]> {
    try {
      const raw = await this.request<any[]>('getPerfilCompetencias', { colaboradorId });
      return (raw || []).map((p) => ({
        id: p.id,
        colaboradorId: p.colaborador_id,
        competenciaId: p.competencia_id,
        nivelAtual: p.nivel_atual,
        atualizadoEm: p.atualizado_em || undefined,
        atualizadoPor: p.atualizado_por || undefined,
      }));
    } catch (e) {
      return this.localFallback.getPerfilCompetencias(colaboradorId);
    }
  }
  // avaliarCompetencia é função de negócio (Princípio 2 — nada escreve no
  // Perfil fora de evento); o backend decide se altera o cache ou não, e o
  // erro (parâmetros inválidos) precisa chegar até quem chamou.
  async avaliarCompetencia(
    colaboradorId: string,
    competenciaId: string,
    nivel: string,
    usuarioId?: string,
    origemId?: string
  ): Promise<ResultadoEvolucaoCompetencia> {
    try {
      const raw = await this.request<any>('avaliarCompetencia', {
        data: {
          colaborador_id: colaboradorId,
          competencia_id: competenciaId,
          nivel,
          usuario_id: usuarioId || '',
          origem_id: origemId || '',
        },
      });
      await this.localFallback.avaliarCompetencia(colaboradorId, competenciaId, nivel).catch(() => undefined);
      return {
        alterado: raw.alterado === true,
        nivelAnterior: raw.nivelAnterior || undefined,
        nivelAtual: raw.nivelAtual || nivel,
      };
    } catch (e) {
      console.warn('Erro ao avaliar Competência no GoogleScript:', e);
      throw e;
    }
  }
  async getPerfilObjetivos(colaboradorId: string): Promise<PerfilObjetivo[]> {
    try {
      const raw = await this.request<any[]>('getPerfilObjetivos', { colaboradorId });
      return (raw || []).map((o) => ({
        id: o.id,
        colaboradorId: o.colaborador_id,
        titulo: o.titulo,
        descricao: o.descricao || undefined,
        competenciaId: o.competencia_id || undefined,
        prazo: o.prazo || undefined,
        status: o.status,
        dataConclusao: o.data_conclusao || undefined,
      }));
    } catch (e) {
      return this.localFallback.getPerfilObjetivos(colaboradorId);
    }
  }
  async saveObjetivo(objetivo: PerfilObjetivo): Promise<void> {
    await this.localFallback.saveObjetivo(objetivo);
    try {
      const body = {
        id: objetivo.id,
        colaborador_id: objetivo.colaboradorId,
        titulo: objetivo.titulo,
        descricao: objetivo.descricao || '',
        competencia_id: objetivo.competenciaId || '',
        prazo: objetivo.prazo || '',
        status: objetivo.status || 'aberto',
        data_conclusao: objetivo.dataConclusao || '',
      };
      await this.request('saveObjetivo', { data: body });
    } catch (e) {
      console.warn('Erro ao salvar Objetivo no GoogleScript:', e);
      throw e;
    }
  }
  async concluirObjetivo(id: string, usuarioId?: string): Promise<void> {
    await this.localFallback.concluirObjetivo(id);
    try {
      await this.request('concluirObjetivo', { data: { id, usuario_id: usuarioId || '' } });
    } catch (e) {
      console.warn('Erro ao concluir Objetivo no GoogleScript:', e);
      throw e;
    }
  }
  async expirarObjetivo(id: string, usuarioId?: string): Promise<void> {
    await this.localFallback.expirarObjetivo(id);
    try {
      await this.request('expirarObjetivo', { data: { id, usuario_id: usuarioId || '' } });
    } catch (e) {
      console.warn('Erro ao expirar Objetivo no GoogleScript:', e);
      throw e;
    }
  }
  async getPerfilConsolidado(colaboradorId: string): Promise<PerfilConsolidado> {
    try {
      const raw = await this.request<any>('getPerfilConsolidado', { colaboradorId });
      return {
        colaboradorId: raw.colaboradorId,
        competencias: raw.competencias || [],
        objetivos: (raw.objetivos || []).map((o: any) => ({
          id: o.id,
          colaboradorId: o.colaborador_id,
          titulo: o.titulo,
          descricao: o.descricao || undefined,
          competenciaId: o.competencia_id || undefined,
          prazo: o.prazo || undefined,
          status: o.status,
          dataConclusao: o.data_conclusao || undefined,
        })),
        inscricoesAtivas: raw.inscricoesAtivas || [],
      };
    } catch (e) {
      return this.localFallback.getPerfilConsolidado(colaboradorId);
    }
  }

  // ── Motor de Desenvolvimento de Colaboradores — Indicadores ──
  async getIndicadoresDesenvolvimento(filtro?: {
    escopoTipo?: EscopoTipoIndicador;
    escopoId?: string;
    tipoIndicador?: string;
  }): Promise<IndicadorDesenvolvimento[]> {
    try {
      const raw = await this.request<any[]>('getIndicadoresDesenvolvimento', {
        escopoTipo: filtro?.escopoTipo || '',
        escopoId: filtro?.escopoId || '',
        tipoIndicador: filtro?.tipoIndicador || '',
      });
      return (raw || []).map((i) => ({
        id: i.id,
        tipoIndicador: i.tipo_indicador,
        escopoTipo: i.escopo_tipo,
        escopoId: i.escopo_id,
        valor: Number(i.valor) || 0,
        calculadoEm: i.calculado_em || undefined,
      }));
    } catch (e) {
      return this.localFallback.getIndicadoresDesenvolvimento(filtro);
    }
  }
  async recalcularIndicadoresDesenvolvimentoAgora(): Promise<{ totalIndicadores: number }> {
    try {
      const raw = await this.request<any>('recalcularIndicadoresDesenvolvimentoAgora');
      return { totalIndicadores: Number(raw?.totalIndicadores) || 0 };
    } catch (e) {
      console.warn('Erro ao recalcular Indicadores de Desenvolvimento no GoogleScript:', e);
      throw e;
    }
  }

  // ── Motor de Desenvolvimento de Colaboradores — Visão Analítica / Insight ──
  async getInsights(filtro?: {
    colaboradorId?: string;
    entidadeTipo?: EntidadeTipoInsight;
    entidadeId?: string;
    status?: StatusInsight;
  }): Promise<Insight[]> {
    try {
      const raw = await this.request<any[]>('getInsights', {
        colaboradorId: filtro?.colaboradorId || '',
        entidadeTipo: filtro?.entidadeTipo || '',
        entidadeId: filtro?.entidadeId || '',
        status: filtro?.status || '',
      });
      return (raw || []).map((i) => ({
        id: i.id,
        entidadeTipo: i.entidade_tipo,
        entidadeId: i.entidade_id,
        tipo: i.tipo,
        origem: i.origem,
        confianca: Number(i.confianca) || 0,
        texto: i.texto,
        dadoReferencia: i.dado_referencia && typeof i.dado_referencia === 'object' ? i.dado_referencia : undefined,
        status: i.status,
        geradoEm: i.gerado_em || undefined,
        decididoPor: i.decidido_por || undefined,
        decididoEm: i.decidido_em || undefined,
      }));
    } catch (e) {
      return this.localFallback.getInsights(filtro);
    }
  }
  async gerarInsightsDesenvolvimentoAgora(): Promise<{ novosInsights: number }> {
    try {
      const raw = await this.request<any>('gerarInsightsDesenvolvimentoAgora');
      return { novosInsights: Number(raw?.novosInsights) || 0 };
    } catch (e) {
      console.warn('Erro ao gerar Insights de Desenvolvimento no GoogleScript:', e);
      throw e;
    }
  }
  // decidirInsight é função de negócio (Princípio 15) — pode gerar um efeito
  // real (ex.: criar Objetivo) quando aceito; o erro (Insight já decidido,
  // não encontrado) precisa chegar até quem chamou.
  async decidirInsight(id: string, decisao: 'aceito' | 'recusado', usuarioId?: string): Promise<ResultadoDecisaoInsight> {
    try {
      const raw = await this.request<any>('decidirInsight', { data: { id, decisao, usuario_id: usuarioId || '' } });
      await this.localFallback.decidirInsight(id, decisao).catch(() => undefined);
      return { id: raw.id, status: raw.status, efeito: raw.efeito || null };
    } catch (e) {
      console.warn('Erro ao decidir Insight no GoogleScript:', e);
      throw e;
    }
  }
  async getVisaoAnalitica(colaboradorId: string): Promise<VisaoAnalitica> {
    try {
      const raw = await this.request<any>('getVisaoAnalitica', { colaboradorId });
      return {
        colaboradorId: raw.colaboradorId,
        perfil: raw.perfil,
        etapasAtrasadas: Number(raw.etapasAtrasadas) || 0,
        indicadoresSetor: (raw.indicadoresSetor || []).map((i: any) => ({
          id: i.id,
          tipoIndicador: i.tipo_indicador,
          escopoTipo: i.escopo_tipo,
          escopoId: i.escopo_id,
          valor: Number(i.valor) || 0,
          calculadoEm: i.calculado_em || undefined,
        })),
      };
    } catch (e) {
      return this.localFallback.getVisaoAnalitica(colaboradorId);
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
  async getAvaliacoesExperiencia(colaboradorId?: string): Promise<AvaliacaoExperiencia[]> {
    return this.getService().getAvaliacoesExperiencia(colaboradorId);
  }
  async saveAvaliacaoExperiencia(avaliacao: AvaliacaoExperiencia): Promise<void> {
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
  // ── Motor de Disponibilidade Operacional — Fase 2 (Motor de Férias) ──
  async getMovimentosAusencia(colaboradorId?: string): Promise<MovimentoAusencia[]> {
    return this.getService().getMovimentosAusencia(colaboradorId);
  }
  async saveMovimentoAusencia(movimento: MovimentoAusencia): Promise<void> {
    await this.getService().saveMovimentoAusencia(movimento);
  }
  async getHistoricoAlteracoes(entidade?: string, entidadeId?: string): Promise<HistoricoAlteracao[]> {
    return this.getService().getHistoricoAlteracoes(entidade, entidadeId);
  }
  async saveHistoricoAlteracao(historico: HistoricoAlteracao): Promise<void> {
    await this.getService().saveHistoricoAlteracao(historico);
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

  // ── Motor de Itens Operacionais — Sprint 1 ────────────────────────────
  async getItensOperacionais(filtro?: {
    responsavelId?: string;
    colaboradorId?: string;
    setorId?: string;
    tipoItem?: string;
    categoriaId?: string;
    estadoWorkflow?: string;
  }): Promise<ItemOperacional[]> {
    return this.getService().getItensOperacionais(filtro);
  }
  async saveItemOperacional(item: ItemOperacional): Promise<void> {
    await this.getService().saveItemOperacional(item);
  }
  async deleteItemOperacional(id: string): Promise<void> {
    await this.getService().deleteItemOperacional(id);
  }
  async getCategoriasItem(): Promise<CategoriaItem[]> {
    return this.getService().getCategoriasItem();
  }
  async saveCategoriaItem(categoria: CategoriaItem): Promise<void> {
    await this.getService().saveCategoriaItem(categoria);
  }
  async deleteCategoriaItem(id: string): Promise<void> {
    await this.getService().deleteCategoriaItem(id);
  }
  async getItensEventos(itemId: string): Promise<ItemEvento[]> {
    return this.getService().getItensEventos(itemId);
  }
  async saveItemEvento(evento: ItemEvento): Promise<void> {
    await this.getService().saveItemEvento(evento);
  }
  async getItensComentarios(filtro?: { itemId?: string; itemTipo?: 'item_operacional' | 'inscricao_etapa' }): Promise<ItemComentario[]> {
    return this.getService().getItensComentarios(filtro);
  }
  async saveItemComentario(comentario: ItemComentario): Promise<void> {
    await this.getService().saveItemComentario(comentario);
  }
  async migrarOnboardingParaMotorDesenvolvimento(): Promise<{ templates: unknown; checklists: unknown }> {
    return this.getService().migrarOnboardingParaMotorDesenvolvimento();
  }

  // ── Motor de Desenvolvimento de Colaboradores — Biblioteca Corporativa ──
  async getCapacidadesBiblioteca(): Promise<CapacidadeBiblioteca[]> {
    return this.getService().getCapacidadesBiblioteca();
  }
  async saveCapacidadeBiblioteca(capacidade: CapacidadeBiblioteca): Promise<void> {
    await this.getService().saveCapacidadeBiblioteca(capacidade);
  }
  async getCompetenciasBiblioteca(filtro?: { capacidadeId?: string }): Promise<CompetenciaBiblioteca[]> {
    return this.getService().getCompetenciasBiblioteca(filtro);
  }
  async saveCompetenciaBiblioteca(competencia: CompetenciaBiblioteca): Promise<void> {
    await this.getService().saveCompetenciaBiblioteca(competencia);
  }
  async getMateriaisBiblioteca(filtro?: { tipo?: TipoMaterialBiblioteca }): Promise<MaterialBiblioteca[]> {
    return this.getService().getMateriaisBiblioteca(filtro);
  }
  async saveMaterialBiblioteca(material: MaterialBiblioteca): Promise<void> {
    await this.getService().saveMaterialBiblioteca(material);
  }
  async deleteMaterialBiblioteca(id: string): Promise<void> {
    await this.getService().deleteMaterialBiblioteca(id);
  }
  async getMatrizCompetenciasCargo(filtro?: { cargoId?: string }): Promise<MatrizCompetenciaCargo[]> {
    return this.getService().getMatrizCompetenciasCargo(filtro);
  }
  async saveMatrizCompetenciaCargo(item: MatrizCompetenciaCargo): Promise<void> {
    await this.getService().saveMatrizCompetenciaCargo(item);
  }
  async deleteMatrizCompetenciaCargo(id: string): Promise<void> {
    await this.getService().deleteMatrizCompetenciaCargo(id);
  }
  async getAreasDesenvolvimento(): Promise<AreaDesenvolvimento[]> {
    return this.getService().getAreasDesenvolvimento();
  }
  async saveAreaDesenvolvimento(area: AreaDesenvolvimento): Promise<void> {
    await this.getService().saveAreaDesenvolvimento(area);
  }
  async deleteAreaDesenvolvimento(id: string): Promise<void> {
    await this.getService().deleteAreaDesenvolvimento(id);
  }

  // ── Motor de Desenvolvimento de Colaboradores — Programa (definição) ──
  async getProgramas(filtro?: {
    areaDesenvolvimentoId?: string;
    tipoPrograma?: TipoPrograma;
    programaFamiliaId?: string;
  }): Promise<Programa[]> {
    return this.getService().getProgramas(filtro);
  }
  async saveProgramaTemplate(programa: Programa): Promise<void> {
    await this.getService().saveProgramaTemplate(programa);
  }
  async getProgramaEtapasTemplate(filtro?: { programaId?: string }): Promise<ProgramaEtapaTemplate[]> {
    return this.getService().getProgramaEtapasTemplate(filtro);
  }
  async saveProgramaEtapaTemplate(etapa: ProgramaEtapaTemplate): Promise<void> {
    await this.getService().saveProgramaEtapaTemplate(etapa);
  }
  async deleteProgramaEtapaTemplate(id: string): Promise<void> {
    await this.getService().deleteProgramaEtapaTemplate(id);
  }

  // ── Motor de Desenvolvimento de Colaboradores — Oferta/Inscrição/Etapa/Evidência ──
  async getOfertas(filtro?: { programaId?: string; status?: StatusOferta }): Promise<Oferta[]> {
    return this.getService().getOfertas(filtro);
  }
  async saveOferta(oferta: Oferta): Promise<void> {
    await this.getService().saveOferta(oferta);
  }
  async encerrarOferta(id: string): Promise<void> {
    await this.getService().encerrarOferta(id);
  }
  async cancelarOferta(id: string): Promise<void> {
    await this.getService().cancelarOferta(id);
  }
  async getInscricoes(filtro?: {
    colaboradorId?: string;
    ofertaId?: string;
    programaId?: string;
    estadoWorkflow?: EstadoWorkflowInscricao;
  }): Promise<Inscricao[]> {
    return this.getService().getInscricoes(filtro);
  }
  async criarInscricao(colaboradorId: string, ofertaId: string, origem?: OrigemInscricao, usuarioId?: string): Promise<Inscricao> {
    return this.getService().criarInscricao(colaboradorId, ofertaId, origem, usuarioId);
  }
  async cancelarInscricao(id: string, motivo: string, usuarioId?: string): Promise<void> {
    await this.getService().cancelarInscricao(id, motivo, usuarioId);
  }
  async getInscricaoEtapas(filtro?: { inscricaoId?: string }): Promise<InscricaoEtapa[]> {
    return this.getService().getInscricaoEtapas(filtro);
  }
  async concluirEtapa(id: string, usuarioId?: string): Promise<ResultadoConclusaoEtapa> {
    return this.getService().concluirEtapa(id, usuarioId);
  }
  async aprovarEtapa(id: string, usuarioId?: string): Promise<ResultadoDecisaoAprovacaoEtapa> {
    return this.getService().aprovarEtapa(id, usuarioId);
  }
  async rejeitarEtapa(id: string, usuarioId?: string): Promise<ResultadoDecisaoAprovacaoEtapa> {
    return this.getService().rejeitarEtapa(id, usuarioId);
  }
  async getAvaliacaoCompetenciaResultados(instanciaId: string): Promise<AvaliacaoCompetenciaResultado[]> {
    return this.getService().getAvaliacaoCompetenciaResultados(instanciaId);
  }
  async saveAvaliacaoCompetenciaResultadosBatch(
    instanciaId: string,
    resultados: AvaliacaoCompetenciaResultado[]
  ): Promise<{ instanciaId: string; totalGravado: number }> {
    return this.getService().saveAvaliacaoCompetenciaResultadosBatch(instanciaId, resultados);
  }
  async getEvidencias(filtro?: { entidadeTipo?: EntidadeTipoEvidencia; entidadeId?: string }): Promise<Evidencia[]> {
    return this.getService().getEvidencias(filtro);
  }
  async anexarEvidencia(evidencia: Evidencia): Promise<void> {
    await this.getService().anexarEvidencia(evidencia);
  }
  async validarEvidencia(id: string, validadoPor?: string): Promise<void> {
    await this.getService().validarEvidencia(id, validadoPor);
  }
  async rejeitarEvidencia(id: string, validadoPor?: string): Promise<void> {
    await this.getService().rejeitarEvidencia(id, validadoPor);
  }

  // ── Motor de Desenvolvimento de Colaboradores — Perfil (Aggregate Root) ──
  async getPerfilCompetencias(colaboradorId: string): Promise<PerfilCompetencia[]> {
    return this.getService().getPerfilCompetencias(colaboradorId);
  }
  async avaliarCompetencia(
    colaboradorId: string,
    competenciaId: string,
    nivel: string,
    usuarioId?: string,
    origemId?: string
  ): Promise<ResultadoEvolucaoCompetencia> {
    return this.getService().avaliarCompetencia(colaboradorId, competenciaId, nivel, usuarioId, origemId);
  }
  async getPerfilObjetivos(colaboradorId: string): Promise<PerfilObjetivo[]> {
    return this.getService().getPerfilObjetivos(colaboradorId);
  }
  async saveObjetivo(objetivo: PerfilObjetivo): Promise<void> {
    await this.getService().saveObjetivo(objetivo);
  }
  async concluirObjetivo(id: string, usuarioId?: string): Promise<void> {
    await this.getService().concluirObjetivo(id, usuarioId);
  }
  async expirarObjetivo(id: string, usuarioId?: string): Promise<void> {
    await this.getService().expirarObjetivo(id, usuarioId);
  }
  async getPerfilConsolidado(colaboradorId: string): Promise<PerfilConsolidado> {
    return this.getService().getPerfilConsolidado(colaboradorId);
  }

  // ── Motor de Desenvolvimento de Colaboradores — Indicadores ──
  async getIndicadoresDesenvolvimento(filtro?: {
    escopoTipo?: EscopoTipoIndicador;
    escopoId?: string;
    tipoIndicador?: string;
  }): Promise<IndicadorDesenvolvimento[]> {
    return this.getService().getIndicadoresDesenvolvimento(filtro);
  }
  async recalcularIndicadoresDesenvolvimentoAgora(): Promise<{ totalIndicadores: number }> {
    return this.getService().recalcularIndicadoresDesenvolvimentoAgora();
  }

  // ── Motor de Desenvolvimento de Colaboradores — Visão Analítica / Insight ──
  async getInsights(filtro?: {
    colaboradorId?: string;
    entidadeTipo?: EntidadeTipoInsight;
    entidadeId?: string;
    status?: StatusInsight;
  }): Promise<Insight[]> {
    return this.getService().getInsights(filtro);
  }
  async gerarInsightsDesenvolvimentoAgora(): Promise<{ novosInsights: number }> {
    return this.getService().gerarInsightsDesenvolvimentoAgora();
  }
  async decidirInsight(id: string, decisao: 'aceito' | 'recusado', usuarioId?: string): Promise<ResultadoDecisaoInsight> {
    return this.getService().decidirInsight(id, decisao, usuarioId);
  }
  async getVisaoAnalitica(colaboradorId: string): Promise<VisaoAnalitica> {
    return this.getService().getVisaoAnalitica(colaboradorId);
  }

  async resetData(): Promise<void> {
    await this.getService().resetData();
  }
}

export const DataService = new DynamicDataService();
