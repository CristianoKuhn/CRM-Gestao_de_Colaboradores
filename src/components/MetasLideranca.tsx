/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  MetaLideranca,
  MetaSetor,
  AcompanhamentoRealizado,
  TipoInteracao,
  GrupoMeta,
  Lider,
  Setor,
  Colaborador,
  TimelineRegistro,
  Tarefa,
  MAPA_TIPO_PARA_INTERACAO,
} from '../types';
import { DataService } from '../services/DataService';
import {
  Target,
  TrendingUp,
  CheckCircle2,
  Plus,
  Trash2,
  Edit2,
  X,
  Calendar,
  Users,
  MessageSquare,
  Award,
  Coffee,
  BookOpen,
  Heart,
  ThumbsUp,
  AlertCircle,
  Clock,
  ChevronDown,
} from 'lucide-react';

interface MetasLiderancaProps {
  metasLideranca: MetaLideranca[];
  metasSetor: MetaSetor[];
  acompanhamentos: AcompanhamentoRealizado[];
  // Timeline e tarefas são a FONTE PRIMÁRIA de contagem das metas.
  // AcompanhamentoRealizado fica como fonte complementar (ex.: avaliações
  // 180° geradas pelo motor de formulários, que não passam pela timeline).
  timeline: TimelineRegistro[];
  tarefas: Tarefa[];
  lideres: Lider[];
  setores: Setor[];
  colaboradores: Colaborador[];
  currentUserId: string;
  gruposMeta?: GrupoMeta[];
  onSaveMetaLideranca: (meta: MetaLideranca) => void;
  onDeleteMetaLideranca: (id: string) => void;
  onSaveMetaSetor: (meta: MetaSetor) => void;
  onDeleteMetaSetor: (id: string) => void;
  onSaveAcompanhamento: (acomp: AcompanhamentoRealizado) => void;
}

const TIPOS_INTERACAO: { id: TipoInteracao; nome: string; icone: React.ReactNode }[] = [
  { id: 'avaliacao_180', nome: 'Avaliação 180º', icone: <Award size={16} /> },
  { id: 'avaliacao_bem_estar', nome: 'Avaliação Bem-estar', icone: <Heart size={16} /> },
  { id: 'avaliacao_experiencia', nome: 'Avaliação Experiência', icone: <CheckCircle2 size={16} /> },
  { id: 'feedback', nome: 'Feedback', icone: <MessageSquare size={16} /> },
  { id: 'conversa_alinhamento', nome: 'Conversa Alinhamento', icone: <Target size={16} /> },
  { id: 'conversa_disciplinar', nome: 'Conversa Disciplinar', icone: <AlertCircle size={16} /> },
  { id: 'conversa_informal', nome: 'Conversa Informal', icone: <Coffee size={16} /> },
  { id: 'conversa_desenvolvimento', nome: 'Conversa Desenvolvimento', icone: <TrendingUp size={16} /> },
  { id: 'conversa_reconhecimento', nome: 'Conversa Reconhecimento', icone: <ThumbsUp size={16} /> },
  { id: 'onboarding', nome: 'Onboarding', icone: <Users size={16} /> },
  { id: 'pdiavaliacao_360', nome: 'PDI / Avaliação 360º', icone: <BookOpen size={16} /> },
];

const getIconeInteracao = (tipo: string) => {
  return TIPOS_INTERACAO.find((t) => t.id === tipo)?.icone || <MessageSquare size={16} />;
};

const getNomeInteracao = (tipo: string) => {
  return TIPOS_INTERACAO.find((t) => t.id === tipo)?.nome || tipo;
};

