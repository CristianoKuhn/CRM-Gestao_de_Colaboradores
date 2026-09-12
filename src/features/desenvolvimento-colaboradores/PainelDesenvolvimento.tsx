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
} from 'lucide-react';

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

  const capsDaCompetencia = capacidades.filter(c => c.competenciaId === competenciaId);
  const grausDaEscala = graus.filter(g => g.escalaId === escalaId).sort((a, b) => a.ordem - b.ordem);
  const tipoSelecionado = tiposEvidencia.find(t => t.id === tipoEvidenciaId);
  const ehTreinamento = tipoSelecionado?.contaComoTreinamento;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!capacidadeId || !tipoEvidenciaId) return;
    if (!ehTreinamento && !grauDemonstrado) return;
    onSalvar({
      id: `ev-${Date.now()}`,
      entidadeTipo: 'capacidade',
      entidadeId: capacidadeId,
      colaboradorId: colaborador.id,
      competenciaId: competenciaId || undefined,
      capacidadeId,
      tipoEvidenciaId,
      escalaId: escalaId || undefined,
      grauDemonstrado: grauDemonstrado || undefined,
      situacaoObservada: situacaoObservada || undefined,
      observacaoGestor: observacaoGestor || undefined,
      matrizVersaoId: versaoAtiva?.id,
      data,
      tipo: 'observacao',
      status: 'pendente',
      anexadoPor: currentUserId,
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

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Situação Observada</label>
            <textarea value={situacaoObservada} onChange={e => setSituacaoObservada(e.target.value)} rows={2} placeholder="Descreva a situação real observada..." className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Observação do Gestor</label>
            <textarea value={observacaoGestor} onChange={e => setObservacaoGestor(e.target.value)} rows={2} placeholder="Contexto adicional (opcional)..." className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Data</label>
            <input type="date" value={data} onChange={e => setData(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-teal-500" />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={onFechar} className="px-4 py-2 border border-slate-200 text-slate-600 bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer">Cancelar</button>
            <button type="submit" className="px-5 py-2 bg-teal-500 text-slate-950 font-bold rounded-xl text-xs cursor-pointer hover:bg-teal-400">Registrar Evidência</button>
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

  if (prontidao.semProximoCargo || prontidao.erro) {
    return (
      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
        <p className="text-xs text-slate-400 text-center">{prontidao.motivo || prontidao.erro || 'Topo da trilha de carreira atual.'}</p>
      </div>
    );
  }
  if (prontidao.semMatriz) {
    return (
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-2">
        <AlertTriangle size={14} className="text-amber-500 shrink-0" />
        <p className="text-xs text-amber-700">{prontidao.motivo}</p>
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
            <div className="space-y-2">
              <div className="flex justify-end">
                <button onClick={() => setModalEvidencia(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-teal-600">
                  <Plus size={13} /> Registrar Evidência
                </button>
              </div>
              {perfilCapacidades.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">Nenhuma capacidade avaliada ainda.</p>
              ) : (
                <div className="space-y-2">
                  {perfilCapacidades.map(pc => {
                    const cap = capacidades.find(c => c.id === pc.capacidadeId);
                    const grauAtual = graus.find(g => g.id === pc.grauAtual);
                    return (
                      <div key={pc.id} className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-700 truncate">{cap?.nome || pc.capacidadeId}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {pc.treinado && <span className="text-[10px] bg-blue-50 text-blue-600 font-bold px-1.5 py-0.5 rounded">Treinado</span>}
                            {pc.demonstrado && <span className="text-[10px] bg-emerald-50 text-emerald-600 font-bold px-1.5 py-0.5 rounded">Demonstrado</span>}
                            {!pc.treinado && !pc.demonstrado && <span className="text-[10px] text-slate-400">Não iniciado</span>}
                          </div>
                        </div>
                        {grauAtual && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: grauAtual.cor || '#94a3b8' }} />
                            <span className="text-xs font-bold text-slate-700">{grauAtual.nome}</span>
                          </div>
                        )}
                        {!grauAtual && pc.treinado && <span className="text-xs text-slate-400 shrink-0">Aguardando avaliação</span>}
                      </div>
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
