/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Download, ExternalLink } from 'lucide-react';

// Formato mínimo necessário para pré-visualizar um arquivo — tanto um Anexo
// (da timeline) quanto um Documento (da Central de Documentos) cabem aqui.
export interface ArquivoParaPreview {
  nome: string;
  url: string;
  tipo?: string; // 'imagem' | 'pdf' | mimetype completo, etc.
}

// O backend (salvarArquivoDrive) sempre devolve a URL no formato
// "https://lh3.googleusercontent.com/d/<ID_DO_ARQUIVO>". Extraímos o ID aqui
// para poder montar a URL de pré-visualização embutida do Google Drive
// (funciona para PDF, Office, etc. — não só imagens).
function extrairIdDoDrive(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

function ehImagem(arquivo: ArquivoParaPreview): boolean {
  const tipo = (arquivo.tipo || '').toLowerCase();
  if (tipo.includes('imagem') || tipo.includes('image')) return true;
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(arquivo.nome);
}

interface AnexoPreviewModalProps {
  arquivo: ArquivoParaPreview;
  onClose: () => void;
}

// Modal simples de pré-visualização: imagens renderizam inline; qualquer
// outro tipo (PDF, DOCX, XLSX...) usa o visualizador embutido do próprio
// Google Drive via iframe — sem precisar sair da plataforma. Se por algum
// motivo não for possível montar o embed, cai para os links de "Nova aba"/
// "Baixar", que sempre funcionam.
const AnexoPreviewModal: React.FC<AnexoPreviewModalProps> = ({ arquivo, onClose }) => {
  const driveId = extrairIdDoDrive(arquivo.url);
  const imagem = ehImagem(arquivo);
  const urlEmbutida = driveId ? `https://drive.google.com/file/d/${driveId}/preview` : null;

  return (
    <div
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-100 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 gap-3">
          <p className="font-bold text-slate-800 truncate">{arquivo.nome}</p>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={arquivo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg px-3 py-1.5 transition"
            >
              <ExternalLink size={13} /> Nova aba
            </a>
            <a
              href={arquivo.url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg px-3 py-1.5 transition"
            >
              <Download size={13} /> Baixar
            </a>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5 hover:bg-slate-100 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-50 flex items-center justify-center p-3">
          {imagem ? (
            <img
              src={arquivo.url}
              alt={arquivo.nome}
              className="max-w-full max-h-full object-contain rounded-xl"
            />
          ) : urlEmbutida ? (
            <iframe
              src={urlEmbutida}
              title={arquivo.nome}
              className="w-full h-[70vh] rounded-xl border border-slate-200 bg-white"
            />
          ) : (
            <div className="text-center text-sm text-slate-500 py-10 px-6">
              Não foi possível pré-visualizar este arquivo aqui.
              <br />
              Use "Nova aba" ou "Baixar" acima.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnexoPreviewModal;
