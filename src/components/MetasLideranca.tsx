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
  Lider,
  Setor,
  Colaborador,
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
  lideres: Lider[];
  setores: Setor[];
  colaboradores: Colaborador[];
  currentUserId: string;
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
  lideres,
  setores,
  colaboradores,
  currentUserId,
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
    titulo: '',
    descricao: '',
    quantidadeMinima: 4,
    periodo: 'mensal' as 'mensal' | 'trimestral' | 'semestral',
    liderId: '',
    setorId: '',
  });

  // Calcular resumo das metas
  const resumoMetas = useMemo(() => {
    const metasAtivas = [...metasLideranca.filter((m) => m.ativo), ...metasSetor.filter((m) => m.ativo)];
    const acompPeriodo = acompanhamentos.filter((a) => a.data.startsWith(periodoAtual));

    return metasAtivas.map((meta) => {
      const isMetaLider = 'liderId' in meta;
      const tipoId = isMetaLider ? (meta as MetaLideranca).liderId : (meta as MetaSetor).setorId;
      const realizado = acompPeriodo.filter((a) => {
        if (a.tipoInteracao !== meta.tipoInteracao) return false;
        if (isMetaLider) {
          return a.liderId === tipoId;
        } else {
          return a.setorId === tipoId;
        }
      }).length;

      return {
        meta,
        realizado,
        percentual: meta.quantidadeMinima > 0 ? Math.round((realizado / meta.quantidadeMinima) * 100) : 0,
        status: realizado >= meta.quantidadeMinima ? 'concluido' : realizado > 0 ? 'parcial' : 'pendente',
      };
    });
  }, [metasLideranca, metasSetor, acompanhamentos, periodoAtual]);

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
      titulo: '',
      descricao: '',
      quantidadeMinima: 4,
      periodo: 'mensal',
      liderId: tipo === 'lider' ? lideres[0]?.id || '' : '',
      setorId: tipo === 'setor' ? setores[0]?.id || '' : '',
    });
    setShowMetaModal(true);
  };

  const abrirModalEditarMeta = (meta: MetaLideranca | MetaSetor) => {
    setTipoMeta('liderId' in meta ? 'lider' : 'setor');
    setEditMeta(meta);
    setFormData({
      tipoInteracao: meta.tipoInteracao,
      titulo: meta.titulo,
      descricao: meta.descricao,
      quantidadeMinima: meta.quantidadeMinima,
      periodo: meta.periodo,
      liderId: 'liderId' in meta ? meta.liderId : '',
      setorId: 'setorId' in meta ? meta.setorId : '',
    });
    setShowMetaModal(true);
  };

  const salvarMeta = () => {
    if (!formData.titulo) return;

    if (tipoMeta === 'lider') {
      const meta: MetaLideranca = {
        id: editMeta?.id || `meta-lid-${Date.now()}`,
        liderId: formData.liderId,
        tipoInteracao: formData.tipoInteracao,
        titulo: formData.titulo,
        descricao: formData.descricao,
        quantidadeMinima: formData.quantidadeMinima,
        periodo: formData.periodo,
        ativo: true,
      };
      onSaveMetaLideranca(meta);
    } else {
      const meta: MetaSetor = {
        id: editMeta?.id || `meta-set-${Date.now()}`,
        setorId: formData.setorId,
        tipoInteracao: formData.tipoInteracao,
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
                : setores.find((s) => s.id === (item.meta as MetaSetor).setorId)?.nome;

              return (
                <div
                  key={item.meta.id}
                  className={`p-4 rounded-xl border transition ${
                    item.status === 'concluido'
                      ? 'bg-emerald-50 border-emerald-200'
                      : item.status === 'parcial'
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        item.status === 'concluido'
                          ? 'bg-emerald-100'
                          : item.status === 'parcial'
                          ? 'bg-amber-100'
                          : 'bg-slate-100'
                      }`}>
                        {getIconeInteracao(item.meta.tipoInteracao)}
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-800">{item.meta.titulo}</h5>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {isLider ? 'Líder' : 'Setor'}: {responsavel} • {getNomeInteracao(item.meta.tipoInteracao)}
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
                    Setor Responsável
                  </label>
                  <select
                    value={formData.setorId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, setorId: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none cursor-pointer"
                  >
                    {setores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Tipo de Interação */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Tipo de Interação
                </label>
                <select
                  value={formData.tipoInteracao}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tipoInteracao: e.target.value as TipoInteracao }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none cursor-pointer"
                >
                  {TIPOS_INTERACAO.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome}
                    </option>
                  ))}
                </select>
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
