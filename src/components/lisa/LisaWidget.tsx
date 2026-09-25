/**
 * LisaWidget.tsx — Assistente da Lisa com identidade visual renovada
 *
 * Visual:
 *  - Avatar: rosto expressivo SVG com olhos animados, bochechas, sorriso natural
 *  - Float: ondulação suave contínua (como o balão de mensagens)
 *  - Hover: olhos piscam, leve crescimento
 *  - Click: vibração "acorda" → painel surge com spring scale
 *  - Painel: header rico com avatar animado + ondas de áudio ao responder
 *  - Halo pulsante teal ao redor do avatar
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, AnimatePresence } from 'motion/react';
import { Send, X, Sparkles, MapPin } from 'lucide-react';
import { perguntarParaLisa, LisaMensagem, LisaAcaoNavegar } from '../../services/LisaService';

export type ResultadoNavegacaoLisa =
  | { ok: true }
  | { ok: false; motivo: 'nao_encontrado' }
  | { ok: false; motivo: 'ambiguo'; candidatos: string[] };

export interface ResumoDiarioLisa {
  tarefasAtrasadas: number;
  tarefasAVencer: { titulo: string; dias: number }[];
  avaliacoes180Proximas: string[];
  colaboradoresAbaixoDaMeta: string[];
  diaDoMes: number;
  diasNoMes: number;
}

interface LisaWidgetProps {
  onNavegarPara: (acao: LisaAcaoNavegar) => ResultadoNavegacaoLisa;
  resumoDiario?: ResumoDiarioLisa;
  usuarioId?: string;
  nomeUsuario?: string;
}

interface MensagemExibida extends LisaMensagem { id: string; }

const POSICAO_STORAGE_KEY = 'lisa_widget_posicao';

function chaveResumoMostradoHoje(usuarioId: string): string {
  const hoje = new Date();
  return `lisa_resumo_mostrado_${usuarioId}_${hoje.getFullYear()}-${hoje.getMonth()+1}-${hoje.getDate()}`;
}

function montarResumoBase(resumo: ResumoDiarioLisa, nomeUsuario?: string): string {
  const saudacao = nomeUsuario ? `Oi, ${nomeUsuario.split(' ')[0]}! 👋` : 'Oi! 👋';
  const partes: string[] = [saudacao];
  if (resumo.tarefasAtrasadas > 0)
    partes.push(`Você tem **${resumo.tarefasAtrasadas} tarefa${resumo.tarefasAtrasadas > 1 ? 's' : ''} atrasada${resumo.tarefasAtrasadas > 1 ? 's' : ''}** para resolver.`);
  if (resumo.tarefasAVencer.length > 0)
    partes.push(`**${resumo.tarefasAVencer.length} tarefa${resumo.tarefasAVencer.length > 1 ? 's' : ''}** vence${resumo.tarefasAVencer.length === 1 ? '' : 'm'} nos próximos dias — fique de olho.`);
  if (resumo.avaliacoes180Proximas.length > 0)
    partes.push(`Avaliação 180° se aproximando para: **${resumo.avaliacoes180Proximas.slice(0, 2).join(', ')}${resumo.avaliacoes180Proximas.length > 2 ? ' e mais…' : ''}**.`);
  if (partes.length === 1)
    partes.push('Está tudo em ordem por aqui. Como posso te ajudar hoje?');
  return partes.join(' ');
}

function renderizarNegrito(texto: string, chave: string) {
  const partes = texto.split(/(\*\*[^*]+\*\*)/g);
  return partes.map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={`${chave}-b${i}`}>{p.slice(2, -2)}</strong>
      : <span key={`${chave}-t${i}`}>{p}</span>
  );
}

function renderizarTextoLisa(texto: string | null) {
  if (!texto) return null;
  return texto.split('\n').map((linha, idx) => (
    <div key={idx} className={idx > 0 ? 'mt-1' : ''}>
      {renderizarNegrito(linha, `l${idx}`)}
    </div>
  ));
}

// ─── Avatar SVG expressivo ────────────────────────────────────────────────────
// Rosto com: gradiente profundo, olhos com pupilas+brilho, bochechas rosadas,
// sobrancelhas sutis, sorriso natural com lábios, cílios decorativos.
const AvatarLisa: React.FC<{ size?: number; piscando?: boolean; falando?: boolean }> = ({
  size = 56, piscando = false, falando = false,
}) => {
  const escalaOlho = piscando ? 0 : 1;
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <defs>
        <radialGradient id="lg-face" cx="40%" cy="30%" r="70%" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5eead4" />
          <stop offset="55%" stopColor="#0d9488" />
          <stop offset="100%" stopColor="#0f766e" />
        </radialGradient>
        <radialGradient id="lg-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#99f6e4" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#0d9488" stopOpacity="0" />
        </radialGradient>
        <filter id="lisa-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0f766e" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Halo externo suave */}
      <circle cx="40" cy="40" r="38" fill="url(#lg-glow)" />

      {/* Rosto base */}
      <circle cx="40" cy="40" r="34" fill="url(#lg-face)" filter="url(#lisa-shadow)" />

      {/* Brilho especular no topo */}
      <ellipse cx="30" cy="24" rx="10" ry="6" fill="white" opacity="0.18" />

      {/* Bochechas */}
      <ellipse cx="18" cy="48" rx="8" ry="5" fill="#f9a8d4" opacity="0.38" />
      <ellipse cx="62" cy="48" rx="8" ry="5" fill="#f9a8d4" opacity="0.38" />

      {/* Sobrancelhas */}
      <path d="M24 28 Q28 25 32 27" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
      <path d="M48 27 Q52 25 56 28" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />

      {/* Olho esquerdo */}
      <g transform={`scale(1, ${escalaOlho}) translate(0, ${piscando ? 20 : 0})`} style={{ transformOrigin: '28px 36px' }}>
        <ellipse cx="28" cy="36" rx="6" ry="6.5" fill="white" />
        <circle cx="29" cy="37" r="4" fill="#0f766e" />
        <circle cx="30.5" cy="35.5" r="1.5" fill="white" />
        <circle cx="27.5" cy="38" r="0.8" fill="white" opacity="0.5" />
      </g>

      {/* Olho direito */}
      <g transform={`scale(1, ${escalaOlho}) translate(0, ${piscando ? 20 : 0})`} style={{ transformOrigin: '52px 36px' }}>
        <ellipse cx="52" cy="36" rx="6" ry="6.5" fill="white" />
        <circle cx="53" cy="37" r="4" fill="#0f766e" />
        <circle cx="54.5" cy="35.5" r="1.5" fill="white" />
        <circle cx="51.5" cy="38" r="0.8" fill="white" opacity="0.5" />
      </g>

      {/* Cílios decorativos */}
      <line x1="22" y1="29" x2="20" y2="25" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.45" />
      <line x1="28" y1="28" x2="28" y2="24" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.45" />
      <line x1="34" y1="29" x2="36" y2="25" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.45" />
      <line x1="46" y1="29" x2="44" y2="25" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.45" />
      <line x1="52" y1="28" x2="52" y2="24" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.45" />
      <line x1="58" y1="29" x2="60" y2="25" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.45" />

      {/* Sorriso / boca falando */}
      {falando ? (
        <ellipse cx="40" cy="55" rx="9" ry="5" fill="white" opacity="0.9" />
      ) : (
        <path
          d="M28 52 Q34 59 40 59 Q46 59 52 52"
          stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.9"
        />
      )}

      {/* Nariz ponto */}
      <circle cx="40" cy="46" r="1.5" fill="white" opacity="0.3" />
    </svg>
  );
};

