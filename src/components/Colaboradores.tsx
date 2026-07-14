/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Colaborador,
  Setor,
  Cargo,
  Lider,
  Empresa,
  SituacaoColaborador,
} from '../types';
import { DataService } from '../services/DataService';
import {
  Search,
  Filter,
  Plus,
  Users2,
  Phone,
  Mail,
  Calendar,
  Layers,
  ChevronRight,
  Sparkles,
  Briefcase,
  UserCheck,
  Upload,
  RefreshCw,
} from 'lucide-react';

interface ColaboradoresProps {
  colaboradores: Colaborador[];
  setores: Setor[];
  cargos: Cargo[];
  lideres: Lider[];
  empresas: Empresa[];
  onSelectColaborador: (id: string) => void;
  onAddColaborador: (col: Colaborador) => void;
  onAddSetor: (nome: string) => void;
  onAddCargo: (nome: string) => void;
  onAddLider: (lider: Lider) => void;
  preselectedFilters?: any;
}

export default function Colaboradores({
  colaboradores,
  setores,
  cargos,
  lideres,
  empresas,
  onSelectColaborador,
  onAddColaborador,
  onAddSetor,
  onAddCargo,
  onAddLider,
  preselectedFilters = {},
}: ColaboradoresProps) {
  // Estados para Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSetor, setFilterSetor] = useState(preselectedFilters.setorId || '');
  const [filterCargo, setFilterCargo] = useState('');
  const [filterSituacao, setFilterSituacao] = useState<string>(preselectedFilters.situacao || '');

  // Modais de Cadastro
  const [isColModalOpen, setIsColModalOpen] = useState(false);
  const [isAuxModalOpen, setIsAuxModalOpen] = useState<'setor' | 'cargo' | 'lider' | null>(null);

  // Campos para Novo Colaborador
  const [newColNome, setNewColNome] = useState('');
  const [newColEmail, setNewColEmail] = useState('');
  const [newColFotoUrl, setNewColFotoUrl] = useState('');
  const [newColCargoId, setNewColCargoId] = useState(cargos[0]?.id || '');
  const [newColSetorId, setNewColSetorId] = useState(setores[0]?.id || '');
  const [newColLiderId, setNewColLiderId] = useState(lideres[0]?.id || '');
  const [newColAdmissao, setNewColAdmissao] = useState('2026-01-01');
  const [newColSituacao, setNewColSituacao] = useState<SituacaoColaborador>('Ativo');
  const [newColEmpresaId, setNewColEmpresaId] = useState(empresas[0]?.id || '');
  const [newColTelefone, setNewColTelefone] = useState('');
  const [newCidadeBase, setNewCidadeBase] = useState('');
  const [newPrazoAvaliacao180, setNewPrazoAvaliacao180] = useState<number>(6);
  const [newRealizarExperiencia, setNewRealizarExperiencia] = useState<boolean>(true);

  const photoInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const colaboradorNome = newColNome.trim() || 'Novo Colaborador';
      const fileUrl = await DataService.uploadFile(file, 'Fotos Colaboradores', colaboradorNome);
      setNewColFotoUrl(fileUrl);
    } catch (err) {
      console.error('Erro ao fazer upload da foto de perfil:', err);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Campos para Entidades Auxiliares
  const [auxNome, setAuxNome] = useState('');
  const [auxEmail, setAuxEmail] = useState(''); // apenas para Líder

  // Função para calcular o tempo de empresa de forma legível
  function calcularTempoEmpresa(dataAdmissaoStr: string): string {
    const admissao = new Date(dataAdmissaoStr);
    const hoje = new Date('2026-07-13'); // Tempo de referência congelado

    let anos = hoje.getFullYear() - admissao.getFullYear();
    let meses = hoje.getMonth() - admissao.getMonth();

    if (meses < 0) {
      anos--;
      meses += 12;
    }

    if (anos === 0) {
      if (meses === 0) return 'Recém-admitido';
      return `${meses} ${meses === 1 ? 'mês' : 'meses'}`;
    }

    const anosStr = `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
    const mesesStr = meses > 0 ? ` e ${meses} ${meses === 1 ? 'mês' : 'meses'}` : '';
    return `${anosStr}${mesesStr}`;
  }

  // Filtragem inteligente
  const colaboradoresFiltrados = colaboradores.filter((col) => {
    const matchesSearch =
      col.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      col.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSetor = filterSetor ? col.setorId === filterSetor : true;
    const matchesCargo = filterCargo ? col.cargoId === filterCargo : true;
    const matchesSituacao = filterSituacao ? col.situacao === filterSituacao : true;

    return matchesSearch && matchesSetor && matchesCargo && matchesSituacao;
  });

  const handleCreateColaborador = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColNome || !newColEmail) return;

    const foto = newColFotoUrl || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200`;

    const novoCol: Colaborador = {
      id: `col-${Date.now()}`,
      nome: newColNome,
      email: newColEmail,
      fotoUrl: foto,
      cargoId: newColCargoId || cargos[0]?.id,
      setorId: newColSetorId || setores[0]?.id,
      liderId: newColLiderId || lideres[0]?.id,
      dataAdmissao: newColAdmissao,
      situacao: newColSituacao,
      empresaId: newColEmpresaId || empresas[0]?.id,
      telefone: newColTelefone,
      cidadeBase: newCidadeBase || 'São Paulo - SP',
      prazoAvaliacao180: Number(newPrazoAvaliacao180 || 6),
      realizarExperiencia: newRealizarExperiencia,
      avaliacoesCompletas: [],
    };

    onAddColaborador(novoCol);
    setIsColModalOpen(false);

    // Reset Form
    setNewColNome('');
    setNewColEmail('');
    setNewColFotoUrl('');
    setNewColTelefone('');
    setNewCidadeBase('');
    setNewPrazoAvaliacao180(6);
    setNewRealizarExperiencia(true);
  };

  const handleCreateAux = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auxNome) return;

    if (isAuxModalOpen === 'setor') {
      onAddSetor(auxNome);
    } else if (isAuxModalOpen === 'cargo') {
      onAddCargo(auxNome);
    } else if (isAuxModalOpen === 'lider') {
      onAddLider({
        id: `lid-${Date.now()}`,
        nome: auxNome,
        email: auxEmail || `${auxNome.toLowerCase().replace(/\s/g, '.')}@inovacao.com`,
        cargo: 'Gestor / Líder de Equipe',
      });
    }

    setAuxNome('');
    setAuxEmail('');
    setIsAuxModalOpen(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 animate-fade-in">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Equipe e Colaboradores</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Cadastre, pesquise e acesse a timeline detalhada com o histórico profissional de cada colaborador.
          </p>
        </div>

        {/* Quick Actions Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            id="btn-cadastrar-setor"
            onClick={() => setIsAuxModalOpen('setor')}
            className="px-3.5 py-2 border border-slate-200 text-slate-600 bg-slate-50 rounded-xl text-xs font-semibold hover:bg-slate-100 cursor-pointer"
          >
            + Setor
          </button>
          <button
            id="btn-cadastrar-cargo"
            onClick={() => setIsAuxModalOpen('cargo')}
            className="px-3.5 py-2 border border-slate-200 text-slate-600 bg-slate-50 rounded-xl text-xs font-semibold hover:bg-slate-100 cursor-pointer"
          >
            + Cargo
          </button>
          <button
            id="btn-cadastrar-lider"
            onClick={() => setIsAuxModalOpen('lider')}
            className="px-3.5 py-2 border border-slate-200 text-slate-600 bg-slate-50 rounded-xl text-xs font-semibold hover:bg-slate-100 cursor-pointer"
          >
            + Líder
          </button>
          <button
            id="btn-novo-colaborador"
            onClick={() => setIsColModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-500 text-slate-950 font-bold rounded-xl text-sm hover:bg-teal-400 cursor-pointer shadow-md shadow-teal-500/10 transition"
          >
            <Plus size={16} />
            Novo Colaborador
          </button>
        </div>
      </div>

      {/* Intelligent Filters & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-3 items-center">
        {/* Search */}
        <div className="relative w-full md:flex-1">
          <Search size={18} className="absolute left-3 top-3 text-slate-400" />
          <input
            id="search-colaborador"
            type="text"
            placeholder="Pesquise por nome ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <select
            id="filter-setor"
            value={filterSetor}
            onChange={(e) => setFilterSetor(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none text-slate-700 cursor-pointer"
          >
            <option value="">Todos os Setores</option>
            {setores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>

          <select
            id="filter-cargo"
            value={filterCargo}
            onChange={(e) => setFilterCargo(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none text-slate-700 cursor-pointer"
          >
            <option value="">Todos os Cargos</option>
            {cargos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>

          <select
            id="filter-situacao"
            value={filterSituacao}
            onChange={(e) => setFilterSituacao(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none text-slate-700 cursor-pointer"
          >
            <option value="">Todas as Situações</option>
            <option value="Ativo">Ativo</option>
            <option value="Em Acompanhamento">Em Acompanhamento</option>
            <option value="Suspenso">Suspenso</option>
            <option value="Desligado">Desligado</option>
          </select>
        </div>
      </div>

      {/* Employees Grid (HubSpot CRM Style) */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 font-bold text-xs uppercase tracking-wider">
                <th className="p-4 pl-6">Colaborador</th>
                <th className="p-4">Cargo / Setor</th>
                <th className="p-4">Líder Direto</th>
                <th className="p-4">Tempo de Empresa</th>
                <th className="p-4 text-center">Situação</th>
                <th className="p-4 pr-6 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
              {colaboradoresFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <Users2 className="mx-auto mb-2 text-slate-300" size={36} />
                    <p className="font-semibold text-slate-500">Nenhum colaborador encontrado</p>
                    <p className="text-xs mt-1">Experimente limpar os filtros ou realizar um novo cadastro.</p>
                  </td>
                </tr>
              ) : (
                colaboradoresFiltrados.map((col) => {
                  const cargo = cargos.find((c) => c.id === col.cargoId)?.nome || 'Cargo Não Especificado';
                  const setor = setores.find((s) => s.id === col.setorId)?.nome || 'Setor Não Especificado';
                  const lider = lideres.find((l) => l.id === col.liderId);

                  // Definir cores para a situação
                  let badgeClass = 'bg-slate-100 text-slate-700';
                  if (col.situacao === 'Ativo') badgeClass = 'bg-teal-50 text-teal-700 font-semibold';
                  else if (col.situacao === 'Em Acompanhamento') badgeClass = 'bg-orange-50 text-orange-700 font-semibold';
                  else if (col.situacao === 'Suspenso') badgeClass = 'bg-rose-50 text-rose-700 font-semibold';
                  else if (col.situacao === 'Desligado') badgeClass = 'bg-slate-100 text-slate-500';

                  return (
                    <tr
                      key={col.id}
                      className="hover:bg-slate-50/70 transition duration-150 group"
                    >
                      {/* Name Card */}
                      <td className="p-4 pl-6">
                        <div
                          onClick={() => onSelectColaborador(col.id)}
                          className="flex items-center gap-3 cursor-pointer"
                        >
                          <img
                            src={col.fotoUrl}
                            alt={col.nome}
                            className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-100 shadow-sm"
                          />
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 group-hover:text-teal-600 transition truncate">
                              {col.nome}
                            </h4>
                            <span className="text-xs text-slate-400 truncate flex items-center gap-1">
                              <Mail size={12} /> {col.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Cargo & Setor */}
                      <td className="p-4">
                        <div>
                          <p className="font-semibold text-slate-800">{cargo}</p>
                          <p className="text-xs text-slate-400">{setor}</p>
                        </div>
                      </td>

                      {/* Líder Direto */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {lider?.fotoUrl && (
                            <img
                              src={lider.fotoUrl}
                              alt={lider.nome}
                              className="w-6 h-6 rounded-full object-cover border border-slate-100"
                            />
                          )}
                          <p className="text-sm text-slate-600 font-medium">{lider?.nome || 'Nenhum'}</p>
                        </div>
                      </td>

                      {/* Tempo de Empresa */}
                      <td className="p-4">
                        <div>
                          <p className="text-slate-800 font-medium">{calcularTempoEmpresa(col.dataAdmissao)}</p>
                          <p className="text-[11px] text-slate-400">Desde {new Date(col.dataAdmissao).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </td>

                      {/* Situação */}
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs ${badgeClass}`}>
                          {col.situacao}
                        </span>
                      </td>

                      {/* Ação */}
                      <td className="p-4 pr-6 text-right">
                        <button
                          id={`btn-view-profile-${col.id}`}
                          onClick={() => onSelectColaborador(col.id)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-xl cursor-pointer transition"
                        >
                          CRM & Timeline
                          <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: NOVO COLABORADOR */}
      {isColModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 animate-scale-up border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Novo Colaborador</h3>
                <p className="text-xs text-slate-400 mt-0.5">Cadastre o colaborador vinculando-o ao líder e setor correspondente.</p>
              </div>
              <button
                onClick={() => setIsColModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold text-lg"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateColaborador} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={newColNome}
                    onChange={(e) => setNewColNome(e.target.value)}
                    placeholder="Ex: Aline Meireles"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">E-mail Profissional</label>
                  <input
                    type="email"
                    required
                    value={newColEmail}
                    onChange={(e) => setNewColEmail(e.target.value)}
                    placeholder="Ex: aline@empresa.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Cargo</label>
                  <select
                    value={newColCargoId}
                    onChange={(e) => setNewColCargoId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 cursor-pointer"
                  >
                    {cargos.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Setor</label>
                  <select
                    value={newColSetorId}
                    onChange={(e) => setNewColSetorId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 cursor-pointer"
                  >
                    {setores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Líder Direto</label>
                  <select
                    value={newColLiderId}
                    onChange={(e) => setNewColLiderId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 cursor-pointer"
                  >
                    {lideres.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nome} ({l.cargo})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Cidade Base</label>
                  <input
                    type="text"
                    required
                    value={newCidadeBase}
                    onChange={(e) => setNewCidadeBase(e.target.value)}
                    placeholder="Ex: São Paulo - SP"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Data de Contratação / Admissão</label>
                  <input
                    type="date"
                    required
                    value={newColAdmissao}
                    onChange={(e) => setNewColAdmissao(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Empresa</label>
                  <select
                    value={newColEmpresaId}
                    onChange={(e) => setNewColEmpresaId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 cursor-pointer"
                  >
                    {empresas.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Seção de Planejamento de Avaliações */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-teal-500" />
                  Planejamento de Avaliações
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Prazo para Avaliação 180º</label>
                    <select
                      value={newPrazoAvaliacao180}
                      onChange={(e) => setNewPrazoAvaliacao180(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 cursor-pointer"
                    >
                      <option value={3}>3 meses</option>
                      <option value={6}>6 meses (Padrão)</option>
                      <option value={12}>12 meses</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Avaliação de Período de Experiência?</label>
                    <div className="flex items-center h-9">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newRealizarExperiencia}
                          onChange={(e) => setNewRealizarExperiencia(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-250 rounded-full peer peer-checked:bg-teal-500 relative after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white border border-slate-200"></div>
                        <span className="ml-2 text-xs font-medium text-slate-600">
                          {newRealizarExperiencia ? 'Sim (15, 30, 60 e 90 dias)' : 'Não realizar'}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Situação Inicial</label>
                  <select
                    value={newColSituacao}
                    onChange={(e) => setNewColSituacao(e.target.value as SituacaoColaborador)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 cursor-pointer"
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Em Acompanhamento">Em Acompanhamento</option>
                    <option value="Suspenso">Suspenso</option>
                    <option value="Desligado">Desligado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Telefone de Contato</label>
                  <input
                    type="text"
                    value={newColTelefone}
                    onChange={(e) => setNewColTelefone(e.target.value)}
                    placeholder="Ex: (11) 99999-9999"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Foto de Perfil</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={newColFotoUrl}
                      onChange={(e) => setNewColFotoUrl(e.target.value)}
                      placeholder="URL da imagem ou faça upload..."
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={isUploadingPhoto}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer border border-slate-250 transition shrink-0"
                    >
                      {isUploadingPhoto ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <Upload size={14} />
                      )}
                      {isUploadingPhoto ? 'Enviando...' : 'Carregar'}
                    </button>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleUploadPhoto}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsColModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 bg-slate-50 rounded-xl text-sm font-semibold hover:bg-slate-100 cursor-pointer transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-500 text-slate-950 font-bold rounded-xl text-sm hover:bg-teal-400 cursor-pointer shadow-md shadow-teal-500/10 transition"
                >
                  Salvar Colaborador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AUXILIARY ENTITY REGISTRATION MODAL */}
      {isAuxModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-scale-up border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-md font-bold text-slate-900">
                Cadastrar Novo {isAuxModalOpen === 'setor' ? 'Setor' : isAuxModalOpen === 'cargo' ? 'Cargo' : 'Líder'}
              </h3>
              <button
                onClick={() => setIsAuxModalOpen(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold text-lg"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateAux} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Nome do {isAuxModalOpen === 'setor' ? 'Setor' : isAuxModalOpen === 'cargo' ? 'Cargo' : 'Líder'}
                </label>
                <input
                  type="text"
                  required
                  value={auxNome}
                  onChange={(e) => setAuxNome(e.target.value)}
                  placeholder={`Ex: ${isAuxModalOpen === 'setor' ? 'Recursos Humanos' : isAuxModalOpen === 'cargo' ? 'Analista de Sistemas' : 'Renata Souza'}`}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              {isAuxModalOpen === 'lider' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    E-mail do Líder
                  </label>
                  <input
                    type="email"
                    value={auxEmail}
                    onChange={(e) => setAuxEmail(e.target.value)}
                    placeholder="Ex: renata.souza@empresa.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAuxModalOpen(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 bg-slate-50 rounded-xl text-sm font-semibold hover:bg-slate-100 cursor-pointer transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-500 text-slate-950 font-bold rounded-xl text-sm hover:bg-teal-400 cursor-pointer transition"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
