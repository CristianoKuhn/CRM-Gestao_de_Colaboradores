/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue } from 'motion/react';
import { Sparkles, Send, X, MapPin } from 'lucide-react';
import { perguntarParaLisa, LisaMensagem, LisaAcaoNavegar } from '../../services/LisaService';

// Resultado de uma tentativa de navegação, decidido pelo App.tsx — que é
// quem realmente conhece a lista de colaboradores carregada em memória.
export type ResultadoNavegacaoLisa =
  | { ok: true }
  | { ok: false; motivo: 'nao_encontrado' }
  | { ok: false; motivo: 'ambiguo'; candidatos: string[] };

// Dados reais (nunca inventados pela IA) para o resumo diário — calculados
// pelo App.tsx a partir do que já está carregado em memória.
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
  // Quando presente (dados já carregados), a Lisa monta e mostra automaticamente
  // — no máximo uma vez por dia — um resumo de boas-vindas com esses dados.
  resumoDiario?: ResumoDiarioLisa;
  usuarioId?: string;
  nomeUsuario?: string;
}

interface MensagemExibida extends LisaMensagem {
  id: string;
}

const POSICAO_STORAGE_KEY = 'lisa_widget_posicao';

function chaveResumoMostradoHoje(usuarioId: string): string {
  const hoje = new Date();
  const dataISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
  return `lisa_resumo_mostrado_${usuarioId}_${dataISO}`;
}

// Versão determinística do resumo — é o que sempre aparece se, por qualquer
// motivo, a chamada à IA falhar (chave ausente, limite de uso, etc.). O
// resumo diário é considerado importante o bastante para nunca depender só
// da IA estar no ar.
function montarResumoBase(resumo: ResumoDiarioLisa, nomeUsuario?: string): string {
  const linhas: string[] = [];
  const primeiroNome = nomeUsuario ? nomeUsuario.split(' ')[0] : undefined;
  linhas.push(primeiroNome ? `Bom te ver de novo, ${primeiroNome}! Aqui está o seu resumo de hoje:` : 'Bom te ver de novo! Aqui está o seu resumo de hoje:');

  if (resumo.tarefasAtrasadas > 0) {
    linhas.push(`⚠️ Você tem ${resumo.tarefasAtrasadas} tarefa(s) atrasada(s).`);
  }
  if (resumo.tarefasAVencer.length > 0) {
    const lista = resumo.tarefasAVencer
      .map((t) => `"${t.titulo}" (${t.dias === 0 ? 'vence hoje' : `em ${t.dias} dia(s)`})`)
      .join(', ');
    linhas.push(`📌 Vencendo nos próximos 3 dias: ${lista}.`);
  } else if (resumo.tarefasAtrasadas === 0) {
    linhas.push('✅ Nenhuma tarefa atrasada ou vencendo nos próximos 3 dias.');
  }

  if (resumo.avaliacoes180Proximas.length > 0) {
    linhas.push(`📋 Avaliação 180° próxima para: ${resumo.avaliacoes180Proximas.join(', ')}.`);
  }

  if (resumo.colaboradoresAbaixoDaMeta.length > 0) {
    linhas.push(
      `💬 Faltando ${resumo.diasNoMes - resumo.diaDoMes} dia(s) para o fim do mês, ainda não bateram a meta de 2 contatos: ${resumo.colaboradoresAbaixoDaMeta.join(', ')}.`
    );
  }

  return linhas.join('\n');
}

