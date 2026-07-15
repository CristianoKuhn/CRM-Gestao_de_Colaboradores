/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Documento,
  CategoriaDocumento,
  Colaborador,
} from '../types';
import { DataService } from '../services/DataService';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  FolderOpen,
  X,
  File,
  FileImage,
  FileCheck,
  AlertTriangle,
  Award,
  Clipboard,
  User,
  BookOpen,
  MessageSquare,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';

interface CentralDocumentosProps {
  colaborador: Colaborador;
  documentos: Documento[];
  onAddDocumento: (doc: Documento) => void;
  onDeleteDocumento: (id: string) => void;
  currentUserId: string;
}

const CATEGORIAS: { id: CategoriaDocumento; nome: string; icone: React.ReactNode; cor: string }[] = [
  { id: 'certificado', nome: 'Certificados', icone: <Award size={16} />, cor: 'text-amber-500' },
  { id: 'termo_assinado', nome: 'Termos Assinados', icone: <FileCheck size={16} />, cor: 'text-emerald-500' },
  { id: 'advertencia', nome: 'Advertências', icone: <AlertTriangle size={16} />, cor: 'text-rose-500' },
  { id: 'avaliacao', nome: 'Avaliações', icone: <Clipboard size={16} />, cor: 'text-indigo-500' },
  { id: 'feedback_pdf', nome: 'Feedbacks PDF', icone: <MessageSquare size={16} />, cor: 'text-blue-500' },
  { id: 'contrato', nome: 'Contratos', icone: <FileText size={16} />, cor: 'text-slate-500' },
  { id: 'curriculo', nome: 'Currículos', icone: <User size={16} />, cor: 'text-purple-500' },
  { id: 'documento_pessoal', nome: 'Documentos Pessoais', icone: <BookOpen size={16} />, cor: 'text-teal-500' },
  { id: 'outro', nome: 'Outros', icone: <File size={16} />, cor: 'text-slate-400' },
];

const getIconePorTipo = (tipo: string) => {
  if (tipo.includes('pdf')) return <FileText size={24} className="text-rose-500" />;
  if (tipo.includes('image') || tipo.includes('png') || tipo.includes('jpg')) return <FileImage size={24} className="text-blue-500" />;
  return <File size={24} className="text-slate-500" />;
};

