/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { DataService } from '../services/DataService';
import {
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldAlert,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';

interface RedefinirSenhaPageProps {
  token: string;
  // Chamado quando a pessoa termina o fluxo (com sucesso ou desistindo) —
  // quem chama (App.tsx) é responsável por limpar o `?resetToken=` da URL e
  // devolver o app ao estado normal (login ou dashboard).
  onConcluir: () => void;
}

type EstadoValidacao = 'validando' | 'valido' | 'invalido';

// ── "Esqueci minha senha" — Etapa final do fluxo ────────────────────────
// Esta é a página pública para a qual o link do e-mail de recuperação aponta
// (?resetToken=<token>). Não exige nenhuma sessão: o próprio token, validado
// contra o backend, é a prova de identidade. Sequência:
//   1. Ao montar, valida o token (existe? não expirou? usuário ainda ativo?).
//   2. Se válido, mostra só o essencial: nome/e-mail (mascarado) da conta e
//      os dois campos de nova senha — exatamente como pedido.
//   3. Ao salvar, o token é consumido (uso único) e todas as sessões antigas
//      daquela conta são encerradas pelo backend.
export default function RedefinirSenhaPage({ token, onConcluir }: RedefinirSenhaPageProps) {
  const [estado, setEstado] = useState<EstadoValidacao>('validando');
  const [nomeConta, setNomeConta] = useState('');
  const [emailMascarado, setEmailMascarado] = useState('');
  const [erroValidacao, setErroValidacao] = useState('');

  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const [concluidoComSucesso, setConcluidoComSucesso] = useState(false);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const resultado = await DataService.validarTokenRecuperacaoSenha(token);
      if (cancelado) return;
      if (resultado.valido) {
        setNomeConta(resultado.nome || '');
        setEmailMascarado(resultado.emailMascarado || '');
        setEstado('valido');
      } else {
        setErroValidacao(resultado.erro || 'Este link de recuperação é inválido ou expirou.');
        setEstado('invalido');
      }
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (salvando) return;

    if (novaSenha.trim().length < 6) {
      setErroSalvar('A nova senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (novaSenha !== confirmarNovaSenha) {
      setErroSalvar('As senhas digitadas não coincidem.');
      return;
    }

    setSalvando(true);
    setErroSalvar(null);
    try {
      await DataService.redefinirSenhaComToken(token, novaSenha.trim());
      setConcluidoComSucesso(true);
    } catch (err: any) {
      console.error(err);
      setErroSalvar(err.message || 'Não foi possível redefinir a senha. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div id="redefinir-senha-container" className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans antialiased">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center gap-3 bg-teal-500 text-slate-900 font-extrabold p-3 rounded-2xl shadow-lg shadow-teal-500/20 mb-4">
          <KeyRound size={28} />
        </div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Redefinir Senha</h2>
        <p className="mt-1 text-xs text-slate-400 font-medium">Gestão360</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md p-4">
        <div className="bg-slate-800/80 backdrop-blur-md py-8 px-6 shadow-2xl rounded-3xl border border-slate-700/50 space-y-6">

          {/* ── Validando o token ─────────────────────────────────────── */}
          {estado === 'validando' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 size={28} className="text-teal-400 animate-spin" />
              <p className="text-xs text-slate-400 font-medium">Verificando seu link de recuperação...</p>
            </div>
          )}

          {/* ── Token inválido ou expirado ────────────────────────────── */}
          {estado === 'invalido' && (
            <div className="space-y-5">
              <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-2xl flex items-start gap-3 animate-scale-up">
                <XCircle className="text-rose-400 shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="text-xs font-bold text-rose-300">Link inválido</p>
                  <p className="text-[10px] text-rose-400/90 mt-0.5 leading-relaxed">{erroValidacao}</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                Volte para a tela de login e use a opção "Esqueci minha senha" para receber um novo link.
              </p>
              <button
                onClick={onConcluir}
                className="w-full flex justify-center items-center gap-2 py-3.5 bg-teal-500 hover:bg-teal-400 active:bg-teal-600 text-slate-950 font-extrabold rounded-2xl text-xs transition duration-150 shadow-lg shadow-teal-500/10 cursor-pointer"
              >
                Voltar para o Login
              </button>
            </div>
          )}

          {/* ── Sucesso: senha redefinida ─────────────────────────────── */}
          {estado === 'valido' && concluidoComSucesso && (
            <div className="space-y-5">
              <div className="flex flex-col items-center gap-3 py-2 text-center">
                <div className="w-14 h-14 bg-teal-500/10 border border-teal-500/30 rounded-full flex items-center justify-center">
                  <CheckCircle className="text-teal-400" size={28} />
                </div>
                <p className="text-sm font-bold text-white">Senha redefinida com sucesso!</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Por segurança, encerramos qualquer sessão antiga desta conta. Faça login novamente com sua nova senha.
                </p>
              </div>
              <button
                onClick={onConcluir}
                className="w-full flex justify-center items-center gap-2 py-3.5 bg-teal-500 hover:bg-teal-400 active:bg-teal-600 text-slate-950 font-extrabold rounded-2xl text-xs transition duration-150 shadow-lg shadow-teal-500/10 cursor-pointer"
              >
                Ir para o Login
                <ArrowRight size={14} />
              </button>
            </div>
          )}

          {/* ── Token válido: formulário de nova senha ────────────────── */}
          {estado === 'valido' && !concluidoComSucesso && (
            <>
              <div className="bg-teal-500/10 border border-teal-500/20 p-3 rounded-2xl flex items-center gap-2.5">
                <CheckCircle className="text-teal-400 shrink-0" size={16} />
                <p className="text-[10px] text-teal-300 font-medium">
                  {nomeConta} — {emailMascarado}
                </p>
              </div>

              {erroSalvar && (
                <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-2xl flex items-start gap-3 animate-scale-up">
                  <ShieldAlert className="text-rose-400 shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="text-xs font-bold text-rose-300">Não foi possível salvar</p>
                    <p className="text-[10px] text-rose-400/90 mt-0.5 leading-relaxed">{erroSalvar}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="novaSenha" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Digite sua Nova Senha
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Lock size={16} />
                    </div>
                    <input
                      id="novaSenha"
                      type={showSenha ? 'text' : 'password'}
                      required
                      minLength={6}
                      autoFocus
                      disabled={salvando}
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      placeholder="Mínimo de 6 caracteres"
                      className="block w-full pl-10 pr-10 py-3 bg-slate-900/50 border border-slate-700 focus:border-teal-500 focus:bg-slate-900 outline-none rounded-2xl text-xs text-white placeholder-slate-500 transition duration-150 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSenha(!showSenha)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      {showSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmarNovaSenha" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Digite Novamente
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Lock size={16} />
                    </div>
                    <input
                      id="confirmarNovaSenha"
                      type={showSenha ? 'text' : 'password'}
                      required
                      minLength={6}
                      disabled={salvando}
                      value={confirmarNovaSenha}
                      onChange={(e) => setConfirmarNovaSenha(e.target.value)}
                      placeholder="Repita a nova senha"
                      className="block w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 focus:border-teal-500 focus:bg-slate-900 outline-none rounded-2xl text-xs text-white placeholder-slate-500 transition duration-150 disabled:opacity-50"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={salvando}
                  className="w-full flex justify-center items-center gap-2 py-3.5 bg-teal-500 hover:bg-teal-400 active:bg-teal-600 disabled:opacity-50 text-slate-950 font-extrabold rounded-2xl text-xs transition duration-150 shadow-lg shadow-teal-500/10 cursor-pointer"
                >
                  {salvando ? 'Salvando...' : 'Salvar Nova Senha'}
                  {!salvando && <ArrowRight size={14} />}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
