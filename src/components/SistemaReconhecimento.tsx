/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Reconhecimento,
  TipoReconhecimento,
  ConfiguracaoReconhecimento,
  Colaborador,
  Lider,
} from '../types';
import { DataService } from '../services/DataService';
import {
  Award,
  Trophy,
  Lightbulb,
  Users,
  Heart,
  TrendingUp,
  Plus,
  Trash2,
  Edit2,
  X,
  Gift,
  Star,
  CheckCircle2,
  Medal,
} from 'lucide-react';

interface SistemaReconhecimentoProps {
  reconhecimentos: Reconhecimento[];
  configuracao: ConfiguracaoReconhecimento;
  colaboradores: Colaborador[];
  lideres: Lider[];
  currentUserId: string;
  onSaveReconhecimento: (rec: Reconhecimento) => void;
  onDeleteReconhecimento: (id: string) => void;
  onSaveConfiguracao: (config: ConfiguracaoReconhecimento) => void;
}

const ICONES_DISPONIVEIS = [
  { id: 'Trophy', icone: <Trophy size={20} /> },
  { id: 'Lightbulb', icone: <Lightbulb size={20} /> },
  { id: 'Users', icone: <Users size={20} /> },
  { id: 'Heart', icone: <Heart size={20} /> },
  { id: 'TrendingUp', icone: <TrendingUp size={20} /> },
  { id: 'Star', icone: <Star size={20} /> },
  { id: 'Award', icone: <Award size={20} /> },
  { id: 'Medal', icone: <Medal size={20} /> },
  { id: 'Gift', icone: <Gift size={20} /> },
  { id: 'CheckCircle2', icone: <CheckCircle2 size={20} /> },
];

const getIcone = (nome: string) => {
  return ICONES_DISPONIVEIS.find((i) => i.id === nome)?.icone || <Award size={20} />;
};

