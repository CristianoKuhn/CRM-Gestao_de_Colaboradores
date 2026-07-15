/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ItemLinhaTempo, Colaborador, TimelineRegistro, Documento, Reconhecimento, Tarefa } from '../types';

export interface ExportOptions {
  formato: 'pdf' | 'excel';
  incluirDocumentos: boolean;
  incluirReconhecimentos: boolean;
  incluirTarefas: boolean;
  periodoInicio?: string;
  periodoFim?: string;
}

export function gerarCSV(data: ItemLinhaTempo[], nomeColaborador: string): string {
  const headers = ['Data', 'Tipo', 'Título', 'Descrição'];
  const rows = data.map(item => [
    formatDate(item.data),
    item.tipo,
    escapeCSV(item.titulo),
    escapeCSV(item.descricao),
  ]);

  const csvContent = [
    `Histórico do Colaborador: ${nomeColaborador}`,
    `Data de Exportação: ${formatDate(new Date().toISOString())}`,
    '',
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');

  return csvContent;
}

export function gerarHTMLParaPDF(data: ItemLinhaTempo[], nomeColaborador: string): string {
  const itemsPorMes = agruparPorMes(data);

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Histórico - ${nomeColaborador}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1e293b; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #0d9488; padding-bottom: 20px; }
        .header h1 { color: #0d9488; font-size: 24px; margin-bottom: 5px; }
        .header p { color: #64748b; font-size: 12px; }
        .mes { margin-bottom: 25px; }
        .mes-title { background: #f1f5f9; padding: 10px 15px; border-radius: 8px; margin-bottom: 15px; font-weight: bold; color: #475569; }
        .item { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 10px; }
        .item-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .item-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
        .item-title { font-weight: bold; color: #1e293b; }
        .item-date { color: #94a3b8; font-size: 11px; }
        .item-desc { color: #64748b; font-size: 13px; line-height: 1.5; }
        .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; }
        .badge-registro { background: #dbeafe; color: #1d4ed8; }
        .badge-documento { background: #fef3c7; color: #d97706; }
        .badge-reconhecimento { background: #dcfce7; color: #16a34a; }
        .badge-tarefa { background: #fce7f3; color: #db2777; }
        .badge-avaliacao { background: #ede9fe; color: #7c3aed; }
        .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 10px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📋 Histórico do Colaborador</h1>
        <p><strong>${nomeColaborador}</strong></p>
        <p>Exportado em: ${formatDate(new Date().toISOString())}</p>
      </div>
  `;

  Object.entries(itemsPorMes).forEach(([mes, items]) => {
    html += `
      <div class="mes">
        <div class="mes-title">${mes}</div>
        ${items.map(item => `
          <div class="item">
            <div class="item-header">
              <div class="item-icon" style="background: ${item.cor}20; color: ${item.cor}">
                ${item.icone}
              </div>
              <div>
                <div class="item-title">${escapeHTML(item.titulo)}</div>
                <div class="item-date">${formatDate(item.data)} • <span class="badge badge-${item.tipo}">${getTipoLabel(item.tipo)}</span></div>
              </div>
            </div>
            <div class="item-desc">${escapeHTML(item.descricao)}</div>
          </div>
        `).join('')}
      </div>
    `;
  });

  html += `
      <div class="footer">
        <p>Sistema de Gestão de Colaboradores - Gestão360</p>
        <p>Documento gerado automaticamente</p>
      </div>
    </body>
    </html>
  `;

  return html;
}

export function exportarPDF(html: string, nomeArquivo: string) {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}

export function exportarCSV(csv: string, nomeArquivo: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${nomeArquivo}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function construirLinhaTempo(
  registros: TimelineRegistro[],
  documentos: Documento[],
  reconhecimentos: Reconhecimento[],
  tarefas: Tarefa[],
  configReconhecimento: { tipos: { id: string; nome: string }[] }
): ItemLinhaTempo[] {
  const itens: ItemLinhaTempo[] = [];

  // Adicionar registros
  registros.forEach(reg => {
    itens.push({
      id: reg.id,
      tipo: 'registro',
      titulo: reg.titulo,
      descricao: reg.descricao,
      data: reg.data,
      icone: getIconePorTipoRegistro(reg.tipo),
      cor: getCorPorTipoRegistro(reg.tipo),
      entidadeId: reg.id,
      entidadeTipo: 'registro',
    });
  });

  // Adicionar documentos
  documentos.forEach(doc => {
    itens.push({
      id: doc.id,
      tipo: 'documento',
      titulo: `Documento: ${doc.nome}`,
      descricao: doc.descricao || `Categoria: ${doc.categoria}`,
      data: doc.dataUpload,
      icone: '📄',
      cor: '#f59e0b',
      entidadeId: doc.id,
      entidadeTipo: 'documento',
    });
  });

  // Adicionar reconhecimentos
  reconhecimentos.forEach(rec => {
    const tipo = configReconhecimento.tipos.find(t => t.id === rec.tipoId);
    itens.push({
      id: rec.id,
      tipo: 'reconhecimento',
      titulo: rec.titulo,
      descricao: rec.descricao || `Reconhecimento: ${tipo?.nome || 'N/A'}`,
      data: rec.dataConcessao,
      icone: '🏆',
      cor: '#eab308',
      entidadeId: rec.id,
      entidadeTipo: 'reconhecimento',
    });
  });

  // Adicionar tarefas concluídas
  tarefas.filter(t => t.concluida).forEach(tar => {
    itens.push({
      id: tar.id,
      tipo: 'tarefa',
      titulo: `Tarefa: ${tar.titulo}`,
      descricao: tar.descricao,
      data: tar.vencimento,
      icone: '✅',
      cor: '#22c55e',
      entidadeId: tar.id,
      entidadeTipo: 'tarefa',
    });
  });

  // Ordenar por data (mais recente primeiro)
  return itens.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
}

function escapeCSV(str: string): string {
  return str.replace(/"/g, '""');
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getTipoLabel(tipo: string): string {
  const labels: Record<string, string> = {
    registro: 'Registro',
    documento: 'Documento',
    reconhecimento: 'Reconhecimento',
    tarefa: 'Tarefa',
    meta: 'Meta',
    avaliacao: 'Avaliação',
  };
  return labels[tipo] || tipo;
}

function getIconePorTipoRegistro(tipo: string): string {
  const icones: Record<string, string> = {
    'Feedback Corretivo': '⚠️',
    'Feedback Positivo': '💚',
    'Reconhecimento': '🏆',
    'Conversa Individual (1:1)': '💬',
    'Plano de Desenvolvimento Individual (PDI)': '📈',
    'Advertência': '⚠️',
    'Suspensão': '⏸️',
    'Elogio de Cliente': '⭐',
    'Reclamação de Cliente': '📉',
    'Observação Geral': '📝',
    'Acompanhamento': '👁️',
    'Outros': '📌',
  };
  return icones[tipo] || '📌';
}

function getCorPorTipoRegistro(tipo: string): string {
  const cores: Record<string, string> = {
    'Feedback Corretivo': '#ef4444',
    'Feedback Positivo': '#22c55e',
    'Reconhecimento': '#eab308',
    'Conversa Individual (1:1)': '#3b82f6',
    'Plano de Desenvolvimento Individual (PDI)': '#8b5cf6',
    'Advertência': '#dc2626',
    'Suspensão': '#f97316',
    'Elogio de Cliente': '#fbbf24',
    'Reclamação de Cliente': '#ef4444',
    'Observação Geral': '#64748b',
    'Acompanhamento': '#06b6d4',
    'Outros': '#94a3b8',
  };
  return cores[tipo] || '#94a3b8';
}

function agruparPorMes(itens: ItemLinhaTempo[]): Record<string, ItemLinhaTempo[]> {
  const grupos: Record<string, ItemLinhaTempo[]> = {};

  itens.forEach(item => {
    const date = new Date(item.data);
    const mesKey = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    if (!grupos[mesKey]) {
      grupos[mesKey] = [];
    }
    grupos[mesKey].push(item);
  });

  return grupos;
}
