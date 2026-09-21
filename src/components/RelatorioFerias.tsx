/**
 * RelatorioFerias — Gestão360
 *
 * Painel analítico de planejamento de férias.
 * Filtros: Ano, Semestre, Setor, Status.
 * Exportação: PDF (nova janela isolada) e CSV (abre no Excel).
 *
 * Colunas do relatório: Colaborador · Dias · Início da Concessão ·
 *   Fim da Concessão · Retorno Previsto · Status · Limite Gozo · Obs.
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
  periodo: string;
  concessaoInicio: Date;
  concessaoFim: Date;
  retornoPrevisto: Date;
  dias: number;
  status: string;
  limiteGozo: Date;
  foraDoPrazo: boolean;
}

const parseData = (s: string | undefined): Date | null => {
  if (!s) return null;
  const norm = s.replace(/T00:00:00$/, 'T12:00:00');
  const comHora = norm.match(/^\d{4}-\d{2}-\d{2}$/) ? norm + 'T12:00:00' : norm;
  const d = new Date(comHora);
  return isNaN(d.getTime()) ? null : d;
};

const fmt = (d: Date) => d.toLocaleDateString('pt-BR');

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export default function RelatorioFerias({
  colaboradores, ferias, setores, periodosAquisitivos,
}: RelatorioFeriasProps) {
  const anoAtual = new Date().getFullYear();
  const [filtroAno, setFiltroAno] = useState(anoAtual + 1);
  const [filtroSemestre, setFiltroSemestre] = useState<Semestre>('todos');
  const [filtroSetor, setFiltroSetor] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'planejada' | 'concluida'>('todos');

  // ── Construir linhas ────────────────────────────────────────────────────
  const linhas: LinhaRelatorio[] = useMemo(() => {
    return ferias
      .filter(f => {
        if (f.status !== 'planejada' && f.status !== 'concluida' && f.status !== 'em_gozo') return false;
        const ini = parseData(f.dataInicio);
        if (!ini) return false;
        if (ini.getFullYear() !== filtroAno) return false;
        const mes = ini.getMonth();
        if (filtroSemestre === '1sem' && mes > 5) return false;
        if (filtroSemestre === '2sem' && mes < 6) return false;
        return true;
      })
      .map(f => {
        const col = colaboradores.find(c => c.id === f.colaboradorId);
        if (!col) return null;
        if (filtroSetor && col.setorId !== filtroSetor) return null;
        if (filtroStatus !== 'todos' && f.status !== filtroStatus) return null;

        const setor = setores.find(s => s.id === col.setorId);
        const ini = parseData(f.dataInicio)!;
        const fim = parseData(f.dataFim) || new Date(ini.getTime() + (f.dias - 1) * 86400000);

        // Retorno = dia seguinte ao fim das férias
        const retorno = new Date(fim);
        retorno.setDate(retorno.getDate() + 1);

        // Limite de gozo
        const perDb = periodosAquisitivos.find(p => p.id === f.periodoAquisitivoId);
        let limiteGozo = fim;
        let periodo = '—';
        if (perDb) {
          const fimPA = parseData(perDb.dataFim);
          if (fimPA) {
            limiteGozo = new Date(fimPA);
            limiteGozo.setFullYear(limiteGozo.getFullYear() + 1);
          }
          const pIni = parseData(perDb.dataInicio);
          const pFim = parseData(perDb.dataFim);
          if (pIni && pFim) periodo = `${pIni.getFullYear()}/${pFim.getFullYear()}`;
        }

        return {
          colaborador: col, setor, periodo,
          concessaoInicio: ini, concessaoFim: fim, retornoPrevisto: retorno,
          dias: f.dias, status: f.status,
          limiteGozo, foraDoPrazo: ini > limiteGozo,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a!.concessaoInicio.getTime() - b!.concessaoInicio.getTime()) as LinhaRelatorio[];
  }, [ferias, colaboradores, setores, periodosAquisitivos, filtroAno, filtroSemestre, filtroSetor, filtroStatus]);

  // ── Métricas ────────────────────────────────────────────────────────────
  const totalColaboradores = new Set(linhas.map(l => l.colaborador.id)).size;
  const totalDias = linhas.reduce((a, l) => a + l.dias, 0);
  const totalForaDoPrazo = linhas.filter(l => l.foraDoPrazo).length;
  const porMes = Array.from({ length: 12 }, (_, m) => ({
    mes: MESES[m],
    qtd: linhas.filter(l => l.concessaoInicio.getMonth() === m).length,
  }));

  const labelSemestre = filtroSemestre === '1sem' ? '1º Semestre' : filtroSemestre === '2sem' ? '2º Semestre' : 'Ano todo';
  const nomeFiltroSetor = setores.find(s => s.id === filtroSetor)?.nome || 'Todos os setores';
  const labelStatus = filtroStatus === 'planejada' ? 'Planejados' : filtroStatus === 'concluida' ? 'Concluídos' : 'Todos';

  // ── Exportar PDF — abre nova janela com HTML isolado ────────────────────
  const exportarPDF = () => {
    const w = window.open('', '_blank', 'width=1100,height=800');
    if (!w) { alert('Permita pop-ups para gerar o PDF.'); return; }

    const linhasHtml = linhas.map((l, i) => `
      <tr style="background:${l.foraDoPrazo ? '#fef2f2' : i % 2 === 0 ? '#fff' : '#f8fafc'}">
        <td>${l.colaborador.nome}</td>
        <td>${l.setor?.nome || '—'}</td>
        <td style="text-align:center;font-weight:700;color:#059669">${l.dias}</td>
        <td style="font-weight:600">${fmt(l.concessaoInicio)}</td>
        <td>${fmt(l.concessaoFim)}</td>
        <td style="font-weight:600;color:#0d9488">${fmt(l.retornoPrevisto)}</td>
        <td><span style="padding:2px 8px;border-radius:9999px;font-size:9px;font-weight:700;
          background:${l.status === 'planejada' ? '#ccfbf1' : '#f1f5f9'};
          color:${l.status === 'planejada' ? '#0f766e' : '#475569'}">
          ${l.status === 'planejada' ? 'Planejado' : l.status === 'concluida' ? 'Concluído' : 'Em Gozo'}</span></td>
        <td style="color:${l.foraDoPrazo ? '#dc2626' : '#64748b'}">${fmt(l.limiteGozo)}</td>
        <td style="color:#dc2626;font-size:9px">${l.foraDoPrazo ? '⚠️ Fora do prazo' : ''}</td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Planejamento de Férias ${filtroAno}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #1e293b; padding: 24px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; border-bottom: 2px solid #0d9488; padding-bottom: 12px; }
  .title { font-size: 18px; font-weight: 900; color: #0f766e; }
  .subtitle { font-size: 10px; color: #64748b; margin-top: 3px; }
  .meta { text-align: right; font-size: 9px; color: #94a3b8; }
  .filtros { display: flex; gap: 16px; margin-bottom: 14px; font-size: 9px; }
  .filtro { background: #f1f5f9; border-radius: 6px; padding: 4px 10px; }
  .filtro strong { color: #0f766e; }
  .cards { display: flex; gap: 12px; margin-bottom: 16px; }
  .card { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; text-align: center; }
  .card-num { font-size: 20px; font-weight: 900; color: #0f766e; }
  .card-label { font-size: 8px; color: #64748b; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px; }
  table { width: 100%; border-collapse: collapse; font-size: 9px; }
  thead { position: sticky; top: 0; }
  th { background: #0f766e; color: white; text-align: left; padding: 6px 8px; font-weight: 700; font-size: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; }
  .footer { margin-top: 16px; font-size: 8px; color: #94a3b8; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 8px; }
  .alerta { color: #dc2626; font-weight: 700; }
  @media print {
    body { padding: 16px; }
    @page { margin: 1.5cm; size: A4 landscape; }
  }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">Gestão360 · Planejamento de Férias ${filtroAno}</div>
      <div class="subtitle">${labelSemestre} · ${nomeFiltroSetor} · ${labelStatus}</div>
    </div>
    <div class="meta">
      Gerado em ${new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })}<br>
      ${linhas.length} concessão(ões) · ${totalColaboradores} colaborador(es)
    </div>
  </div>

  <div class="filtros">
    <div class="filtro"><strong>Ano:</strong> ${filtroAno}</div>
    <div class="filtro"><strong>Período:</strong> ${labelSemestre}</div>
    <div class="filtro"><strong>Setor:</strong> ${nomeFiltroSetor}</div>
    <div class="filtro"><strong>Status:</strong> ${labelStatus}</div>
  </div>

  <div class="cards">
    <div class="card"><div class="card-num">${totalColaboradores}</div><div class="card-label">Colaboradores</div></div>
    <div class="card"><div class="card-num">${linhas.length}</div><div class="card-label">Concessões</div></div>
    <div class="card"><div class="card-num">${totalDias}</div><div class="card-label">Dias totais</div></div>
    ${totalForaDoPrazo > 0 ? `<div class="card" style="border-color:#fca5a5;background:#fef2f2"><div class="card-num" style="color:#dc2626">${totalForaDoPrazo}</div><div class="card-label" style="color:#dc2626">Fora do prazo</div></div>` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th>Colaborador</th>
        <th>Setor</th>
        <th style="text-align:center">Dias</th>
        <th>Início da Concessão</th>
        <th>Fim da Concessão</th>
        <th>Retorno Previsto</th>
        <th>Status</th>
        <th>Limite Gozo</th>
        <th>Obs.</th>
      </tr>
    </thead>
    <tbody>
      ${linhasHtml || '<tr><td colspan="9" style="text-align:center;padding:20px;color:#94a3b8">Nenhuma concessão encontrada com os filtros aplicados.</td></tr>'}
    </tbody>
  </table>

  <div class="footer">
    <span>Gestão360 · crm-gestao-de-colaboradores.vercel.app</span>
    ${totalForaDoPrazo > 0 ? `<span class="alerta">⚠️ ${totalForaDoPrazo} concessão(ões) além do prazo limite de gozo</span>` : '<span style="color:#0d9488">✓ Todas as concessões dentro do prazo</span>'}
  </div>

  <script>
    window.onload = function() {
      window.print();
      // Fechar a janela após imprimir (opcional — alguns browsers fecham automaticamente)
      window.onfocus = function() { setTimeout(function(){ window.close(); }, 500); };
    };
  </script>
</body>
</html>`;

    w.document.write(html);
    w.document.close();
  };

  // ── Exportar CSV (abre no Excel) ────────────────────────────────────────
  const exportarCSV = () => {
    const BOM = '\uFEFF';
    const sep = ';';
    const cab = ['Colaborador','Setor','Período Aquisitivo','Dias','Início da Concessão','Fim da Concessão','Retorno Previsto','Status','Limite Gozo','Obs.'].join(sep);
    const rows = linhas.map(l => [
      `"${l.colaborador.nome}"`,
      `"${l.setor?.nome || '—'}"`,
      l.periodo,
      l.dias,
      fmt(l.concessaoInicio),
      fmt(l.concessaoFim),
      fmt(l.retornoPrevisto),
      l.status === 'planejada' ? 'Planejado' : l.status === 'concluida' ? 'Concluído' : 'Em Gozo',
      fmt(l.limiteGozo),
      l.foraDoPrazo ? 'Fora do prazo' : '',
    ].join(sep));

    rows.push('');
    rows.push([`"Colaboradores: ${totalColaboradores}"`,`"Concessões: ${linhas.length}"`,`"Dias totais: ${totalDias}"`,'','','','','','',''].join(sep));

    const csv = BOM + [cab, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ferias_${filtroAno}${filtroSemestre !== 'todos' ? '_' + filtroSemestre : ''}${filtroSetor ? '_' + nomeFiltroSetor.replace(/\s+/g,'_') : ''}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
            <TrendingUp size={18} className="text-teal-500" />
            Relatório de Férias
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Planejamento de concessões filtrado. Use para enviar ao RH.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportarPDF}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-700 cursor-pointer transition"
          >
            <FileText size={13} /> Gerar PDF
          </button>
          <button
            onClick={exportarCSV}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl cursor-pointer transition"
          >
            <Download size={13} /> Exportar Excel
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
        <Filter size={14} className="text-slate-400 shrink-0" />

        <select value={filtroAno} onChange={e => setFiltroAno(parseInt(e.target.value))}
          className="text-xs border border-slate-200 bg-white rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500 cursor-pointer">
          {[anoAtual - 1, anoAtual, anoAtual + 1, anoAtual + 2].map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden text-xs font-semibold">
          {([['todos','Ano todo'],['1sem','1º Semestre'],['2sem','2º Semestre']] as const).map(([v,l]) => (
            <button key={v} onClick={() => setFiltroSemestre(v)}
              className={`px-3 py-2 transition cursor-pointer ${filtroSemestre === v ? 'bg-teal-500 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              {l}
            </button>
          ))}
        </div>

        <select value={filtroSetor} onChange={e => setFiltroSetor(e.target.value)}
          className="text-xs border border-slate-200 bg-white rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500 cursor-pointer">
          <option value="">Todos os setores</option>
          {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>

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
          { label: 'Colaboradores', valor: totalColaboradores, icon: <Users size={16} className="text-teal-500" />, cls: 'border-teal-200' },
          { label: 'Concessões', valor: linhas.length, icon: <Calendar size={16} className="text-blue-500" />, cls: 'border-blue-200' },
          { label: 'Total Dias', valor: totalDias, icon: <TrendingUp size={16} className="text-emerald-500" />, cls: 'border-emerald-200' },
          { label: 'Fora do Prazo', valor: totalForaDoPrazo, icon: <span className="text-base">⚠️</span>, cls: totalForaDoPrazo > 0 ? 'border-rose-300 bg-rose-50' : 'border-slate-200' },
        ].map(c => (
          <div key={c.label} className={`bg-white rounded-2xl border ${c.cls} p-4 flex items-center gap-3`}>
            {c.icon}
            <div>
              <p className="text-xl font-extrabold text-slate-900">{c.valor}</p>
              <p className="text-[10px] text-slate-500 font-semibold">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Mini gráfico de barras */}
      {linhas.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <p className="text-xs font-bold text-slate-600 mb-3">Distribuição por mês de início</p>
          <div className="flex items-end gap-1 h-14">
            {porMes.map(({ mes, qtd }) => {
              const max = Math.max(...porMes.map(m => m.qtd), 1);
              const h = qtd > 0 ? Math.max(6, Math.round((qtd / max) * 48)) : 0;
              return (
                <div key={mes} className="flex-1 flex flex-col items-center gap-0.5">
                  {qtd > 0 && <span className="text-[8px] font-bold text-teal-700">{qtd}</span>}
                  <div className="w-full rounded-t-sm" style={{ height: h || 2, backgroundColor: h > 0 ? '#0D9488' : '#E2E8F0' }} />
                  <span className="text-[8px] text-slate-400">{mes}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabela principal */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div style={{ maxHeight: '55vh', overflowY: 'auto', overflowX: 'auto' }}>
          <table className="w-full text-xs" style={{ minWidth: 900 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr className="bg-teal-700 text-white">
                {['Colaborador','Setor','Dias','Início da Concessão','Fim da Concessão','Retorno Previsto','Status','Limite Gozo','Obs.'].map(h => (
                  <th key={h} className="text-left py-3 px-3 font-bold uppercase tracking-wider text-[10px] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((l, i) => (
                <tr key={i} className={`border-t border-slate-100 ${l.foraDoPrazo ? 'bg-rose-50/50' : i%2===0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <img src={l.colaborador.fotoUrl} alt={l.colaborador.nome}
                        className="w-6 h-6 rounded-full object-cover shrink-0" />
                      <span className="font-bold text-slate-800 whitespace-nowrap">{l.colaborador.nome}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{l.setor?.nome || '—'}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="font-extrabold text-emerald-600 text-sm">{l.dias}</span>
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">{fmt(l.concessaoInicio)}</td>
                  <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{fmt(l.concessaoFim)}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="font-bold text-teal-700">{fmt(l.retornoPrevisto)}</span>
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
                    <span className={l.foraDoPrazo ? 'text-rose-600 font-bold' : 'text-slate-400'}>
                      {fmt(l.limiteGozo)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    {l.foraDoPrazo && <span className="text-[9px] font-bold text-rose-600">⚠️ Fora do prazo</span>}
                  </td>
                </tr>
              ))}
              {linhas.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                    Nenhuma concessão encontrada para {filtroAno} — {labelSemestre}.
                    <br/>
                    <span className="text-[10px] text-slate-300">Verifique os filtros ou planeje férias na aba Férias.</span>
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
            {totalForaDoPrazo > 0 ? (
              <p className="text-[10px] text-rose-600 font-bold">⚠️ {totalForaDoPrazo} além do prazo limite</p>
            ) : (
              <p className="text-[10px] text-teal-600 font-semibold">✓ Todas dentro do prazo</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
