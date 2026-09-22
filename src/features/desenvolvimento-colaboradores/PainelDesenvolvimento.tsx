/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import {
  ProjecaoProntidao,
  PerfilCapacidade,
  Evidencia,
  Ocorrencia,
  PerfilObjetivo,
  CapacidadeBiblioteca,
  CompetenciaBiblioteca,
  EscalaDominio,
  GrauDominio,
  MatrizVersao,
  MatrizCapacidadeCargo,
  GravidadeOcorrencia,
  TipoEvidenciaCapacidade,
  Colaborador,
  Lider,
  Setor,
  Cargo,
} from '../../types';
import { DataService } from '../../services/DataService';
import {
  TrendingUp,
  Award,
  AlertTriangle,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Plus,
  ChevronDown,
  ChevronRight,
  Activity,
  Layers,
  Target,
  ClipboardList,
  Edit3,
  Save,
  X,
} from 'lucide-react';

// ══════════════════════════════════════════════════════════════════
// LEGENDA FIXA DE GRAUS — 0 a 4
// Usada quando a escala do banco não está disponível ou como padrão.
// Exibida no painel e no Guia de Usabilidade.
// ══════════════════════════════════════════════════════════════════
export const GRAUS_FIXOS = [
  {
    ordem: 0,
    nome: 'Não Iniciado',
    descricao: 'Não avaliado — todos começam aqui por padrão.',
    cor: '#94a3b8',    // slate-400
    corBg: '#f1f5f9',  // slate-100
    corTexto: '#475569',
  },
  {
    ordem: 1,
    nome: 'Consciente',
    descricao: 'Sei que existe, mas não sei usar.',
    cor: '#3b82f6',    // blue-500
    corBg: '#eff6ff',
    corTexto: '#1d4ed8',
  },
  {
    ordem: 2,
    nome: 'Aplicado',
    descricao: 'Sei avaliar e tratar necessidades simples, como avaliar problemas e configurar com uso da wiki.',
    cor: '#10b981',    // emerald-500
    corBg: '#ecfdf5',
    corTexto: '#065f46',
  },
  {
    ordem: 3,
    nome: 'Avançado',
    descricao: 'Saber identificar problemas avançados, configurar do zero sem uso da wiki.',
    cor: '#f59e0b',    // amber-500
    corBg: '#fffbeb',
    corTexto: '#92400e',
  },
  {
    ordem: 4,
    nome: 'Referência',
    descricao: 'Ter o nível avançado e ainda poder compartilhar conhecimento, treinando novos colaboradores de forma eficiente.',
    cor: '#8b5cf6',    // violet-500
    corBg: '#f5f3ff',
    corTexto: '#5b21b6',
  },
];

// ══════════════════════════════════════════════════════════════════
// Helpers de grau — o nome/cor/descrição exibidos vêm SEMPRE da legenda
// oficial pela ORDEM do grau (0-4), nunca pelo nome digitado na escala do
// banco (que pode estar como "0 — Não Iniciado", "Avançado", etc.).
// ══════════════════════════════════════════════════════════════════
export const grauFixoPorOrdem = (ordem: number | undefined | null) =>
  GRAUS_FIXOS.find(g => g.ordem === Number(ordem)) || GRAUS_FIXOS[0];

const ordemDoGrau = (graus: GrauDominio[], grauId?: string): number | null => {
  if (!grauId) return null;
  const g = graus.find(x => x.id === grauId);
  return g ? Number(g.ordem) : null;
};

// ══════════════════════════════════════════════════════════════════
// Componente: LinhaCapacidadeAvaliavel
// Seletor visual de grau direto na capacidade. Salvar registra uma
// Evidência já validada (quem/quando/contexto) e o servidor recalcula o
// Perfil de Capacidade na mesma chamada. Nada vai para a timeline/CRM.
// ══════════════════════════════════════════════════════════════════
interface LinhaCapacidadeAvaliavelProps {
  capacidadeId: string;
  cap?: CapacidadeBiblioteca;
  comp?: CompetenciaBiblioteca;
  pc?: PerfilCapacidade;              // perfil atual (undefined = nunca avaliado)
  escalaId?: string;                  // escala exigida pela Matriz (ou do perfil)
  grauMinimoId?: string;              // grau mínimo exigido pela Matriz
  obrigatorio?: boolean;
  grausDaEscala: GrauDominio[];       // graus reais (ids do banco) da escala
  matrizVersaoId?: string;
  colaborador: Colaborador;
  currentUserId: string;
  onAtualizado: () => Promise<void> | void;
}

