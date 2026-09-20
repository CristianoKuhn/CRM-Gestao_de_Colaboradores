/**
 * BotaoIndicadoresOperacionais — Gestão360
 *
 * Botão que abre o App-Indicadores-Operacionais já logado via SSO.
 *
 * CORREÇÕES v2:
 *  1. Pop-up bloqueado: a janela é aberta IMEDIATAMENTE no clique (gesto do
 *     usuário), antes da chamada async. A navegação para a URL final acontece
 *     dentro da janela já aberta — browsers nunca bloqueiam isso.
 *  2. URL do backend G360: passada como parâmetro ?g360=URL na URL de destino,
 *     porque o localStorage do IO (nova aba) não conhece a URL do G360.
 *  3. Fallback de pop-up: se o navegador bloquear mesmo assim (configuração
 *     corporativa), um modal aparece com o link para copiar manualmente.
 */

import React, { useState } from 'react';
import {
  BarChart2, ExternalLink, Loader2, AlertTriangle,
  Copy, Check, X,
} from 'lucide-react';
import { Usuario } from '../types';
import { StorageAPI } from '../utils/storage';

interface BotaoIndicadoresOperacionaisProps {
  currentUser: Usuario;
  sessionToken: string;
}

const IO_URL = 'https://app-indicadores-operacionais.vercel.app';

export default function BotaoIndicadoresOperacionais({
  currentUser,
  sessionToken,
}: BotaoIndicadoresOperacionaisProps) {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Modal de fallback quando pop-up é bloqueado
  const [urlFallback, setUrlFallback] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const backendUrl = StorageAPI.getGoogleScriptConfig()?.webAppUrl || '';
  const semBackend = !backendUrl || !backendUrl.startsWith('https://script.google.com/');

  const abrirIndicadores = async () => {
    if (semBackend || carregando) return;

    setCarregando(true);
    setErro(null);

    // ── CORREÇÃO 1: abrir janela IMEDIATAMENTE (gesto do usuário) ──────────
    // O navegador só permite window.open sem bloquear quando chamado
    // diretamente em resposta a um clique. Chamadas dentro de .then() de
    // uma Promise async são tratadas como fora do contexto de gesto.
    // Abrimos uma janela de loading agora e navegamos nela depois.
    const janelaIO = window.open('about:blank', '_blank', 'noopener');

    try {
      const resp = await fetch('/api/gerar-token-sso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken, backendUrl }),
      });

      const dados = await resp.json();

      if (!resp.ok || !dados.success || !dados.ssoToken) {
        // Fechar janela vazia se falhar
        janelaIO?.close();
        setErro(dados?.message || 'Não foi possível gerar o acesso. Tente novamente.');
        return;
      }

      // ── CORREÇÃO 2: URL do backend G360 passada como parâmetro ────────────
      // O localStorage do IO (nova aba) não conhece a URL do G360.
      // Passamos ela como ?g360=URL para que o ssoService do IO a use
      // sem precisar de configuração prévia naquele domínio.
      const urlIO = `${IO_URL}?sso=${encodeURIComponent(dados.ssoToken)}&g360=${encodeURIComponent(backendUrl)}`;

      if (janelaIO && !janelaIO.closed) {
        // Navega a janela já aberta para a URL correta
        janelaIO.location.href = urlIO;
      } else {
        // ── CORREÇÃO 3: fallback se pop-up foi bloqueado ───────────────────
        // O navegador fechou/bloqueou a janela. Mostramos um modal com o
        // link para o usuário abrir manualmente.
        setUrlFallback(urlIO);
      }

    } catch (e: any) {
      janelaIO?.close();
      setErro('Erro de conexão. Verifique sua internet e tente novamente.');
      console.error('[BotaoIO]', e);
    } finally {
      setCarregando(false);
    }
  };

  const copiarLink = async () => {
    if (!urlFallback) return;
    try {
      await navigator.clipboard.writeText(urlFallback);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Fallback para navegadores sem clipboard API
      const el = document.createElement('textarea');
      el.value = urlFallback;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  return (
    <>
      {/* Botão principal */}
      <div className="mt-1">
        <div className="border-t border-slate-800 mb-2 mx-2" />

        <button
          onClick={abrirIndicadores}
          disabled={semBackend || carregando}
          title={
            semBackend
              ? 'Configure a URL do backend em Configurações Gerais'
              : `Abrir Indicadores Operacionais como ${currentUser.nome}`
          }
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
            semBackend || carregando
              ? 'opacity-40 cursor-not-allowed text-slate-500'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100 cursor-pointer'
          }`}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {carregando ? (
              <Loader2 size={18} className="text-teal-400 animate-spin shrink-0" />
            ) : (
              <BarChart2 size={18} className="text-slate-400 group-hover:text-teal-400 transition-colors shrink-0" />
            )}
            <span className="truncate">
              {carregando ? 'Preparando acesso...' : 'Indicadores Operacionais'}
            </span>
          </div>
          {!carregando && (
            <ExternalLink size={13} className="text-slate-600 group-hover:text-slate-400 shrink-0" />
          )}
        </button>

        {erro && (
          <div className="mx-2 mt-1 flex items-start gap-1.5 bg-rose-900/40 border border-rose-800/50 rounded-xl px-3 py-2">
            <AlertTriangle size={12} className="text-rose-400 mt-0.5 shrink-0" />
            <p className="text-[10px] text-rose-300 leading-tight">{erro}</p>
          </div>
        )}
      </div>

      {/* Modal de fallback — pop-up bloqueado */}
      {urlFallback && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-amber-500/20 rounded-xl flex items-center justify-center">
                  <AlertTriangle size={16} className="text-amber-400" />
                </div>
                <div>
                  <p className="font-bold text-slate-100 text-sm">Pop-up bloqueado</p>
                  <p className="text-[11px] text-slate-400">O navegador bloqueou a abertura automática</p>
                </div>
              </div>
              <button
                onClick={() => setUrlFallback(null)}
                className="text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Clique no botão abaixo para abrir o Indicadores Operacionais, ou libere
              pop-ups para este site nas configurações do navegador.
            </p>

            <div className="space-y-2">
              <a
                href={urlFallback}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setUrlFallback(null)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm rounded-xl transition cursor-pointer"
              >
                <ExternalLink size={14} />
                Abrir Indicadores Operacionais
              </a>

              <button
                onClick={copiarLink}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                {copiado ? <Check size={13} className="text-teal-400" /> : <Copy size={13} />}
                {copiado ? 'Link copiado!' : 'Copiar link de acesso'}
              </button>
            </div>

            <p className="text-[10px] text-slate-500 text-center mt-3">
              Este link expira em 5 minutos. Não compartilhe com terceiros.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