export default function SistemaReconhecimento({
  reconhecimentos,
  configuracao,
  colaboradores,
  lideres,
  currentUserId,
  onSaveReconhecimento,
  onDeleteReconhecimento,
  onSaveConfiguracao,
}: SistemaReconhecimentoProps) {
  const [showNovoReconhecimento, setShowNovoReconhecimento] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [formReconhecimento, setFormReconhecimento] = useState({
    colaboradorId: '',
    tipoId: '',
    titulo: '',
    descricao: '',
    visibleEquipe: true,
  });
  const [formConfig, setFormConfig] = useState<ConfiguracaoReconhecimento>(configuracao);
  const [editTipo, setEditTipo] = useState<TipoReconhecimento | null>(null);
  const [novoTipo, setNovoTipo] = useState({
    nome: '',
    icone: 'Trophy',
    cor: '#fbbf24',
    criterios: '',
  });

  const tiposAtivos = configuracao.tipos.filter((t) => t.ativo);

  const salvarReconhecimento = () => {
    if (!formReconhecimento.colaboradorId || !formReconhecimento.tipoId || !formReconhecimento.titulo) {
      return;
    }

    const reconhecimento: Reconhecimento = {
      id: `rec-${Date.now()}`,
      colaboradorId: formReconhecimento.colaboradorId,
      tipoId: formReconhecimento.tipoId,
      titulo: formReconhecimento.titulo,
      descricao: formReconhecimento.descricao,
      concedidoPor: currentUserId,
      dataConcessao: new Date().toISOString().split('T')[0],
      visibleEquipe: formReconhecimento.visibleEquipe,
    };

    onSaveReconhecimento(reconhecimento);
    setShowNovoReconhecimento(false);
    setFormReconhecimento({
      colaboradorId: '',
      tipoId: '',
      titulo: '',
      descricao: '',
      visibleEquipe: true,
    });
  };

  const adicionarTipo = () => {
    if (!novoTipo.nome) return;

    const tipo: TipoReconhecimento = {
      id: editTipo?.id || `tipo-${Date.now()}`,
      nome: novoTipo.nome,
      icone: novoTipo.icone,
      cor: novoTipo.cor,
      ativo: true,
      criterios: novoTipo.criterios,
    };

    const novosTipos = editTipo
      ? configuracao.tipos.map((t) => (t.id === tipo.id ? tipo : t))
      : [...configuracao.tipos, tipo];

    onSaveConfiguracao({ ...configuracao, tipos: novosTipos });
    setNovoTipo({ nome: '', icone: 'Trophy', cor: '#fbbf24', criterios: '' });
    setEditTipo(null);
  };

  const toggleTipoAtivo = (tipoId: string) => {
    const novosTipos = configuracao.tipos.map((t) =>
      t.id === tipoId ? { ...t, ativo: !t.ativo } : t
    );
    onSaveConfiguracao({ ...configuracao, tipos: novosTipos });
  };

  const excluirTipo = (tipoId: string) => {
    const novosTipos = configuracao.tipos.filter((t) => t.id !== tipoId);
    onSaveConfiguracao({ ...configuracao, tipos: novosTipos });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Trophy size={20} className="text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Sistema de Reconhecimento</h3>
              <p className="text-xs text-slate-500">
                {reconhecimentos.length} reconhecimento(s) registrado(s)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfigModal(true)}
              className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-200 transition cursor-pointer"
            >
              Configurar
            </button>
            <button
              onClick={() => setShowNovoReconhecimento(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white font-bold rounded-xl text-sm hover:bg-amber-400 transition cursor-pointer"
            >
              <Plus size={16} />
              Novo Reconhecimento
            </button>
          </div>
        </div>

        {/* Tipos de Reconhecimento */}
        <div className="mb-4">
          <h4 className="text-sm font-bold text-slate-700 mb-3">Tipos de Reconhecimento</h4>
          <div className="flex flex-wrap gap-2">
            {tiposAtivos.map((tipo) => (
              <div
                key={tipo.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold"
                style={{ backgroundColor: `${tipo.cor}20`, color: tipo.cor }}
              >
                {getIcone(tipo.icone)}
                <span>{tipo.nome}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Reconhecimentos Recentes */}
        <div>
          <h4 className="text-sm font-bold text-slate-700 mb-3">Reconhecimentos Recentes</h4>
          {reconhecimentos.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
              <Award size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">Nenhum reconhecimento ainda</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {reconhecimentos.slice(0, 6).map((rec) => {
                const tipo = configuracao.tipos.find((t) => t.id === rec.tipoId);
                const col = colaboradores.find((c) => c.id === rec.colaboradorId);
                const gestor = lideres.find((l) => l.id === rec.concedidoPor);

                return (
                  <div
                    key={rec.id}
                    className="p-4 rounded-xl border border-slate-100 bg-slate-50"
                  >
                    <div className="flex items-start gap-3">
                      {tipo && (
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: tipo.cor }}
                        >
                          <span className="text-white">{getIcone(tipo.icone)}</span>
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-bold text-slate-800 text-sm">{rec.titulo}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {col?.nome || 'Colaborador'}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Por {gestor?.nome || 'Gestor'} • {formatDate(rec.dataConcessao)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Novo Reconhecimento */}
      {showNovoReconhecimento && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 animate-scale-up border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900">Novo Reconhecimento</h3>
              <button
                onClick={() => setShowNovoReconhecimento(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold text-2xl"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Colaborador
                </label>
                <select
                  value={formReconhecimento.colaboradorId}
                  onChange={(e) =>
                    setFormReconhecimento((prev) => ({ ...prev, colaboradorId: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none cursor-pointer"
                >
                  <option value="">Selecione...</option>
                  {colaboradores
                    .filter((c) => c.situacao !== 'Desligado')
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Tipo de Reconhecimento
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {tiposAtivos.map((tipo) => (
                    <button
                      key={tipo.id}
                      type="button"
                      onClick={() =>
                        setFormReconhecimento((prev) => ({ ...prev, tipoId: tipo.id }))
                      }
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        formReconhecimento.tipoId === tipo.id
                          ? 'ring-2 ring-offset-2'
                          : 'bg-slate-50 hover:bg-slate-100'
                      }`}
                      style={{
                        backgroundColor:
                          formReconhecimento.tipoId === tipo.id ? `${tipo.cor}20` : undefined,
                        color: formReconhecimento.tipoId === tipo.id ? tipo.cor : undefined,
                        borderColor: tipo.cor,
                        borderWidth: formReconhecimento.tipoId === tipo.id ? '2px' : undefined,
                      }}
                    >
                      <span style={{ color: tipo.cor }}>{getIcone(tipo.icone)}</span>
                      {tipo.nome}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Título do Reconhecimento
                </label>
                <input
                  type="text"
                  value={formReconhecimento.titulo}
                  onChange={(e) =>
                    setFormReconhecimento((prev) => ({ ...prev, titulo: e.target.value }))
                  }
                  placeholder="Ex: Por excelente trabalho no projeto X"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Descrição (opcional)
                </label>
                <textarea
                  value={formReconhecimento.descricao}
                  onChange={(e) =>
                    setFormReconhecimento((prev) => ({ ...prev, descricao: e.target.value }))
                  }
                  placeholder="Descreva o motivo do reconhecimento..."
                  rows={2}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="visibleEquipe"
                  checked={formReconhecimento.visibleEquipe}
                  onChange={(e) =>
                    setFormReconhecimento((prev) => ({ ...prev, visibleEquipe: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-teal-500 focus:ring-teal-500 cursor-pointer"
                />
                <label htmlFor="visibleEquipe" className="text-sm text-slate-600 cursor-pointer">
                  Visível para toda a equipe
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowNovoReconhecimento(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 bg-slate-50 rounded-xl text-sm font-semibold hover:bg-slate-100 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={salvarReconhecimento}
                className="px-4 py-2 bg-amber-500 text-white font-bold rounded-xl text-sm hover:bg-amber-400 transition cursor-pointer"
              >
                Conceder Reconhecimento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Configuração */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 animate-scale-up border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900">Configurar Reconhecimento</h3>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold text-2xl"
              >
                &times;
              </button>
            </div>

            <div className="space-y-6">
              {/* Tipos Existentes */}
              <div>
                <h4 className="text-sm font-bold text-slate-700 mb-3">Tipos de Reconhecimento</h4>
                <div className="space-y-2">
                  {configuracao.tipos.map((tipo) => (
                    <div
                      key={tipo.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border ${
                        tipo.ativo ? 'bg-slate-50 border-slate-200' : 'bg-slate-100 border-slate-100 opacity-60'
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: tipo.cor }}
                      >
                        <span className="text-white">{getIcone(tipo.icone)}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-800 text-sm">{tipo.nome}</p>
                        {tipo.criterios && (
                          <p className="text-xs text-slate-400">{tipo.criterios}</p>
                        )}
                      </div>
                      <button
                        onClick={() => toggleTipoAtivo(tipo.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                          tipo.ativo
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {tipo.ativo ? 'Ativo' : 'Inativo'}
                      </button>
                      <button
                        onClick={() => excluirTipo(tipo.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Adicionar Novo Tipo */}
              <div className="border-t border-slate-100 pt-6">
                <h4 className="text-sm font-bold text-slate-700 mb-3">Adicionar Novo Tipo</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Nome
                    </label>
                    <input
                      type="text"
                      value={novoTipo.nome}
                      onChange={(e) => setNovoTipo((prev) => ({ ...prev, nome: e.target.value }))}
                      placeholder="Ex: Super Herói"
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Ícone
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {ICONES_DISPONIVEIS.map((ic) => (
                        <button
                          key={ic.id}
                          type="button"
                          onClick={() => setNovoTipo((prev) => ({ ...prev, icone: ic.id }))}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer ${
                            novoTipo.icone === ic.id ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {ic.icone}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Cor
                    </label>
                    <div className="flex gap-2">
                      {['#fbbf24', '#f97316', '#22c55e', '#ec4899', '#8b5cf6', '#3b82f6', '#ef4444'].map(
                        (cor) => (
                          <button
                            key={cor}
                            type="button"
                            onClick={() => setNovoTipo((prev) => ({ ...prev, cor }))}
                            className={`w-8 h-8 rounded-lg cursor-pointer ${
                              novoTipo.cor === cor ? 'ring-2 ring-offset-2 ring-slate-400' : ''
                            }`}
                            style={{ backgroundColor: cor }}
                          />
                        )
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Critérios (opcional)
                    </label>
                    <input
                      type="text"
                      value={novoTipo.criterios}
                      onChange={(e) =>
                        setNovoTipo((prev) => ({ ...prev, criterios: e.target.value }))
                      }
                      placeholder="Ex: Colaborador que ajuda o time"
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none"
                    />
                  </div>
                </div>
                <button
                  onClick={adicionarTipo}
                  className="mt-3 flex items-center gap-2 px-4 py-2 bg-teal-500 text-white font-bold rounded-xl text-sm hover:bg-teal-400 transition cursor-pointer"
                >
                  <Plus size={16} />
                  Adicionar Tipo
                </button>
              </div>
            </div>

            <div className="flex justify-end mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-200 transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR');
}