function LinhaCapacidadeAvaliavel({
  capacidadeId, cap, comp, pc, escalaId, grauMinimoId, obrigatorio, grausDaEscala,
  matrizVersaoId, colaborador, currentUserId, onAtualizado,
}: LinhaCapacidadeAvaliavelProps) {
  const ordemAtual = ordemDoGrau(grausDaEscala, pc?.grauAtual) ?? 0;
  const ordemMinima = ordemDoGrau(grausDaEscala, grauMinimoId);
  const avaliado = !!pc?.grauAtual;
  const atingido = avaliado && ordemMinima !== null && ordemAtual >= ordemMinima;
  const abaixo = avaliado && ordemMinima !== null && ordemAtual < ordemMinima;

  const [expandido, setExpandido] = useState(false);
  const [grauSelecionado, setGrauSelecionado] = useState<number>(ordemAtual);
  const [contexto, setContexto] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Mantém o seletor coerente com o banco depois de cada recarga
  useEffect(() => { setGrauSelecionado(ordemAtual); }, [ordemAtual, pc?.grauAtual]);

  const grausOrdenados = [...grausDaEscala].sort((a, b) => Number(a.ordem) - Number(b.ordem));
  const mudou = grauSelecionado !== ordemAtual || !avaliado;
  const fixoAtual = grauFixoPorOrdem(ordemAtual);
  const fixoMinimo = ordemMinima !== null ? grauFixoPorOrdem(ordemMinima) : null;

  const handleSalvar = async () => {
    const grauDb = grausOrdenados.find(g => Number(g.ordem) === grauSelecionado);
    if (!grauDb || salvando) return;
    setSalvando(true); setErro(null);
    try {
      await DataService.avaliarCapacidade({
        colaboradorId: colaborador.id,
        capacidadeId,
        competenciaId: comp?.id || cap?.competenciaId,
        escalaId: escalaId || grauDb.escalaId,
        grauId: grauDb.id,
        grauOrdem: grauSelecionado,
        avaliadoPor: currentUserId,
        contexto: contexto.trim() || undefined,
        data,
        matrizVersaoId,
      });
      setContexto('');
      setExpandido(false);
      await onAtualizado();
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível salvar. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  const bordaLinha = expandido ? 'border-teal-300 bg-teal-50/30'
    : atingido ? 'border-emerald-200 bg-emerald-50/50'
    : abaixo ? 'border-amber-200 bg-amber-50/40'
    : 'border-slate-100 bg-white';

  return (
    <div className={`rounded-2xl border transition-all ${bordaLinha}`}>
      <div className="flex items-center gap-3 px-3 py-2.5 cursor-pointer" onClick={() => setExpandido(e => !e)}>
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-extrabold shrink-0"
          style={{ background: avaliado ? fixoAtual.cor : '#cbd5e1' }} title={`Grau atual: ${fixoAtual.nome}`}>
          {avaliado ? ordemAtual : '–'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-xs font-bold text-slate-700 truncate">{cap?.nome || 'Capacidade'}</p>
            {obrigatorio && <span className="text-[8px] font-bold bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full shrink-0">obrigatória</span>}
            {pc?.treinado && <span className="text-[8px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full shrink-0">treinado</span>}
          </div>
          {comp && <p className="text-[9px] text-slate-400 truncate">{comp.nome}</p>}
          {fixoMinimo && (
            <p className="text-[9px] text-slate-400 mt-0.5">
              Mínimo exigido: <span className="font-bold" style={{ color: fixoMinimo.corTexto }}>{fixoMinimo.ordem} — {fixoMinimo.nome}</span>
            </p>
          )}
        </div>

        {atingido ? (
          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0">
            <CheckCircle size={11} /> {fixoAtual.nome} · atingido
          </span>
        ) : avaliado ? (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
            style={{ background: fixoAtual.corBg, color: fixoAtual.corTexto }}>
            {ordemAtual} — {fixoAtual.nome}{abaixo ? ' · abaixo do mínimo' : ''}
          </span>
        ) : (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 shrink-0">Não avaliado</span>
        )}
        <Edit3 size={12} className={`shrink-0 transition ${expandido ? 'text-teal-500' : 'text-slate-300'}`} />
      </div>

      {expandido && (
        <div className="px-3 pb-3 space-y-3 border-t border-slate-100 pt-3" onClick={e => e.stopPropagation()}>
          {grausOrdenados.length === 0 ? (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              Esta capacidade não tem Escala de Domínio vinculada na Matriz. Configure em
              <strong> Configurações → Trilha &amp; Matriz → Matriz por Cargo</strong> para habilitar a avaliação.
            </p>
          ) : (
            <>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Selecionar grau</p>
                <div className="flex gap-1.5 flex-wrap">
                  {grausOrdenados.map(g => {
                    const ordem = Number(g.ordem);
                    const fixo = grauFixoPorOrdem(ordem);
                    const sel = grauSelecionado === ordem;
                    return (
                      <button key={g.id} type="button" onClick={() => setGrauSelecionado(ordem)} title={fixo.descricao}
                        className={`relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border-2 cursor-pointer transition-all ${sel ? 'scale-105 shadow-md' : 'opacity-70 hover:opacity-100'}`}
                        style={{ borderColor: sel ? fixo.cor : '#e2e8f0', background: sel ? fixo.corBg : '#f8fafc' }}>
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-extrabold" style={{ background: fixo.cor }}>{ordem}</span>
                        <span className="text-[9px] font-bold whitespace-nowrap" style={{ color: fixo.corTexto }}>{fixo.nome}</span>
                        {avaliado && ordemAtual === ordem && (
                          <span className="absolute -top-1.5 -right-1.5 text-[8px] bg-slate-700 text-white px-1 rounded-full font-bold">atual</span>
                        )}
                        {ordemMinima === ordem && (
                          <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[7px] bg-rose-500 text-white px-1 rounded-full font-bold">mín.</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-500 mt-2 italic">{grauFixoPorOrdem(grauSelecionado).descricao}</p>
              </div>

              {mudou && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    O que foi observado? <span className="font-normal text-slate-400 normal-case">(opcional — fica no histórico de evidências)</span>
                  </p>
                  <textarea value={contexto} onChange={e => setContexto(e.target.value)} rows={2}
                    placeholder={[
                      'Ex.: Capacidade ainda não trabalhada com o colaborador.',
                      'Ex.: Já foi apresentado ao tema, mas ainda não aplicou.',
                      'Ex.: Resolveu o chamado #1234 seguindo a wiki.',
                      'Ex.: Configurou do zero sem consultar documentação.',
                      'Ex.: Treinou um novo colaborador no tema com sucesso.',
                    ][grauSelecionado] || ''}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-none placeholder:text-slate-300" />
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-slate-500 font-semibold">Data da avaliação:</label>
                    <input type="date" value={data} onChange={e => setData(e.target.value)}
                      className="text-[10px] border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-teal-500" />
                  </div>
                </div>
              )}

              {erro && <p className="text-[11px] text-rose-600 font-semibold">⚠️ {erro}</p>}

              <div className="flex items-center gap-2">
                {mudou && (
                  <button type="button" onClick={handleSalvar} disabled={salvando}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-teal-500 hover:bg-teal-400 text-white text-xs font-bold rounded-xl cursor-pointer transition disabled:opacity-50">
                    {salvando ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    {salvando ? 'Salvando...' : 'Salvar avaliação'}
                  </button>
                )}
                <button type="button" onClick={() => { setExpandido(false); setGrauSelecionado(ordemAtual); setContexto(''); setErro(null); }}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 cursor-pointer transition">
                  <X size={12} /> Cancelar
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Componente: CartaoEvidencia — histórico com editar/remover.
// Editar ou remover recalcula o grau da capacidade no servidor.
// ══════════════════════════════════════════════════════════════════
const formatarDataEvidencia = (d?: string) => {
  if (!d) return '—';
  const iso = d.includes('T') ? d : `${d}T12:00:00`;
  const dt = new Date(iso);
  return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};
const dataParaInput = (d?: string) => {
  if (!d) return new Date().toISOString().split('T')[0];
  const dt = new Date(d.includes('T') ? d : `${d}T12:00:00`);
  return isNaN(dt.getTime()) ? new Date().toISOString().split('T')[0] : dt.toISOString().split('T')[0];
};

interface CartaoEvidenciaProps {
  ev: Evidencia;
  cap?: CapacidadeBiblioteca;
  tipoNome: string;
  ehTreinamento: boolean;
  graus: GrauDominio[];
  currentUserId: string;
  onRemover: (ev: Evidencia) => void;
  onAtualizado: () => Promise<void> | void;
}

function CartaoEvidencia({ ev, cap, tipoNome, ehTreinamento, graus, currentUserId, onRemover, onAtualizado }: CartaoEvidenciaProps) {
  const ehManual = ev.tipoEvidenciaId === 'avaliacao_manual';
  const grausDaEscala = ev.escalaId ? graus.filter(g => g.escalaId === ev.escalaId).sort((a, b) => Number(a.ordem) - Number(b.ordem)) : [];
  const ordemEv = ordemDoGrau(graus, ev.grauDemonstrado);
  const fixoEv = ordemEv !== null ? grauFixoPorOrdem(ordemEv) : null;
  const textoPrincipal = ehManual ? ev.texto : (ev.situacaoObservada || ev.texto);

  const [editando, setEditando] = useState(false);
  const [txt, setTxt] = useState(textoPrincipal || '');
  const [obs, setObs] = useState(ev.observacaoGestor || '');
  const [grau, setGrau] = useState(ev.grauDemonstrado || '');
  const [data, setData] = useState(dataParaInput(ev.data));
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    setSalvando(true);
    try {
      await DataService.editarEvidencia(ev.id, {
        ...(ehManual ? { texto: txt } : { situacaoObservada: txt, observacaoGestor: obs }),
        ...(grausDaEscala.length > 0 && !ehTreinamento ? { grauDemonstrado: grau } : {}),
        data,
      }, currentUserId);
      setEditando(false);
      await onAtualizado();
    } catch (e: any) {
      alert(e?.message || 'Não foi possível salvar a edição.');
    } finally { setSalvando(false); }
  };

  const validarPendente = async () => {
    try { await DataService.validarEvidencia(ev.id, currentUserId); await onAtualizado(); }
    catch (e: any) { alert(e?.message || 'Não foi possível validar.'); }
  };

  return (
    <div className={`bg-white border rounded-2xl p-3 space-y-2 ${ev.status === 'pendente' ? 'border-amber-200' : 'border-slate-100'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-700">{cap?.nome || 'Capacidade'}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${ehManual ? 'bg-violet-100 text-violet-700' : ehTreinamento ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{tipoNome}</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">{formatarDataEvidencia(ev.data)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {fixoEv && !ehTreinamento && (
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: fixoEv.corBg, color: fixoEv.corTexto }}>
              <span className="w-2 h-2 rounded-full" style={{ background: fixoEv.cor }} />{fixoEv.ordem} — {fixoEv.nome}
            </span>
          )}
          {ehTreinamento && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">Treinado</span>}
          {ev.status === 'pendente' ? (
            <button onClick={validarPendente} className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 cursor-pointer">Pendente · validar</button>
          ) : (
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${ev.status === 'validada' ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>{ev.status}</span>
          )}
          <button onClick={() => setEditando(e => !e)} className="text-slate-300 hover:text-teal-600 p-0.5 rounded hover:bg-teal-50 cursor-pointer transition" title="Editar evidência"><Edit3 size={13} /></button>
          <button onClick={() => onRemover(ev)} className="text-slate-300 hover:text-rose-500 p-0.5 rounded hover:bg-rose-50 cursor-pointer transition" title="Remover evidência"><X size={13} /></button>
        </div>
      </div>

      {!editando && textoPrincipal && <p className="text-[11px] text-slate-600 leading-relaxed bg-slate-50 rounded-xl px-3 py-2">{textoPrincipal}</p>}
      {!editando && !ehManual && ev.observacaoGestor && <p className="text-[10px] text-slate-500 italic">Obs. do gestor: {ev.observacaoGestor}</p>}

      {editando && (
        <div className="space-y-2 bg-slate-50 rounded-xl p-3">
          <textarea value={txt} onChange={e => setTxt(e.target.value)} rows={2} placeholder={ehManual ? 'Contexto da avaliação' : 'Situação observada'}
            className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-none bg-white" />
          {!ehManual && (
            <input value={obs} onChange={e => setObs(e.target.value)} placeholder="Observação do gestor (opcional)"
              className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none bg-white" />
          )}
          <div className="flex items-center gap-2 flex-wrap">
            {grausDaEscala.length > 0 && !ehTreinamento && (
              <select value={grau} onChange={e => setGrau(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white">
                {grausDaEscala.map(g => <option key={g.id} value={g.id}>{Number(g.ordem)} — {grauFixoPorOrdem(Number(g.ordem)).nome}</option>)}
              </select>
            )}
            <input type="date" value={data} onChange={e => setData(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white" />
            <button onClick={salvar} disabled={salvando} className="ml-auto flex items-center gap-1 px-3 py-1 bg-teal-500 hover:bg-teal-400 text-white text-[11px] font-bold rounded-lg cursor-pointer disabled:opacity-50">
              {salvando ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} Salvar
            </button>
            <button onClick={() => setEditando(false)} className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Componente: ModalEvidencia
// ══════════════════════════════════════════════════════════════════
interface ModalEvidenciaProps {
  colaborador: Colaborador;
  capacidades: CapacidadeBiblioteca[];
  competencias: CompetenciaBiblioteca[];
  tiposEvidencia: TipoEvidenciaCapacidade[];
  escalas: EscalaDominio[];
  graus: GrauDominio[];
  versaoAtiva?: MatrizVersao;
  currentUserId: string;
  onSalvar: (ev: Partial<Evidencia>) => void;
  onFechar: () => void;
}

function ModalEvidencia({ colaborador, capacidades, competencias, tiposEvidencia, escalas, graus, versaoAtiva, currentUserId, onSalvar, onFechar }: ModalEvidenciaProps) {
  const [competenciaId, setCompetenciaId] = useState('');
  const [capacidadeId, setCapacidadeId] = useState('');
  const [tipoEvidenciaId, setTipoEvidenciaId] = useState(tiposEvidencia[0]?.id || '');
  const [escalaId, setEscalaId] = useState(escalas[0]?.id || '');
  const [grauDemonstrado, setGrauDemonstrado] = useState('');
  const [situacaoObservada, setSituacaoObservada] = useState('');
  const [observacaoGestor, setObservacaoGestor] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  // Modo Certificado/Curso
  const [isCertificado, setIsCertificado] = useState(false);
  const [certCursoNome, setCertCursoNome] = useState('');
  const [certInstituicao, setCertInstituicao] = useState('');
  const [certCargaHoraria, setCertCargaHoraria] = useState<number | ''>('');
  const [certDataConclusao, setCertDataConclusao] = useState('');
  const [certUrl, setCertUrl] = useState('');

  const capsDaCompetencia = capacidades.filter(c => c.competenciaId === competenciaId);
  const grausDaEscala = graus.filter(g => g.escalaId === escalaId).sort((a, b) => a.ordem - b.ordem);
  const tipoSelecionado = tiposEvidencia.find(t => t.id === tipoEvidenciaId);
  const ehTreinamento = isCertificado ? true : tipoSelecionado?.contaComoTreinamento;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!capacidadeId) return;
    if (!isCertificado && !tipoEvidenciaId) return;
    if (!isCertificado && !ehTreinamento && !grauDemonstrado) return;
    if (isCertificado && !certCursoNome.trim()) return;
    onSalvar({
      id: `ev-${Date.now()}`,
      entidadeTipo: 'capacidade',
      entidadeId: capacidadeId,
      colaboradorId: colaborador.id,
      competenciaId: competenciaId || undefined,
      capacidadeId,
      tipoEvidenciaId: isCertificado ? 'certificado' : tipoEvidenciaId,
      escalaId: isCertificado ? undefined : (escalaId || undefined),
      grauDemonstrado: isCertificado ? undefined : (grauDemonstrado || undefined),
      situacaoObservada: isCertificado ? certCursoNome : (situacaoObservada || undefined),
      observacaoGestor: isCertificado ? certInstituicao : (observacaoGestor || undefined),
      matrizVersaoId: versaoAtiva?.id,
      data: isCertificado ? (certDataConclusao || data) : data,
      tipo: isCertificado ? 'documento' : 'observacao',
      url: isCertificado ? (certUrl || undefined) : undefined,
      status: 'validada',
      autoValidar: true,
      anexadoPor: currentUserId,
      certificadoCursoNome: isCertificado ? certCursoNome : undefined,
      certificadoInstituicao: isCertificado ? (certInstituicao || undefined) : undefined,
      certificadoCargaHoraria: isCertificado && certCargaHoraria !== '' ? Number(certCargaHoraria) : undefined,
      certificadoDataConclusao: isCertificado ? (certDataConclusao || undefined) : undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900">Registrar Evidência</h3>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold text-2xl">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Toggle: Observação ou Certificado/Curso */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setIsCertificado(false)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${!isCertificado ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Observação
            </button>
            <button
              type="button"
              onClick={() => setIsCertificado(true)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${isCertificado ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              📄 Certificado / Curso
            </button>
          </div>

          {/* Competência → Capacidade */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Competência</label>
              <select value={competenciaId} onChange={e => { setCompetenciaId(e.target.value); setCapacidadeId(''); }} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer">
                <option value="">Todas</option>
                {competencias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Capacidade *</label>
              <select required value={capacidadeId} onChange={e => setCapacidadeId(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer">
                <option value="">Selecione...</option>
                {(competenciaId ? capsDaCompetencia : capacidades).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          </div>

          {/* Tipo de Evidência */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tipo de Evidência *</label>
            <select required value={tipoEvidenciaId} onChange={e => setTipoEvidenciaId(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer">
              <option value="">Selecione...</option>
              {tiposEvidencia.map(t => <option key={t.id} value={t.id}>{t.nome} {t.contaComoTreinamento ? '(treinamento)' : '(demonstração)'}</option>)}
            </select>
            {tipoSelecionado && (
              <p className={`text-[10px] mt-1 font-semibold ${ehTreinamento ? 'text-blue-600' : 'text-emerald-600'}`}>
                {ehTreinamento ? '→ Tipo configurado como treinamento: marca a capacidade como "Treinado", sem alterar o grau.' : '→ Demonstração prática: o grau selecionado passa a valer para o colaborador ao salvar.'}
              </p>
            )}
          </div>

          {/* Grau demonstrado — só para demonstração prática */}
          {!ehTreinamento && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Escala</label>
                <select value={escalaId} onChange={e => { setEscalaId(e.target.value); setGrauDemonstrado(''); }} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer">
                  {escalas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Grau Demonstrado *</label>
                <select required={!ehTreinamento} value={grauDemonstrado} onChange={e => setGrauDemonstrado(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer">
                  <option value="">Selecione...</option>
                  {grausDaEscala.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                </select>
              </div>
            </div>
          )}

          {!isCertificado && (
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Situação Observada</label>
            <textarea value={situacaoObservada} onChange={e => setSituacaoObservada(e.target.value)} rows={2} placeholder="Descreva a situação real observada..." className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none" />
          </div>
          )}
          {!isCertificado && (
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Observação do Gestor</label>
            <textarea value={observacaoGestor} onChange={e => setObservacaoGestor(e.target.value)} rows={2} placeholder="Contexto adicional (opcional)..." className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none" />
          </div>
          )}

          {/* Campos de Certificado/Curso */}
          {isCertificado && (
            <div className="space-y-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Dados do Certificado / Curso</p>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nome do Curso / Certificação *</label>
                <input required={isCertificado} value={certCursoNome} onChange={e => setCertCursoNome(e.target.value)} placeholder="Ex.: AWS Cloud Practitioner, CCNA, Curso de Fibra Óptica..." className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Instituição Emissora</label>
                  <input value={certInstituicao} onChange={e => setCertInstituicao(e.target.value)} placeholder="Ex.: Udemy, Alura, Cisco..." className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Carga Horária (h)</label>
                  <input type="number" min={1} value={certCargaHoraria} onChange={e => setCertCargaHoraria(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Ex.: 40" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Data de Conclusão</label>
                  <input type="date" value={certDataConclusao} onChange={e => setCertDataConclusao(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Link do Certificado (URL)</label>
                  <input type="url" value={certUrl} onChange={e => setCertUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white" />
                </div>
              </div>
              <p className="text-[10px] text-blue-600">→ Este certificado será marcado como "Treinado" na capacidade e ficará no histórico do colaborador.</p>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{isCertificado ? 'Data de Conclusão do Curso' : 'Data'}</label>
            <input type="date" value={isCertificado ? (certDataConclusao || data) : data} onChange={e => isCertificado ? setCertDataConclusao(e.target.value) : setData(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-teal-500" />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={onFechar} className="px-4 py-2 border border-slate-200 text-slate-600 bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer">Cancelar</button>
            <button type="submit" className="px-5 py-2 bg-teal-500 text-slate-950 font-bold rounded-xl text-xs cursor-pointer hover:bg-teal-400">{isCertificado ? '📄 Registrar Certificado' : 'Registrar Evidência'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Componente: ModalOcorrencia
// ══════════════════════════════════════════════════════════════════
interface ModalOcorrenciaProps {
  colaborador: Colaborador;
  capacidades: CapacidadeBiblioteca[];
  competencias: CompetenciaBiblioteca[];
  gravidadesOcorrencia: GravidadeOcorrencia[];
  currentUserId: string;
  onSalvar: (dados: Partial<Ocorrencia>) => void;
  onFechar: () => void;
}

function ModalOcorrencia({ colaborador, capacidades, competencias, gravidadesOcorrencia, currentUserId, onSalvar, onFechar }: ModalOcorrenciaProps) {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [competenciaId, setCompetenciaId] = useState('');
  const [capacidadeId, setCapacidadeId] = useState('');
  const [gravidadeId, setGravidadeId] = useState(gravidadesOcorrencia[0]?.id || '');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const capsDaCompetencia = capacidades.filter(c => c.competenciaId === competenciaId);

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900">Registrar Ocorrência / Ponto de Desenvolvimento</h3>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold text-2xl">&times;</button>
        </div>

        <form onSubmit={e => { e.preventDefault(); if (!titulo) return; onSalvar({ colaborador_id: colaborador.id, titulo, descricao, competencia_id: competenciaId || undefined, capacidade_id: capacidadeId || undefined, gravidade_id: gravidadeId || undefined, avaliador_id: currentUserId, data } as any); }} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Título *</label>
            <input required value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Descreva brevemente o ponto observado..." className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-rose-500" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Competência</label>
              <select value={competenciaId} onChange={e => { setCompetenciaId(e.target.value); setCapacidadeId(''); }} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer">
                <option value="">Nenhuma</option>
                {competencias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Capacidade</label>
              <select value={capacidadeId} onChange={e => setCapacidadeId(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer">
                <option value="">Nenhuma</option>
                {(competenciaId ? capsDaCompetencia : capacidades).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {gravidadesOcorrencia.length > 0 && (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Gravidade</label>
                <select value={gravidadeId} onChange={e => setGravidadeId(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer">
                  {gravidadesOcorrencia.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Data</label>
              <input type="date" value={data} onChange={e => setData(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-rose-500" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Descrição</label>
            <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={3} placeholder="Contexto, o que foi observado, impacto..." className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none" />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={onFechar} className="px-4 py-2 border border-slate-200 text-slate-600 bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer">Cancelar</button>
            <button type="submit" className="px-5 py-2 bg-rose-500 text-white font-bold rounded-xl text-xs cursor-pointer hover:bg-rose-600">Registrar Ocorrência</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Componente: ModalPDI
// ══════════════════════════════════════════════════════════════════
interface ModalPDIProps {
  colaborador: Colaborador;
  capacidades: CapacidadeBiblioteca[];
  competencias: CompetenciaBiblioteca[];
  ocorrencias: Ocorrencia[];
  onSalvar: (pdi: Partial<PerfilObjetivo>) => void;
  onFechar: () => void;
}

function ModalPDI({ colaborador, capacidades, competencias, ocorrencias, onSalvar, onFechar }: ModalPDIProps) {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [competenciaId, setCompetenciaId] = useState('');
  const [capacidadeId, setCapacidadeId] = useState('');
  const [ocorrenciaId, setOcorrenciaId] = useState('');
  const [acaoDesenvolvimento, setAcaoDesenvolvimento] = useState('');
  const [evidenciaEsperada, setEvidenciaEsperada] = useState('');
  const [prazo, setPrazo] = useState('');
  const capsDaCompetencia = capacidades.filter(c => c.competenciaId === competenciaId);

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900">Criar PDI (Plano de Desenvolvimento)</h3>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold text-2xl">&times;</button>
        </div>

        <form onSubmit={e => { e.preventDefault(); if (!titulo) return; onSalvar({ id: `pdi-${Date.now()}`, colaboradorId: colaborador.id, titulo, descricao, competenciaId: competenciaId || undefined, capacidadeId: capacidadeId || undefined, ocorrenciaId: ocorrenciaId || undefined, acaoDesenvolvimento, evidenciaEsperada, prazo: prazo || undefined, status: 'aberto' }); }} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Título do PDI *</label>
            <input required value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex.: Desenvolver capacidade de triagem avançada" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-teal-500" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Competência</label>
              <select value={competenciaId} onChange={e => { setCompetenciaId(e.target.value); setCapacidadeId(''); }} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none cursor-pointer">
                <option value="">Nenhuma</option>
                {competencias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Capacidade</label>
              <select value={capacidadeId} onChange={e => setCapacidadeId(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none cursor-pointer">
                <option value="">Nenhuma</option>
                {(competenciaId ? capsDaCompetencia : capacidades).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          </div>

          {ocorrencias.length > 0 && (
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Ocorrência Relacionada</label>
              <select value={ocorrenciaId} onChange={e => setOcorrenciaId(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none cursor-pointer">
                <option value="">Nenhuma (PDI proativo)</option>
                {ocorrencias.map(o => <option key={o.id} value={o.id}>{o.titulo} — {o.data}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Ação de Desenvolvimento</label>
            <textarea value={acaoDesenvolvimento} onChange={e => setAcaoDesenvolvimento(e.target.value)} rows={2} placeholder="O que será feito para desenvolver esta capacidade? Ex.: Participar de X sessões de coaching, assistir ao módulo Y..." className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none resize-none" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Evidência Esperada</label>
            <textarea value={evidenciaEsperada} onChange={e => setEvidenciaEsperada(e.target.value)} rows={2} placeholder="Como saberemos que o desenvolvimento aconteceu? Ex.: Demonstrar grau X na próxima avaliação de capacidade." className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none resize-none" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Prazo</label>
            <input type="date" value={prazo} onChange={e => setPrazo(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none" />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={onFechar} className="px-4 py-2 border border-slate-200 text-slate-600 bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer">Cancelar</button>
            <button type="submit" className="px-5 py-2 bg-teal-500 text-slate-950 font-bold rounded-xl text-xs cursor-pointer hover:bg-teal-400">Criar PDI</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Card de Prontidão
// ══════════════════════════════════════════════════════════════════
function CardProntidao({ prontidao, graus }: { prontidao: ProjecaoProntidao; graus: GrauDominio[] }) {
  const [expandido, setExpandido] = useState(false);

  if (prontidao.erro) {
    return (
      <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-start gap-2">
        <AlertTriangle size={14} className="text-rose-500 shrink-0 mt-0.5" />
        <p className="text-xs text-rose-700">{prontidao.erro}</p>
      </div>
    );
  }
  if (prontidao.semProximoCargo) {
    return (
      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2">
        <div className="flex items-start gap-2">
          <TrendingUp size={16} className="text-slate-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-slate-600">Trilha de carreira não configurada</p>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              {prontidao.motivo || 'Este cargo não tem um próximo nível definido na trilha.'}
            </p>
            <p className="text-[11px] text-teal-600 font-semibold mt-2">
              → Configure em: Configurações Gerais → Cargos → edite o cargo e defina o "Próximo Cargo na Trilha"
            </p>
          </div>
        </div>
      </div>
    );
  }
  if (prontidao.semMatriz) {
    return (
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-2">
        <div className="flex items-start gap-2">
          <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-700">Matriz de capacidades não configurada</p>
            <p className="text-[11px] text-amber-700/80 mt-1 leading-relaxed">{prontidao.motivo}</p>
            <p className="text-[11px] text-teal-600 font-semibold mt-2">
              → Configure em: Configurações Gerais → Trilha & Matriz → Matriz por Cargo
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { indiceProntidao, cargoAlvoNome, totalOk = 0, totalEmDesenvolvimento = 0, totalLacunas = 0, totalObrigatorias = 0 } = prontidao;
  const corBadge = indiceProntidao === 'pronto' ? 'bg-emerald-100 text-emerald-700' : indiceProntidao === 'em_desenvolvimento' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700';
  const labelBadge = indiceProntidao === 'pronto' ? '🟢 Pronto' : indiceProntidao === 'em_desenvolvimento' ? '🟡 Em Desenvolvimento' : '🔴 Com Lacunas';

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Próximo nível</p>
          <p className="font-bold text-slate-800 text-sm mt-0.5">{cargoAlvoNome}</p>
          <p className="text-xs text-slate-400 mt-0.5">{totalOk}/{totalObrigatorias} obrigatórias atingidas</p>
        </div>
        <span className={`text-[11px] font-extrabold px-3 py-1.5 rounded-full ${corBadge}`}>{labelBadge}</span>
      </div>

      {/* Barra de progresso */}
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: totalObrigatorias > 0 ? `${(totalOk / totalObrigatorias) * 100}%` : '0%' }} />
      </div>

      <button onClick={() => setExpandido(e => !e)} className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold cursor-pointer hover:text-teal-600">
        {expandido ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        {expandido ? 'Ocultar detalhes' : 'Ver detalhes por capacidade'}
      </button>

      {expandido && prontidao.capacidades && (
        <div className="space-y-1.5 pt-1">
          {prontidao.capacidades.map(cap => {
            const grauAtual = graus.find(g => g.id === cap.grauAtual);
            const grauMin = graus.find(g => g.id === cap.grauMinimo);
            const icone = cap.estado === 'ok' ? <CheckCircle size={13} className="text-emerald-500" /> : cap.estado === 'em_desenvolvimento' ? <Clock size={13} className="text-amber-500" /> : cap.estado === 'nao_avaliado' ? <Activity size={13} className="text-slate-400" /> : <XCircle size={13} className="text-rose-500" />;
            return (
              <div key={cap.capacidadeId} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs ${cap.obrigatorio ? 'bg-slate-50 border border-slate-100' : 'bg-white'}`}>
                {icone}
                <span className={`flex-1 font-semibold ${cap.obrigatorio ? 'text-slate-700' : 'text-slate-500'}`}>{cap.capacidadeNome}</span>
                <span className="text-slate-400">{grauAtual?.nome || 'Não avaliado'}</span>
                {grauMin && <span className="text-slate-300">→</span>}
                {grauMin && <span className="text-slate-600 font-bold">{grauMin.nome}</span>}
                {!cap.obrigatorio && <span className="text-[9px] text-slate-400 ml-1">facultativa</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Componente principal: PainelDesenvolvimento
// ══════════════════════════════════════════════════════════════════
interface PainelDesenvolvimentoProps {
  colaborador: Colaborador;
  capacidades: CapacidadeBiblioteca[];
  competencias: CompetenciaBiblioteca[];
  escalas: EscalaDominio[];
  graus: GrauDominio[];
  tiposEvidencia: TipoEvidenciaCapacidade[];
  gravidadesOcorrencia: GravidadeOcorrencia[];
  matrizVersoes: MatrizVersao[];
  setores: Setor[];
  currentUserId: string;
  onEvidenciaRegistrada?: () => void;
  onOcorrenciaRegistrada?: () => void;
  onPDIRegistrado?: () => void;
}

export default function PainelDesenvolvimento({
  colaborador,
  capacidades,
  competencias,
  escalas,
  graus,
  tiposEvidencia,
  gravidadesOcorrencia,
  matrizVersoes,
  setores,
  currentUserId,
  onEvidenciaRegistrada,
  onOcorrenciaRegistrada,
  onPDIRegistrado,
}: PainelDesenvolvimentoProps) {
  const [prontidao, setProntidao] = useState<ProjecaoProntidao | null>(null);
  const [perfilCapacidades, setPerfilCapacidades] = useState<PerfilCapacidade[]>([]);
  const [matrizCargo, setMatrizCargo] = useState<MatrizCapacidadeCargo[]>([]);
  const [evidencias, setEvidencias] = useState<Evidencia[]>([]);
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [pdis, setPdis] = useState<PerfilObjetivo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalEvidencia, setModalEvidencia] = useState(false);
  const [modalOcorrencia, setModalOcorrencia] = useState(false);
  const [modalPDI, setModalPDI] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<'capacidades' | 'evidencias' | 'ocorrencias' | 'pdis'>('capacidades');

  const versaoAtiva = matrizVersoes.find(v => v.ativa && setores.some(s => s.id === v.setorId && s.id === colaborador.setorId));

  const [salvandoEvidencia, setSalvandoEvidencia] = useState(false);
  const [erroEvidencia, setErroEvidencia] = useState<string | null>(null);

  const carregarDados = async (silencioso = false) => {
    if (!silencioso) setCarregando(true);
    try {
      const [pront, perfil, matriz, evids, ocorrs, pdisList] = await Promise.allSettled([
        DataService.getProntidaoProximoNivel(colaborador.id),
        DataService.getPerfilCapacidades(colaborador.id),
        // Busca TODAS as capacidades da Matriz do cargo — incluindo as ainda não avaliadas
        DataService.getMatrizCapacidadesCargo({ cargoId: colaborador.cargoId }),
        DataService.getEvidencias({ colaboradorId: colaborador.id }),
        DataService.getOcorrencias(colaborador.id),
        DataService.getPerfilObjetivos(colaborador.id),
      ]);
      if (pront.status === 'fulfilled') setProntidao(pront.value);
      if (perfil.status === 'fulfilled') setPerfilCapacidades(perfil.value);
      if (matriz.status === 'fulfilled') setMatrizCargo(matriz.value as MatrizCapacidadeCargo[]);
      if (evids.status === 'fulfilled') {
        const todasEvids = evids.value as Evidencia[];
        // Filtrar: evidências de capacidade vinculadas a este colaborador
        setEvidencias(todasEvids.filter(e => e.colaboradorId === colaborador.id));
      }
      if (ocorrs.status === 'fulfilled') setOcorrencias(ocorrs.value as Ocorrencia[]);
      if (pdisList.status === 'fulfilled') setPdis(pdisList.value as PerfilObjetivo[]);
    } catch (e) {
      console.error('PainelDesenvolvimento: erro ao carregar dados', e);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { carregarDados(); }, [colaborador.id]);

  // Registro de evidência: já nasce validado e o servidor recalcula o Perfil
  // na mesma chamada — em seguida recarrega Prontidão, Capacidades e Evidências.
  const handleSalvarEvidencia = async (ev: Partial<Evidencia>) => {
    setSalvandoEvidencia(true); setErroEvidencia(null);
    try {
      await DataService.anexarEvidencia({ ...(ev as Evidencia), status: 'validada', autoValidar: true });
      setModalEvidencia(false);
      await carregarDados(true);
      setAbaAtiva('evidencias');
      onEvidenciaRegistrada?.();
    } catch (e: any) {
      console.error(e);
      setErroEvidencia(e?.message || 'Não foi possível registrar a evidência.');
    } finally {
      setSalvandoEvidencia(false);
    }
  };

  const handleRemoverEvidencia = async (ev: Evidencia) => {
    if (!confirm('Remover esta evidência? O grau da capacidade será recalculado com base nas evidências restantes.')) return;
    try {
      await DataService.deleteEvidencia(ev.id, currentUserId);
      await carregarDados(true);
    } catch (e: any) {
      alert(e?.message || 'Não foi possível remover a evidência.');
    }
  };

  const handleSalvarOcorrencia = async (dados: any) => {
    try {
      await DataService.criarOcorrencia(dados);
      setModalOcorrencia(false);
      onOcorrenciaRegistrada?.();
      carregarDados(true);
    } catch (e) { console.error(e); }
  };

  const handleSalvarPDI = async (pdi: Partial<PerfilObjetivo>) => {
    try {
      await DataService.saveObjetivo(pdi as PerfilObjetivo);
      setModalPDI(false);
      onPDIRegistrado?.();
      carregarDados(true);
    } catch (e) { console.error(e); }
  };

  // ── Capacidades exigidas pelo cargo (Matriz), já saneadas ──────────────
  // Prioriza a versão ativa da Matriz; remove duplicatas e itens legados que
  // apontam para capacidades inexistentes na Biblioteca.
  const itensMatrizCargo = (() => {
    const daVersao = versaoAtiva ? matrizCargo.filter(m => m.matrizVersaoId === versaoAtiva.id) : [];
    const base = daVersao.length > 0 ? daVersao : matrizCargo;
    const vistos = new Set<string>();
    return base.filter(m => (vistos.has(m.capacidadeId) ? false : (vistos.add(m.capacidadeId), true)));
  })();
  const itensMatrizValidos = itensMatrizCargo.filter(m => capacidades.some(c => c.id === m.capacidadeId));
  const totalItensOrfaos = itensMatrizCargo.length - itensMatrizValidos.length;
  // Capacidades avaliadas que não estão na Matriz do cargo (ex.: registradas via "Registrar Evidência")
  const perfisForaDaMatriz = perfilCapacidades.filter(p =>
    !itensMatrizValidos.some(m => m.capacidadeId === p.capacidadeId) && capacidades.some(c => c.id === p.capacidadeId)
  );
  const totalAtingidas = itensMatrizValidos.filter(m => {
    const pc = perfilCapacidades.find(p => p.capacidadeId === m.capacidadeId);
    const oa = ordemDoGrau(graus, pc?.grauAtual); const om = ordemDoGrau(graus, m.grauMinimo);
    return oa !== null && om !== null && oa >= om;
  }).length;
  const nomeTipoEvidencia = (ev: Evidencia) =>
    ev.tipoEvidenciaId === 'avaliacao_manual' ? 'Avaliação de grau'
    : ev.tipoEvidenciaId === 'certificado' ? 'Certificado / Curso'
    : tiposEvidencia.find(t => t.id === ev.tipoEvidenciaId)?.nome || 'Evidência';
  const evidenciaEhTreinamento = (ev: Evidencia) =>
    ev.tipoEvidenciaId === 'certificado' || !!tiposEvidencia.find(t => t.id === ev.tipoEvidenciaId)?.contaComoTreinamento;

  if (carregando) return (
    <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
      <Loader2 size={20} className="animate-spin" />
      <span className="text-xs font-medium">Carregando desenvolvimento...</span>
    </div>
  );

  const statusLabel: Record<string, { label: string; cor: string }> = {
    aberto: { label: 'Aberto', cor: 'bg-slate-100 text-slate-600' },
    em_acompanhamento: { label: 'Em acompanhamento', cor: 'bg-amber-100 text-amber-700' },
    alcancado: { label: 'Alcançado', cor: 'bg-emerald-100 text-emerald-700' },
    expirado: { label: 'Expirado', cor: 'bg-slate-100 text-slate-400' },
    recorrente: { label: 'Recorrente', cor: 'bg-rose-100 text-rose-700' },
  };

  return (
    <div className="space-y-6">
      {/* Card de Prontidão */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <TrendingUp size={14} className="text-teal-500" />
          Prontidão para o Próximo Nível
        </h3>
        {prontidao ? (
          <CardProntidao prontidao={prontidao} graus={graus} />
        ) : (
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center text-xs text-slate-400">
            Nenhuma informação de prontidão disponível.
          </div>
        )}
      </div>

      {/* Abas de detalhe */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
        <div className="flex border-b border-slate-100 overflow-x-auto">
          {[
            { id: 'capacidades', label: itensMatrizValidos.length > 0 ? `Capacidades (${totalAtingidas}/${itensMatrizValidos.length})` : `Capacidades (${perfilCapacidades.length})`, icon: <Layers size={13} /> },
            { id: 'evidencias', label: `Evidências (${evidencias.length})`, icon: <Award size={13} /> },
            { id: 'ocorrencias', label: `Ocorrências (${ocorrencias.length})`, icon: <AlertTriangle size={13} /> },
            { id: 'pdis', label: `PDIs (${pdis.length})`, icon: <ClipboardList size={13} /> },
          ].map(aba => (
            <button
              key={aba.id}
              onClick={() => setAbaAtiva(aba.id as any)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold whitespace-nowrap cursor-pointer transition border-b-2 ${
                abaAtiva === aba.id ? 'border-teal-500 text-teal-700 bg-teal-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {aba.icon} {aba.label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {/* Capacidades */}
          {/* Capacidades — seletor de grau direto em cada capacidade */}
          {abaAtiva === 'capacidades' && (
            <div className="space-y-3">
              <details className="bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden">
                <summary className="px-4 py-2.5 text-xs font-bold text-slate-600 cursor-pointer flex items-center gap-2 hover:bg-slate-100 transition">
                  <Award size={13} className="text-violet-500" /> Legenda dos Graus de Domínio
                  <span className="ml-auto text-[10px] text-slate-400 font-normal">clique para expandir</span>
                </summary>
                <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-5 gap-2 pt-2">
                  {GRAUS_FIXOS.map(g => (
                    <div key={g.ordem} className="rounded-xl p-2.5 text-center" style={{ background: g.corBg, border: `1px solid ${g.cor}30` }}>
                      <div className="w-6 h-6 rounded-full mx-auto mb-1.5 flex items-center justify-center text-white text-[10px] font-extrabold" style={{ background: g.cor }}>{g.ordem}</div>
                      <p className="text-[10px] font-extrabold mb-0.5" style={{ color: g.corTexto }}>{g.nome}</p>
                      <p className="text-[9px] leading-tight" style={{ color: g.corTexto, opacity: 0.8 }}>{g.descricao}</p>
                    </div>
                  ))}
                </div>
              </details>

              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-slate-400 font-semibold">
                  {itensMatrizValidos.length > 0
                    ? `${itensMatrizValidos.length} capacidade(s) exigida(s) pelo cargo · ${totalAtingidas} no grau mínimo`
                    : `${perfilCapacidades.length} capacidade(s) avaliada(s)`}
                </p>
                <button onClick={() => setModalEvidencia(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-teal-600">
                  <Plus size={13} /> Registrar Evidência
                </button>
              </div>

              {totalItensOrfaos > 0 && (
                <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  ⚠️ {totalItensOrfaos} item(ns) da Matriz deste cargo apontam para capacidades que não existem mais na Biblioteca e foram ocultados.
                  Revise em <strong>Configurações → Trilha &amp; Matriz → Matriz por Cargo</strong>.
                </p>
              )}

              {itensMatrizValidos.length > 0 && (
                <div className="space-y-2">
                  {itensMatrizValidos.map(item => {
                    const cap = capacidades.find(c => c.id === item.capacidadeId);
                    const escala = item.escalaId || perfilCapacidades.find(p => p.capacidadeId === item.capacidadeId)?.escalaId;
                    return (
                      <LinhaCapacidadeAvaliavel
                        key={item.capacidadeId}
                        capacidadeId={item.capacidadeId}
                        cap={cap}
                        comp={competencias.find(c => c.id === cap?.competenciaId)}
                        pc={perfilCapacidades.find(p => p.capacidadeId === item.capacidadeId)}
                        escalaId={escala}
                        grauMinimoId={item.grauMinimo}
                        obrigatorio={item.obrigatorio}
                        grausDaEscala={escala ? graus.filter(g => g.escalaId === escala) : []}
                        matrizVersaoId={item.matrizVersaoId}
                        colaborador={colaborador}
                        currentUserId={currentUserId}
                        onAtualizado={() => carregarDados(true)}
                      />
                    );
                  })}
                </div>
              )}

              {perfisForaDaMatriz.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pt-1">Outras capacidades avaliadas (fora da Matriz do cargo)</p>
                  {perfisForaDaMatriz.map(pc => {
                    const cap = capacidades.find(c => c.id === pc.capacidadeId);
                    return (
                      <LinhaCapacidadeAvaliavel
                        key={pc.id}
                        capacidadeId={pc.capacidadeId}
                        cap={cap}
                        comp={competencias.find(c => c.id === cap?.competenciaId)}
                        pc={pc}
                        escalaId={pc.escalaId}
                        grausDaEscala={pc.escalaId ? graus.filter(g => g.escalaId === pc.escalaId) : []}
                        matrizVersaoId={pc.matrizVersaoId}
                        colaborador={colaborador}
                        currentUserId={currentUserId}
                        onAtualizado={() => carregarDados(true)}
                      />
                    );
                  })}
                </div>
              )}

              {itensMatrizValidos.length === 0 && perfisForaDaMatriz.length === 0 && (
                <div className="text-center py-10 space-y-2 bg-slate-50 rounded-2xl border border-slate-100">
                  <Layers size={28} className="mx-auto text-slate-300" />
                  <p className="text-xs text-slate-500 font-semibold">Nenhuma capacidade configurada para este cargo.</p>
                  <p className="text-[10px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                    Configure a Matriz em <strong>Configurações Gerais → Trilha &amp; Matriz</strong>, ou use <strong>"Registrar Evidência"</strong>.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Evidências — histórico (mais recente primeiro), editar e remover */}
          {abaAtiva === 'evidencias' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-slate-400">Editar ou remover uma evidência recalcula automaticamente o grau da capacidade.</p>
                <button onClick={() => setModalEvidencia(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-teal-600">
                  <Plus size={13} /> Nova Evidência
                </button>
              </div>
              {evidencias.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-100">
                  <FileText size={24} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-xs text-slate-400">Nenhuma evidência registrada ainda.</p>
                  <p className="text-[10px] text-slate-300 mt-1">Avaliações de grau e evidências de treinamento aparecem aqui.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {[...evidencias]
                    .sort((a, b) => (new Date(b.data || 0).getTime() - new Date(a.data || 0).getTime()) || b.id.localeCompare(a.id))
                    .map(ev => (
                      <CartaoEvidencia
                        key={ev.id}
                        ev={ev}
                        cap={capacidades.find(c => c.id === ev.capacidadeId)}
                        tipoNome={nomeTipoEvidencia(ev)}
                        ehTreinamento={evidenciaEhTreinamento(ev)}
                        graus={graus}
                        currentUserId={currentUserId}
                        onRemover={handleRemoverEvidencia}
                        onAtualizado={() => carregarDados(true)}
                      />
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Ocorrências */}
          {abaAtiva === 'ocorrencias' && (
            <div className="space-y-2">
              <div className="flex justify-end">
                <button onClick={() => setModalOcorrencia(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-rose-600">
                  <Plus size={13} /> Nova Ocorrência
                </button>
              </div>
              {ocorrencias.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">Nenhuma ocorrência registrada.</p>
              ) : (
                <div className="space-y-2">
                  {[...ocorrencias].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()).map(oc => {
                    const cap = capacidades.find(c => c.id === oc.capacidadeId);
                    const grav = gravidadesOcorrencia.find(g => g.id === oc.gravidadeId);
                    return (
                      <div key={oc.id} className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {grav && <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: grav.cor || '#94a3b8' }} />}
                              <p className="text-xs font-bold text-slate-700">{oc.titulo}</p>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {cap ? cap.nome + ' • ' : ''}{new Date(oc.data).toLocaleDateString('pt-BR')}
                              {oc.ocorrenciaOrigemId && <span className="ml-1 text-rose-500 font-bold">• Reincidente</span>}
                            </p>
                          </div>
                          <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full shrink-0">{oc.estadoWorkflow?.replace(/_/g, ' ')}</span>
                        </div>
                        {oc.descricao && <p className="text-[11px] text-slate-500 line-clamp-2">{oc.descricao}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* PDIs */}
          {abaAtiva === 'pdis' && (
            <div className="space-y-2">
              <div className="flex justify-end">
                <button onClick={() => setModalPDI(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-teal-600">
                  <Plus size={13} /> Novo PDI
                </button>
              </div>
              {pdis.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">Nenhum PDI criado ainda.</p>
              ) : (
                <div className="space-y-2">
                  {pdis.map(pdi => {
                    const cap = capacidades.find(c => c.id === pdi.capacidadeId);
                    const st = statusLabel[pdi.status] || { label: pdi.status, cor: 'bg-slate-100 text-slate-600' };
                    return (
                      <div key={pdi.id} className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-bold text-slate-700">{pdi.titulo}</p>
                            <p className="text-[10px] text-slate-400">
                              {cap ? cap.nome + ' • ' : ''}
                              {pdi.prazo ? 'Prazo: ' + new Date(pdi.prazo).toLocaleDateString('pt-BR') : 'Sem prazo'}
                              {pdi.ocorrenciaId && <span className="ml-1 text-slate-400">• Vinculado a ocorrência</span>}
                            </p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${st.cor}`}>{st.label}</span>
                        </div>
                        {pdi.acaoDesenvolvimento && <p className="text-[11px] text-slate-600 line-clamp-2"><strong>Ação:</strong> {pdi.acaoDesenvolvimento}</p>}
                        {pdi.evidenciaEsperada && <p className="text-[11px] text-slate-500 line-clamp-1"><strong>Evidência esperada:</strong> {pdi.evidenciaEsperada}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modais */}
      {modalEvidencia && (
        <ModalEvidencia
          colaborador={colaborador}
          capacidades={capacidades}
          competencias={competencias}
          tiposEvidencia={tiposEvidencia}
          escalas={escalas}
          graus={graus}
          versaoAtiva={versaoAtiva}
          currentUserId={currentUserId}
          onSalvar={handleSalvarEvidencia}
          onFechar={() => { setModalEvidencia(false); setErroEvidencia(null); }}
        />
      )}
      {modalEvidencia && (salvandoEvidencia || erroEvidencia) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-xl shadow-xl text-xs font-bold flex items-center gap-2 bg-white border border-slate-200">
          {salvandoEvidencia
            ? <><Loader2 size={13} className="animate-spin text-teal-500" /> Salvando evidência e atualizando o perfil...</>
            : <span className="text-rose-600">⚠️ {erroEvidencia}</span>}
        </div>
      )}
      {modalOcorrencia && (
        <ModalOcorrencia
          colaborador={colaborador}
          capacidades={capacidades}
          competencias={competencias}
          gravidadesOcorrencia={gravidadesOcorrencia}
          currentUserId={currentUserId}
          onSalvar={handleSalvarOcorrencia}
          onFechar={() => setModalOcorrencia(false)}
        />
      )}
      {modalPDI && (
        <ModalPDI
          colaborador={colaborador}
          capacidades={capacidades}
          competencias={competencias}
          ocorrencias={ocorrencias.filter(o => o.estadoWorkflow !== 'resolvido')}
          onSalvar={handleSalvarPDI}
          onFechar={() => setModalPDI(false)}
        />
      )}
    </div>
  );
}
