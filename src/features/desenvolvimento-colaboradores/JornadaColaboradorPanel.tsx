/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Usuario, Programa, Oferta, Inscricao, InscricaoEtapa, Evidencia, TipoEvidencia } from '../../types';
import { DataService } from '../../services/DataService';
import {
  GraduationCap,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  Lock,
  Plus,
  X,
  Save,
  Paperclip,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

interface JornadaColaboradorPanelProps {
  colaboradorId: string;
  currentUser?: Usuario;
}

const TIPOS_EVIDENCIA: { valor: TipoEvidencia; label: string }[] = [
  { valor: 'documento', label: 'Documento' },
  { valor: 'video', label: 'Vídeo' },
  { valor: 'imagem', label: 'Imagem' },
  { valor: 'observacao', label: 'Observação' },
  { valor: 'formulario', label: 'Formulário' },
  { valor: 'assinatura', label: 'Assinatura' },
  { valor: 'aprovacao', label: 'Aprovação' },
];

const STATUS_ETAPA_LABEL: Record<string, { label: string; className: string }> = {
  bloqueada: { label: 'Bloqueada', className: 'bg-slate-100 text-slate-400' },
  disponivel: { label: 'Disponível', className: 'bg-indigo-50 text-indigo-600' },
  em_andamento: { label: 'Em andamento', className: 'bg-amber-50 text-amber-600' },
  concluida: { label: 'Concluída', className: 'bg-teal-50 text-teal-600' },
  atrasada: { label: 'Atrasada', className: 'bg-rose-50 text-rose-600' },
  encerrada_cancelamento: { label: 'Encerrada (cancelamento)', className: 'bg-slate-100 text-slate-400' },
};

const inputBase =
  'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400';

// Motor de Desenvolvimento de Colaboradores — visão dentro do perfil (Roadmap do
// Domínio: Inscrições e Etapas, camada de execução). Nenhuma escrita acontece
// direto aqui: toda ação chama as funções de negócio do backend (criarInscricao,
// concluirEtapa, anexarEvidencia...), nunca upsert cru de status (Princípio 10
// da Especificação v2).
const JornadaColaboradorPanel: React.FC<JornadaColaboradorPanelProps> = ({ colaboradorId, currentUser }) => {
  const [carregando, setCarregando] = useState(true);
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([]);
  const [etapasPorInscricao, setEtapasPorInscricao] = useState<Record<string, InscricaoEtapa[]>>({});
  const [evidenciasPorEtapa, setEvidenciasPorEtapa] = useState<Record<string, Evidencia[]>>({});
  const [programas, setProgramas] = useState<Programa[]>([]);
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [inscricaoExpandidaId, setInscricaoExpandidaId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [modalNovaInscricao, setModalNovaInscricao] = useState(false);
  const [ofertaEscolhidaId, setOfertaEscolhidaId] = useState('');
  const [modalEvidencia, setModalEvidencia] = useState<string | null>(null); // id da etapa
  const [novaEvidenciaTipo, setNovaEvidenciaTipo] = useState<TipoEvidencia>('observacao');
  const [novaEvidenciaTexto, setNovaEvidenciaTexto] = useState('');
  const [novaEvidenciaUrl, setNovaEvidenciaUrl] = useState('');

  const podeGerir = !!currentUser; // app interno de gestão — quem acessa o perfil já é staff

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [listaInscricoes, listaProgramas, listaOfertas] = await Promise.all([
        DataService.getInscricoes({ colaboradorId }),
        DataService.getProgramas(),
        DataService.getOfertas(),
      ]);
      setInscricoes(listaInscricoes);
      setProgramas(listaProgramas);
      setOfertas(listaOfertas);

      const etapasEntries = await Promise.all(
        listaInscricoes.map(async (i) => [i.id, await DataService.getInscricaoEtapas({ inscricaoId: i.id })] as const)
      );
      const mapaEtapas: Record<string, InscricaoEtapa[]> = {};
      etapasEntries.forEach(([id, etapas]) => {
        mapaEtapas[id] = [...etapas].sort((a, b) => a.ordem - b.ordem);
      });
      setEtapasPorInscricao(mapaEtapas);
    } finally {
      setCarregando(false);
    }
  }, [colaboradorId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const carregarEvidenciasDaEtapa = async (etapaId: string) => {
    const lista = await DataService.getEvidencias({ entidadeTipo: 'etapa', entidadeId: etapaId });
    setEvidenciasPorEtapa((atual) => ({ ...atual, [etapaId]: lista }));
  };

  const toggleInscricaoExpandida = async (inscricaoId: string) => {
    const abrindo = inscricaoExpandidaId !== inscricaoId;
    setInscricaoExpandidaId(abrindo ? inscricaoId : null);
    if (abrindo) {
      const etapas = etapasPorInscricao[inscricaoId] || [];
      await Promise.all(etapas.map((e) => carregarEvidenciasDaEtapa(e.id)));
    }
  };

  const concluir = async (etapaId: string) => {
    setErro(null);
    try {
      await DataService.concluirEtapa(etapaId, currentUser?.id);
      await carregar();
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível concluir esta etapa.');
    }
  };

  const abrirNovaInscricao = () => {
    setErro(null);
    setOfertaEscolhidaId('');
    setModalNovaInscricao(true);
  };

  const confirmarNovaInscricao = async () => {
    if (!ofertaEscolhidaId) return;
    setErro(null);
    try {
      await DataService.criarInscricao(colaboradorId, ofertaEscolhidaId, 'indicacao', currentUser?.id);
      setModalNovaInscricao(false);
      await carregar();
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível criar a Inscrição.');
    }
  };

  const salvarEvidencia = async () => {
    if (!modalEvidencia) return;
    const evidencia: Evidencia = {
      id: `evidencia-${Date.now()}`,
      entidadeTipo: 'etapa',
      entidadeId: modalEvidencia,
      tipo: novaEvidenciaTipo,
      texto: novaEvidenciaTexto || undefined,
      url: novaEvidenciaUrl || undefined,
      anexadoPor: currentUser?.id,
      status: 'pendente',
    };
    await DataService.anexarEvidencia(evidencia);
    await carregarEvidenciasDaEtapa(modalEvidencia);
    setModalEvidencia(null);
    setNovaEvidenciaTexto('');
    setNovaEvidenciaUrl('');
  };

  const validarOuRejeitar = async (evidenciaId: string, etapaId: string, aprovar: boolean) => {
    if (aprovar) await DataService.validarEvidencia(evidenciaId, currentUser?.id);
    else await DataService.rejeitarEvidencia(evidenciaId, currentUser?.id);
    await carregarEvidenciasDaEtapa(etapaId);
  };

  const nomePrograma = (programaId: string) => programas.find((p) => p.id === programaId)?.nome || 'Programa';
  const nomeOferta = (ofertaId: string) => ofertas.find((o) => o.id === ofertaId)?.nome || '';

  const ofertasDisponiveisParaInscricao = ofertas.filter(
    (o) => o.status === 'aberta' && !inscricoes.some((i) => i.ofertaId === o.id && i.estadoWorkflow !== 'cancelada')
  );

  if (carregando) {
    return (
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex items-center gap-2 text-sm text-slate-400">
        <RefreshCw size={16} className="animate-spin" /> Carregando jornada de desenvolvimento...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600">
            <GraduationCap size={18} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Jornada de Desenvolvimento</h3>
            <p className="text-xs text-slate-400">Programas em que este colaborador está inscrito</p>
          </div>
        </div>
        {podeGerir && (
          <button
            onClick={abrirNovaInscricao}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
          >
            <Plus size={14} /> Nova inscrição
          </button>
        )}
      </div>

      {erro && (
        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2 mb-3">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          {erro}
        </div>
      )}

      {inscricoes.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">
          Nenhuma Inscrição ainda. Se o Programa de Onboarding do setor estiver configurado como automático, a
          Inscrição nasce sozinha quando o colaborador é admitido.
        </p>
      ) : (
        <div className="space-y-3">
          {inscricoes.map((inscricao) => {
            const etapas = etapasPorInscricao[inscricao.id] || [];
            const expandida = inscricaoExpandidaId === inscricao.id;
            return (
              <div key={inscricao.id} className="rounded-2xl border border-slate-100 overflow-hidden">
                <button
                  onClick={() => toggleInscricaoExpandida(inscricao.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700 shrink-0 text-xs font-bold">
                      {inscricao.percentualConcluido}%
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="font-semibold text-sm text-slate-800 truncate">
                        {nomePrograma(inscricao.programaId)}{' '}
                        <span className="text-slate-400 font-normal">· {nomeOferta(inscricao.ofertaId)}</span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {inscricao.estadoWorkflow === 'concluida'
                          ? 'Concluída'
                          : inscricao.estadoWorkflow === 'cancelada'
                          ? `Cancelada${inscricao.motivoCancelamento ? ' — ' + inscricao.motivoCancelamento : ''}`
                          : 'Em andamento'}{' '}
                        · origem: {inscricao.origem}
                      </p>
                    </div>
                  </div>
                  {expandida ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </button>

                {expandida && (
                  <div className="border-t border-slate-100 px-4 py-3 space-y-2 bg-slate-50/40">
                    {etapas.map((etapa) => {
                      const statusInfo = STATUS_ETAPA_LABEL[etapa.status] || STATUS_ETAPA_LABEL.bloqueada;
                      const evidencias = evidenciasPorEtapa[etapa.id] || [];
                      const podeConcluir = podeGerir && (etapa.status === 'disponivel' || etapa.status === 'em_andamento');
                      return (
                        <div key={etapa.id} className="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 min-w-0">
                              {etapa.status === 'concluida' ? (
                                <CheckCircle2 size={16} className="text-teal-500 shrink-0" />
                              ) : etapa.status === 'bloqueada' ? (
                                <Lock size={14} className="text-slate-300 shrink-0" />
                              ) : (
                                <Circle size={14} className="text-indigo-400 shrink-0" />
                              )}
                              <span className="text-sm font-semibold text-slate-700 truncate">
                                {etapa.ordem}. {etapa.nome}
                              </span>
                              <span className={`text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 shrink-0 ${statusInfo.className}`}>
                                {statusInfo.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {podeGerir && etapa.status !== 'bloqueada' && etapa.status !== 'concluida' && etapa.status !== 'encerrada_cancelamento' && (
                                <button
                                  onClick={() => {
                                    setModalEvidencia(etapa.id);
                                    setNovaEvidenciaTipo('observacao');
                                  }}
                                  className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg px-2 py-1"
                                >
                                  <Paperclip size={11} /> Evidência
                                </button>
                              )}
                              {podeConcluir && (
                                <button
                                  onClick={() => concluir(etapa.id)}
                                  className="text-[11px] font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg px-2.5 py-1"
                                >
                                  Concluir etapa
                                </button>
                              )}
                            </div>
                          </div>
                          {evidencias.length > 0 && (
                            <div className="mt-2 space-y-1 pl-6">
                              {evidencias.map((ev) => (
                                <div key={ev.id} className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                                  <span className="truncate">
                                    <span className="font-semibold text-slate-600">
                                      {TIPOS_EVIDENCIA.find((t) => t.valor === ev.tipo)?.label}
                                    </span>
                                    {ev.texto ? `: ${ev.texto}` : ''}
                                    {ev.url ? ` (${ev.url})` : ''}
                                  </span>
                                  <span className="flex items-center gap-1.5 shrink-0">
                                    {ev.status === 'validada' && (
                                      <span title="Validada"><ShieldCheck size={12} className="text-teal-500" /></span>
                                    )}
                                    {ev.status === 'rejeitada' && (
                                      <span title="Rejeitada"><ShieldAlert size={12} className="text-rose-500" /></span>
                                    )}
                                    {ev.status === 'pendente' && podeGerir && (
                                      <>
                                        <button
                                          onClick={() => validarOuRejeitar(ev.id, etapa.id, true)}
                                          className="text-teal-600 hover:underline"
                                        >
                                          Validar
                                        </button>
                                        <button
                                          onClick={() => validarOuRejeitar(ev.id, etapa.id, false)}
                                          className="text-rose-500 hover:underline"
                                        >
                                          Rejeitar
                                        </button>
                                      </>
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modalNovaInscricao && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-800">Nova inscrição</h4>
              <button onClick={() => setModalNovaInscricao(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            {ofertasDisponiveisParaInscricao.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhuma Oferta aberta disponível no momento.</p>
            ) : (
              <div className="space-y-3">
                <select className={inputBase} value={ofertaEscolhidaId} onChange={(e) => setOfertaEscolhidaId(e.target.value)}>
                  <option value="">Selecione uma Oferta</option>
                  {ofertasDisponiveisParaInscricao.map((o) => (
                    <option key={o.id} value={o.id}>
                      {nomePrograma(o.programaId)} · {o.nome}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex items-center justify-end gap-2 mt-6">
              <button onClick={() => setModalNovaInscricao(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50">
                Cancelar
              </button>
              <button
                onClick={confirmarNovaInscricao}
                disabled={!ofertaEscolhidaId}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50"
              >
                <Save size={15} /> Inscrever
              </button>
            </div>
          </div>
        </div>
      )}

      {modalEvidencia && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-800">Anexar evidência</h4>
              <button onClick={() => setModalEvidencia(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <select className={inputBase} value={novaEvidenciaTipo} onChange={(e) => setNovaEvidenciaTipo(e.target.value as TipoEvidencia)}>
                {TIPOS_EVIDENCIA.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.label}
                  </option>
                ))}
              </select>
              <textarea
                className={inputBase}
                rows={2}
                placeholder="Observação (opcional)"
                value={novaEvidenciaTexto}
                onChange={(e) => setNovaEvidenciaTexto(e.target.value)}
              />
              <input
                className={inputBase}
                placeholder="Link (opcional)"
                value={novaEvidenciaUrl}
                onChange={(e) => setNovaEvidenciaUrl(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-end gap-2 mt-6">
              <button onClick={() => setModalEvidencia(null)} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50">
                Cancelar
              </button>
              <button
                onClick={salvarEvidencia}
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

export default JornadaColaboradorPanel;
