/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  ItemLinhaTempo,
  TimelineRegistro,
  Documento,
  Reconhecimento,
  Tarefa,
  ConfiguracaoReconhecimento,
  ResumoLinhaTempo,
} from '../types';
import {
  construirLinhaTempo,
  exportarPDF,
  exportarCSV,
  gerarCSV,
  gerarHTMLParaPDF,
  gerarHTMLParaResumo,
} from '../utils/exportUtils';
import { DataService } from '../services/DataService';
import { atualizarResumoTimeline } from '../services/ResumoTimelineService';
import {
  Clock,
  FileText,
  Download,
  Printer,
  FileSpreadsheet,
  Calendar,
  Filter,
  Search,
  ChevronDown,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

interface LinhaDoTempoInteligenteProps {
  registros: TimelineRegistro[];
  documentos: Documento[];
  reconhecimentos: Reconhecimento[];
  tarefas: Tarefa[];
  configReconhecimento: ConfiguracaoReconhecimento;
  colaboradorNome: string;
  colaboradorId?: string;
  currentUserId?: string;
}

const ICONES_TIPO: Record<string, string> = {
  registro: '📋',
  documento: '📄',
  reconhecimento: '🏆',
  tarefa: '✅',
  meta: '🎯',
  avaliacao: '📊',
};

const CORES_TIPO: Record<string, string> = {
  registro: '#3b82f6',
  documento: '#f59e0b',
  reconhecimento: '#eab308',
  tarefa: '#22c55e',
  meta: '#8b5cf6',
  avaliacao: '#06b6d4',
};

export default function LinhaDoTempoInteligente({
  registros,
  documentos,
  reconhecimentos,
  tarefas,
  configReconhecimento,
  colaboradorNome,
  colaboradorId,
  currentUserId,
}: LinhaDoTempoInteligenteProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [showExportMenu, setShowExportMenu] = useState(false);

  // ── Resumo Inteligente (IA, incremental) ──────────────────────────────
  const [resumo, setResumo] = useState<ResumoLinhaTempo | undefined>(undefined);
  const [carregandoResumo, setCarregandoResumo] = useState(false);
  const [atualizandoResumo, setAtualizandoResumo] = useState(false);
  const [mensagemResumo, setMensagemResumo] = useState<string | null>(null);

  // Filtrar registros por colaborador se ID for fornecido
  const registrosFiltrados = useMemo(() => {
    if (!colaboradorId) return registros;
    return registros.filter(r => r.colaboradorId === colaboradorId);
  }, [registros, colaboradorId]);

  const documentosFiltrados = useMemo(() => {
    if (!colaboradorId) return documentos;
    return documentos.filter(d => d.colaboradorId === colaboradorId);
  }, [documentos, colaboradorId]);

  const reconhecimentosFiltrados = useMemo(() => {
    if (!colaboradorId) return reconhecimentos;
    return reconhecimentos.filter(r => r.colaboradorId === colaboradorId);
  }, [reconhecimentos, colaboradorId]);

  const tarefasFiltradas = useMemo(() => {
    if (!colaboradorId) return tarefas;
    return tarefas.filter(t => t.colaboradorId === colaboradorId);
  }, [tarefas, colaboradorId]);

  // Construir linha do tempo
  const linhaTempo = useMemo(() => {
    return construirLinhaTempo(
      registrosFiltrados,
      documentosFiltrados,
      reconhecimentosFiltrados,
      tarefasFiltradas,
      configReconhecimento
    );
  }, [registrosFiltrados, documentosFiltrados, reconhecimentosFiltrados, tarefasFiltradas, configReconhecimento]);

  // Carrega o resumo já salvo (se existir) assim que soubermos de qual
  // colaborador se trata — nunca dispara sozinho uma chamada de IA, só lê o
  // que já está gravado.
  useEffect(() => {
    if (!colaboradorId) return;
    setCarregandoResumo(true);
    DataService.getResumoLinhaTempo(colaboradorId)
      .then(setResumo)
      .finally(() => setCarregandoResumo(false));
  }, [colaboradorId]);

  // Eventos ainda não incorporados ao resumo salvo — SEMPRE contra a linha do
  // tempo completa (nunca a filtrada por busca/tipo), já que o resumo
  // representa o histórico real, não a visão momentânea da tela.
  const eventosNovosPendentes = useMemo(() => {
    const ultimaData = resumo?.ultimaDataProcessada ? new Date(resumo.ultimaDataProcessada).getTime() : 0;
    return linhaTempo.filter((item) => new Date(item.data).getTime() > ultimaData);
  }, [linhaTempo, resumo]);

  const handleAtualizarResumo = async () => {
    if (!colaboradorId) return;
    setMensagemResumo(null);
    if (eventosNovosPendentes.length === 0) {
      setMensagemResumo(resumo ? 'O resumo já está em dia — nada novo desde a última atualização.' : 'Ainda não há nenhum evento para resumir.');
      return;
    }
    setAtualizandoResumo(true);
    try {
      const novoTexto = await atualizarResumoTimeline(
        colaboradorNome,
        resumo?.resumoTexto || '',
        eventosNovosPendentes.map((item) => ({
          data: item.data,
          tipo: item.tipo,
          titulo: item.titulo,
          descricao: item.descricao,
        }))
      );
      const maiorData = linhaTempo.reduce(
        (max, item) => (new Date(item.data).getTime() > new Date(max).getTime() ? item.data : max),
        resumo?.ultimaDataProcessada || linhaTempo[0]?.data || new Date().toISOString()
      );
      const resumoAtualizado: ResumoLinhaTempo = {
        colaboradorId,
        resumoTexto: novoTexto,
        ultimaDataProcessada: maiorData,
        totalEventosProcessados: linhaTempo.length,
        atualizadoEm: new Date().toISOString(),
        atualizadoPor: currentUserId || '',
      };
      await DataService.saveResumoLinhaTempo(resumoAtualizado);
      setResumo(resumoAtualizado);
    } catch (e: any) {
      setMensagemResumo(e?.message || 'Não consegui atualizar o resumo agora. Tente novamente em instantes.');
    } finally {
      setAtualizandoResumo(false);
    }
  };

  const handleExportResumo = () => {
    if (!resumo) return;
    const html = gerarHTMLParaResumo(resumo.resumoTexto, colaboradorNome, resumo.atualizadoEm);
    exportarPDF(html, `resumo-${colaboradorNome.replace(/\s+/g, '-').toLowerCase()}`);
    setShowExportMenu(false);
  };

  // Filtrar por busca e tipo
  const linhaTempoFiltrada = useMemo(() => {
    return linhaTempo.filter(item => {
      const matchesSearch =
        item.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.descricao.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTipo = filterTipo === 'todos' || item.tipo === filterTipo;
      return matchesSearch && matchesTipo;
    });
  }, [linhaTempo, searchTerm, filterTipo]);

  // Agrupar por mês
  const itensPorMes = useMemo(() => {
    const grupos: Record<string, ItemLinhaTempo[]> = {};
    linhaTempoFiltrada.forEach(item => {
      const date = new Date(item.data);
      const mesKey = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      if (!grupos[mesKey]) {
        grupos[mesKey] = [];
      }
      grupos[mesKey].push(item);
    });
    return grupos;
  }, [linhaTempoFiltrada]);

  const handleExportPDF = () => {
    const html = gerarHTMLParaPDF(linhaTempoFiltrada, colaboradorNome);
    exportarPDF(html, `historico-${colaboradorNome.replace(/\s+/g, '-').toLowerCase()}`);
    setShowExportMenu(false);
  };

  const handleExportCSV = () => {
    const csv = gerarCSV(linhaTempoFiltrada, colaboradorNome);
    exportarCSV(csv, `historico-${colaboradorNome.replace(/\s+/g, '-').toLowerCase()}`);
    setShowExportMenu(false);
  };

  const stats = useMemo(() => ({
    total: linhaTempo.length,
    registros: linhaTempo.filter(i => i.tipo === 'registro').length,
    documentos: linhaTempo.filter(i => i.tipo === 'documento').length,
    reconhecimentos: linhaTempo.filter(i => i.tipo === 'reconhecimento').length,
    tarefas: linhaTempo.filter(i => i.tipo === 'tarefa').length,
  }), [linhaTempo]);

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <Clock size={20} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Linha do Tempo Inteligente</h3>
            <p className="text-xs text-slate-500">{stats.total} eventos registrados</p>
          </div>
        </div>

        {/* Menu de Exportação */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-200 transition cursor-pointer"
          >
            <Download size={16} />
            Exportar
            <ChevronDown size={14} />
          </button>

          {showExportMenu && (
            <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-10 overflow-hidden min-w-[180px]">
              <button
                onClick={handleExportPDF}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition cursor-pointer text-left"
              >
                <Printer size={16} className="text-rose-500" />
                <span className="text-sm font-semibold text-slate-700">Exportar PDF</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition cursor-pointer text-left border-t border-slate-100"
              >
                <FileSpreadsheet size={16} className="text-emerald-500" />
                <span className="text-sm font-semibold text-slate-700">Exportar Excel</span>
              </button>
              <button
                onClick={handleExportResumo}
                disabled={!resumo}
                title={resumo ? undefined : 'Gere o Resumo Inteligente primeiro'}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition cursor-pointer text-left border-t border-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Sparkles size={16} className="text-indigo-500" />
                <span className="text-sm font-semibold text-slate-700">Exportar Resumo (IA)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Resumo Inteligente — só atualiza com clique explícito (nunca automático,
          para nunca gastar tokens de IA sem o usuário pedir), e sempre de forma
          incremental (só os eventos novos desde a última atualização). */}
      {colaboradorId && (
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 mb-6">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-indigo-500 shrink-0" />
              <h4 className="text-sm font-bold text-slate-800">Resumo Inteligente</h4>
            </div>
            <button
              onClick={handleAtualizarResumo}
              disabled={atualizandoResumo || carregandoResumo}
              className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-100 rounded-lg px-3 py-1.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={12} className={atualizandoResumo ? 'animate-spin' : ''} />
              {atualizandoResumo ? 'Atualizando...' : 'Atualizar Resumo'}
            </button>
          </div>

          {carregandoResumo ? (
            <p className="text-xs text-slate-400">Carregando...</p>
          ) : resumo ? (
            <>
              <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{resumo.resumoTexto}</p>
              <p className="text-[10px] text-slate-400 mt-2">
                Atualizado em {new Date(resumo.atualizadoEm).toLocaleString('pt-BR')}
                {eventosNovosPendentes.length > 0 && ` · ${eventosNovosPendentes.length} evento(s) novo(s) ainda não incorporado(s)`}
              </p>
            </>
          ) : (
            <p className="text-xs text-slate-500">
              Ainda não há um resumo gerado. Clique em "Atualizar Resumo" para gerar o primeiro, a partir do histórico completo — só será reprocessado do zero desta vez; as próximas atualizações incorporam só o que for novo.
            </p>
          )}

          {mensagemResumo && <p className="text-xs text-indigo-700 mt-2">{mensagemResumo}</p>}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-5 gap-2 mb-6">
        <div className="bg-slate-50 rounded-xl p-3 text-center">
          <p className="text-lg font-extrabold text-slate-800">{stats.registros}</p>
          <p className="text-xs text-slate-500">Registros</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 text-center">
          <p className="text-lg font-extrabold text-amber-700">{stats.documentos}</p>
          <p className="text-xs text-amber-600">Documentos</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-3 text-center">
          <p className="text-lg font-extrabold text-yellow-700">{stats.reconhecimentos}</p>
          <p className="text-xs text-yellow-600">Reconhecimentos</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3 text-center">
          <p className="text-lg font-extrabold text-emerald-700">{stats.tarefas}</p>
          <p className="text-xs text-emerald-600">Tarefas</p>
        </div>
        <div className="bg-indigo-50 rounded-xl p-3 text-center">
          <p className="text-lg font-extrabold text-indigo-700">{stats.total}</p>
          <p className="text-xs text-indigo-600">Total</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar na linha do tempo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-400" />
          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none cursor-pointer"
          >
            <option value="todos">Todos os tipos</option>
            <option value="registro">Registros</option>
            <option value="documento">Documentos</option>
            <option value="reconhecimento">Reconhecimentos</option>
            <option value="tarefa">Tarefas</option>
          </select>
        </div>
      </div>

      {/* Timeline */}
      {Object.keys(itensPorMes).length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
          <Clock size={48} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-semibold">Nenhum evento encontrado</p>
          <p className="text-xs text-slate-400 mt-1">
            {searchTerm || filterTipo !== 'todos'
              ? 'Tente ajustar os filtros de busca'
              : 'Registre interações para visualizar a linha do tempo'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {(Object.entries(itensPorMes) as [string, ItemLinhaTempo[]][]).map(([mes, itens]) => (
            <div key={mes}>
              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Calendar size={14} />
                {mes}
              </h4>
              <div className="relative pl-6 border-l-2 border-slate-100 space-y-4">
                {itens.map((item) => (
                  <div key={item.id} className="relative">
                    {/* Indicador na linha */}
                    <div
                      className="absolute -left-[29px] w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-xs"
                      style={{ backgroundColor: CORES_TIPO[item.tipo] }}
                    >
                      <span className="text-white">{ICONES_TIPO[item.tipo]}</span>
                    </div>

                    <div className="bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl p-4 transition">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h5 className="font-bold text-slate-800">{item.titulo}</h5>
                          <p className="text-sm text-slate-500 mt-1">{item.descricao}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-slate-400">
                              {new Date(item.data).toLocaleDateString('pt-BR')}
                            </span>
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-semibold"
                              style={{
                                backgroundColor: `${CORES_TIPO[item.tipo]}20`,
                                color: CORES_TIPO[item.tipo],
                              }}
                            >
                              {item.tipo.charAt(0).toUpperCase() + item.tipo.slice(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Click outside para fechar menu */}
      {showExportMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowExportMenu(false)}
        />
      )}
    </div>
  );
}
