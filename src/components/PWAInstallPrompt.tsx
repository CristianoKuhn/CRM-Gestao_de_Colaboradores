/**
 * PWAInstallPrompt — Gestão360
 *
 * Dois comportamentos em um componente:
 *
 * 1. BANNER DE INSTALAÇÃO — aparece discretamente quando o navegador detecta
 *    que o app pode ser instalado (evento beforeinstallprompt). O usuário clica
 *    e o prompt nativo do Chrome/Edge/Safari aparece. Após instalar ou dispensar,
 *    o banner some e não volta a aparecer por 30 dias.
 *
 * 2. BANNER DE ATUALIZAÇÃO — aparece quando o Service Worker tem uma nova versão
 *    pronta (evento gestao360-update-available). Um clique recarrega o app com
 *    a versão mais recente.
 *
 * Design: aparece no rodapé da tela, discreto, não bloqueia o conteúdo.
 * Nunca aparece quando o app já está instalado (display-mode: standalone).
 */

import React, { useState, useEffect } from 'react';
import { Download, X, RefreshCw, Smartphone } from 'lucide-react';

// Evento nativo do navegador antes de mostrar o prompt de instalação
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

const DISMISSED_KEY = 'gc_pwa_install_dismissed_until';

export default function PWAInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Não mostrar se já está rodando como app instalado
    const isPWA =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.documentElement.getAttribute('data-pwa') === 'true';

    if (isPWA) return;

    // Verificar se o usuário já dispensou recentemente (dentro de 30 dias)
    const dismissedUntil = localStorage.getItem(DISMISSED_KEY);
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil)) return;

    // Capturar o evento de instalação do navegador
    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      // Mostrar o banner com um delay para não aparecer logo ao abrir
      setTimeout(() => setShowInstall(true), 3000);
    };

    // Escutar atualização do Service Worker
    const handleUpdate = () => setShowUpdate(true);

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('gestao360-update-available', handleUpdate);

    // Detectar se foi instalado (fecha o banner)
    window.addEventListener('appinstalled', () => {
      setShowInstall(false);
      setInstallEvent(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('gestao360-update-available', handleUpdate);
    };
  }, []);

  const handleInstall = async () => {
    if (!installEvent) return;
    setInstalling(true);
    try {
      await installEvent.prompt();
      const { outcome } = await installEvent.userChoice;
      if (outcome === 'accepted') {
        setShowInstall(false);
      }
    } catch (err) {
      console.warn('[PWA] Erro ao instalar:', err);
    } finally {
      setInstalling(false);
    }
  };

  const handleDismissInstall = () => {
    setShowInstall(false);
    // Não mostrar novamente por 30 dias
    localStorage.setItem(DISMISSED_KEY, String(Date.now() + 30 * 24 * 60 * 60 * 1000));
  };

  const handleUpdate = () => {
    // Pede ao Service Worker para pular a espera e ativar imediatamente
    navigator.serviceWorker?.ready.then((reg) => {
      reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
    });
    window.location.reload();
  };

  // ── Banner de Atualização ─────────────────────────────────────────────────
  if (showUpdate) {
    return (
      <div
        role="alert"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm mx-4"
        style={{ animation: 'slideUp 0.3s ease-out' }}
      >
        <div className="bg-indigo-600 text-white rounded-2xl shadow-2xl px-5 py-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <RefreshCw size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">Nova versão disponível</p>
            <p className="text-xs text-indigo-200">Clique para atualizar o Gestão360.</p>
          </div>
          <button
            onClick={handleUpdate}
            className="shrink-0 bg-white text-indigo-700 font-bold text-xs px-3 py-1.5 rounded-xl hover:bg-indigo-50 transition cursor-pointer"
          >
            Atualizar
          </button>
          <button
            onClick={() => setShowUpdate(false)}
            className="shrink-0 p-1 hover:bg-white/20 rounded-lg transition cursor-pointer"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  // ── Banner de Instalação ──────────────────────────────────────────────────
  if (!showInstall || !installEvent) return null;

  return (
    <>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
      <div
        role="dialog"
        aria-label="Instalar Gestão360"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
        style={{ animation: 'slideUp 0.35s ease-out' }}
      >
        <div className="bg-slate-900 border border-slate-700/60 text-slate-100 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header com gradiente teal */}
          <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                <Smartphone size={16} className="text-white" />
              </div>
              <span className="font-extrabold text-white text-sm">Instalar Gestão360</span>
            </div>
            <button
              onClick={handleDismissInstall}
              className="p-1.5 hover:bg-white/20 rounded-lg transition cursor-pointer"
              aria-label="Fechar"
            >
              <X size={15} className="text-white" />
            </button>
          </div>

          {/* Corpo */}
          <div className="px-5 py-4">
            <p className="text-sm text-slate-300 leading-relaxed mb-4">
              Instale o Gestão360 no seu computador para acesso rápido pela barra de tarefas,
              sem precisar abrir o navegador toda vez.
            </p>

            {/* Recursos do app instalado */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { icone: '⚡', texto: 'Abre instantaneamente' },
                { icone: '📌', texto: 'Fixo na barra de tarefas' },
                { icone: '📡', texto: 'Funciona offline' },
              ].map((item) => (
                <div key={item.texto} className="bg-slate-800 rounded-xl p-3 text-center">
                  <div className="text-xl mb-1">{item.icone}</div>
                  <p className="text-[10px] text-slate-400 leading-tight">{item.texto}</p>
                </div>
              ))}
            </div>

            {/* Botões */}
            <div className="flex gap-2">
              <button
                onClick={handleDismissInstall}
                className="flex-1 py-2.5 text-slate-400 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Agora não
              </button>
              <button
                onClick={handleInstall}
                disabled={installing}
                className="flex-1 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-60 cursor-pointer"
              >
                {installing ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    Instalando...
                  </>
                ) : (
                  <>
                    <Download size={13} />
                    Instalar agora
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
