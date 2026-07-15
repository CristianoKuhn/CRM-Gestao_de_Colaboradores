/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertaInteligente,
  ConfiguracaoAlertas,
  Colaborador,
  TimelineRegistro,
} from '../types';
import {
  Bell,
  X,
  Check,
  Clock,
  Gift,
  Calendar,
  AlertTriangle,
  ChevronRight,
  Trash2,
  CheckCircle2,
} from 'lucide-react';

interface SistemaNotificacoesProps {
  alertas: AlertaInteligente[];
  configAlertas: ConfiguracaoAlertas;
  colaboradores: Colaborador[];
  timeline: TimelineRegistro[];
  onReconhecerAlerta: (id: string) => void;
  onResolverAlerta: (id: string) => void;
  onIgnorarAlerta: (id: string) => void;
  onLimparResolvidos: () => void;
}

interface Notificacao {
  id: string;
  tipo: 'info' | 'warning' | 'success' | 'error';
  titulo: string;
  mensagem: string;
  data: Date;
  lida: boolean;
}

export default function SistemaNotificacoes({
  alertas,
  configAlertas,
  colaboradores,
  timeline,
  onReconhecerAlerta,
  onResolverAlerta,
  onIgnorarAlerta,
  onLimparResolvidos,
}: SistemaNotificacoesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [activeTab, setActiveTab] = useState<'alertas' | 'historico'>('alertas');

  // Alertas pendentes
  const alertasPendentes = alertas.filter(a => a.status === 'pendente');
  const alertasReconhecidos = alertas.filter(a => a.status === 'reconhecido');

  // Converter alertas para notificações
  const alertasToNotificacoes = useCallback((): Notificacao[] => {
    return alertas.map(alerta => {
      const col = colaboradores.find(c => c.id === alerta.colaboradorId);
      return {
        id: alerta.id,
        tipo: getTipoNotificacao(alerta.tipo),
        titulo: alerta.titulo,
        mensagem: `${col?.nome || 'Colaborador'}: ${alerta.descricao}`,
        data: new Date(alerta.dataCriacao),
        lida: alerta.status !== 'pendente',
      };
    });
  }, [alertas, colaboradores]);

  // Verificar novos alertas e gerar notificações
  useEffect(() => {
    const novasNotificacoes = alertasToNotificacoes();
    setNotificacoes(novasNotificacoes);
  }, [alertasToNotificacoes]);

  // Não lidas count
  const naoLidasCount = alertasPendentes.length;

  const getTipoNotificacao = (tipo: string): Notificacao['tipo'] => {
    switch (tipo) {
      case 'aniversario_nascimento':
      case 'aniversario_casa':
        return 'info';
      case 'avaliacao_180':
        return 'warning';
      case 'sem_interacao':
        return 'error';
      default:
        return 'info';
    }
  };

  const getIconePorTipo = (tipo: string) => {
    switch (tipo) {
      case 'aniversario_nascimento':
        return <Gift size={16} />;
      case 'aniversario_casa':
        return <Calendar size={16} />;
      case 'avaliacao_180':
        return <CheckCircle2 size={16} />;
      case 'sem_interacao':
        return <AlertTriangle size={16} />;
      default:
        return <Bell size={16} />;
    }
  };

  const getCorPorStatus = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'bg-rose-500';
      case 'reconhecido':
        return 'bg-amber-500';
      case 'resolvido':
        return 'bg-emerald-500';
      default:
        return 'bg-slate-500';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'agora';
    if (minutes < 60) return `${minutes}min`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  return (
    <>
      {/* Botão de Notificações */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
        >
          <Bell size={20} />
          {naoLidasCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {naoLidasCount > 9 ? '9+' : naoLidasCount}
            </span>
          )}
        </button>

        {/* Dropdown de Notificações */}
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">Notificações</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={onLimparResolvidos}
                      className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      Limpar resolvidos
                    </button>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setActiveTab('alertas')}
                    className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      activeTab === 'alertas'
                        ? 'bg-teal-500 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Alertas ({alertasPendentes.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('historico')}
                    className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      activeTab === 'historico'
                        ? 'bg-teal-500 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Histórico ({alertasReconhecidos.length})
                  </button>
                </div>
              </div>

              {/* Lista de Notificações */}
              <div className="max-h-96 overflow-y-auto">
                {activeTab === 'alertas' ? (
                  alertasPendentes.length === 0 ? (
                    <div className="p-8 text-center">
                      <CheckCircle2 size={40} className="mx-auto text-emerald-300 mb-2" />
                      <p className="text-slate-500 font-semibold">Nenhum alerta pendente</p>
                      <p className="text-xs text-slate-400 mt-1">Tudo em dia!</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {alertasPendentes.map(alerta => {
                        const col = colaboradores.find(c => c.id === alerta.colaboradorId);
                        return (
                          <div
                            key={alerta.id}
                            className="p-4 hover:bg-slate-50 transition group"
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                alerta.tipo === 'sem_interacao'
                                  ? 'bg-rose-100 text-rose-600'
                                  : alerta.tipo === 'avaliacao_180'
                                  ? 'bg-amber-100 text-amber-600'
                                  : 'bg-blue-100 text-blue-600'
                              }`}>
                                {getIconePorTipo(alerta.tipo)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-800 text-sm">{alerta.titulo}</p>
                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{alerta.descricao}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                    <Clock size={10} />
                                    {formatTimeAgo(new Date(alerta.dataCriacao))}
                                  </span>
                                  {alerta.diasRestantes > 0 && (
                                    <span className="text-[10px] text-amber-600 font-semibold">
                                      {alerta.diasRestantes} dias restantes
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition">
                              <button
                                onClick={() => onReconhecerAlerta(alerta.id)}
                                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold hover:bg-amber-200 transition cursor-pointer"
                              >
                                <Check size={12} />
                                Reconhecer
                              </button>
                              <button
                                onClick={() => onIgnorarAlerta(alerta.id)}
                                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-200 transition cursor-pointer"
                              >
                                <X size={12} />
                                Ignorar
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  alertasReconhecidos.length === 0 ? (
                    <div className="p-8 text-center">
                      <Bell size={40} className="mx-auto text-slate-200 mb-2" />
                      <p className="text-slate-500 font-semibold">Nenhum histórico</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {alertasReconhecidos.map(alerta => {
                        const col = colaboradores.find(c => c.id === alerta.colaboradorId);
                        return (
                          <div
                            key={alerta.id}
                            className="p-4 hover:bg-slate-50 transition"
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-100 text-emerald-600">
                                <Check size={16} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-800 text-sm">{alerta.titulo}</p>
                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{alerta.descricao}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="text-[10px] text-slate-400">
                                    Reconhecido {formatTimeAgo(new Date(alerta.dataReconhecimento || alerta.dataCriacao))}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => onResolverAlerta(alerta.id)}
                                className="text-emerald-500 hover:text-emerald-700 cursor-pointer"
                                title="Marcar como resolvido"
                              >
                                <CheckCircle2 size={18} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-slate-100 bg-slate-50">
                <button
                  onClick={() => {
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Ver todos os alertas
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