// Avatar em SVG, estilizado e abstrato de propósito — não representa uma
// pessoa real, só um rosto simpático e reconhecível como "a assistente".
const RostoLisa: React.FC<{ size?: number }> = ({ size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <circle cx="20" cy="20" r="20" fill="url(#lisa-gradiente)" />
    <circle cx="14" cy="18" r="2.4" fill="white" />
    <circle cx="26" cy="18" r="2.4" fill="white" />
    <path d="M13 25c2.5 2.6 11.5 2.6 14 0" stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    <defs>
      <linearGradient id="lisa-gradiente" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop stopColor="#5EEAD4" />
        <stop offset="1" stopColor="#0D9488" />
      </linearGradient>
    </defs>
  </svg>
);

const LisaWidget: React.FC<LisaWidgetProps> = ({ onNavegarPara, resumoDiario, usuarioId, nomeUsuario }) => {
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState<MensagemExibida[]>([
    {
      id: 'boas-vindas',
      role: 'model',
      texto: 'Oi, eu sou a Lisa 👋 Posso explicar como usar o Gestão360 e te levar até a tela certa. O que você precisa?',
    },
  ]);
  const [input, setInput] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const fimDaListaRef = useRef<HTMLDivElement>(null);
  const posX = useMotionValue(0);
  const posY = useMotionValue(0);


  // Lembra onde o gestor deixou o avatar da última vez.
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(POSICAO_STORAGE_KEY);
      if (salvo) {
        const { x, y } = JSON.parse(salvo);
        posX.set(x);
        posY.set(y);
      }
    } catch {
      // localStorage indisponível — segue com a posição padrão, sem quebrar nada.
    }
  }, [posX, posY]);

  useEffect(() => {
    fimDaListaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [mensagens, carregando]);

  // Boas-vindas inteligentes: assim que os dados terminam de carregar, se
  // ainda não mostramos o resumo hoje para este usuário, monta e envia.
  const jaTentouResumoRef = useRef(false);
  useEffect(() => {
    if (!resumoDiario || !usuarioId || jaTentouResumoRef.current) return;
    const chave = chaveResumoMostradoHoje(usuarioId);
    if (localStorage.getItem(chave)) return;
    jaTentouResumoRef.current = true;

    const textoBase = montarResumoBase(resumoDiario, nomeUsuario);

    (async () => {
      let textoFinal = textoBase;
      try {
        const prompt = `(Mensagem automática de entrada no sistema — não foi o gestor quem escreveu isso.) Reescreva os dados abaixo como uma saudação de boas-vindas curta e calorosa, no máximo 5 frases (pode usar quebras de linha/lista), em português do Brasil. Não invente nenhum número ou nome além dos que aparecem aqui. Não chame nenhuma função desta vez, apenas responda em texto.\n\n${textoBase}`;
        const resposta = await perguntarParaLisa(prompt, []);
        if (resposta.texto) textoFinal = resposta.texto;
      } catch {
        // Sem IA disponível agora? Sem problema — o resumo determinístico já
        // é suficiente e sempre confiável.
      }
      setMensagens([{ id: 'resumo-diario', role: 'model', texto: textoFinal }]);
      setAberto(true);
      try {
        localStorage.setItem(chave, '1');
      } catch {
        // Se não conseguir gravar, o pior caso é mostrar de novo na próxima
        // vez — não é grave.
      }
    })();
  }, [resumoDiario, usuarioId, nomeUsuario]);

  const salvarPosicao = () => {
    try {
      localStorage.setItem(POSICAO_STORAGE_KEY, JSON.stringify({ x: posX.get(), y: posY.get() }));
    } catch {
      // Sem persistência, sem problema — só não lembra na próxima visita.
    }
  };

  const adicionarMensagem = (role: 'user' | 'model', texto: string) => {
    setMensagens((prev) => [...prev, { id: `${role}-${Date.now()}-${Math.random()}`, role, texto }]);
  };

  const executarAcoes = (acoes: LisaAcaoNavegar[]): boolean => {
    let algumaComSucesso = false;
    acoes.forEach((acao) => {
      const resultado = onNavegarPara(acao);
      if (resultado.ok) {
        algumaComSucesso = true;
      } else if (resultado.motivo === 'nao_encontrado') {
        adicionarMensagem('model', `Não encontrei ninguém chamado "${acao.colaboradorNome}" na lista de colaboradores visível para você.`);
      } else if (resultado.motivo === 'ambiguo') {
        adicionarMensagem(
          'model',
          `Encontrei mais de uma pessoa com esse nome: ${resultado.candidatos.join(', ')}. Pode me dizer o nome completo?`
        );
      }
    });
    return algumaComSucesso;
  };

  const enviarMensagem = async () => {
    const texto = input.trim();
    if (!texto || carregando) return;

    setErro(null);
    adicionarMensagem('user', texto);
    setInput('');
    setCarregando(true);

    try {
      const historico: LisaMensagem[] = mensagens.map((m) => ({ role: m.role, texto: m.texto }));
      const resposta = await perguntarParaLisa(texto, historico);
      if (resposta.texto) adicionarMensagem('model', resposta.texto);
      const navegou = executarAcoes(resposta.acoes);
      if (!resposta.texto) {
        // Rede de segurança: se a IA chamou a ferramenta sem escrever nada
        // junto (acontece às vezes), o gestor ainda vê uma confirmação.
        adicionarMensagem('model', navegou ? 'Pronto, te levei até lá! ✅' : 'Certo!');
      }
    } catch (e: any) {
      setErro(e?.message || 'Não consegui falar com a Lisa agora.');
    } finally {
      setCarregando(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviarMensagem();
    }
  };

  return (
    <>
      {/* AVATAR FLUTUANTE — arrastável; um "tap" (sem arrastar) abre o chat */}
      <motion.div
        drag
        dragMomentum={false}
        onDragEnd={salvarPosicao}
        style={{ x: posX, y: posY, position: 'fixed', bottom: 24, right: 24, zIndex: 60 }}
        onTap={() => setAberto((v) => !v)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.96 }}
        className="w-16 h-16 rounded-full shadow-xl shadow-teal-900/20 bg-white border-2 border-white flex items-center justify-center cursor-grab active:cursor-grabbing"
        title="Lisa — assistente do Gestão360"
      >
        <div className="w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-br from-teal-300 to-teal-600">
          <RostoLisa size={34} />
        </div>
        {!aberto && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-teal-400 rounded-full ring-2 ring-white animate-pulse" />
        )}
      </motion.div>

      {/* PAINEL DE CHAT */}
      {aberto && (
        <div className="fixed bottom-24 right-6 z-[59] w-[92vw] max-w-sm h-[520px] max-h-[70vh] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-slide-down">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 bg-gradient-to-r from-teal-50 to-white">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-gradient-to-br from-teal-300 to-teal-600 shrink-0">
                <RostoLisa size={20} />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm leading-tight">Lisa</p>
                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Sparkles size={9} /> Assistente do Gestão360
                </p>
              </div>
            </div>
            <button
              onClick={() => setAberto(false)}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg p-1.5 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-slate-50/50">
            {mensagens.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-snug ${
                    m.role === 'user'
                      ? 'bg-teal-500 text-white rounded-br-md'
                      : 'bg-white border border-slate-100 text-slate-700 rounded-bl-md shadow-sm'
                  }`}
                >
                  {m.texto}
                </div>
              </div>
            ))}
            {carregando && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-md px-3.5 py-2.5 shadow-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
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

          <div className="p-3 border-t border-slate-100 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte algo à Lisa..."
              disabled={carregando}
              className="flex-1 px-3.5 py-2.5 bg-slate-100 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-60"
            />
            <button
              onClick={enviarMensagem}
              disabled={carregando || !input.trim()}
              className="w-10 h-10 shrink-0 flex items-center justify-center bg-teal-500 hover:bg-teal-400 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl cursor-pointer transition"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default LisaWidget;
