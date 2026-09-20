/**
 * BotaoIndicadoresOperacionais — Gestão360
 *
 * Botão no Sidebar que abre o App-Indicadores-Operacionais já logado,
 * via SSO (Single Sign-On). Não exige que o usuário tenha conta separada
 * no IO — o perfil do Gestão360 é traduzido automaticamente.
 *
 * Visibilidade por perfil:
 *   Administrador / Coordenador → aparece sempre no Sidebar
 *   Supervisor / Lider          → aparece se tiver "indicadores" em dashboardsHabilitados
 *                                  (ou se o admin deixou sem restrição)
 *
 * O botão fica desabilitado se a URL do backend do G360 não estiver
 * configurada em Configurações Gerais → URL do Backend.
 */

import React, { useState } from 'react';
import { BarChart2, ExternalLink, Loader2, AlertTriangle } from 'lucide-react';
import { Usuario } from '../types';
import { StorageAPI } from '../utils/storage';

interface BotaoIndicadoresOperacionaisProps {
  currentUser: Usuario;
  sessionToken: string; // token de sessão atual do G360
  isCollapsed?: boolean;
}

const IO_URL = 'https://app-indicadores-operacionais.vercel.app';

export default function BotaoIndicadoresOperacionais({
  currentUser,
  sessionToken,
  isCollapsed = false,
}: BotaoIndicadoresOperacionaisProps) {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const backendUrl = StorageAPI.getGoogleScriptConfig()?.webAppUrl || '';
  const semBackend = !backendUrl || !backendUrl.startsWith('https://script.google.com/');

  const abrirIndicadores = async () => {
    if (semBackend || carregando) return;
    setCarregando(true);
    setErro(null);

    try {
      const resp = await fetch('/api/gerar-token-sso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken, backendUrl }),
      });

      const dados = await resp.json();

      if (!resp.ok || !dados.success || !dados.ssoToken) {
        setErro(dados?.message || 'Não foi possível gerar o acesso. Tente novamente.');
        return;
      }

      // Abrir o IO com o token SSO na URL
      const urlIO = `${IO_URL}?sso=${encodeURIComponent(dados.ssoToken)}`;
      window.open(urlIO, '_blank', 'noopener,noreferrer');

    } catch (e: any) {
      setErro('Erro de conexão. Verifique sua internet e tente novamente.');
      console.error('[BotaoIO]', e);
    } finally {
      setCarregando(false);
      // Limpar erro após 4 segundos
      if (erro) setTimeout(() => setErro(null), 4000);
    }
  };

  return (
    <div className="mt-1">
      {/* Separador visual */}
      <div className="border-t border-slate-800 mb-2 mx-2" />

      <button
        onClick={abrirIndicadores}
        disabled={semBackend || carregando}
        title={
          semBackend
            ? 'Configure a URL do backend em Configurações Gerais'
            : `Abrir Indicadores Operacionais como ${currentUser.nome}`
        }
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer group ${
          semBackend || carregando
            ? 'opacity-40 cursor-not-allowed text-slate-500'
            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
        }`}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {carregando ? (
            <Loader2 size={18} className="text-teal-400 animate-spin shrink-0" />
          ) : (
            <BarChart2 size={18} className="text-slate-400 group-hover:text-teal-400 transition-colors shrink-0" />
          )}
          {!isCollapsed && (
            <span className="truncate">
              {carregando ? 'Abrindo...' : 'Indicadores Operacionais'}
            </span>
          )}
        </div>
        {!isCollapsed && !carregando && (
          <ExternalLink size={13} className="text-slate-600 group-hover:text-slate-400 shrink-0" />
        )}
      </button>

      {/* Tooltip de erro — aparece abaixo do botão, some em 4s */}
      {erro && !isCollapsed && (
        <div className="mx-2 mt-1 flex items-start gap-1.5 bg-rose-900/40 border border-rose-800/50 rounded-xl px-3 py-2">
          <AlertTriangle size={12} className="text-rose-400 mt-0.5 shrink-0" />
          <p className="text-[10px] text-rose-300 leading-tight">{erro}</p>
        </div>
      )}
    </div>
  );
}
