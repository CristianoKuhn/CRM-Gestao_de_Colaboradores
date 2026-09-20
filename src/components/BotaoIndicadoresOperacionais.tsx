/**
 * BotaoIndicadoresOperacionais — Gestão360 v3
 *
 * Fluxo sem poluição visual:
 *
 *  CLIQUE 1 (usuário) → busca o token SSO em background (sem abrir nada)
 *                     → quando o token chega, exibe um micro-popover
 *                       inline com botão "Abrir agora"
 *
 *  CLIQUE 2 (usuário, no popover) → window.open() chamado diretamente
 *                                   no handler do clique → navegador
 *                                   NUNCA bloqueia porque é gesto direto
 *                                   → abre o IO já logado, sem about:blank
 *
 * Resultado: zero abas `about:blank`, zero pop-ups bloqueados.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  BarChart2, ExternalLink, Loader2, AlertTriangle,
  CheckCircle2, X,
} from 'lucide-react';
import { Usuario } from '../types';
import { StorageAPI } from '../utils/storage';

interface Props {
  currentUser: Usuario;
  sessionToken: string;
}

const IO_URL = 'https://app-indicadores-operacionais.vercel.app';

type Estado =
  | { tipo: 'idle' }
  | { tipo: 'carregando' }
  | { tipo: 'pronto'; url: string }
  | { tipo: 'erro'; msg: string };

export default function BotaoIndicadoresOperacionais({ currentUser, sessionToken }: Props) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'idle' });
  const popoverRef = useRef<HTMLDivElement>(null);
  const backendUrl = StorageAPI.getGoogleScriptConfig()?.webAppUrl || '';
  const semBackend = !backendUrl.startsWith('https://script.google.com/');

  // Fecha o popover ao clicar fora
  useEffect(() => {
    if (estado.tipo !== 'pronto') return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setEstado({ tipo: 'idle' });
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [estado.tipo]);

  // Token expira em 5 min — limpa o popover após 4m50s
  useEffect(() => {
    if (estado.tipo !== 'pronto') return;
    const t = setTimeout(() => setEstado({ tipo: 'idle' }), 4 * 60 * 1000 + 50 * 1000);
    return () => clearTimeout(t);
  }, [estado.tipo]);

  // ── CLIQUE 1: buscar token sem abrir nada ─────────────────────────────────
  const handlePrimeiroClique = async () => {
    if (semBackend || estado.tipo === 'carregando') return;

    // Se já temos o token pronto, o segundo clique vai abrir diretamente
    if (estado.tipo === 'pronto') {
      setEstado({ tipo: 'idle' });
      return;
    }

    setEstado({ tipo: 'carregando' });

    try {
      const resp = await fetch('/api/gerar-token-sso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken, backendUrl }),
      });
      const dados = await resp.json();

      if (!resp.ok || !dados.success || !dados.ssoToken) {
        setEstado({ tipo: 'erro', msg: dados?.message || 'Não foi possível gerar o acesso. Tente novamente.' });
        setTimeout(() => setEstado({ tipo: 'idle' }), 4000);
        return;
      }

      const url = `${IO_URL}?sso=${encodeURIComponent(dados.ssoToken)}&g360=${encodeURIComponent(backendUrl)}`;
      setEstado({ tipo: 'pronto', url });

    } catch (e: any) {
      setEstado({ tipo: 'erro', msg: 'Erro de conexão. Tente novamente.' });
      setTimeout(() => setEstado({ tipo: 'idle' }), 4000);
    }
  };

  // ── CLIQUE 2: abrir a aba — chamado DIRETAMENTE no onClick do <a> ─────────
  // Usando <a target="_blank"> em vez de window.open(): browsers NUNCA
  // bloqueiam links <a> com target="_blank" clicados pelo usuário, mesmo com
  // bloqueadores de pop-up ativos. É o método mais confiável disponível.
  const handleAbrirIO = () => {
    // Limpa o popover após abrir
    setTimeout(() => setEstado({ tipo: 'idle' }), 300);
  };

  const carregando = estado.tipo === 'carregando';
  const pronto = estado.tipo === 'pronto';
  const erro = estado.tipo === 'erro';

  return (
    <div className="relative mt-1" ref={popoverRef}>
      {/* Separador */}
      <div className="border-t border-slate-800 mb-2 mx-2" />

      {/* Botão principal */}
      <button
        onClick={handlePrimeiroClique}
        disabled={semBackend || carregando}
        title={
          semBackend
            ? 'Configure a URL do backend em Configurações Gerais'
            : pronto
            ? 'Clique em "Abrir agora" para entrar'
            : `Acessar Indicadores Operacionais como ${currentUser.nome}`
        }
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
          semBackend || carregando
            ? 'opacity-40 cursor-not-allowed text-slate-500'
            : pronto
            ? 'bg-teal-900/30 text-teal-300 cursor-pointer'
            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100 cursor-pointer'
        }`}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {carregando ? (
            <Loader2 size={18} className="text-teal-400 animate-spin shrink-0" />
          ) : pronto ? (
            <CheckCircle2 size={18} className="text-teal-400 shrink-0" />
          ) : erro ? (
            <AlertTriangle size={18} className="text-rose-400 shrink-0" />
          ) : (
            <BarChart2 size={18} className="text-slate-400 group-hover:text-teal-400 transition-colors shrink-0" />
          )}
          <span className="truncate text-sm">
            {carregando
              ? 'Preparando acesso...'
              : pronto
              ? 'Acesso pronto!'
              : 'Indicadores Operacionais'}
          </span>
        </div>
        {!carregando && !pronto && (
          <ExternalLink size={13} className="text-slate-600 group-hover:text-slate-400 shrink-0" />
        )}
        {pronto && (
          <span className="text-[10px] text-teal-500 font-bold shrink-0">Abrir ↓</span>
        )}
      </button>

      {/* Erro inline */}
      {erro && (
        <div className="mx-2 mt-1 flex items-start gap-1.5 bg-rose-900/40 border border-rose-800/50 rounded-xl px-3 py-2">
          <AlertTriangle size={12} className="text-rose-400 mt-0.5 shrink-0" />
          <p className="text-[10px] text-rose-300 leading-tight">{(estado as any).msg}</p>
        </div>
      )}

      {/* Popover inline — aparece abaixo do botão quando token está pronto */}
      {pronto && (
        <div className="absolute bottom-full left-2 right-2 mb-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="bg-slate-800 border border-teal-700/50 rounded-2xl shadow-2xl p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-teal-500/20 rounded-lg flex items-center justify-center">
                  <CheckCircle2 size={13} className="text-teal-400" />
                </div>
                <span className="text-xs font-bold text-teal-300">Acesso autorizado</span>
              </div>
              <button
                onClick={() => setEstado({ tipo: 'idle' })}
                className="text-slate-500 hover:text-slate-300 cursor-pointer transition"
                aria-label="Fechar"
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
              Logado como <span className="text-slate-200 font-semibold">{currentUser.nome}</span>.
              Clique abaixo para abrir o Indicadores Operacionais.
            </p>

            {/* Link direto — <a> nunca é bloqueado por pop-up blockers */}
            <a
              href={(estado as { tipo: 'pronto'; url: string }).url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleAbrirIO}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              <ExternalLink size={13} />
              Abrir Indicadores Operacionais
            </a>

            <p className="text-[10px] text-slate-600 text-center mt-2">
              Link expira em 5 min · uso único
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
