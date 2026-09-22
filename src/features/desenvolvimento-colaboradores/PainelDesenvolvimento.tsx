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
// Componente: LinhaCapacidadeAvaliavel
// Seletor visual de grau inline com mini-modal de contextualização.
// Persiste: PerfilCapacidade (grau) + Evidencia (histórico de quem/quando).
// A evidência NÃO vai para a timeline do colaborador — fica na aba Evidencias.
// ══════════════════════════════════════════════════════════════════
interface LinhaCapacidadeAvaliavelProps {
  pc: PerfilCapacidade;
  cap?: CapacidadeBiblioteca;
  comp?: CompetenciaBiblioteca;
  grauAtual?: GrauDominio;
  grauFixoAtual: typeof GRAUS_FIXOS[0];
  grausDaEscala: GrauDominio[];
  colaborador: Colaborador;
  currentUserId: string;
  onAtualizado: () => void;
}

function LinhaCapacidadeAvaliavel({
  pc, cap, comp, grauAtual, grauFixoAtual, grausDaEscala,
  colaborador, currentUserId, onAtualizado,
}: LinhaCapacidadeAvaliavelProps) {
  const [expandido, setExpandido] = useState(false);
  const [grauSelecionado, setGrauSelecionado] = useState<number>(
    grauAtual ? (grauAtual.ordem ?? 0) : 0
  );
  const [contexto, setContexto] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  // Usar os graus da escala do banco se disponíveis, senão usar GRAUS_FIXOS
  const grausDisponiveis: Array<{ ordem: number; nome: string; cor: string; corBg: string; corTexto: string; id?: string; descricao?: string }> =
    grausDaEscala.length > 0
      ? grausDaEscala.map(g => {
          const fixo = GRAUS_FIXOS[g.ordem] || GRAUS_FIXOS[0];
          return { ordem: g.ordem, nome: g.nome, cor: g.cor || fixo.cor, corBg: fixo.corBg, corTexto: fixo.corTexto, id: g.id, descricao: fixo.descricao };
        })
      : GRAUS_FIXOS.map(g => ({ ...g }));

  const grauAtualOrdem = grauAtual?.ordem ?? 0;
  const mudou = grauSelecionado !== grauAtualOrdem;

  const handleSalvar = async () => {
    if (!mudou || salvando) return;
    setSalvando(true);
    try {
      // Encontrar o GrauDominio correspondente se houver escala no banco
      const grauDb = grausDaEscala.find(g => g.ordem === grauSelecionado);
      const grauId = grauDb?.id || `grau-fixo-${grauSelecionado}`;
      await DataService.avaliarCapacidade({
        colaboradorId: colaborador.id,
        capacidadeId: pc.capacidadeId,
        competenciaId: comp?.id,
        escalaId: pc.escalaId,
        grauId,
        grauOrdem: grauSelecionado,
        avaliadoPor: currentUserId,
        contexto: contexto || undefined,
        data,
        matrizVersaoId: pc.matrizVersaoId,
      });
      setSucesso(true);
      setContexto('');
      setTimeout(() => {
        setSucesso(false);
        setExpandido(false);
        onAtualizado();
      }, 1200);
    } catch (e) {
      console.error('[LinhaCapacidadeAvaliavel] Erro ao salvar:', e);
    } finally {
      setSalvando(false);
    }
  };

  const grauAtualDisplay = grausDisponiveis.find(g => g.ordem === grauAtualOrdem) || grausDisponiveis[0];

  return (
    <div className={`rounded-2xl border transition-all ${expandido ? 'border-teal-200 bg-teal-50/20' : 'border-slate-100 bg-white'}`}>
      {/* Linha principal — clicável para expandir */}
      <div
        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
        onClick={() => setExpandido(e => !e)}
      >
        {/* Indicador de grau atual */}
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-extrabold shrink-0"
          style={{ background: grauAtualDisplay.cor }}
          title={`Grau atual: ${grauAtualDisplay.nome}`}
        >
          {grauAtualOrdem}
        </div>

        {/* Nome da capacidade + competência pai */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-700 truncate">{cap?.nome || pc.capacidadeId}</p>
          {comp && <p className="text-[9px] text-slate-400 truncate">{comp.nome}</p>}
        </div>

        {/* Badge do grau atual */}
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
          style={{ background: grauAtualDisplay.corBg, color: grauAtualDisplay.corTexto }}
        >
          {grauAtualDisplay.nome}
        </span>

        {/* Ícone de editar */}
        <Edit3 size={12} className={`shrink-0 transition ${expandido ? 'text-teal-500' : 'text-slate-300'}`} />
      </div>

      {/* Painel de avaliação expandido */}
      {expandido && (
        <div className="px-3 pb-3 space-y-3 border-t border-slate-100 pt-3">
          {/* Seletor visual de grau */}
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Selecionar novo grau
            </p>
            <div className="flex gap-1.5 flex-wrap">
              {grausDisponiveis.map(g => {
                const selecionado = grauSelecionado === g.ordem;
                const ehAtual = grauAtualOrdem === g.ordem;
                return (
                  <button
                    key={g.ordem}
                    onClick={e => { e.stopPropagation(); setGrauSelecionado(g.ordem); }}
                    className={`relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border-2 cursor-pointer transition-all ${
                      selecionado
                        ? 'scale-105 shadow-md'
                        : 'hover:scale-102 hover:shadow-sm opacity-70 hover:opacity-100'
                    }`}
                    style={{
                      borderColor: selecionado ? g.cor : '#e2e8f0',
                      background: selecionado ? g.corBg : '#f8fafc',
                    }}
                    title={g.descricao || g.nome}
                  >
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-extrabold"
                      style={{ background: g.cor }}
                    >
                      {g.ordem}
                    </span>
                    <span className="text-[9px] font-bold whitespace-nowrap" style={{ color: g.corTexto }}>
                      {g.nome}
                    </span>
                    {ehAtual && (
                      <span className="absolute -top-1.5 -right-1.5 text-[8px] bg-slate-700 text-white px-1 rounded-full font-bold">
                        atual
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {/* Descrição do grau selecionado */}
            {grausDisponiveis[grauSelecionado] && (
              <p className="text-[10px] text-slate-500 mt-2 italic">
                {grausDisponiveis[grauSelecionado].descricao || grausDisponiveis[grauSelecionado].nome}
              </p>
            )}
          </div>

          {/* Contextualização — opcional mas incentivada */}
          {mudou && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Contextualização <span className="font-normal text-slate-400 normal-case">(opcional — ajuda no histórico)</span>
              </p>
              <textarea
                value={contexto}
                onChange={e => setContexto(e.target.value)}
                placeholder={
                  grauSelecionado === 0 ? 'Ex.: Capacidade ainda não trabalhada com o colaborador.' :
                  grauSelecionado === 1 ? 'Ex.: Colaborador já foi apresentado ao tema mas ainda não aplicou.' :
                  grauSelecionado === 2 ? 'Ex.: Resolveu o chamado #1234 seguindo a wiki de configuração.' :
                  grauSelecionado === 3 ? 'Ex.: Configurou o ambiente do zero sem consultar documentação.' :
                  'Ex.: Treinou o novo colaborador Fulano no tema com sucesso.'
                }
                rows={2}
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-none placeholder:text-slate-300"
              />
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-slate-500 font-semibold">Data da avaliação:</label>
                <input
                  type="date"
                  value={data}
                  onChange={e => setData(e.target.value)}
                  className="text-[10px] border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex items-center gap-2">
            {mudou && !sucesso && (
              <button
                onClick={e => { e.stopPropagation(); handleSalvar(); }}
                disabled={salvando}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-teal-500 hover:bg-teal-400 text-white text-xs font-bold rounded-xl cursor-pointer transition disabled:opacity-50"
              >
                <Save size={12} />
                {salvando ? 'Salvando...' : 'Salvar avaliação'}
              </button>
            )}
            {sucesso && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
                <CheckCircle size={14} /> Salvo! Histórico atualizado.
              </span>
            )}
            <button
              onClick={e => { e.stopPropagation(); setExpandido(false); setGrauSelecionado(grauAtualOrdem); setContexto(''); }}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 cursor-pointer transition"
            >
              <X size={12} /> Cancelar
            </button>
          </div>

          {/* Info sobre onde fica salvo */}
          <p className="text-[9px] text-slate-300 leading-relaxed">
            A avaliação fica registrada na aba <strong className="text-slate-400">Evidências</strong> do desenvolvimento deste colaborador —
            não aparece na timeline de feedbacks/CRM. Registra automaticamente quem avaliou e quando.
          </p>
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
      status: 'pendente',
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
                {ehTreinamento ? '→ Registrará como "Treinado". O grau não será alterado.' : '→ Registrará como demonstração prática. O grau pode ser evoluído.'}
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
  const [evidencias, setEvidencias] = useState<Evidencia[]>([]);
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [pdis, setPdis] = useState<PerfilObjetivo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalEvidencia, setModalEvidencia] = useState(false);
  const [modalOcorrencia, setModalOcorrencia] = useState(false);
  const [modalPDI, setModalPDI] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<'capacidades' | 'evidencias' | 'ocorrencias' | 'pdis'>('capacidades');

  const versaoAtiva = matrizVersoes.find(v => v.ativa && setores.some(s => s.id === v.setorId && s.id === colaborador.setorId));

  const carregarDados = async () => {
    setCarregando(true);
    try {
      const [pront, perfil, evids, ocorrs, pdisList] = await Promise.allSettled([
        DataService.getProntidaoProximoNivel(colaborador.id),
        DataService.getPerfilCapacidades(colaborador.id),
        DataService.getEvidencias({ colaboradorId: colaborador.id }),
        DataService.getOcorrencias(colaborador.id),
        DataService.getPerfilObjetivos(colaborador.id),
      ]);
      if (pront.status === 'fulfilled') setProntidao(pront.value);
      if (perfil.status === 'fulfilled') setPerfilCapacidades(perfil.value);
      if (evids.status === 'fulfilled') setEvidencias((evids.value as Evidencia[]).filter(e => e.entidadeTipo === 'capacidade'));
      if (ocorrs.status === 'fulfilled') setOcorrencias(ocorrs.value as Ocorrencia[]);
      if (pdisList.status === 'fulfilled') setPdis(pdisList.value as PerfilObjetivo[]);
    } catch (e) {
      console.error('PainelDesenvolvimento: erro ao carregar dados', e);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { carregarDados(); }, [colaborador.id]);

  const handleSalvarEvidencia = async (ev: Partial<Evidencia>) => {
    try {
      await DataService.anexarEvidencia(ev as Evidencia);
      setModalEvidencia(false);
      onEvidenciaRegistrada?.();
      carregarDados();
    } catch (e) { console.error(e); }
  };

  const handleSalvarOcorrencia = async (dados: any) => {
    try {
      await DataService.criarOcorrencia(dados);
      setModalOcorrencia(false);
      onOcorrenciaRegistrada?.();
      carregarDados();
    } catch (e) { console.error(e); }
  };

  const handleSalvarPDI = async (pdi: Partial<PerfilObjetivo>) => {
    try {
      await DataService.saveObjetivo(pdi as PerfilObjetivo);
      setModalPDI(false);
      onPDIRegistrado?.();
      carregarDados();
    } catch (e) { console.error(e); }
  };

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
            { id: 'capacidades', label: `Capacidades (${perfilCapacidades.length})`, icon: <Layers size={13} /> },
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
          {abaAtiva === 'capacidades' && (
            <div className="space-y-3">

              {/* Legenda de graus */}
              <details className="bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden">
                <summary className="px-4 py-2.5 text-xs font-bold text-slate-600 cursor-pointer flex items-center gap-2 hover:bg-slate-100 transition">
                  <Award size={13} className="text-violet-500" />
                  Legenda dos Graus de Domínio
                  <span className="ml-auto text-[10px] text-slate-400 font-normal">clique para expandir</span>
                </summary>
                <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-5 gap-2 pt-2">
                  {GRAUS_FIXOS.map(g => (
                    <div key={g.ordem} className="rounded-xl p-2.5 text-center" style={{ background: g.corBg, border: `1px solid ${g.cor}30` }}>
                      <div className="w-6 h-6 rounded-full mx-auto mb-1.5 flex items-center justify-center text-white text-[10px] font-extrabold" style={{ background: g.cor }}>
                        {g.ordem}
                      </div>
                      <p className="text-[10px] font-extrabold mb-0.5" style={{ color: g.corTexto }}>{g.nome}</p>
                      <p className="text-[9px] leading-tight" style={{ color: g.corTexto, opacity: 0.8 }}>{g.descricao}</p>
                    </div>
                  ))}
                </div>
              </details>

              <div className="flex items-center justify-between">
                <p className="text-[11px] text-slate-400 font-semibold">
                  {perfilCapacidades.length} capacidade(s) avaliada(s)
                </p>
                <button onClick={() => setModalEvidencia(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-teal-600">
                  <Plus size={13} /> Registrar Evidência
                </button>
              </div>

              {/* Lista de capacidades com seletor de grau */}
              {perfilCapacidades.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <p className="text-xs text-slate-400">Nenhuma capacidade avaliada ainda.</p>
                  <p className="text-[10px] text-slate-300">Clique em qualquer capacidade da Matriz acima para avaliar.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {perfilCapacidades.map(pc => {
                    const cap = capacidades.find(c => c.id === pc.capacidadeId);
                    const comp = competencias.find(c => c.id === cap?.competenciaId);
                    const grauAtual = graus.find(g => g.id === pc.grauAtual);
                    const grauFixoAtual = GRAUS_FIXOS.find(g => g.nome === grauAtual?.nome) || GRAUS_FIXOS[0];
                    const grausDaEscala = pc.escalaId
                      ? graus.filter(g => g.escalaId === pc.escalaId).sort((a, b) => a.ordem - b.ordem)
                      : [];
                    return (
                      <LinhaCapacidadeAvaliavel
                        key={pc.id}
                        pc={pc}
                        cap={cap}
                        comp={comp}
                        grauAtual={grauAtual}
                        grauFixoAtual={grauFixoAtual}
                        grausDaEscala={grausDaEscala}
                        colaborador={colaborador}
                        currentUserId={currentUserId}
                        onAtualizado={carregarDados}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Evidências */}
          {abaAtiva === 'evidencias' && (
            <div className="space-y-2">
              <div className="flex justify-end">
                <button onClick={() => setModalEvidencia(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-teal-600">
                  <Plus size={13} /> Nova Evidência
                </button>
              </div>
              {evidencias.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">Nenhuma evidência de capacidade registrada.</p>
              ) : (
                <div className="space-y-2">
                  {[...evidencias].sort((a, b) => new Date(b.data || 0).getTime() - new Date(a.data || 0).getTime()).map(ev => {
                    const cap = capacidades.find(c => c.id === ev.capacidadeId);
                    const tipo = tiposEvidencia.find(t => t.id === ev.tipoEvidenciaId);
                    const grauEv = graus.find(g => g.id === ev.grauDemonstrado);
                    const statusCor = ev.status === 'validada' ? 'text-emerald-600' : ev.status === 'rejeitada' ? 'text-rose-600' : 'text-amber-600';
                    return (
                      <div key={ev.id} className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-bold text-slate-700">{cap?.nome || ev.capacidadeId}</p>
                            <p className="text-[10px] text-slate-400">{tipo?.nome} • {ev.data ? new Date(ev.data).toLocaleDateString('pt-BR') : '—'}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {grauEv && <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: grauEv.cor || '#94a3b8' }} /><span className="text-[10px] font-bold text-slate-700">{grauEv.nome}</span></div>}
                            <span className={`text-[10px] font-bold capitalize ${statusCor}`}>{ev.status}</span>
                          </div>
                        </div>
                        {ev.situacaoObservada && <p className="text-[11px] text-slate-600 line-clamp-2">{ev.situacaoObservada}</p>}
                      </div>
                    );
                  })}
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
          onFechar={() => setModalEvidencia(false)}
        />
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