export default function MetasLideranca({
  metasLideranca,
  metasSetor,
  acompanhamentos,
  timeline,
  tarefas,
  lideres,
  setores,
  colaboradores,
  currentUserId,
  gruposMeta = [],
  onSaveMetaLideranca,
  onDeleteMetaLideranca,
  onSaveMetaSetor,
  onDeleteMetaSetor,
  onSaveAcompanhamento,
}: MetasLiderancaProps) {
  const hoje = new Date();
  const [periodoAtual, setPeriodoAtual] = useState(
    `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
  );
  const [showMetaModal, setShowMetaModal] = useState(false);
  const [tipoMeta, setTipoMeta] = useState<'lider' | 'setor'>('lider');
  const [editMeta, setEditMeta] = useState<MetaLideranca | MetaSetor | null>(null);
  const [formData, setFormData] = useState({
    tipoInteracao: 'feedback' as TipoInteracao,
    grupoId: '' as string,
    titulo: '',
    descricao: '',
    quantidadeMinima: 4,
    periodo: 'mensal' as 'mensal' | 'trimestral' | 'semestral',
    liderId: '',
    setorId: '',
    setorIds: [] as string[], // múltiplos setores para Meta por Setor
  });

  // ─── Núcleo do Motor de Metas ────────────────────────────────────────────
  // Fonte primária: Timeline + Tarefas concluídas
  // Fonte complementar: AcompanhamentoRealizado (ex.: Avaliações 180° do
  // motor de formulários, que não passam pela timeline manual).
  //
  // Regras de contagem:
  // 1. Cada registro da Timeline cujo TipoRegistro mapeie para um TipoInteracao
  //    via MAPA_TIPO_PARA_INTERACAO conta como 1 interação do LÍDER responsável
  //    (responsavelId) com o colaborador do setor do colaborador.
  // 2. Tarefas CONCLUÍDAS cujo tipoOrigem mapeie contam como 1 interação —
  //    a conclusão de uma tarefa de acompanhamento é o encerramento do ciclo
  //    de feedback, não o início.
  // 3. AcompanhamentoRealizado complementa (ex.: avaliações geradas por
  //    formulários). Deduplicados por id para evitar dupla contagem.
  // 4. Retroativo: periodoAtual é qualquer AAAA-MM; basta mudar o seletor.
  const interacoesDoPeriodo = useMemo(() => {
    // --- Fonte 1: Timeline ---
    const doTimeline = timeline
      .filter((r) => r.data.startsWith(periodoAtual))
      .flatMap((r) => {
        const tipoInteracao = MAPA_TIPO_PARA_INTERACAO[r.tipo];
        if (!tipoInteracao) return [];
        // Descobrir o setor do colaborador (para metas por setor)
        const col = colaboradores.find((c) => c.id === r.colaboradorId);
        return [{
          tipoInteracao,
          liderId: r.responsavelId,      // o líder que fez a interação
          setorId: col?.setorId || '',   // setor do colaborador
          data: r.data,
          _fonte: 'timeline',
          _id: r.id,
        }];
      });

    // --- Fonte 2: Tarefas concluídas no período ---
    const deTarefas = tarefas
      .filter((t) => {
        if (!t.concluida) return false;
        // Usar vencimento como proxy de data de conclusão (não temos data_conclusao explícita)
        // mas só conta se o vencimento estiver no período
        const dataRef = t.vencimento || '';
        return dataRef.startsWith(periodoAtual);
      })
      .flatMap((t) => {
        const tipoInteracao = t.tipoOrigem
          ? MAPA_TIPO_PARA_INTERACAO[t.tipoOrigem as keyof typeof MAPA_TIPO_PARA_INTERACAO]
          : undefined;
        if (!tipoInteracao) return [];
        const col = colaboradores.find((c) => c.id === t.colaboradorId);
        return [{
          tipoInteracao,
          liderId: t.responsavelId || '',
          setorId: col?.setorId || '',
          data: t.vencimento,
          _fonte: 'tarefa',
          _id: `tar-${t.id}`,
        }];
      });

    // --- Fonte 3: AcompanhamentoRealizado (complementar) ---
    const deAcomp = acompanhamentos
      .filter((a) => a.data.startsWith(periodoAtual))
      .map((a) => ({
        tipoInteracao: a.tipoInteracao,
        liderId: a.liderId,
        setorId: a.setorId,
        data: a.data,
        _fonte: 'acompanhamento',
        _id: a.id,
      }));

    // Unir e deduplicar por _id
    const todas = [...doTimeline, ...deTarefas, ...deAcomp];
    const vistos = new Set<string>();
    return todas.filter((i) => {
      if (vistos.has(i._id)) return false;
      vistos.add(i._id);
      return true;
    });
  }, [timeline, tarefas, acompanhamentos, colaboradores, periodoAtual]);

  // Calcular resumo das metas
  const resumoMetas = useMemo(() => {
    const metasAtivas = [...metasLideranca.filter((m) => m.ativo), ...metasSetor.filter((m) => m.ativo)];

    return metasAtivas.map((meta) => {
      const isMetaLider = 'liderId' in meta;
      const tipoId = isMetaLider ? (meta as MetaLideranca).liderId : (meta as MetaSetor).setorId;
      const grupoAtivo = meta.grupoId ? gruposMeta.find(g => g.id === meta.grupoId) : null;
      const tiposValidos = grupoAtivo ? grupoAtivo.tiposInteracao : [meta.tipoInteracao];

      const realizado = interacoesDoPeriodo.filter((i) => {
        if (!tiposValidos.includes(i.tipoInteracao)) return false;
        if (isMetaLider) {
          return i.liderId === tipoId;
        } else {
          // Meta por setor: conta interações em QUALQUER dos setores da lista
          const metaSetor = meta as MetaSetor;
          const setoresAlvo: string[] = metaSetor.setorIds?.length
            ? metaSetor.setorIds
            : [metaSetor.setorId];
          return setoresAlvo.includes(i.setorId);
        }
      }).length;

      return {
        meta,
        realizado,
        percentual: meta.quantidadeMinima > 0 ? Math.round((realizado / meta.quantidadeMinima) * 100) : 0,
        status: realizado >= meta.quantidadeMinima ? 'concluido' : realizado > 0 ? 'parcial' : 'pendente',
      };
    });
  }, [metasLideranca, metasSetor, interacoesDoPeriodo, gruposMeta]);

  const stats = useMemo(() => {
    const total = resumoMetas.length;
    const concluidas = resumoMetas.filter((r) => r.status === 'concluido').length;
    const parciais = resumoMetas.filter((r) => r.status === 'parcial').length;
    const pendentes = resumoMetas.filter((r) => r.status === 'pendente').length;
    const percentualGeral = total > 0 ? Math.round(resumoMetas.reduce((acc, r) => acc + r.percentual, 0) / total) : 0;

    return { total, concluidas, parciais, pendentes, percentualGeral };
  }, [resumoMetas]);

  const abrirModalNovaMeta = (tipo: 'lider' | 'setor') => {
    setTipoMeta(tipo);
    setEditMeta(null);
    setFormData({
      tipoInteracao: 'feedback',
      grupoId: '',
      titulo: '',
      descricao: '',
      quantidadeMinima: 4,
      periodo: 'mensal',
      liderId: tipo === 'lider' ? lideres[0]?.id || '' : '',
      setorId: tipo === 'setor' ? setores[0]?.id || '' : '',
      setorIds: tipo === 'setor' ? (setores[0] ? [setores[0].id] : []) : [],
    });
    setShowMetaModal(true);
  };

  const abrirModalEditarMeta = (meta: MetaLideranca | MetaSetor) => {
    setTipoMeta('liderId' in meta ? 'lider' : 'setor');
    setEditMeta(meta);
    setFormData({
      tipoInteracao: meta.tipoInteracao,
      grupoId: meta.grupoId || '',
      titulo: meta.titulo,
      descricao: meta.descricao,
      quantidadeMinima: meta.quantidadeMinima,
      periodo: meta.periodo,
      liderId: 'liderId' in meta ? meta.liderId : '',
      setorId: 'setorId' in meta ? meta.setorId : '',
      setorIds: 'setorIds' in meta && (meta as any).setorIds?.length
        ? (meta as any).setorIds
        : 'setorId' in meta && meta.setorId ? [meta.setorId] : [],
    });
    setShowMetaModal(true);
  };

  const salvarMeta = () => {
    if (!formData.titulo) return;
    // Meta por Setor exige ao menos um setor selecionado
    if (tipoMeta === 'setor' && formData.setorIds.length === 0) return;

    if (tipoMeta === 'lider') {
      const meta: MetaLideranca = {
        id: editMeta?.id || `meta-lid-${Date.now()}`,
        liderId: formData.liderId,
        tipoInteracao: formData.tipoInteracao,
        grupoId: formData.grupoId || undefined,
        titulo: formData.titulo,
        descricao: formData.descricao,
        quantidadeMinima: formData.quantidadeMinima,
        periodo: formData.periodo,
        ativo: true,
      };
      onSaveMetaLideranca(meta);
    } else {
      const setorIdPrincipal = formData.setorIds.length > 0 ? formData.setorIds[0] : formData.setorId;
      const meta: MetaSetor = {
        id: editMeta?.id || `meta-set-${Date.now()}`,
        setorId: setorIdPrincipal,
        setorIds: formData.setorIds.length > 0 ? formData.setorIds : undefined,
        tipoInteracao: formData.tipoInteracao,
        grupoId: formData.grupoId || undefined,
        titulo: formData.titulo,
        descricao: formData.descricao,
        quantidadeMinima: formData.quantidadeMinima,
        periodo: formData.periodo,
        ativo: true,
      };
      onSaveMetaSetor(meta);
    }
    setShowMetaModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header com Stats */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Target size={20} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Metas de Liderança</h3>
              <p className="text-xs text-slate-500">Acompanhamento de interações e metas</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={periodoAtual}
              onChange={(e) => setPeriodoAtual(e.target.value)}
              className="px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none cursor-pointer"
            >
              {[...Array(6)].map((_, i) => {
                const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
                const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                return (
                  <option key={value} value={value}>
                    {label}
                  </option>
                );
              })}
            </select>
            <button
              onClick={() => abrirModalNovaMeta('lider')}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white font-bold rounded-xl text-sm hover:bg-indigo-400 transition cursor-pointer"
            >
              <Plus size={16} />
              Nova Meta
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Total</p>
            <p className="text-2xl font-extrabold text-slate-800">{stats.total}</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4">
            <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-1">Concluídas</p>
            <p className="text-2xl font-extrabold text-emerald-700">{stats.concluidas}</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-4">
            <p className="text-xs text-amber-600 font-bold uppercase tracking-wider mb-1">Em Andamento</p>
            <p className="text-2xl font-extrabold text-amber-700">{stats.parciais}</p>
          </div>
          <div className="bg-rose-50 rounded-xl p-4">
            <p className="text-xs text-rose-600 font-bold uppercase tracking-wider mb-1">Pendentes</p>
            <p className="text-2xl font-extrabold text-rose-700">{stats.pendentes}</p>
          </div>
          <div className="bg-indigo-50 rounded-xl p-4">
            <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider mb-1">% Geral</p>
            <p className="text-2xl font-extrabold text-indigo-700">{stats.percentualGeral}%</p>
          </div>
        </div>
      </div>

      {/* Lista de Metas */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold text-slate-800">Metas do Período</h4>
          <div className="flex items-center gap-2">
            <button
              onClick={() => abrirModalNovaMeta('lider')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer flex items-center gap-1"
            >
              <Users size={14} />
              Meta por Líder
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => abrirModalNovaMeta('setor')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer flex items-center gap-1"
            >
              <Target size={14} />
              Meta por Setor
            </button>
          </div>
        </div>

        {resumoMetas.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
            <Target size={48} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-semibold">Nenhuma meta configurada</p>
            <p className="text-xs text-slate-400 mt-1">Clique em "Nova Meta" para começar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {resumoMetas.map((item) => {
              const isLider = 'liderId' in item.meta;
              const responsavel = isLider
                ? lideres.find((l) => l.id === (item.meta as MetaLideranca).liderId)?.nome
                : (() => {
                    const ms = item.meta as MetaSetor;
                    const ids = ms.setorIds?.length ? ms.setorIds : [ms.setorId];
                    return ids.map(id => setores.find(s => s.id === id)?.nome).filter(Boolean).join(', ');
                  })();

              return (
                <div
                  key={item.meta.id}
                  className={`group p-4 rounded-xl border transition ${
                    item.status === 'concluido'
                      ? 'bg-emerald-50 border-emerald-200'
                      : item.status === 'parcial'
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        item.status === 'concluido'
                          ? 'bg-emerald-100'
                          : item.status === 'parcial'
                          ? 'bg-amber-100'
                          : 'bg-slate-100'
                      }`}>
                        {getIconeInteracao(item.meta.tipoInteracao)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-slate-800 truncate">{item.meta.titulo}</h5>
                          {/* Botões Editar e Deletar */}
                          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => abrirModalEditarMeta(item.meta)}
                              className="p-1 text-slate-400 hover:text-teal-600 cursor-pointer transition rounded"
                              title="Editar meta"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => {
                                if (!window.confirm(`Excluir a meta "${item.meta.titulo}"? Esta ação não pode ser desfeita.`)) return;
                                isLider
                                  ? onDeleteMetaLideranca(item.meta.id)
                                  : onDeleteMetaSetor(item.meta.id);
                              }}
                              className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer transition rounded"
                              title="Excluir meta"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {isLider ? 'Líder' : 'Setor'}: {responsavel} • {
                            item.meta.grupoId
                              ? (gruposMeta.find(g => g.id === item.meta.grupoId)?.nome || getNomeInteracao(item.meta.tipoInteracao))
                              : getNomeInteracao(item.meta.tipoInteracao)
                          }
                        </p>
                        <p className="text-xs text-slate-400">{item.meta.descricao}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className={`text-lg font-extrabold ${
                          item.status === 'concluido'
                            ? 'text-emerald-700'
                            : item.status === 'parcial'
                            ? 'text-amber-700'
                            : 'text-slate-700'
                        }`}>
                          {item.realizado}/{item.meta.quantidadeMinima}
                        </p>
                        <p className="text-xs text-slate-400">{item.percentual}%</p>
                      </div>
                      <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            item.status === 'concluido'
                              ? 'bg-emerald-500'
                              : item.status === 'parcial'
                              ? 'bg-amber-500'
                              : 'bg-slate-400'
                          }`}
                          style={{ width: `${Math.min(item.percentual, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Meta */}
      {showMetaModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 animate-scale-up border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900">
                {editMeta ? 'Editar Meta' : `Nova Meta por ${tipoMeta === 'lider' ? 'Líder' : 'Setor'}`}
              </h3>
              <button
                onClick={() => setShowMetaModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold text-2xl"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4">
              {/* Tipo de Meta */}
              {tipoMeta === 'lider' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Líder Responsável
                  </label>
                  <select
                    value={formData.liderId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, liderId: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none cursor-pointer"
                  >
                    {lideres.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nome}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Setores Responsáveis
                  </label>
                  <p className="text-[10px] text-slate-400 mb-2">
                    Selecione um ou mais setores. A meta contabilizará todas as interações com colaboradores de qualquer setor marcado.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    {setores.map((s) => {
                      const marcado = formData.setorIds.includes(s.id);
                      return (
                        <label key={s.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer px-2 py-1.5 rounded-lg hover:bg-white transition">
                          <input
                            type="checkbox"
                            checked={marcado}
                            onChange={() =>
                              setFormData((prev) => ({
                                ...prev,
                                setorIds: marcado
                                  ? prev.setorIds.filter((id) => id !== s.id)
                                  : [...prev.setorIds, s.id],
                                setorId: marcado
                                  ? (prev.setorIds.filter((id) => id !== s.id)[0] || '')
                                  : prev.setorIds.length === 0 ? s.id : prev.setorId,
                              }))
                            }
                            className="w-4 h-4 text-teal-600 border-slate-300 rounded cursor-pointer"
                          />
                          {s.nome}
                        </label>
                      );
                    })}
                  </div>
                  {formData.setorIds.length === 0 && (
                    <p className="text-[10px] text-rose-500 mt-1.5">Selecione ao menos um setor.</p>
                  )}
                  {formData.setorIds.length > 0 && (
                    <p className="text-[10px] text-teal-600 font-semibold mt-1.5">{formData.setorIds.length} setor(es) selecionado(s)</p>
                  )}
                </div>
              )}

              {/* Grupo ou Tipo de Interação */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  {gruposMeta.length > 0 ? 'Grupo de Interações' : 'Tipo de Interação'}
                </label>
                {gruposMeta.length > 0 ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 gap-1.5">
                      {gruposMeta.filter(g => g.ativo).map(g => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, grupoId: g.id === prev.grupoId ? '' : g.id }))}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-xs font-semibold text-left cursor-pointer transition ${
                            formData.grupoId === g.id
                              ? 'border-teal-500 bg-teal-50 text-teal-700 ring-1 ring-teal-300'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: g.cor }} />
                          <div className="flex-1">
                            <span className="font-bold">{g.nome}</span>
                            <span className="text-slate-400 font-normal ml-2">({g.tiposInteracao.length} tipos)</span>
                          </div>
                          {formData.grupoId === g.id && <span className="text-teal-600">✓</span>}
                        </button>
                      ))}
                    </div>
                    {!formData.grupoId && (
                      <div>
                        <p className="text-[10px] text-slate-400 mb-1.5">Ou escolha um tipo específico:</p>
                        <select
                          value={formData.tipoInteracao}
                          onChange={(e) => setFormData((prev) => ({ ...prev, tipoInteracao: e.target.value as TipoInteracao, grupoId: '' }))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none cursor-pointer"
                        >
                          {TIPOS_INTERACAO.map((t) => (
                            <option key={t.id} value={t.id}>{t.nome}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {!formData.grupoId && (
                      <p className="text-[10px] text-amber-600">
                        💡 Configure Grupos de Meta em Configurações Gerais → Grupos de Meta para metas transversais.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <select
                      value={formData.tipoInteracao}
                      onChange={(e) => setFormData((prev) => ({ ...prev, tipoInteracao: e.target.value as TipoInteracao }))}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none cursor-pointer"
                    >
                      {TIPOS_INTERACAO.map((t) => (
                        <option key={t.id} value={t.id}>{t.nome}</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400">
                      💡 Configure Grupos em <strong>Configurações Gerais → Grupos de Meta</strong> para criar metas que abrangem múltiplos tipos de interação.
                    </p>
                  </div>
                )}
              </div>

              {/* Título */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Título da Meta
                </label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => setFormData((prev) => ({ ...prev, titulo: e.target.value }))}
                  placeholder="Ex: Realizar 4 feedbacks por mês"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none"
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Descrição
                </label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData((prev) => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Descreva o objetivo desta meta..."
                  rows={2}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none resize-none"
                />
              </div>

              {/* Quantidade e Período */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Quantidade Mínima
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantidadeMinima}
                    onChange={(e) => setFormData((prev) => ({ ...prev, quantidadeMinima: parseInt(e.target.value) || 1 }))}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Período
                  </label>
                  <select
                    value={formData.periodo}
                    onChange={(e) => setFormData((prev) => ({ ...prev, periodo: e.target.value as any }))}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none cursor-pointer"
                  >
                    <option value="mensal">Mensal</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="semestral">Semestral</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowMetaModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 bg-slate-50 rounded-xl text-sm font-semibold hover:bg-slate-100 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={salvarMeta}
                className="px-4 py-2 bg-indigo-500 text-white font-bold rounded-xl text-sm hover:bg-indigo-400 transition cursor-pointer"
              >
                {editMeta ? 'Salvar Alterações' : 'Criar Meta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
