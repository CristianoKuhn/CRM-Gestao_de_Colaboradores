/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Lista de colaboradores + modal de edição do Perfil de Disponibilidade (Módulo 3).
// Um perfil por colaborador — se ele ainda não tiver um perfil salvo, este componente
// cria um "perfil vazio" na hora de abrir o modal, sem gravar nada até o usuário salvar.

import React, { useMemo, useState } from 'react';
import {
  Colaborador,
  Setor,
  Cargo,
  PerfilDisponibilidadeColaborador,
  PrioridadeUtilizacaoColaborador,
} from '../../../types';
import PerfilDisponibilidadeForm from './PerfilDisponibilidadeForm';
import { UserCog, Search, X, Save, CheckCircle2 } from 'lucide-react';

interface PerfilDisponibilidadeManagerProps {
  colaboradores: Colaborador[];
  perfis: PerfilDisponibilidadeColaborador[];
  setores: Setor[];
  cargos: Cargo[];
  onSalvar: (perfil: PerfilDisponibilidadeColaborador) => void | Promise<void>;
  somenteLeitura?: boolean;
}

const PRIORIDADE_ESTILO: Record<PrioridadeUtilizacaoColaborador, string> = {
  fixo: 'text-teal-700 bg-teal-50',
  preferencial: 'text-indigo-700 bg-indigo-50',
  flexivel: 'text-amber-700 bg-amber-50',
  cobertura: 'text-slate-600 bg-slate-100',
  temporario: 'text-rose-700 bg-rose-50',
};

const PRIORIDADE_LABEL_CURTO: Record<PrioridadeUtilizacaoColaborador, string> = {
  fixo: 'Fixo',
  preferencial: 'Preferencial',
  flexivel: 'Flexível',
  cobertura: 'Cobertura',
  temporario: 'Temporário',
};

const perfilVazio = (colaboradorId: string): PerfilDisponibilidadeColaborador => ({
  id: '',
  colaboradorId,
  jornadaContratual: {
    diasNormais: [1, 2, 3, 4, 5],
    horaEntradaPadrao: '08:00',
    horaSaidaPadrao: '18:00',
    horaInicioAlmoco: '12:00',
    horaFimAlmoco: '13:00',
    cargaHorariaDiaria: 8,
    cargaHorariaSemanal: 44,
  },
  disponibilidadesFlexiveis: [],
  preferencias: [],
  competencias: [],
  restricoes: [],
  prioridadeUtilizacao: 'flexivel',
});

const PerfilDisponibilidadeManager: React.FC<PerfilDisponibilidadeManagerProps> = ({
  colaboradores,
  perfis,
  setores,
  cargos,
  onSalvar,
  somenteLeitura,
}) => {
  const [busca, setBusca] = useState('');
  const [filtroSetor, setFiltroSetor] = useState('');
  const [colaboradorEditando, setColaboradorEditando] = useState<Colaborador | null>(null);
  const [perfilEmEdicao, setPerfilEmEdicao] = useState<PerfilDisponibilidadeColaborador | null>(null);
  const [salvando, setSalvando] = useState(false);

  const perfilPorColaborador = useMemo(() => {
    const mapa = new Map<string, PerfilDisponibilidadeColaborador>();
    perfis.forEach((p) => mapa.set(p.colaboradorId, p));
    return mapa;
  }, [perfis]);

  const colaboradoresFiltrados = useMemo(() => {
    return colaboradores.filter((c) => {
      const bateBusca = !busca || c.nome.toLowerCase().includes(busca.toLowerCase());
      const bateSetor = !filtroSetor || c.setorId === filtroSetor;
      return bateBusca && bateSetor && c.situacao !== 'Desligado';
    });
  }, [colaboradores, busca, filtroSetor]);

  const abrirEdicao = (colaborador: Colaborador) => {
    setColaboradorEditando(colaborador);
    setPerfilEmEdicao(perfilPorColaborador.get(colaborador.id) || perfilVazio(colaborador.id));
  };

  const salvar = async () => {
    if (!perfilEmEdicao) return;
    setSalvando(true);
    try {
      await onSalvar({
        ...perfilEmEdicao,
        id: perfilEmEdicao.id || `perfil-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        atualizadoEm: new Date().toISOString(),
      });
      setColaboradorEditando(null);
      setPerfilEmEdicao(null);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <UserCog size={18} className="text-teal-500" />
          <div>
            <h3 className="font-bold text-slate-800">Perfil de disponibilidade</h3>
            <p className="text-xs text-slate-400">
              Regras permanentes por colaborador que a geração automática de escala deve respeitar.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar colaborador…"
              className="pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/40 w-48"
            />
          </div>
          {setores.length > 0 && (
            <select
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
              value={filtroSetor}
              onChange={(e) => setFiltroSetor(e.target.value)}
            >
              <option value="">Todos os setores</option>
              {setores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {colaboradoresFiltrados.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">Nenhum colaborador encontrado.</p>
      ) : (
        <div className="space-y-2">
          {colaboradoresFiltrados.map((c) => {
            const perfil = perfilPorColaborador.get(c.id);
            return (
              <button
                key={c.id}
                onClick={() => abrirEdicao(c)}
                className="w-full flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3 hover:border-teal-200 hover:bg-teal-50/30 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  {c.fotoUrl ? (
                    <img src={c.fotoUrl} alt={c.nome} className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-400">
                      {c.nome.slice(0, 1)}
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{c.nome}</div>
                    <div className="text-xs text-slate-400">
                      {setores.find((s) => s.id === c.setorId)?.nome || 'Setor não definido'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {perfil ? (
                    <>
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 ${PRIORIDADE_ESTILO[perfil.prioridadeUtilizacao]}`}
                      >
                        {PRIORIDADE_LABEL_CURTO[perfil.prioridadeUtilizacao]}
                      </span>
                      <CheckCircle2 size={16} className="text-teal-500" />
                    </>
                  ) : (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
                      Perfil não configurado
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {colaboradorEditando && perfilEmEdicao && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 border border-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-bold text-slate-800">Perfil de disponibilidade</h4>
                <p className="text-xs text-slate-400">{colaboradorEditando.nome}</p>
              </div>
              <button
                onClick={() => {
                  setColaboradorEditando(null);
                  setPerfilEmEdicao(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <PerfilDisponibilidadeForm
              colaborador={colaboradorEditando}
              perfil={perfilEmEdicao}
              setores={setores}
              cargos={cargos}
              onChange={setPerfilEmEdicao}
              somenteLeitura={somenteLeitura}
            />

            {!somenteLeitura && (
              <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
                <button
                  onClick={() => {
                    setColaboradorEditando(null);
                    setPerfilEmEdicao(null);
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvar}
                  disabled={salvando}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50"
                >
                  <Save size={15} /> {salvando ? 'Salvando…' : 'Salvar perfil'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PerfilDisponibilidadeManager;
