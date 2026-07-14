/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Usuario,
  Setor,
} from '../types';
import {
  Search,
  Filter,
  Plus,
  ShieldCheck,
  Mail,
  Lock,
  UserCheck,
  UserMinus,
  Edit2,
  Trash2,
  CheckCircle,
  Clock,
  Layers,
  ChevronRight,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

interface UsuariosProps {
  usuarios: Usuario[];
  setores: Setor[];
  onSaveUsuario: (usuario: Usuario) => Promise<void>;
  onDeleteUsuario: (id: string) => Promise<void>;
}

export default function Usuarios({
  usuarios,
  setores,
  onSaveUsuario,
  onDeleteUsuario,
}: UsuariosProps) {
  // Filtros de Busca
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPerfil, setFilterPerfil] = useState('');
  const [filterSetor, setFilterSetor] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modais de Cadastro / Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Campos do Formulário
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senhaHash, setSenhaHash] = useState('');
  const [perfil, setPerfil] = useState<Usuario['perfil']>('Lider');
  const [setoresPermitidos, setSetoresPermitidos] = useState<string[]>([]);
  const [ativo, setAtivo] = useState(true);

  // Abrir modal para novo usuário
  const handleOpenAddModal = () => {
    setEditingUsuario(null);
    setNome('');
    setEmail('');
    setSenhaHash('');
    setPerfil('Lider');
    setSetoresPermitidos([]);
    setAtivo(true);
    setIsModalOpen(true);
  };

  // Abrir modal para editar usuário existente
  const handleOpenEditModal = (usuario: Usuario) => {
    setEditingUsuario(usuario);
    setNome(usuario.nome);
    setEmail(usuario.email);
    setSenhaHash(usuario.senha_hash || '');
    setPerfil(usuario.perfil);
    setSetoresPermitidos(
      usuario.setoresPermitidos?.length
        ? usuario.setoresPermitidos
        : usuario.setor_id
          ? [usuario.setor_id]
          : []
    );
    setAtivo(usuario.ativo);
    setIsModalOpen(true);
  };

  // Submissão do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim() || isSaving) return;

    setIsSaving(true);
    try {
      const userData: Usuario = {
        id: editingUsuario ? editingUsuario.id : `usu-${Date.now()}`,
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        senha_hash: senhaHash.trim(),
        perfil,
        setor_id: setoresPermitidos[0] || '',
        setoresPermitidos,
        ativo,
        ultimo_login: editingUsuario?.ultimo_login || '',
      };

      await onSaveUsuario(userData);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Erro ao salvar usuário:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Excluir usuário
  const handleDeleteClick = async (id: string, name: string) => {
    if (confirm(`Tem certeza de que deseja remover o usuário "${name}"?`)) {
      await onDeleteUsuario(id);
    }
  };

  // Filtrar usuários
  const filteredUsuarios = usuarios.filter((usu) => {
    const matchesSearch =
      usu.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      usu.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPerfil = filterPerfil === '' || usu.perfil === filterPerfil;
    const setoresDoUsuario = usu.setoresPermitidos?.length
      ? usu.setoresPermitidos
      : usu.setor_id
        ? [usu.setor_id]
        : [];
    const matchesSetor = filterSetor === '' || setoresDoUsuario.includes(filterSetor);
    
    let matchesStatus = true;
    if (filterStatus === 'ativo') matchesStatus = usu.ativo;
    if (filterStatus === 'inativo') matchesStatus = !usu.ativo;

    return matchesSearch && matchesPerfil && matchesSetor && matchesStatus;
  });

  // Métricas rápidas
  const totalUsuarios = usuarios.length;
  const ativosCount = usuarios.filter((u) => u.ativo).length;
  const administradoresCount = usuarios.filter((u) => u.perfil === 'Administrador').length;
  const coordenadoresCount = usuarios.filter((u) => u.perfil === 'Coordenador').length;

  return (
    <div id="usuarios-dashboard-view" className="p-8 space-y-8 animate-fade-in">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="text-teal-500" size={24} />
            Gerenciamento de Usuários
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Administre os operadores do sistema, defina perfis de acesso e vincule-os a setores organizacionais.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-slate-950 font-semibold rounded-2xl text-xs transition-all duration-200 shadow-md shadow-teal-500/10 cursor-pointer"
        >
          <Plus size={16} />
          Novo Usuário
        </button>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric 1 */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-slate-50 rounded-2xl text-slate-700">
            <ShieldCheck size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Geral</span>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5">{totalUsuarios}</h3>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
            <UserCheck size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Usuários Ativos</span>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5">
              {ativosCount} <span className="text-xs font-medium text-emerald-500">({totalUsuarios > 0 ? Math.round((ativosCount / totalUsuarios) * 100) : 0}%)</span>
            </h3>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-purple-50 rounded-2xl text-purple-600">
            <Sparkles size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Administradores</span>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5">{administradoresCount}</h3>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
            <Layers size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Coordenadores / Outros</span>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5">{coordenadoresCount}</h3>
          </div>
        </div>
      </div>

      {/* Filter and Table Section */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        {/* Filters Top Bar */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row items-center gap-4">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar usuário por nome ou email..."
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition"
              />
            </div>

            {/* Dropdown Filters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
              {/* Profile Filter */}
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-slate-200 rounded-2xl">
                <Filter size={14} className="text-slate-400 shrink-0" />
                <select
                  value={filterPerfil}
                  onChange={(e) => setFilterPerfil(e.target.value)}
                  className="bg-transparent border-none text-xs outline-none text-slate-600 cursor-pointer pr-4"
                >
                  <option value="">Todos Perfis</option>
                  <option value="Administrador">Administrador</option>
                  <option value="Coordenador">Coordenador</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="Lider">Líder</option>
                </select>
              </div>

              {/* Sector Filter */}
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-slate-200 rounded-2xl">
                <Layers size={14} className="text-slate-400 shrink-0" />
                <select
                  value={filterSetor}
                  onChange={(e) => setFilterSetor(e.target.value)}
                  className="bg-transparent border-none text-xs outline-none text-slate-600 cursor-pointer pr-4"
                >
                  <option value="">Todos Setores</option>
                  {setores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-slate-200 rounded-2xl">
                <CheckCircle size={14} className="text-slate-400 shrink-0" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-transparent border-none text-xs outline-none text-slate-600 cursor-pointer pr-4"
                >
                  <option value="">Todas Situações</option>
                  <option value="ativo">Somente Ativos</option>
                  <option value="inativo">Somente Inativos</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* User Table */}
        <div className="overflow-x-auto">
          {filteredUsuarios.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <ShieldCheck size={40} className="text-slate-300 mb-2" />
              <h3 className="text-xs font-bold text-slate-800">Nenhum usuário encontrado</h3>
              <p className="text-[10px] text-slate-400 mt-1 max-w-sm">
                Experimente limpar os filtros ou faça uma nova busca utilizando termos diferentes.
              </p>
            </div>
          ) : (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Usuário</th>
                  <th className="py-4 px-6">Perfil</th>
                  <th className="py-4 px-6">Setores Permitidos</th>
                  <th className="py-4 px-6">Senha / Hash</th>
                  <th className="py-4 px-6">Situação</th>
                  <th className="py-4 px-6">Último Login</th>
                  <th className="py-4 px-6 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {filteredUsuarios.map((usu) => {
                  const setoresDoUsuario = usu.setoresPermitidos?.length
                    ? usu.setoresPermitidos
                    : usu.setor_id
                      ? [usu.setor_id]
                      : [];
                  const sectorNames = setoresDoUsuario
                    .map((id) => setores.find((s) => s.id === id)?.nome)
                    .filter(Boolean)
                    .join(', ') || 'Nenhum setor';
                  
                  // Iniciais do nome para avatar
                  const initials = usu.nome
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  // Cor do perfil
                  let perfilBadgeColor = 'bg-slate-100 text-slate-700';
                  if (usu.perfil === 'Administrador') perfilBadgeColor = 'bg-purple-100 text-purple-700 font-bold';
                  else if (usu.perfil === 'Coordenador') perfilBadgeColor = 'bg-blue-100 text-blue-700';
                  else if (usu.perfil === 'Supervisor') perfilBadgeColor = 'bg-teal-100 text-teal-800';

                  return (
                    <tr key={usu.id} className="hover:bg-slate-50/50 transition">
                      {/* Name & Email */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-slate-900 border border-slate-100 flex items-center justify-center font-bold text-[10px] text-teal-400 shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 block truncate">{usu.nome}</span>
                            <span className="text-[10px] text-slate-400 block truncate flex items-center gap-1 mt-0.5">
                              <Mail size={10} /> {usu.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Profile Profile */}
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] ${perfilBadgeColor}`}>
                          {usu.perfil}
                        </span>
                      </td>

                      {/* Setores permitidos */}
                      <td className="py-4 px-6">
                        <span className="text-slate-600 font-medium">{sectorNames}</span>
                      </td>

                      {/* Pass / Hash code */}
                      <td className="py-4 px-6">
                        <span className="font-mono text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100 flex items-center gap-1.5 w-fit">
                          <Lock size={10} />
                          {usu.senha_hash ? '••••••••' : 'Sem Senha'}
                        </span>
                      </td>

                      {/* Active Status */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${usu.ativo ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                          <span className={`text-[10px] font-bold ${usu.ativo ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {usu.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                      </td>

                      {/* Last Login */}
                      <td className="py-4 px-6">
                        <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                          <Clock size={11} />
                          {usu.ultimo_login || 'Nunca acessou'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEditModal(usu)}
                            className="p-1.5 hover:bg-slate-100 hover:text-slate-900 rounded-lg text-slate-400 cursor-pointer transition"
                            title="Editar Usuário"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(usu.id, usu.nome)}
                            className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-slate-400 cursor-pointer transition"
                            title="Remover Usuário"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL: CADASTRO & EDIÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-scale-up">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-950 text-sm uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-teal-500" />
                  {editingUsuario ? 'Editar Usuário' : 'Novo Usuário'}
                </h3>
                <p className="text-[10px] text-slate-400 mt-1">
                  {editingUsuario ? 'Atualize as informações cadastrais e permissões.' : 'Crie credenciais e configure permissões de acesso.'}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full name input */}
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Nome Completo <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isSaving}
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Carlos Roberto Silva"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-teal-500/15 focus:border-teal-500 outline-none rounded-2xl text-xs transition disabled:opacity-50"
                  />
                </div>

                {/* Email address input */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Email de Acesso <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    disabled={isSaving}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Ex: carlos.silva@empresa.com"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-teal-500/15 focus:border-teal-500 outline-none rounded-2xl text-xs transition disabled:opacity-50"
                  />
                </div>

                {/* Access Password Hash code */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Senha / Hash de Acesso
                  </label>
                  <input
                    type="password"
                    disabled={isSaving}
                    value={senhaHash}
                    onChange={(e) => setSenhaHash(e.target.value)}
                    placeholder={editingUsuario ? '••••••••' : 'Inserir senha'}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-teal-500/15 focus:border-teal-500 outline-none rounded-2xl text-xs transition disabled:opacity-50"
                  />
                </div>

                {/* Profile selection dropdown */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Perfil de Acesso
                  </label>
                  <select
                    disabled={isSaving}
                    value={perfil}
                    onChange={(e) => setPerfil(e.target.value as Usuario['perfil'])}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-teal-500/15 focus:border-teal-500 outline-none rounded-2xl text-xs transition cursor-pointer disabled:opacity-50"
                  >
                    <option value="Administrador">Administrador</option>
                    <option value="Coordenador">Coordenador</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Lider">Líder</option>
                  </select>
                </div>

                {/* Setores autorizados */}
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Setores Permitidos
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                    {setores.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          disabled={isSaving}
                          checked={setoresPermitidos.includes(s.id)}
                          onChange={(e) => {
                            setSetoresPermitidos((atuais) =>
                              e.target.checked
                                ? [...atuais, s.id]
                                : atuais.filter((id) => id !== s.id)
                            );
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-teal-500 focus:ring-teal-500 cursor-pointer disabled:opacity-50"
                        />
                        {s.nome}
                      </label>
                    ))}
                    {setores.length === 0 && (
                      <span className="text-[10px] text-slate-400">Cadastre ao menos um setor antes de criar o líder.</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    Líderes verão somente colaboradores dos setores marcados. Perfis administrativos mantêm visão total.
                  </p>
                </div>

                {/* Ativo Checkbox toggle */}
                <div className="sm:col-span-2 pt-2">
                  <label className="inline-flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      disabled={isSaving}
                      checked={ativo}
                      onChange={(e) => setAtivo(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-teal-500 focus:ring-teal-500 cursor-pointer disabled:opacity-50"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800 block">Usuário Ativo</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Se desativado, o operador perderá o acesso às planilhas e relatórios.</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end items-center gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100 font-semibold rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Salvando na Planilha...
                    </>
                  ) : (
                    'Salvar Usuário'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