export default function CentralDocumentos({
  colaborador,
  documentos,
  onAddDocumento,
  onDeleteDocumento,
  currentUserId,
}: CentralDocumentosProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState<string>('todas');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadData, setUploadData] = useState({
    nome: '',
    categoria: 'outro' as CategoriaDocumento,
    descricao: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const documentosFiltrados = documentos.filter((doc) => {
    const matchesSearch = doc.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategoria = filterCategoria === 'todas' || doc.categoria === filterCategoria;
    return matchesSearch && matchesCategoria;
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setUploadData((prev) => ({
      ...prev,
      nome: file.name.replace(/\.[^/.]+$/, ''),
    }));
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadData.nome) return;

    setIsUploading(true);
    try {
      const folderName = 'Documentos';
      const fileUrl = await DataService.uploadFile(selectedFile, 'documentos', colaborador.nome);

      const novoDoc: Documento = {
        id: `doc-${Date.now()}`,
        colaboradorId: colaborador.id,
        nome: uploadData.nome,
        categoria: uploadData.categoria,
        tipoArquivo: selectedFile.type,
        url: fileUrl,
        tamanho: formatFileSize(selectedFile.size),
        uploadedPor: currentUserId,
        dataUpload: new Date().toISOString().split('T')[0],
        descricao: uploadData.descricao,
      };

      await DataService.saveDocumento(novoDoc);
      onAddDocumento(novoDoc);
      setShowUploadModal(false);
      setSelectedFile(null);
      setUploadData({ nome: '', categoria: 'outro', descricao: '' });
    } catch (err) {
      console.error('Erro ao fazer upload:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (doc: Documento) => {
    if (confirm(`Deseja realmente excluir o documento "${doc.nome}"?`)) {
      await DataService.deleteDocumento(doc.id);
      onDeleteDocumento(doc.id);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCategoriaInfo = (categoria: CategoriaDocumento) => {
    return CATEGORIAS.find((c) => c.id === categoria) || CATEGORIAS[CATEGORIAS.length - 1];
  };

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
            <FolderOpen size={20} className="text-slate-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Central de Documentos</h3>
            <p className="text-xs text-slate-500">{documentos.length} documento(s) salvo(s)</p>
          </div>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-slate-950 font-bold rounded-xl text-sm hover:bg-teal-400 transition cursor-pointer"
        >
          <Upload size={16} />
          Anexar Documento
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar documentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-400" />
          <select
            value={filterCategoria}
            onChange={(e) => setFilterCategoria(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none cursor-pointer"
          >
            <option value="todas">Todas as categorias</option>
            {CATEGORIAS.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de Documentos */}
      {documentosFiltrados.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
          <FileText size={48} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-semibold">Nenhum documento encontrado</p>
          <p className="text-xs text-slate-400 mt-1">
            {searchTerm || filterCategoria !== 'todas'
              ? 'Tente ajustar os filtros de busca'
              : 'Anexe documentos importantes deste colaborador'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documentosFiltrados.map((doc) => {
            const catInfo = getCategoriaInfo(doc.categoria);
            return (
              <div
                key={doc.id}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-4 transition group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-white rounded-xl border border-slate-200 flex items-center justify-center shrink-0">
                    {getIconePorTipo(doc.tipoArquivo)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`flex items-center gap-1 text-xs font-bold ${catInfo.cor}`}>
                        {catInfo.icone}
                        {catInfo.nome}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-800 truncate">{doc.nome}</h4>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span>{doc.tamanho}</span>
                      <span>•</span>
                      <span>{formatDate(doc.dataUpload)}</span>
                    </div>
                    {doc.descricao && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{doc.descricao}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                  >
                    <Download size={14} />
                    Baixar
                  </a>
                  <button
                    onClick={() => handleDelete(doc)}
                    className="px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Upload */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 animate-scale-up border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900">Anexar Documento</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold text-2xl"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4">
              {/* Upload de Arquivo */}
              <div
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition cursor-pointer ${
                  isDragging ? 'border-teal-500 bg-teal-50' : 'border-slate-300 hover:border-teal-400'
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files[0];
                  if (file) {
                    setSelectedFile(file);
                    setUploadData((prev) => ({
                      ...prev,
                      nome: file.name.replace(/\.[^/.]+$/, ''),
                    }));
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                />
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    {getIconePorTipo(selectedFile.type)}
                    <div className="text-left">
                      <p className="font-bold text-slate-800">{selectedFile.name}</p>
                      <p className="text-xs text-slate-500">{formatFileSize(selectedFile.size)}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload size={32} className="mx-auto text-slate-400 mb-2" />
                    <p className="font-semibold text-slate-600">Arraste ou clique para selecionar</p>
                    <p className="text-xs text-slate-400 mt-1">PDF, DOC, DOCX, PNG, JPG (max 10MB)</p>
                  </>
                )}
              </div>

              {/* Nome do Documento */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Nome do Documento
                </label>
                <input
                  type="text"
                  value={uploadData.nome}
                  onChange={(e) => setUploadData((prev) => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: Certificado de Conclusão - Python"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Categoria
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIAS.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setUploadData((prev) => ({ ...prev, categoria: cat.id }))}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        uploadData.categoria === cat.id
                          ? 'bg-teal-500 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <span className={uploadData.categoria === cat.id ? 'text-white' : cat.cor}>
                        {cat.icone}
                      </span>
                      {cat.nome}
                    </button>
                  ))}
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Descrição (opcional)
                </label>
                <textarea
                  value={uploadData.descricao}
                  onChange={(e) => setUploadData((prev) => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Ex: Certificado do curso de Python avançado concluído em 2024"
                  rows={2}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 bg-slate-50 rounded-xl text-sm font-semibold hover:bg-slate-100 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpload}
                disabled={!selectedFile || !uploadData.nome || isUploading}
                className="px-4 py-2 bg-teal-500 text-slate-950 font-bold rounded-xl text-sm hover:bg-teal-400 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Anexar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR');
}
