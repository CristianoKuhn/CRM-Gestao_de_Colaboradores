/**
 * RelatorioFerias — Gestão360
 *
 * Painel analítico de planejamento de férias.
 * Filtros: Ano, Semestre (1º / 2º / Ano todo), Setor, Status.
 * Exportação: PDF via window.print() e Excel via SheetJS (client-side).
 */

import React, { useMemo, useState } from 'react';
import { Colaborador, Ferias, Setor, PeriodoAquisitivo } from '../types';
import { Download, FileText, Filter, TrendingUp, Users, Calendar } from 'lucide-react';

interface RelatorioFeriasProps {
  colaboradores: Colaborador[];
  ferias: Ferias[];
  setores: Setor[];
  periodosAquisitivos: PeriodoAquisitivo[];
}

type Semestre = 'todos' | '1sem' | '2sem';

interface LinhaRelatorio {
  colaborador: Colaborador;
  setor: Setor | undefined;
  periodo: string;             // ex.: "2025/2026"
  concessaoInicio: Date;
  concessaoFim: Date;
  dias: number;
  status: string;
  limiteGozo: Date;
  foraDoPrazo: boolean;
}

// Normaliza string ISO para Date sem bug de timezone
const parseData = (s: string | undefined): Date | null => {
  if (!s) return null;
  const norm = s.replace(/T00:00:00$/, 'T12:00:00');
  const comHora = norm.match(/^\d{4}-\d{2}-\d{2}$/) ? norm + 'T12:00:00' : norm;
  const d = new Date(comHora);
  return isNaN(d.getTime()) ? null : d;
};

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export default function RelatorioFerias({
  colaboradores, ferias, setores, periodosAquisitivos,
}: RelatorioFeriasProps) {
  const anoAtual = new Date().getFullYear();
  const [filtroAno, setFiltroAno] = useState(anoAtual + 1);
  const [filtroSemestre, setFiltroSemestre] = useState<Semestre>('todos');
  const [filtroSetor, setFiltroSetor] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'planejada' | 'concluida'>('todos');
  const [exportando, setExportando] = useState(false);

  // Construir linhas do relatório
  const linhas: LinhaRelatorio[] = useMemo(() => {
    return ferias
      .filter(f => {
        if (f.status !== 'planejada' && f.status !== 'concluida' && f.status !== 'em_gozo') return false;
        const ini = parseData(f.dataInicio);
        if (!ini) return false;
        // Filtro de ano — considera o ano de início da concessão
        if (ini.getFullYear() !== filtroAno) return false;
        // Filtro de semestre
        const mes = ini.getMonth(); // 0-11
        if (filtroSemestre === '1sem' && mes > 5) return false;
        if (filtroSemestre === '2sem' && mes < 6) return false;
        return true;
      })
      .map(f => {
        const col = colaboradores.find(c => c.id === f.colaboradorId);
        if (!col) return null;
        // Filtro de setor
        if (filtroSetor && col.setorId !== filtroSetor) return null;
        // Filtro de status
        if (filtroStatus !== 'todos' && f.status !== filtroStatus) return null;

        const setor = setores.find(s => s.id === col.setorId);
        const ini = parseData(f.dataInicio)!;
        const fim = parseData(f.dataFim) || new Date(ini.getTime() + (f.dias - 1) * 86400000);

        // Calcular limiteGozo a partir do PeriodoAquisitivo
        const perDb = periodosAquisitivos.find(p => p.id === f.periodoAquisitivoId);
        let limiteGozo = fim;
        if (perDb) {
          const fimPA = parseData(perDb.dataFim);
          if (fimPA) {
            limiteGozo = new Date(fimPA);
            limiteGozo.setFullYear(limiteGozo.getFullYear() + 1);
          }
        }

        // Período aquisitivo como string
        let periodo = '—';
        if (perDb) {
          const pIni = parseData(perDb.dataInicio);
          const pFim = parseData(perDb.dataFim);
          if (pIni && pFim) {
            periodo = `${pIni.getFullYear()}/${pFim.getFullYear()}`;
          }
        }

        return {
          colaborador: col, setor, periodo,
          concessaoInicio: ini, concessaoFim: fim,
          dias: f.dias, status: f.status,
          limiteGozo, foraDoPrazo: ini > limiteGozo,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a!.concessaoInicio.getTime() - b!.concessaoInicio.getTime()) as LinhaRelatorio[];
  }, [ferias, colaboradores, setores, periodosAquisitivos, filtroAno, filtroSemestre, filtroSetor, filtroStatus]);

  // ── Indicadores resumo ─────────────────────────────────────────────────
  const totalColaboradores = new Set(linhas.map(l => l.colaborador.id)).size;
  const totalDias = linhas.reduce((a, l) => a + l.dias, 0);
  const totalForaDoPrazo = linhas.filter(l => l.foraDoPrazo).length;
  const porMes = Array.from({ length: 12 }, (_, m) => ({
    mes: MESES[m],
    qtd: linhas.filter(l => l.concessaoInicio.getMonth() === m).length,
  }));

  // ── Exportar Excel via CSV (abre direto no Excel sem dependência) ────────
  const exportarExcel = () => {
    setExportando(true);
    try {
      // BOM para Excel reconhecer UTF-8
      const BOM = '\uFEFF';
      const sep = ';'; // ponto-e-vírgula é padrão BR no Excel

      const cabecalho = ['Colaborador','Setor','Período Aquisitivo','Concessão Início','Concessão Fim','Dias','Status','Limite Gozo','Obs.'].join(sep);
      const dados = linhas.map(l => [
        `"${l.colaborador.nome}"`,
        `"${l.setor?.nome || '—'}"`,
        l.periodo,
        l.concessaoInicio.toLocaleDateString('pt-BR'),
        l.concessaoFim.toLocaleDateString('pt-BR'),
        l.dias,
        l.status === 'planejada' ? 'Planejado' : l.status === 'concluida' ? 'Concluído' : 'Em Gozo',
        l.limiteGozo.toLocaleDateString('pt-BR'),
        l.foraDoPrazo ? 'Fora do prazo' : '',
      ].join(sep));

      // Linha de totais
      dados.push('');
      dados.push([`"Total colaboradores: ${totalColaboradores}"`,`"Concessões: ${linhas.length}"`,`"Dias totais: ${totalDias}"`,'','','','','',''].join(sep));

      const csv = BOM + [cabecalho, ...dados].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Planejamento_Ferias_${filtroAno}${filtroSemestre !== 'todos' ? '_' + filtroSemestre : ''}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Erro ao exportar:', e);
    } finally {
      setExportando(false);
    }
  };

  // ── Exportar PDF via window.print() ───────────────────────────────────
  const exportarPDF = () => {
    window.print();
  };

  const labelSemestre = filtroSemestre === '1sem' ? '1º Semestre' : filtroSemestre === '2sem' ? '2º Semestre' : 'Ano todo';

  return (
    <>
      {/* CSS de impressão — só esta seção */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #relatorio-ferias-print { display: block !important; font-size: 10px; }
          #relatorio-ferias-print table { width: 100%; border-collapse: collapse; }
          #relatorio-ferias-print th, #relatorio-ferias-print td { border: 1px solid #cbd5e1; padding: 4px 8px; }
          #relatorio-ferias-print th { background: #f1f5f9; font-weight: 700; }
          .no-print { display: none !important; }
          @page { margin: 1.5cm; size: A4 landscape; }
        }
      `}</style>

      {/* Versão de impressão */}
      <div id="relatorio-ferias-print" style={{ display: 'none' }}>
        <h1 style={{ fontSize: 16, marginBottom: 4 }}>Planejamento de Férias — {filtroAno}</h1>
        <p style={{ fontSize: 10, color: '#64748b', marginBottom: 12 }}>
          {labelSemestre} {filtroSetor ? `· ${setores.find(s=>s.id===filtroSetor)?.nome}` : ''} ·
          Gerado em {new Date().toLocaleDateString('pt-BR')}
        </p>
        <table>
          <thead>
            <tr>
              {['Colaborador','Setor','Período Aquisitivo','Concessão Início','Concessão Fim','Dias','Status','Limite Gozo'].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l, i) => (
              <tr key={i} style={{ background: l.foraDoPrazo ? '#fef2f2' : i%2===0 ? '#fff' : '#f8fafc' }}>
                <td>{l.colaborador.nome}</td>
                <td>{l.setor?.nome || '—'}</td>
                <td>{l.periodo}</td>
                <td>{l.concessaoInicio.toLocaleDateString('pt-BR')}</td>
                <td>{l.concessaoFim.toLocaleDateString('pt-BR')}</td>
                <td style={{ textAlign: 'center' }}>{l.dias}</td>
                <td>{l.status === 'planejada' ? 'Planejado' : 'Concluído'}{l.foraDoPrazo ? ' ⚠️' : ''}</td>
                <td>{l.limiteGozo.toLocaleDateString('pt-BR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 12, fontSize: 10, color: '#64748b' }}>
          Total: {linhas.length} concessões · {totalColaboradores} colaboradores · {totalDias} dias
          {totalForaDoPrazo > 0 ? ` · ⚠️ ${totalForaDoPrazo} fora do prazo` : ''}
        </div>
      </div>

      {/* UI interativa */}
      <div className="space-y-5 no-print">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-start gap-3">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <TrendingUp size={18} className="text-teal-500" />
              Painel Analítico de Férias
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Visão consolidada das concessões planejadas por período. Use para enviar ao RH.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportarPDF}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-700 cursor-pointer transition"
            >
              <FileText size={13} /> PDF
            </button>
            <button
              onClick={exportarExcel}
              disabled={exportando}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl cursor-pointer transition disabled:opacity-60"
            >
              <Download size={13} /> {exportando ? 'Gerando...' : 'Excel'}
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <Filter size={14} className="text-slate-400 shrink-0" />

          {/* Ano */}
          <select value={filtroAno} onChange={e => setFiltroAno(parseInt(e.target.value))}
            className="text-xs border border-slate-200 bg-white rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500">
            {[anoAtual - 1, anoAtual, anoAtual + 1, anoAtual + 2].map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          {/* Semestre */}
          <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden text-xs font-semibold">
            {([['todos','Ano todo'],['1sem','1º Semestre'],['2sem','2º Semestre']] as const).map(([v,l]) => (
              <button key={v} onClick={() => setFiltroSemestre(v as Semestre)}
                className={`px-3 py-2 transition cursor-pointer ${filtroSemestre === v ? 'bg-teal-500 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                {l}
              </button>
            ))}
          </div>

          {/* Setor */}
          <select value={filtroSetor} onChange={e => setFiltroSetor(e.target.value)}
            className="text-xs border border-slate-200 bg-white rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500">
            <option value="">Todos os setores</option>
            {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>

          {/* Status */}
          <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden text-xs font-semibold">
            {([['todos','Todos'],['planejada','Planejados'],['concluida','Concluídos']] as const).map(([v,l]) => (
              <button key={v} onClick={() => setFiltroStatus(v as any)}
                className={`px-3 py-2 transition cursor-pointer ${filtroStatus === v ? 'bg-teal-500 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Colaboradores', valor: totalColaboradores, icon: <Users size={16} className="text-teal-500" />, cor: 'border-teal-200' },
            { label: 'Concessões', valor: linhas.length, icon: <Calendar size={16} className="text-blue-500" />, cor: 'border-blue-200' },
            { label: 'Total de Dias', valor: totalDias, icon: <TrendingUp size={16} className="text-emerald-500" />, cor: 'border-emerald-200' },
            { label: 'Fora do Prazo', valor: totalForaDoPrazo, icon: <span className="text-base">⚠️</span>, cor: totalForaDoPrazo > 0 ? 'border-rose-300 bg-rose-50' : 'border-slate-200' },
          ].map(c => (
            <div key={c.label} className={`bg-white rounded-2xl border ${c.cor} p-4 flex items-center gap-3`}>
              {c.icon}
              <div>
                <p className="text-xl font-extrabold text-slate-900">{c.valor}</p>
                <p className="text-[10px] text-slate-500 font-semibold">{c.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Mini gráfico de barras por mês */}
        {linhas.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-xs font-bold text-slate-600 mb-3">Distribuição por mês de início</p>
            <div className="flex items-end gap-1.5 h-16">
              {porMes.map(({ mes, qtd }) => {
                const max = Math.max(...porMes.map(m => m.qtd), 1);
                const h = qtd > 0 ? Math.max(8, Math.round((qtd / max) * 56)) : 0;
                return (
                  <div key={mes} className="flex-1 flex flex-col items-center gap-0.5">
                    {qtd > 0 && <span className="text-[9px] font-bold text-teal-700">{qtd}</span>}
                    <div
                      className="w-full rounded-t-md transition-all"
                      style={{
                        height: h || 2,
                        backgroundColor: h > 0
                          ? (filtroSemestre === '1sem' ? '#0D9488' : filtroSemestre === '2sem' ? '#6366F1' : '#0D9488')
                          : '#E2E8F0',
                        opacity: h > 0 ? 1 : 0.4,
                      }}
                    />
                    <span className="text-[8px] text-slate-400">{mes}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tabela de concessões */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div style={{ maxHeight: '55vh', overflowY: 'auto', overflowX: 'auto' }}>
            <table className="w-full text-xs" style={{ minWidth: 900 }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Colaborador','Setor','Período Aquisitivo','Concessão Início','Concessão Fim','Dias','Status','Limite Gozo','Obs.'].map(h => (
                    <th key={h} className="text-left py-3 px-3 font-bold text-slate-500 uppercase tracking-wider text-[10px] whitespace-nowrap bg-slate-50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhas.map((l, i) => (
                  <tr key={i} className={`border-t border-slate-100 ${l.foraDoPrazo ? 'bg-rose-50/40' : i%2===0 ? 'bg-white' : 'bg-slate-50/20'}`}>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <img src={l.colaborador.fotoUrl} alt={l.colaborador.nome} className="w-5 h-5 rounded-full object-cover shrink-0" />
                        <span className="font-semibold text-slate-800 whitespace-nowrap">{l.colaborador.nome}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{l.setor?.nome || '—'}</td>
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{l.periodo}</td>
                    <td className="py-2.5 px-3 text-slate-700 font-semibold whitespace-nowrap">
                      {l.concessaoInicio.toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                      {l.concessaoFim.toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="font-bold text-emerald-600">{l.dias}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        l.status === 'planejada' ? 'bg-teal-100 text-teal-700' :
                        l.status === 'concluida' ? 'bg-slate-200 text-slate-600' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {l.status === 'planejada' ? 'Planejado' : l.status === 'concluida' ? 'Concluído' : 'Em Gozo'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={l.foraDoPrazo ? 'text-rose-600 font-bold' : 'text-slate-500'}>
                        {l.limiteGozo.toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {l.foraDoPrazo && (
                        <span className="text-[9px] font-bold text-rose-600">⚠️ Fora do prazo</span>
                      )}
                    </td>
                  </tr>
                ))}
                {linhas.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                      Nenhuma concessão encontrada para {filtroAno} — {labelSemestre}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {linhas.length > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <p className="text-[10px] text-slate-500">
                {linhas.length} concessão(ões) · {totalColaboradores} colaborador(es) · {totalDias} dias totais
              </p>
              {totalForaDoPrazo > 0 && (
                <p className="text-[10px] text-rose-600 font-bold">
                  ⚠️ {totalForaDoPrazo} concessão(ões) além do prazo limite
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