// ─── Ondas de áudio animadas (quando a Lisa está "pensando") ──────────────────
const OndasAudio: React.FC = () => (
  <div className="flex items-center gap-0.5 h-4">
    {[0.4, 0.7, 1, 0.7, 0.4, 0.6, 0.9].map((h, i) => (
      <div
        key={i}
        className="w-0.5 rounded-full bg-teal-400"
        style={{
          height: `${h * 14}px`,
          animation: `lisaWave 0.9s ease-in-out ${i * 0.1}s infinite alternate`,
        }}
      />
    ))}
  </div>
);

// ─── Componente principal ─────────────────────────────────────────────────────
const LisaWidget: React.FC<LisaWidgetProps> = ({ onNavegarPara, resumoDiario, usuarioId, nomeUsuario }) => {
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState<MensagemExibida[]>([{
    id: 'boas-vindas',
    role: 'model',
    texto: 'Oi, eu sou a Lisa 👋 Posso explicar como usar o Gestão360 e te levar até a tela certa. O que você precisa?',
  }]);
  const [input, setInput] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [piscando, setPiscando] = useState(false);
  const [vibrar, setVibrar] = useState(false);

  const fimDaListaRef = useRef<HTMLDivElement>(null);
  const posX = useMotionValue(0);
  const posY = useMotionValue(0);

  // Restaurar posição
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(POSICAO_STORAGE_KEY);
      if (salvo) {
        const { x, y } = JSON.parse(salvo);
        const maxX = window.innerWidth - 80;
        const maxY = window.innerHeight - 80;
        if (Math.abs(x) <= maxX && Math.abs(y) <= maxY) {
          posX.set(x); posY.set(y);
        }
      }
    } catch { /* ok */ }
  }, [posX, posY]);

  // Piscar automático a cada ~4s
  useEffect(() => {
    const intervaloPiscar = setInterval(() => {
      setPiscando(true);
      setTimeout(() => setPiscando(false), 180);
    }, 4000 + Math.random() * 2000);
    return () => clearInterval(intervaloPiscar);
  }, []);

  // Resumo diário
  useEffect(() => {
    if (!resumoDiario || !usuarioId || !aberto) return;
    const chave = chaveResumoMostradoHoje(usuarioId);
    if (localStorage.getItem(chave)) return;
    const texto = montarResumoBase(resumoDiario, nomeUsuario);
    setMensagens([{ id: 'boas-vindas', role: 'model', texto },
      { id: 'resumo-diario', role: 'model', texto }]);
    localStorage.setItem(chave, '1');
  }, [resumoDiario, usuarioId, aberto, nomeUsuario]);

  useEffect(() => {
    fimDaListaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [mensagens, carregando]);

  const salvarPosicao = () => {
    try {
      localStorage.setItem(POSICAO_STORAGE_KEY, JSON.stringify({ x: posX.get(), y: posY.get() }));
    } catch { /* ok */ }
  };

  const handleAbrirFechar = () => {
    if (!aberto) {
      // Vibrar antes de abrir
      setVibrar(true);
      setTimeout(() => { setVibrar(false); setAberto(true); }, 400);
    } else {
      setAberto(false);
    }
  };

  const enviarMensagem = async () => {
    if (!input.trim() || carregando) return;
    const textoUsuario = input.trim();
    setInput('');
    setErro(null);
    const idUser = `u${Date.now()}`;
    setMensagens(prev => [...prev, { id: idUser, role: 'user', texto: textoUsuario }]);
    setCarregando(true);
    try {
      const historico = mensagens.map(m => ({ role: m.role, texto: m.texto }));
      const resultado = await perguntarParaLisa(textoUsuario, historico);
      if (resultado.texto) {
        setMensagens(prev => [...prev, { id: `m${Date.now()}`, role: 'model', texto: resultado.texto! }]);
      }
      if (resultado.acoes?.length) {
        resultado.acoes.forEach(acao => {
          const res = onNavegarPara(acao);
          if (!res.ok) {
            const motivo = res.motivo === 'nao_encontrado'
              ? `Não encontrei "${acao.colaboradorNome}" na lista.`
              : `Encontrei mais de um colaborador com esse nome: ${res.candidatos?.join(', ')}.`;
            setMensagens(prev => [...prev, { id: `nav-err-${Date.now()}`, role: 'model', texto: motivo }]);
          }
        });
      }
    } catch (e: any) {
      setErro(e?.message || 'Não consegui falar com a Lisa agora.');
    } finally {
      setCarregando(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensagem(); }
  };

  return (
    <>
      <style>{`
        @keyframes lisaFloat {
          0%   { transform: translateY(0px) rotate(0deg); }
          25%  { transform: translateY(-6px) rotate(0.5deg); }
          50%  { transform: translateY(-10px) rotate(-0.3deg); }
          75%  { transform: translateY(-5px) rotate(0.4deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        @keyframes lisaVibrar {
          0%,100% { transform: translateX(0); }
          15%  { transform: translateX(-4px) rotate(-3deg); }
          30%  { transform: translateX(4px) rotate(3deg); }
          45%  { transform: translateX(-3px) rotate(-2deg); }
          60%  { transform: translateX(3px) rotate(2deg); }
          75%  { transform: translateX(-2px) rotate(-1deg); }
          90%  { transform: translateX(2px) rotate(1deg); }
        }
        @keyframes lisaHalo {
          0%,100% { transform: scale(1); opacity: 0.5; }
          50%      { transform: scale(1.18); opacity: 0.18; }
        }
        @keyframes lisaWave {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1); }
        }
        @keyframes lisaPanelEntrar {
          from { opacity: 0; transform: scale(0.85) translateY(16px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .lisa-float    { animation: lisaFloat  5.5s cubic-bezier(0.37,0,0.63,1) infinite; }
        .lisa-vibrar   { animation: lisaVibrar 0.45s cubic-bezier(0.36,0.07,0.19,0.97); }
        .lisa-panel-in { animation: lisaPanelEntrar 0.45s cubic-bezier(0.16,1,0.3,1) forwards; }
      `}</style>

      {/* Avatar flutuante */}
      <motion.div
        drag
        dragMomentum={false}
        onDragEnd={salvarPosicao}
        style={{ x: posX, y: posY, position: 'fixed', bottom: 24, right: 24, zIndex: 60 }}
        title="Lisa — assistente do Gestão360"
      >
        {/* Float wrapper */}
        <div className={`lisa-float ${vibrar ? 'lisa-vibrar' : ''}`}>

          {/* Halo externo pulsante */}
          <div
            className="absolute inset-0 rounded-full bg-teal-400"
            style={{
              animation: 'lisaHalo 2.8s ease-in-out infinite',
              transformOrigin: 'center',
              filter: 'blur(8px)',
              zIndex: -1,
            }}
          />

          {/* Botão principal */}
          <motion.button
            onClick={handleAbrirFechar}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.93 }}
            className="relative w-[68px] h-[68px] rounded-full cursor-pointer flex items-center justify-center"
            style={{
              background: 'linear-gradient(145deg, #0f766e, #134e4a)',
              boxShadow: '0 8px 32px rgba(13,148,136,0.5), 0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.15)',
            }}
          >
            {/* Avatar com efeito de piscar */}
            <AvatarLisa size={52} piscando={piscando} falando={carregando} />

            {/* Indicador de status online */}
            {!aberto && (
              <span
                className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full ring-2 ring-white"
                style={{
                  background: 'linear-gradient(135deg, #34d399, #10b981)',
                  boxShadow: '0 0 6px rgba(52,211,153,0.6)',
                  animation: 'lisaHalo 1.8s ease-in-out infinite',
                }}
              />
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* Painel de chat */}
      <AnimatePresence>
        {aberto && (
          <motion.div
            key="lisa-panel"
            className="lisa-panel-in"
            style={{
              position: 'fixed',
              bottom: 100,
              right: 24,
              zIndex: 59,
              width: '92vw',
              maxWidth: '360px',
              height: '520px',
              maxHeight: '70vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              borderRadius: '1.5rem',
              boxShadow: '0 32px 64px rgba(0,0,0,0.18), 0 8px 24px rgba(13,148,136,0.15)',
              border: '1px solid rgba(13,148,136,0.12)',
              background: 'white',
            }}
            exit={{ opacity: 0, scale: 0.88, y: 12, transition: { duration: 0.25 } }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3.5 shrink-0"
              style={{
                background: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 50%, #f0fdfa 100%)',
                borderBottom: '1px solid rgba(13,148,136,0.12)',
              }}
            >
              <div className="flex items-center gap-3">
                {/* Avatar pequeno animado no header */}
                <div
                  className="relative w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: 'linear-gradient(145deg, #0f766e, #134e4a)',
                    boxShadow: '0 4px 12px rgba(13,148,136,0.4)',
                  }}
                >
                  <AvatarLisa size={32} piscando={piscando} falando={carregando} />
                  <span
                    className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white"
                    style={{ background: '#10b981' }}
                  />
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-slate-800 text-sm leading-tight">Lisa</p>
                    <Sparkles size={10} className="text-teal-500" />
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {carregando ? (
                      <OndasAudio />
                    ) : (
                      <p className="text-[10px] text-teal-600 font-medium flex items-center gap-1">
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"
                          style={{ animation: 'lisaHalo 1.8s ease-in-out infinite' }}
                        />
                        Online · Assistente do Gestão360
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setAberto(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/60 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Área de mensagens */}
            <div
              className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
              style={{ background: 'linear-gradient(180deg, #f8fffe 0%, #f0fdfa 100%)' }}
            >
              {mensagens.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}
                >
                  {m.role === 'model' && (
                    <div
                      className="w-6 h-6 rounded-full shrink-0 mt-0.5 flex items-center justify-center"
                      style={{ background: 'linear-gradient(145deg, #0f766e, #134e4a)' }}
                    >
                      <AvatarLisa size={18} />
                    </div>
                  )}
                  <div
                    className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-snug ${
                      m.role === 'user'
                        ? 'text-white rounded-br-sm'
                        : 'text-slate-700 rounded-bl-sm shadow-sm border border-white'
                    }`}
                    style={
                      m.role === 'user'
                        ? { background: 'linear-gradient(135deg, #0d9488, #0f766e)' }
                        : { background: 'white', borderColor: 'rgba(13,148,136,0.1)' }
                    }
                  >
                    {renderizarTextoLisa(m.texto)}
                  </div>
                </div>
              ))}

              {/* Indicador de digitação */}
              {carregando && (
                <div className="flex justify-start gap-2">
                  <div
                    className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center"
                    style={{ background: 'linear-gradient(145deg, #0f766e, #134e4a)' }}
                  >
                    <AvatarLisa size={18} falando={true} />
                  </div>
                  <div
                    className="rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border flex items-center gap-1.5"
                    style={{ background: 'white', borderColor: 'rgba(13,148,136,0.1)' }}
                  >
                    {[0, 0.15, 0.3].map(delay => (
                      <span
                        key={delay}
                        className="w-2 h-2 rounded-full"
                        style={{
                          background: '#0d9488',
                          animation: `lisaWave 0.7s ease-in-out ${delay}s infinite alternate`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {erro && (
                <div className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 flex items-center gap-1.5">
                  <MapPin size={12} className="shrink-0" /> {erro}
                </div>
              )}
              <div ref={fimDaListaRef} />
            </div>

            {/* Input */}
            <div
              className="px-3 py-3 flex items-center gap-2 shrink-0"
              style={{
                borderTop: '1px solid rgba(13,148,136,0.1)',
                background: 'white',
              }}
            >
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte algo à Lisa..."
                disabled={carregando}
                className="flex-1 px-4 py-2.5 rounded-2xl text-sm focus:outline-none focus:ring-2 disabled:opacity-60 placeholder:text-slate-400"
                style={{
                  background: '#f0fdfa',
                  border: '1.5px solid rgba(13,148,136,0.2)',
                  color: '#1e293b',
                }}
                onFocus={e => { e.target.style.borderColor = '#0d9488'; e.target.style.boxShadow = '0 0 0 3px rgba(13,148,136,0.15)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(13,148,136,0.2)'; e.target.style.boxShadow = 'none'; }}
              />
              <button
                onClick={enviarMensagem}
                disabled={carregando || !input.trim()}
                className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                  boxShadow: input.trim() ? '0 4px 12px rgba(13,148,136,0.4)' : 'none',
                }}
              >
                <Send size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LisaWidget;
