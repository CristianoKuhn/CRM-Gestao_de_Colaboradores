/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Usuario, PerfilConsolidado, PerfilObjetivo, CompetenciaBiblioteca } from '../../types';
import { DataService } from '../../services/DataService';
import {
  Target,
  Plus,
  X,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Flag,
  Ban,
} from 'lucide-react';

interface PerfilCompetenciasPanelProps {
  colaboradorId: string;
  currentUser?: Usuario;
}

const inputBase =
  'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400';
const labelBase = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1';

const STATUS_OBJETIVO_LABEL: Record<string, { label: string; className: string }> = {
  aberto: { label: 'Aberto', className: 'bg-indigo-50 text-indigo-600' },
  alcancado: { label: 'Alcançado', className: 'bg-teal-50 text-teal-600' },
  expirado: { label: 'Expirado', className: 'bg-slate-100 text-slate-400' },
};

// Motor de Desenvolvimento de Colaboradores — visão do Perfil (Aggregate
// Root) dentro do perfil do colaborador. Nenhuma escrita direta de nível
// acontece aqui: toda avaliação chama a ação de negócio avaliarCompetencia
// (Princípio 2 da Especificação v2 — nada escreve no Perfil fora de evento).
const PerfilCompetenciasPanel: React.FC<PerfilCompetenciasPanelProps> = ({ colaboradorId, currentUser }) => {
  const [carregando, setCarregando] = useState(true);
  const [perfil, setPerfil] = useState<PerfilConsolidado | null>(null);
  const [competenciasBiblioteca, setCompetenciasBiblioteca] = useState<CompetenciaBiblioteca[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const [modalAvaliacao, setModalAvaliacao] = useState(false);
  const [competenciaEscolhidaId, setCompetenciaEscolhidaId] = useState('');
  const [nivelEscolhido, setNivelEscolhido] = useState('');

  const [modalObjetivo, setModalObjetivo] = useState(false);
  const [novoObjetivo, setNovoObjetivo] = useState<PerfilObjetivo>({
    id: '',
    colaboradorId,
    titulo: '',
    status: 'aberto',
  });

  const podeGerir = !!currentUser;

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [perfilConsolidado, listaCompetencias] = await Promise.all([
        DataService.getPerfilConsolidado(colaboradorId),
        DataService.getCompetenciasBiblioteca(),
      ]);
      setPerfil(perfilConsolidado);
      setCompetenciasBiblioteca(listaCompetencias.filter((c) => c.ativo));
    } finally {
      setCarregando(false);
    }
  }, [colaboradorId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const abrirAvaliacao = () => {
    setErro(null);
    const primeira = competenciasBiblioteca[0];
    setCompetenciaEscolhidaId(primeira?.id || '');
    setNivelEscolhido(primeira?.niveis[0] || '');
    setModalAvaliacao(true);
  };

  const confirmarAvaliacao = async () => {
    if (!competenciaEscolhidaId || !nivelEscolhido) return;
    setErro(null);
    try {
      await DataService.avaliarCompetencia(colaboradorId, competenciaEscolhidaId, nivelEscolhido, currentUser?.id);
      setModalAvaliacao(false);
      await carregar();
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível registrar a avaliação.');
    }
  };

  const abrirNovoObjetivo = () => {
    setErro(null);
    setNovoObjetivo({ id: '', colaboradorId, titulo: '', status: 'aberto' });
    setModalObjetivo(true);
  };

  const salvarObjetivo = async () => {
    if (!novoObjetivo.titulo.trim()) return;
    await DataService.saveObjetivo({ ...novoObjetivo, id: novoObjetivo.id || `objetivo-${Date.now()}` });
    setModalObjetivo(false);
    await carregar();
  };

  const concluirObjetivo = async (id: string) => {
    await DataService.concluirObjetivo(id, currentUser?.id);
    await carregar();
  };
  const expirarObjetivo = async (id: string) => {
    await DataService.expirarObjetivo(id, currentUser?.id);
    await carregar();
  };

  const competenciaSelecionada = competenciasBiblioteca.find((c) => c.id === competenciaEscolhidaId);

  if (carregando) {
    return (
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex items-center gap-2 text-sm text-slate-400">
        <RefreshCw size={16} className="animate-spin" /> Carregando perfil de competências...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
            <Target size={18} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Competências e Objetivos</h3>
            <p className="text-xs text-slate-400">Nível atual comparado ao exigido pelo Cargo (Gap)</p>
          </div>
        </div>
        {podeGerir && (
          <div className="flex items-center gap-2">
            <button
              onClick={abrirNovoObjetivo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <Flag size={14} /> Novo objetivo
            </button>
            <button
              onClick={abrirAvaliacao}
              disabled={competenciasBiblioteca.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors disabled:opacity-40"
            >
              <Plus size={14} /> Avaliar competência
            </button>
          </div>
        )}
      </div>

      {erro && (
        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2 mb-3">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          {erro}
        </div>
      )}

      <div className="mb-5">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Competências</p>
        {!perfil || perfil.competencias.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">
            Nenhuma competência avaliada ainda, e o Cargo deste colaborador não tem Matriz de Competências definida.
          </p>
        ) : (
          <div className="space-y-1.5">
            {perfil.competencias.map((c) => (
              <div
                key={c.competenciaId}
                className={`flex items-center justify-between rounded-2xl border px-4 py-2.5 ${
                  c.gap ? 'border-amber-200 bg-amber-50/40' : 'border-slate-100'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-slate-800 truncate">{c.nome}</span>
                    {c.obrigatorioNoCargo && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-rose-600 bg-rose-50 rounded-full px-2 py-0.5">
                        obrigatória no cargo
                      </span>
                    )}
                    {c.gap && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
                        gap
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Atual: <span className="font-semibold text-slate-500">{c.nivelAtual || 'não avaliado'}</span>
                    {c.nivelAlvoCargo && (
                      <>
                        {' '}
                        · Alvo do cargo: <span className="font-semibold text-slate-500">{c.nivelAlvoCargo}</span>
                      </>
                    )}
                  </p>
                </div>
                {c.gap ? (
                  <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                ) : c.nivelAtual ? (
                  <CheckCircle2 size={16} className="text-teal-500 shrink-0" />
                ) : (
                  <Circle size={16} className="text-slate-300 shrink-0" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Objetivos</p>
        {!perfil || perfil.objetivos.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">Nenhum objetivo cadastrado ainda.</p>
        ) : (
          <div className="space-y-1.5">
            {perfil.objetivos.map((o) => {
              const statusInfo = STATUS_OBJETIVO_LABEL[o.status] || STATUS_OBJETIVO_LABEL.aberto;
              return (
                <div key={o.id} className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-2.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-slate-800 truncate">{o.titulo}</span>
                      <span className={`text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    {(o.descricao || o.prazo) && (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {o.descricao} {o.prazo ? `· prazo: ${o.prazo}` : ''}
                      </p>
                    )}
                  </div>
                  {podeGerir && o.status === 'aberto' && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => concluirObjetivo(o.id)}
                        className="flex items-center gap-1 text-[11px] font-semibold text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-lg px-2 py-1"
                      >
                        <CheckCircle2 size={12} /> Concluir
                      </button>
                      <button
                        onClick={() => expirarObjetivo(o.id)}
                        className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg px-2 py-1"
                      >
                        <Ban size={12} /> Expirar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalAvaliacao && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-800">Avaliar competência</h4>
              <button onClick={() => setModalAvaliacao(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelBase}>Competência</label>
                <select
                  className={inputBase}
                  value={competenciaEscolhidaId}
                  onChange={(e) => {
                    const comp = competenciasBiblioteca.find((c) => c.id === e.target.value);
                    setCompetenciaEscolhidaId(e.target.value);
                    setNivelEscolhido(comp?.niveis[0] || '');
                  }}
                >
                  {competenciasBiblioteca.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelBase}>Nível</label>
                <select className={inputBase} value={nivelEscolhido} onChange={(e) => setNivelEscolhido(e.target.value)}>
                  {(competenciaSelecionada?.niveis || []).map((nivel) => (
                    <option key={nivel} value={nivel}>
                      {nivel}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Esta é uma avaliação manual — ao contrário da conclusão automática de Etapa, ela pode apontar um
                  nível mais baixo que o atual (reavaliação explícita).
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-6">
              <button onClick={() => setModalAvaliacao(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50">
                Cancelar
              </button>
              <button
                onClick={confirmarAvaliacao}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700"
              >
                <Save size={15} /> Registrar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalObjetivo && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-800">Novo objetivo</h4>
              <button onClick={() => setModalObjetivo(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelBase}>Título</label>
                <input
                  className={inputBase}
                  value={novoObjetivo.titulo}
                  onChange={(e) => setNovoObjetivo({ ...novoObjetivo, titulo: e.target.value })}
                  placeholder="Ex.: Liderar 1 projeto até dezembro"
                />
              </div>
              <div>
                <label className={labelBase}>Descrição (opcional)</label>
                <textarea
                  className={inputBase}
                  rows={2}
                  value={novoObjetivo.descricao || ''}
                  onChange={(e) => setNovoObjetivo({ ...novoObjetivo, descricao: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelBase}>Prazo (opcional)</label>
                  <input
                    type="date"
                    className={inputBase}
                    value={novoObjetivo.prazo || ''}
                    onChange={(e) => setNovoObjetivo({ ...novoObjetivo, prazo: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelBase}>Competência ligada (opcional)</label>
                  <select
                    className={inputBase}
                    value={novoObjetivo.competenciaId || ''}
                    onChange={(e) => setNovoObjetivo({ ...novoObjetivo, competenciaId: e.target.value || undefined })}
                  >
                    <option value="">Nenhuma</option>
                    {competenciasBiblioteca.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-6">
              <button onClick={() => setModalObjetivo(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50">
                Cancelar
              </button>
              <button
                onClick={salvarObjetivo}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700"
              >
                <Save size={15} /> Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerfilCompetenciasPanel;
