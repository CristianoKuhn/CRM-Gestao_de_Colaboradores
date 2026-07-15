/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Usuario } from '../types';
import { DataService } from '../services/DataService';
import { TrendingUp, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, ShieldAlert } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: Usuario) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const usuarios = await DataService.getUsuarios();
      
      const matchedUser = usuarios.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase()
      );

      if (!matchedUser) {
        setError('E-mail não cadastrado no sistema.');
        setIsLoading(false);
        return;
      }

      if (!matchedUser.ativo) {
        setError('Este usuário está inativo. Entre em contato com o administrador.');
        setIsLoading(false);
        return;
      }

      // Validação de senha: se o usuário tiver senha, valida. Se não tiver, aceita qualquer uma ou '123456'
      const correctPassword = matchedUser.senha_hash || '123456';
      
      if (password !== correctPassword) {
        setError('Senha incorreta. Tente novamente.');
        setIsLoading(false);
        return;
      }

      // Atualiza o último login no banco/local
      const updatedUser: Usuario = {
        ...matchedUser,
        ultimo_login: new Date().toLocaleString('pt-BR'),
      };
      await DataService.saveUsuario(updatedUser);

      // Sucesso!
      onLoginSuccess(updatedUser);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ocorreu um erro ao tentar realizar o login.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="login-container" className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans antialiased">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Logo */}
        <div className="inline-flex items-center gap-3 bg-teal-500 text-slate-900 font-extrabold p-3 rounded-2xl shadow-lg shadow-teal-500/20 mb-4">
          <TrendingUp size={28} />
        </div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Gestão360</h2>
        <p className="mt-1 text-xs text-slate-400 font-medium">
          Construindo equipes de alta performance
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md p-4">
        <div className="bg-slate-800/80 backdrop-blur-md py-8 px-6 shadow-2xl rounded-3xl border border-slate-700/50 space-y-6">
          
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-2xl flex items-start gap-3 animate-scale-up">
              <ShieldAlert className="text-rose-400 shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-xs font-bold text-rose-300">Falha de Autenticação</p>
                <p className="text-[10px] text-rose-400/90 mt-0.5 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                E-mail de Acesso
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail size={16} />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.nome@empresa.com"
                  className="block w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 focus:border-teal-500 focus:bg-slate-900 outline-none rounded-2xl text-xs text-white placeholder-slate-500 transition duration-150"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Senha / Credencial
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock size={16} />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="block w-full pl-10 pr-10 py-3 bg-slate-900/50 border border-slate-700 focus:border-teal-500 focus:bg-slate-900 outline-none rounded-2xl text-xs text-white placeholder-slate-500 transition duration-150"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 py-3.5 bg-teal-500 hover:bg-teal-400 active:bg-teal-600 disabled:opacity-50 text-slate-950 font-extrabold rounded-2xl text-xs transition duration-150 shadow-lg shadow-teal-500/10 cursor-pointer"
            >
              {isLoading ? 'Autenticando...' : 'Acessar o Sistema'}
              {!isLoading && <ArrowRight size={14} />}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
