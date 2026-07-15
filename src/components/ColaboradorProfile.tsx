/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { DataService } from '../services/DataService';
import {
  Colaborador,
  TimelineRegistro,
  Setor,
  Cargo,
  Lider,
  Empresa,
  TipoRegistro,
  PrioridadeRegistro,
  StatusRegistro,
  Anexo,
  SituacaoColaborador,
} from '../types';
import {
  Calendar,
  Briefcase,
  Layers,
  User,
  Phone,
  Mail,
  ChevronLeft,
  FileText,
  AlertTriangle,
  Award,
  BookOpen,
  MessageSquare,
  ShieldAlert,
  ThumbsUp,
  Search,
  Upload,
  X,
  FileIcon,
  CheckCircle,
  PlusCircle,
  Clock,
  ExternalLink,
  MapPin,
  ClipboardList,
  RefreshCw,
} from 'lucide-react';

interface ColaboradorProfileProps {
  colaborador: Colaborador;
  timeline: TimelineRegistro[];
  setores: Setor[];
  cargos: Cargo[];
  lideres: Lider[];
  empresas: Empresa[];
  onBack: () => void;
  onUpdateColaborador: (col: Colaborador) => void;
  onAddTimelineRegistro: (reg: TimelineRegistro) => void;
}

export default function ColaboradorProfile({
  colaborador,
  timeline,
  setores,
  cargos,
  lideres,
  empresas,
  onBack,
  onUpdateColaborador,
  onAddTimelineRegistro,
}: ColaboradorProfileProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingAnexo, setIsUploadingAnexo] = useState(false);

  // Estados locais para filtros da timeline
  const [timelineSearch, setTimelineSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('Todos');

  // Controle de formulário para NOVO REGISTRO na Timeline
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [regTipo, setRegTipo] = useState<TipoRegistro>('Feedback Positivo');
  const [regTitulo, setRegTitulo] = useState('');
  const [regDescricao, setRegDescricao] = useState('');
  const [regData, setRegData] = useState(new Date().toISOString().split('T')[0]);
  const [regLiderId, setRegLiderId] = useState(colaborador.liderId);
  const [regPrioridade, setRegPrioridade] = useState<PrioridadeRegistro>('Média');
  const [regStatus, setRegStatus] = useState<StatusRegistro>('Concluído');
  const [regPrazo, setRegPrazo] = useState('');
  const [regGerarTarefa, setRegGerarTarefa] = useState(false);
  const [regAnexos, setRegAnexos] = useState<Anexo[]>([]);

  // Filtro de Drag and Drop
  const [isDragging, setIsDragging] = useState(false);

  // Dados auxiliares do colaborador
  const cargoNome = cargos.find((c) => c.id === colaborador.cargoId)?.nome || 'Não definido';
  const setorNome = setores.find((s) => s.id === colaborador.setorId)?.nome || 'Não definido';
  const empresaNome = empresas.find((e) => e.id === colaborador.empresaId)?.nome || 'Não definida';
  const liderObj = lideres.find((l) => l.id === colaborador.liderId);

  // Calcular tempo de empresa
  function calcularTempoEmpresa(dataAdmissaoStr: string): string {
    const admissao = new Date(dataAdmissaoStr);
    const hoje = new Date();

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

  // Filtrar timeline deste colaborador
  const timelineColaborador = timeline.filter((reg) => reg.colaboradorId === colaborador.id);

  // Aplicar busca e filtros
  const timelineFiltrada = timelineColaborador.filter((reg) => {
    const matchesSearch =
      reg.titulo.toLowerCase().includes(timelineSearch.toLowerCase()) ||
      reg.descricao.toLowerCase().includes(timelineSearch.toLowerCase());

    let matchesTipo = true;
    if (filterTipo === 'Feedbacks') {
      matchesTipo = reg.tipo.includes('Feedback');
    } else if (filterTipo === 'PDIs') {
      matchesTipo = reg.tipo === 'Plano de Desenvolvimento Individual (PDI)';
    } else if (filterTipo === 'Incidentes') {
      matchesTipo = reg.tipo === 'Advertência' || reg.tipo === 'Suspensão' || reg.tipo === 'Reclamação de Cliente';
    } else if (filterTipo === 'Elogios') {
      matchesTipo = reg.tipo === 'Elogio de Cliente' || reg.tipo === 'Reconhecimento';
    } else if (filterTipo !== 'Todos') {
      matchesTipo = reg.tipo === filterTipo;
    }

    return matchesSearch && matchesTipo;
  });

  // Alterar situação rápida do colaborador
  const handleChangeSituacao = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const novaSituacao = e.target.value as SituacaoColaborador;
    
    // Se mudar para Desligado, marcamos todas as avaliações como concluídas para limpar pendências
    const novasCompletas = novaSituacao === 'Desligado' 
      ? Array.from(new Set([...(colaborador.avaliacoesCompletas || []), '15', '30', '60', '90', '180']))
      : colaborador.avaliacoesCompletas;

    onUpdateColaborador({
      ...colaborador,
      situacao: novaSituacao,
      avaliacoesCompletas: novasCompletas,
    });
  };

  // Ícones dinâmicos por tipo de registro da timeline
  const getTimelineIcon = (tipo: TipoRegistro) => {
    switch (tipo) {
      case 'Feedback Positivo':
        return <ThumbsUp className="text-emerald-500" size={18} />;
      case 'Feedback Corretivo':
        return <MessageSquare className="text-orange-500" size={18} />;
      case 'Reconhecimento':
        return <Award className="text-amber-500" size={18} />;
      case 'Conversa Individual (1:1)':
        return <User className="text-blue-500" size={18} />;
      case 'Plano de Desenvolvimento Individual (PDI)':
        return <BookOpen className="text-indigo-500" size={18} />;
      case 'Advertência':
        return <AlertTriangle className="text-rose-500" size={18} />;
      case 'Suspensão':
        return <ShieldAlert className="text-rose-700" size={18} />;
      case 'Elogio de Cliente':
        return <ThumbsUp className="text-teal-500" size={18} />;
      case 'Reclamação de Cliente':
        return <AlertTriangle className="text-red-500" size={18} />;
      case 'Acompanhamento':
        return <ClipboardList className="text-sky-500" size={18} />;
      default:
        return <FileText className="text-slate-500" size={18} />;
    }
  };

  const getTimelineBadgeColor = (tipo: TipoRegistro) => {
    switch (tipo) {
      case 'Feedback Positivo':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Feedback Corretivo':
        return 'bg-orange-50 text-orange-700 border-orange-100';
      case 'Reconhecimento':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Conversa Individual (1:1)':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Plano de Desenvolvimento Individual (PDI)':
        return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case 'Advertência':
      case 'Suspensão':
      case 'Reclamação de Cliente':
        return 'bg-rose-50 text-rose-700 border-rose-100';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  // Tratar alteração da foto do colaborador
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const novaUrl = await DataService.uploadFile(file, 'Fotos Colaboradores', colaborador.nome);
      onUpdateColaborador({
        ...colaborador,
        fotoUrl: novaUrl
      });
    } catch (err) {
      console.error('Erro ao alterar foto do colaborador:', err);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Upload real para o Google Drive
  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return;

    setIsUploadingAnexo(true);
    try {
      const novosAnexos: Anexo[] = [];
      const folderName = regTipo === 'Plano de Desenvolvimento Individual (PDI)' ? 'documentos' : 'Anexos';

      for (const file of Array.from(files)) {
        try {
          const fileUrl = await DataService.uploadFile(file, folderName, colaborador.nome);

          let sizeFriendly = `${(file.size / 1024).toFixed(0)} KB`;
          if (file.size > 1024 * 1024) {
            sizeFriendly = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
          }

          let tipoFormatado = 'documento';
          if (file.type.startsWith('image/')) tipoFormatado = 'imagem';
          else if (file.type.includes('pdf')) tipoFormatado = 'pdf';
          else if (file.type.startsWith('audio/')) tipoFormatado = 'audio';
          else if (file.type.startsWith('video/')) tipoFormatado = 'video';
          else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.type.includes('excel') || file.type.includes('spreadsheet')) {
            tipoFormatado = 'excel';
          }

          novosAnexos.push({
            id: `anx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            nome: file.name,
            tipo: tipoFormatado,
            url: fileUrl,
            tamanho: sizeFriendly,
          });
        } catch (uploadError) {
          console.error(`Erro ao fazer upload de ${file.name}:`, uploadError);
        }
      }

      setRegAnexos((prev) => [...prev, ...novosAnexos]);
    } catch (err) {
      console.error('Erro no upload de arquivos:', err);
    } finally {
      setIsUploadingAnexo(false);
    }
  };

  const removeAnexo = (id: string) => {
    setRegAnexos((prev) => prev.filter((a) => a.id !== id));
  };

  // Tratar Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  // Submit Novo Registro
  const handleCreateRegistro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regTitulo || !regDescricao) return;

    const novoReg: TimelineRegistro = {
      id: `reg-${Date.now()}`,
      colaboradorId: colaborador.id,
      tipo: regTipo,
      data: regData,
      titulo: regTitulo,
      descricao: regDescricao,
      responsavelId: regLiderId,
      prioridade: regPrioridade,
      status: regStatus,
      prazoAcompanhamento: regPrazo || undefined,
      gerarTarefaFutura: regGerarTarefa,
      anexos: regAnexos,
    };

    onAddTimelineRegistro(novoReg);

    // Reset Form
    setIsFormOpen(false);
    setRegTitulo('');
    setRegDescricao('');
    setRegPrazo('');
    setRegGerarTarefa(false);
    setRegAnexos([]);
  };

  // Estatísticas de timeline rápidas
  const feedPositivosCount = timelineColaborador.filter((r) => r.tipo === 'Feedback Positivo').length;
  const feedCorretivosCount = timelineColaborador.filter((r) => r.tipo === 'Feedback Corretivo').length;
  const pdisCount = timelineColaborador.filter((r) => r.tipo === 'Plano de Desenvolvimento Individual (PDI)').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 animate-fade-in">
      {/* Back Button */}
      <div>
        <button
          id="btn-profile-back"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-800 cursor-pointer transition bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm"
        >
          <ChevronLeft size={16} />
          Voltar para Lista
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: CRM Dossier */}
        <div className="lg:col-span-4 bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm flex flex-col">
          {/* Aesthetic cover profile pattern */}
          <div className="h-28 bg-gradient-to-r from-teal-500/30 to-indigo-500/20 relative" />

          {/* Profile Card Main Body */}
          <div className="p-6 pt-0 relative -mt-12 flex flex-col items-center border-b border-slate-100">
            {/* Editable Profile Photo */}
            <div className="relative group/photo mb-3">
              <img
                src={colaborador.fotoUrl}
                alt={colaborador.nome}
                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md group-hover/photo:brightness-75 transition-all"
              />
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-slate-950/40 text-white rounded-full opacity-0 group-hover/photo:opacity-100 transition-opacity cursor-pointer duration-150"
                title="Alterar Foto de Perfil"
              >
                <Upload size={18} />
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>
            {isUploadingPhoto && (
              <span className="text-[10px] font-bold text-teal-600 animate-pulse mb-2">Atualizando foto...</span>
            )}
            <h2 className="text-xl font-extrabold text-slate-900 text-center tracking-tight">{colaborador.nome}</h2>
            <p className="text-xs text-slate-400 font-medium text-center">{colaborador.email}</p>

            {/* Quick Status Dropdown Selection */}
            <div className="mt-4 flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Situação:</span>
              <select
                id="profile-situacao-select"
                value={colaborador.situacao}
                onChange={handleChangeSituacao}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 cursor-pointer focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="Ativo">Ativo</option>
                <option value="Em Acompanhamento">Em Acompanhamento</option>
                <option value="Suspenso">Suspenso</option>
                <option value="Desligado">Desligado</option>
              </select>
            </div>
          </div>

          {/* Dossier Admin Information */}
          <div className="p-6 space-y-4 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ficha Cadastral</h3>

            <div className="space-y-3.5 text-sm text-slate-700">
              <div className="flex items-center gap-3">
                <div className="text-slate-400 shrink-0"><Briefcase size={16} /></div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">Cargo</p>
                  <p className="font-semibold text-slate-800 mt-0.5 truncate">{cargoNome}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-slate-400 shrink-0"><Layers size={16} /></div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">Setor</p>
                  <p className="font-semibold text-slate-800 mt-0.5 truncate">{setorNome}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-slate-400 shrink-0"><User size={16} /></div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">Líder Responsável</p>
                  {liderObj ? (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {liderObj.fotoUrl && (
                        <img
                          src={liderObj.fotoUrl}
                          alt={liderObj.nome}
                          className="w-5 h-5 rounded-full object-cover border border-slate-100"
                        />
                      )}
                      <p className="font-semibold text-slate-800 truncate">{liderObj.nome}</p>
                    </div>
                  ) : (
                    <p className="text-slate-500 font-semibold mt-0.5">Sem líder direto</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-slate-400 shrink-0"><Calendar size={16} /></div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">Admissão & Tempo</p>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {new Date(colaborador.dataAdmissao).toLocaleDateString('pt-BR')} &middot;{' '}
                    <span className="text-teal-600 font-bold">{calcularTempoEmpresa(colaborador.dataAdmissao)}</span>
                  </p>
                </div>
              </div>

              {colaborador.telefone && (
                <div className="flex items-center gap-3">
                  <div className="text-slate-400 shrink-0"><Phone size={16} /></div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">Telefone</p>
                    <p className="font-semibold text-slate-800 mt-0.5">{colaborador.telefone}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="text-slate-400 shrink-0"><MapPin size={16} /></div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">Empresa</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{empresaNome}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stat Blocks Indicators */}
          <div className="p-6 grid grid-cols-2 gap-3.5 bg-slate-50/50">
            <div className="bg-white p-3 border border-slate-100 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Registros</span>
              <span className="text-xl font-extrabold text-slate-950 block mt-0.5">{timelineColaborador.length}</span>
            </div>
            <div className="bg-white p-3 border border-slate-100 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Feedbacks (+)</span>
              <span className="text-xl font-extrabold text-emerald-600 block mt-0.5">{feedPositivosCount}</span>
            </div>
            <div className="bg-white p-3 border border-slate-100 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Feedbacks (-)</span>
              <span className="text-xl font-extrabold text-orange-600 block mt-0.5">{feedCorretivosCount}</span>
            </div>
            <div className="bg-white p-3 border border-slate-100 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Planos (PDI)</span>
              <span className="text-xl font-extrabold text-indigo-600 block mt-0.5">{pdisCount}</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Timeline & Registry Creation */}
        <div className="lg:col-span-8 space-y-6">
          {/* Timeline Action Bar */}
          <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Quick search timeline */}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                id="search-timeline"
                type="text"
                placeholder="Pesquisar nos históricos..."
                value={timelineSearch}
                onChange={(e) => setTimelineSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
              />
            </div>

            {/* Quick category filter tabs */}
            <div className="flex flex-wrap gap-1.5">
              {['Todos', 'Feedbacks', 'PDIs', 'Incidentes', 'Elogios'].map((item) => (
                <button
                  key={item}
                  onClick={() => setFilterTipo(item)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition ${
                    filterTipo === item
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            {/* Add timeline entry button */}
            <button
              id="btn-open-timeline-form"
              onClick={() => setIsFormOpen(!isFormOpen)}
              className="flex items-center gap-1 px-4 py-1.5 bg-teal-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-teal-400 cursor-pointer transition shadow-sm"
            >
              <PlusCircle size={14} />
              Novo Registro
            </button>
          </div>

          {/* INLINE COLLAPSIBLE FORM: ADD TIMELINE ENTRY */}
          {isFormOpen && (
            <div className="bg-white border border-teal-100 rounded-3xl p-6 shadow-md animate-slide-down space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-extrabold text-slate-900">Adicionar Histórico à Timeline</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Este registro formará a timeline cronológica oficial do colaborador.</p>
                </div>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                >
                  Fechar &times;
                </button>
              </div>

              <form onSubmit={handleCreateRegistro} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tipo de Registro</label>
                    <select
                      value={regTipo}
                      onChange={(e) => setRegTipo(e.target.value as TipoRegistro)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                    >
                      <option value="Feedback Positivo">Feedback Positivo</option>
                      <option value="Feedback Corretivo">Feedback Corretivo</option>
                      <option value="Reconhecimento">Reconhecimento</option>
                      <option value="Conversa Individual (1:1)">Conversa Individual (1:1)</option>
                      <option value="Plano de Desenvolvimento Individual (PDI)">Plano de Desenvolvimento Individual (PDI)</option>
                      <option value="Advertência">Advertência</option>
                      <option value="Suspensão">Suspensão</option>
                      <option value="Elogio de Cliente">Elogio de Cliente</option>
                      <option value="Reclamação de Cliente">Reclamação de Cliente</option>
                      <option value="Observação Geral">Observação Geral</option>
                      <option value="Acompanhamento">Acompanhamento</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Data do Acontecimento</label>
                    <input
                      type="date"
                      required
                      value={regData}
                      onChange={(e) => setRegData(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Título / Tópico Curto</label>
                    <input
                      type="text"
                      required
                      value={regTitulo}
                      onChange={(e) => setRegTitulo(e.target.value)}
                      placeholder="Ex: Entrega do Projeto ou Alinhamento 1:1"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Líder Aplicador / Responsável</label>
                    <select
                      value={regLiderId}
                      onChange={(e) => setRegLiderId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                    >
                      {lideres.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.nome} ({l.cargo})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Descrição Detalhada do Registro</label>
                  <textarea
                    required
                    rows={4}
                    value={regDescricao}
                    onChange={(e) => setRegDescricao(e.target.value)}
                    placeholder="Escreva as anotações, combinados, planos acertados ou observações detalhadas aqui..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Prioridade / Criticidade</label>
                    <select
                      value={regPrioridade}
                      onChange={(e) => setRegPrioridade(e.target.value as PrioridadeRegistro)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                    >
                      <option value="Baixa">Baixa</option>
                      <option value="Média">Média</option>
                      <option value="Alta">Alta</option>
                      <option value="Crítica">Crítica</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Situação Atual</label>
                    <select
                      value={regStatus}
                      onChange={(e) => setRegStatus(e.target.value as StatusRegistro)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                    >
                      <option value="Concluído">Concluído</option>
                      <option value="Em Andamento">Em Andamento</option>
                      <option value="Pendente">Pendente</option>
                      <option value="Atrasado">Atrasado</option>
                      <option value="Cancelado">Cancelado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Prazo de Acompanhamento (Opcional)</label>
                    <input
                      type="date"
                      value={regPrazo}
                      onChange={(e) => setRegPrazo(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Checklist toggle to Auto-generate Task */}
                <div className="bg-slate-50 p-3.5 rounded-2xl flex items-center gap-3 border border-slate-100">
                  <input
                    type="checkbox"
                    id="chk-gerar-tarefa"
                    checked={regGerarTarefa}
                    onChange={(e) => setRegGerarTarefa(e.target.checked)}
                    className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500 cursor-pointer"
                  />
                  <label htmlFor="chk-gerar-tarefa" className="text-xs text-slate-600 font-semibold cursor-pointer">
                    Gerar tarefa futura de acompanhamento para o líder na lista de tarefas automaticamente.
                  </label>
                </div>

                {/* SUPABASE STORAGE: FILE UPLOAD ZONE */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Anexar Arquivos (Imagens, PDFs, Áudios, Vídeos)
                  </label>

                  {/* Drag and Drop Zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => !isUploadingAnexo && fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition ${
                      isDragging
                        ? 'border-teal-500 bg-teal-50/20'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100/50 hover:border-slate-300'
                    } ${isUploadingAnexo ? 'pointer-events-none opacity-60' : ''}`}
                  >
                    {isUploadingAnexo ? (
                      <>
                        <RefreshCw size={24} className="text-teal-500 mb-1.5 animate-spin" />
                        <p className="text-xs font-bold text-teal-600 animate-pulse">Enviando arquivos ao Google Drive...</p>
                        <p className="text-[10px] text-slate-400 mt-1">Sempre criando uma subpasta organizada para o colaborador</p>
                      </>
                    ) : (
                      <>
                        <Upload size={24} className="text-slate-400 mb-1.5" />
                        <p className="text-xs font-semibold text-slate-700">Arrastar arquivos aqui ou clicar para selecionar</p>
                        <p className="text-[10px] text-slate-400 mt-1">Imagens, PDFs, Planilhas Excel ou Vídeos</p>
                      </>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={(e) => handleFileUpload(e.target.files)}
                      className="hidden"
                    />
                  </div>

                  {/* Attachment List */}
                  {regAnexos.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1.5">
                      {regAnexos.map((anx) => (
                        <div
                          key={anx.id}
                          className="bg-white border border-slate-100 rounded-xl p-2 px-3 flex items-center justify-between gap-3 shadow-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileIcon size={14} className="text-slate-400 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate leading-tight">{anx.nome}</p>
                              <p className="text-[10px] text-slate-400">{anx.tamanho}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAnexo(anx.id)}
                            className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold shrink-0 p-1"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Form Buttons */}
                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 bg-slate-50 rounded-xl text-xs font-semibold hover:bg-slate-100 cursor-pointer transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-teal-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-teal-400 cursor-pointer transition"
                  >
                    Lançar no Histórico
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* CHRONOLOGICAL TIMELINE STREAM */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 pl-1.5">
              <span>Linha do Tempo Cronológica</span>
              <span className="bg-slate-100 text-slate-600 font-semibold text-xs px-2 py-0.5 rounded-full">
                {timelineFiltrada.length}
              </span>
            </h3>

            <div className="relative before:absolute before:left-6 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-150 space-y-6">
              {timelineFiltrada.length === 0 ? (
                <div className="bg-white border border-slate-100 p-12 rounded-3xl text-center text-slate-400 shadow-xs">
                  <ClipboardList className="mx-auto text-slate-300 mb-2" size={36} />
                  <p className="text-sm font-semibold text-slate-500">Nenhum registro encontrado nesta linha do tempo</p>
                  <p className="text-xs mt-1">Experimente remover os termos de busca ou filtros de tipo.</p>
                </div>
              ) : (
                timelineFiltrada.map((reg) => {
                  const appliedLider = lideres.find((l) => l.id === reg.responsavelId);
                  const hoje = new Date();
                  const isOverdue = reg.status !== 'Concluído' && reg.prazoAcompanhamento && new Date(reg.prazoAcompanhamento) < hoje;

                  return (
                    <div key={reg.id} className="flex gap-4 items-start relative group">
                      {/* Timeline Node Icon Circle */}
                      <div className="relative z-10 w-12 h-12 rounded-2xl bg-white border border-slate-150 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-all">
                        {getTimelineIcon(reg.tipo)}
                      </div>

                      {/* Timeline Registry Content Card */}
                      <div className="flex-1 bg-white border border-slate-100 p-5 rounded-2xl shadow-xs hover:shadow-md transition duration-150 space-y-3">
                        {/* Header Details */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-50 pb-2.5">
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-md border uppercase ${getTimelineBadgeColor(reg.tipo)}`}>
                                {reg.tipo}
                              </span>
                              {reg.prioridade && (
                                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase ${
                                  reg.prioridade === 'Crítica' || reg.prioridade === 'Alta'
                                    ? 'bg-rose-50 text-rose-700 font-bold'
                                    : 'bg-slate-50 text-slate-500'
                                }`}>
                                  {reg.prioridade}
                                </span>
                              )}
                            </div>
                            <h4 className="text-md font-extrabold text-slate-900 mt-1">{reg.titulo}</h4>
                          </div>

                          <div className="text-right sm:text-right">
                            <span className="text-xs text-slate-400 font-semibold block">
                              {new Date(reg.data).toLocaleDateString('pt-BR')}
                            </span>
                            <span className={`inline-block text-[10px] font-semibold mt-0.5 px-1.5 py-0.5 rounded-md ${
                              reg.status === 'Concluído'
                                ? 'bg-emerald-50 text-emerald-700'
                                : reg.status === 'Em Andamento'
                                ? 'bg-orange-50 text-orange-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {reg.status}
                            </span>
                          </div>
                        </div>

                        {/* Description Text */}
                        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{reg.descricao}</p>

                        {/* Anexos (File Attachments) */}
                        {reg.anexos && reg.anexos.length > 0 && (
                          <div className="pt-2">
                            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Anexos Vinculados (Storage)</p>
                            <div className="flex flex-wrap gap-2">
                              {reg.anexos.map((anx) => (
                                <a
                                  key={anx.id}
                                  href={anx.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 px-3 py-1.5 rounded-xl text-xs text-slate-700 font-semibold transition"
                                >
                                  <FileText size={12} className="text-slate-400 shrink-0" />
                                  <span className="truncate max-w-[150px]">{anx.nome}</span>
                                  <span className="text-[9px] text-slate-400 shrink-0">{anx.tamanho}</span>
                                  <ExternalLink size={10} className="text-slate-400 shrink-0" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Footer Details (Lider applied + Deadlines) */}
                        <div className="pt-2 border-t border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-slate-500">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aplicado por:</span>
                            {appliedLider && (
                              <div className="flex items-center gap-1.5">
                                {appliedLider.fotoUrl && (
                                  <img
                                    src={appliedLider.fotoUrl}
                                    alt={appliedLider.nome}
                                    className="w-5 h-5 rounded-full object-cover border border-slate-100"
                                  />
                                )}
                                <span className="font-semibold text-slate-700">{appliedLider.nome}</span>
                              </div>
                            )}
                          </div>

                          {reg.prazoAcompanhamento && (
                            <div className="flex items-center gap-1.5 font-medium">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prazo de Feedback:</span>
                              <span className={`font-semibold ${
                                isOverdue ? 'text-rose-600 font-extrabold bg-rose-50 px-1.5 py-0.5 rounded' : 'text-slate-700'
                              }`}>
                                {new Date(reg.prazoAcompanhamento).toLocaleDateString('pt-BR')}
                                {isOverdue && ' (Atrasado!)'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
