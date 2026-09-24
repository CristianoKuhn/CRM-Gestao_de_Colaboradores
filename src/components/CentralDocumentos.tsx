import React, { useState, useRef, useMemo } from 'react';
import {
  Documento, CategoriaDocumento, Colaborador, PastaDocumento,
  TipoPasta, Setor, Usuario,
} from '../types';
import { DataService } from '../services/DataService';
import AnexoPreviewModal, { ArquivoParaPreview } from './AnexoPreviewModal';
import {
  FileText, Upload, Download, Trash2, FolderOpen, Folder,
  X, File, FileImage, FileCheck, AlertTriangle, Award,
  Clipboard, User, BookOpen, MessageSquare, Search,
  Eye, Plus, ArrowLeft, Move, ChevronRight, Lock,
  Users, UserCircle, Edit2, FolderPlus, Building2,
} from 'lucide-react';

interface CentralDocumentosProps {
  colaborador: Colaborador;
  documentos: Documento[];
  onAddDocumento: (doc: Documento) => void;
  onDeleteDocumento: (id: string) => void;
  currentUserId: string;
  colaboradores?: Colaborador[];
  setores?: Setor[];
  currentUser?: Usuario;
  pastas?: PastaDocumento[];
  onAddPasta?: (pasta: PastaDocumento) => void;
  onUpdateDocumento?: (doc: Documento) => void;
}

const CATEGORIAS: { id: CategoriaDocumento; nome: string; icone: React.ReactNode; cor: string }[] = [
  { id: 'certificado', nome: 'Certificados', icone: <Award size={15} />, cor: 'text-amber-500' },
  { id: 'termo_assinado', nome: 'Termos Assinados', icone: <FileCheck size={15} />, cor: 'text-emerald-500' },
  { id: 'advertencia', nome: 'Advertências', icone: <AlertTriangle size={15} />, cor: 'text-rose-500' },
  { id: 'avaliacao', nome: 'Avaliações', icone: <Clipboard size={15} />, cor: 'text-indigo-500' },
  { id: 'feedback_pdf', nome: 'Feedbacks PDF', icone: <MessageSquare size={15} />, cor: 'text-blue-500' },
  { id: 'contrato', nome: 'Contratos', icone: <FileText size={15} />, cor: 'text-slate-500' },
  { id: 'curriculo', nome: 'Currículos', icone: <User size={15} />, cor: 'text-purple-500' },
  { id: 'documento_pessoal', nome: 'Docs Pessoais', icone: <BookOpen size={15} />, cor: 'text-teal-500' },
  { id: 'outro', nome: 'Outros', icone: <File size={15} />, cor: 'text-slate-400' },
];

const CORES_PASTA = [
  '#0D9488','#3B82F6','#8B5CF6','#F59E0B','#EF4444',
  '#10B981','#EC4899','#6366F1','#F97316','#14B8A6',
];

const getIconePorTipo = (tipo: string) => {
  if (tipo.includes('pdf')) return <FileText size={22} className="text-rose-500" />;
  if (['image','png','jpg','jpeg','gif','webp'].some(t => tipo.includes(t)))
    return <FileImage size={22} className="text-blue-500" />;
  return <File size={22} className="text-slate-400" />;
};

const formatBytes = (str: string) => str || '—';

export default function CentralDocumentos({
  colaborador, documentos, onAddDocumento, onDeleteDocumento,
  currentUserId, colaboradores = [], setores = [], currentUser,
  pastas: pastasProp = [], onAddPasta, onUpdateDocumento,
}: CentralDocumentosProps) {
  const modoGlobal = colaborador.id === 'todos';

  // ── Navegação ─────────────────────────────────────────────────────────────
  const [pastaSelecionada, setPastaSelecionada] = useState<PastaDocumento | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // ── Modais ────────────────────────────────────────────────────────────────
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCriarPastaModal, setShowCriarPastaModal] = useState(false);
  const [showMoverModal, setShowMoverModal] = useState<Documento | null>(null);
  const [preview, setPreview] = useState<ArquivoParaPreview | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // ── Form de upload ────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadColaboradorId, setUploadColaboradorId] = useState('');
  const [uploadData, setUploadData] = useState({
    nome: '', categoria: 'outro' as CategoriaDocumento, descricao: '',
  });

  // ── Form de criar pasta ───────────────────────────────────────────────────
  const [novaPasta, setNovaPasta] = useState({
    nome: '', tipo: 'colaborador' as TipoPasta,
    colaboradorId: '', setorId: '', cor: CORES_PASTA[0],
  });

  // ── Construir lista de pastas ──────────────────────────────────────────────
  // 1. Pastas explicitamente criadas
  // 2. Pastas virtuais por colaborador (para documentos sem pastaId)
  // 3. Pasta pessoal do usuário atual
  const setorAtualId = currentUser?.setoresPermitidos?.[0] || currentUser?.setor_id || '';

  const pastasVirtuaisColaborador: PastaDocumento[] = useMemo(() => {
    if (!modoGlobal) return [];
    const colsComDocs = new Set(
      documentos
        .map(d => d.colaboradorId)
        .filter(cid =>
          // Excluir sentinelas de departamento e pessoal — não geram pasta virtual
          cid &&
          !cid.startsWith('departamento:') &&
          cid !== 'pessoal'
        )
    );
    const pastasCriadasColIds = new Set(
      pastasProp.filter(p => p.tipo === 'colaborador').map(p => p.colaboradorId)
    );
    return Array.from(colsComDocs)
      .filter(cid => !pastasCriadasColIds.has(cid))
      .map(cid => {
        const col = colaboradores.find(c => c.id === cid);
        return {
          id: `virtual-col-${cid}`, nome: col?.nome || 'Colaborador',
          tipo: 'colaborador' as TipoPasta, colaboradorId: cid,
          criadaEm: '', criadaPor: '', cor: '#64748B',
        };
      });
  }, [documentos, pastasProp, colaboradores, modoGlobal]);

  const todasPastas: PastaDocumento[] = useMemo(() => {
    const isAdmin = currentUser?.perfil === 'Administrador' || currentUser?.perfil === 'Coordenador';
    const criadas = pastasProp.filter(p => {
      if (p.tipo === 'pessoal') return p.donoId === currentUserId;
      if (p.tipo === 'departamento') {
        // Admin e Coordenador veem todas as pastas de departamento
        if (isAdmin) return true;
        // Demais: veem apenas do seu setor
        return !setorAtualId || p.setorId === setorAtualId;
      }
      return true; // colaborador — visibilidade controlada nos documentos
    });
    return [...criadas, ...pastasVirtuaisColaborador];
  }, [pastasProp, pastasVirtuaisColaborador, currentUserId, setorAtualId, currentUser]);

  // ── Documentos da pasta selecionada ────────────────────────────────────────
  const documentosDaPasta = useMemo(() => {
    if (!pastaSelecionada) return [];
    const p = pastaSelecionada;

    let docs: Documento[];
    if (p.tipo === 'colaborador') {
      const colId = p.colaboradorId;
      if (!p.id.startsWith('virtual-')) {
        docs = documentos.filter(d => d.pastaId === p.id || (!d.pastaId && d.colaboradorId === colId));
      } else {
        docs = documentos.filter(d => d.colaboradorId === colId && !d.pastaId);
      }
    } else if (p.tipo === 'pessoal') {
      // Documentos pessoais: vinculados à pasta OU com sentinel 'pessoal' enviados pelo dono
      docs = documentos.filter(d =>
        d.pastaId === p.id ||
        (!d.pastaId && d.uploadedPor === currentUserId && d.colaboradorId === 'pessoal')
      );
    } else {
      // Departamento: a fonte de verdade é pastaId.
      // O sentinel colaboradorId='departamento:setorId' é backup para docs sem pastaId.
      const sentinela = `departamento:${p.setorId || ''}`;
      docs = documentos.filter(d =>
        d.pastaId === p.id ||
        (!d.pastaId && d.colaboradorId === sentinela)
      );
    }

    if (searchTerm)
      docs = docs.filter(d => d.nome.toLowerCase().includes(searchTerm.toLowerCase()));
    return docs;
  }, [pastaSelecionada, documentos, searchTerm, currentUserId, todasPastas]);

  // ── Icone e label de tipo de pasta ────────────────────────────────────────
  const iconePasta = (tipo: TipoPasta) => {
    if (tipo === 'pessoal') return <Lock size={14} className="text-indigo-400" />;
    if (tipo === 'departamento') return <Building2 size={14} className="text-teal-400" />;
    return <UserCircle size={14} className="text-slate-400" />;
  };

  // ── Upload ─────────────────────────────────────────────────────────────────
  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setSelectedFile(file);
    if (!uploadData.nome) setUploadData(p => ({ ...p, nome: file.name }));
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadData.nome.trim()) return;

    // Determinar colaboradorId correto pelo TIPO da pasta ou pelo contexto:
    //   'colaborador' → colaboradorId da pasta (ou selecionado no modal)
    //   'departamento' → usa sentinel 'departamento:<setorId>' para rastrear sem colaborador
    //   'pessoal'      → usa sentinel 'pessoal' (o donoId da pasta já protege a visibilidade)
    //   sem pasta, modoGlobal → colaborador selecionado no modal (obrigatório)
    //   sem pasta, perfil individual → colaborador do contexto
    let colId: string;
    if (pastaSelecionada) {
      if (pastaSelecionada.tipo === 'colaborador') {
        colId = pastaSelecionada.colaboradorId || uploadColaboradorId || '';
      } else if (pastaSelecionada.tipo === 'departamento') {
        colId = `departamento:${pastaSelecionada.setorId || ''}`;
      } else {
        // pessoal
        colId = 'pessoal';
      }
    } else if (modoGlobal) {
      colId = uploadColaboradorId || '';
      if (!colId) return; // sem pasta e sem colaborador selecionado — bloquear
    } else {
      colId = colaborador.id;
    }

    setIsUploading(true);
    try {
      const folderName = 'documentos';
      const url = await DataService.uploadFile(selectedFile, folderName, uploadData.nome.trim());
      const novoDoc: Documento = {
        id: `doc-${Date.now()}`,
        colaboradorId: colId,
        pastaId: pastaSelecionada?.id,
        nome: uploadData.nome.trim(),
        categoria: uploadData.categoria,
        tipoArquivo: selectedFile.type || selectedFile.name.split('.').pop() || 'file',
        url,
        tamanho: `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB`,
        uploadedPor: currentUserId,
        dataUpload: new Date().toISOString(),
        descricao: uploadData.descricao || undefined,
      };
      onAddDocumento(novoDoc);
      setShowUploadModal(false);
      setSelectedFile(null);
      setUploadData({ nome: '', categoria: 'outro', descricao: '' });
      setUploadColaboradorId('');
    } catch (e) {
      console.error('Erro no upload:', e);
    } finally {
      setIsUploading(false);
    }
  };

  // ── Criar pasta ────────────────────────────────────────────────────────────
  const handleCriarPasta = () => {
    if (!novaPasta.nome.trim()) return;
    if (novaPasta.tipo === 'colaborador' && !novaPasta.colaboradorId) return;
    if (novaPasta.tipo === 'departamento' && !novaPasta.setorId) return;
    const pasta: PastaDocumento = {
      id: `pasta-${Date.now()}`,
      nome: novaPasta.nome.trim(),
      tipo: novaPasta.tipo,
      colaboradorId: novaPasta.tipo === 'colaborador' ? novaPasta.colaboradorId : undefined,
      donoId: novaPasta.tipo === 'pessoal' ? currentUserId : undefined,
      setorId: novaPasta.tipo === 'departamento' ? novaPasta.setorId : undefined,
      criadaEm: new Date().toISOString(),
      criadaPor: currentUserId,
      cor: novaPasta.cor,
    };
    onAddPasta?.(pasta);
    setShowCriarPastaModal(false);
    setNovaPasta({ nome: '', tipo: 'colaborador', colaboradorId: '', setorId: '', cor: CORES_PASTA[0] });
  };

  // ── Mover documento ────────────────────────────────────────────────────────
  const handleMoverDoc = (novaPastaId: string) => {
    if (!showMoverModal) return;
    const novaPastaObj = todasPastas.find(p => p.id === novaPastaId);
    // Determinar o colaboradorId correto pelo tipo da pasta de destino
    let novoColaboradorId = showMoverModal.colaboradorId;
    if (novaPastaObj) {
      if (novaPastaObj.tipo === 'colaborador') {
        novoColaboradorId = novaPastaObj.colaboradorId || showMoverModal.colaboradorId;
      } else if (novaPastaObj.tipo === 'departamento') {
        novoColaboradorId = `departamento:${novaPastaObj.setorId || ''}`;
      } else if (novaPastaObj.tipo === 'pessoal') {
        novoColaboradorId = 'pessoal';
      }
    }
    const docAtualizado: Documento = {
      ...showMoverModal,
      pastaId: novaPastaId,
      colaboradorId: novoColaboradorId,
    };
    onUpdateDocumento?.(docAtualizado);
    setShowMoverModal(null);
  };

  // ── VISÃO PRINCIPAL: Lista de Pastas ─────────────────────────────────────
  if (!pastaSelecionada) {
    const pastasFiltradas = todasPastas.filter(p =>
      !searchTerm || p.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const grupoColaborador = pastasFiltradas.filter(p => p.tipo === 'colaborador');
    const grupoPessoal = pastasFiltradas.filter(p => p.tipo === 'pessoal');
    const grupoDepartamento = pastasFiltradas.filter(p => p.tipo === 'departamento');

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Central de Documentos</h2>
            <p className="text-xs text-slate-400">{todasPastas.length} pasta(s) · {documentos.length} documento(s)</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar pastas..."
                className="pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 w-48"
              />
            </div>
            {onAddPasta && (
              <button
                onClick={() => setShowCriarPastaModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-teal-500 text-slate-950 text-xs font-bold rounded-xl hover:bg-teal-400 cursor-pointer transition"
              >
                <FolderPlus size={14} /> Nova Pasta
              </button>
            )}
          </div>
        </div>

        {/* Grupo: Pasta Pessoal */}
        {grupoPessoal.length > 0 && (
          <section>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Lock size={11} /> Minha Pasta (privada)
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {grupoPessoal.map(p => <CardPasta key={p.id} pasta={p} docs={documentos} onClick={() => setPastaSelecionada(p)} />)}
            </div>
          </section>
        )}

        {/* Grupo: Departamento */}
        {grupoDepartamento.length > 0 && (
          <section>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Building2 size={11} /> Pastas do Departamento
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {grupoDepartamento.map(p => <CardPasta key={p.id} pasta={p} docs={documentos} onClick={() => setPastaSelecionada(p)} />)}
            </div>
          </section>
        )}

        {/* Grupo: Colaboradores */}
        {grupoColaborador.length > 0 && (
          <section>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <UserCircle size={11} /> Pastas de Colaboradores
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {grupoColaborador.map(p => {
                const col = colaboradores.find(c => c.id === p.colaboradorId);
                return <CardPasta key={p.id} pasta={p} docs={documentos} onClick={() => setPastaSelecionada(p)} nomeExtra={col?.nome} />;
              })}
            </div>
          </section>
        )}

        {todasPastas.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <FolderOpen size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold">Nenhuma pasta ainda</p>
            <p className="text-xs mt-1">Crie pastas para organizar os documentos dos colaboradores.</p>
          </div>
        )}

        {/* Modal criar pasta */}
        {showCriarPastaModal && (
          <ModalCriarPasta
            colaboradores={colaboradores} setores={setores}
            currentUserId={currentUserId} currentUser={currentUser}
            novaPasta={novaPasta} setNovaPasta={setNovaPasta}
            onConfirmar={handleCriarPasta}
            onFechar={() => setShowCriarPastaModal(false)}
          />
        )}
      </div>
    );
  }

  // ── VISÃO DE PASTA: Documentos dentro da pasta ─────────────────────────────
  const nomePasta = pastaSelecionada.nome;
  const colPasta = colaboradores.find(c => c.id === pastaSelecionada.colaboradorId);

  return (
    <div className="space-y-4">
      {/* Header da pasta */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => { setPastaSelecionada(null); setSearchTerm(''); }}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl cursor-pointer transition"
            title="Voltar para pastas"
          >
            <ArrowLeft size={16} />
          </button>
          <div style={{ color: pastaSelecionada.cor || '#64748B' }}>
            <FolderOpen size={22} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-slate-900 text-base truncate">{nomePasta}</h2>
              {iconePasta(pastaSelecionada.tipo)}
            </div>
            {colPasta && <p className="text-xs text-slate-400 truncate">{colPasta.nome}</p>}
            <p className="text-[10px] text-slate-400">{documentosDaPasta.length} documento(s)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar..."
              className="pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 w-40"
            />
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-teal-500 text-slate-950 text-xs font-bold rounded-xl hover:bg-teal-400 cursor-pointer transition"
          >
            <Upload size={13} /> Enviar
          </button>
        </div>
      </div>

      {/* Lista de documentos */}
      {documentosDaPasta.length === 0 ? (
        <div
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition ${isDragging ? 'border-teal-400 bg-teal-50' : 'border-slate-200'}`}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => { e.preventDefault(); setIsDragging(false); handleFileSelect(e.dataTransfer.files); setShowUploadModal(true); }}
        >
          <Upload size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-400 text-sm font-semibold">Pasta vazia</p>
          <p className="text-xs text-slate-400 mt-1">Arraste arquivos aqui ou clique em "Enviar"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {documentosDaPasta.map(doc => {
            const cat = CATEGORIAS.find(c => c.id === doc.categoria);
            return (
              <div key={doc.id} className="bg-white border border-slate-100 rounded-2xl p-4 hover:shadow-sm transition group">
                <div className="flex items-start gap-3">
                  <div className="shrink-0">{getIconePorTipo(doc.tipoArquivo)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate" title={doc.nome}>{doc.nome}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {cat && <span className={`text-[10px] font-bold ${cat.cor}`}>{cat.nome}</span>}
                      <span className="text-[10px] text-slate-300">·</span>
                      <span className="text-[10px] text-slate-400">{formatBytes(doc.tamanho)}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(doc.dataUpload).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-50 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => setPreview({ url: doc.url, tipo: doc.tipoArquivo, nome: doc.nome })}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer transition">
                    <Eye size={11} /> Visualizar
                  </button>
                  <a href={doc.url} download={doc.nome} target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer transition">
                    <Download size={11} /> Baixar
                  </a>
                  {onUpdateDocumento && (
                    <button onClick={() => setShowMoverModal(doc)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition" title="Mover para outra pasta">
                      <Move size={11} />
                    </button>
                  )}
                  <button onClick={() => { if (confirm(`Remover "${doc.nome}"?`)) onDeleteDocumento(doc.id); }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition" title="Remover">
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Upload */}
      {showUploadModal && (
        <ModalUpload
          modoGlobal={modoGlobal} colaboradores={colaboradores}
          pastaSelecionada={pastaSelecionada}
          uploadColaboradorId={uploadColaboradorId} setUploadColaboradorId={setUploadColaboradorId}
          uploadData={uploadData} setUploadData={setUploadData}
          selectedFile={selectedFile} setSelectedFile={setSelectedFile}
          fileInputRef={fileInputRef} isUploading={isUploading}
          isDragging={isDragging} setIsDragging={setIsDragging}
          handleFileSelect={handleFileSelect}
          onUpload={handleUpload}
          onFechar={() => { setShowUploadModal(false); setSelectedFile(null); }}
        />
      )}

      {/* Modal de Mover */}
      {showMoverModal && (
        <ModalMoverDoc
          doc={showMoverModal}
          pastas={todasPastas.filter(p => p.id !== pastaSelecionada.id)}
          colaboradores={colaboradores}
          onMover={handleMoverDoc}
          onFechar={() => setShowMoverModal(null)}
        />
      )}

      {preview && <AnexoPreviewModal arquivo={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

// ── Sub-componentes ────────────────────────────────────────────────────────

function CardPasta({ pasta, docs, onClick, nomeExtra }: {
  pasta: PastaDocumento; docs: Documento[];
  onClick: () => void; nomeExtra?: string;
}) {
  const count = docs.filter(d => {
    if (d.pastaId) return d.pastaId === pasta.id;
    if (pasta.tipo === 'colaborador') return d.colaboradorId === pasta.colaboradorId && !d.pastaId;
    return false;
  }).length;
  const icones = { colaborador: <UserCircle size={13} className="text-slate-400" />, pessoal: <Lock size={13} className="text-indigo-400" />, departamento: <Building2 size={13} className="text-teal-400" /> };
  return (
    <button onClick={onClick}
      className="flex flex-col items-start gap-2 p-4 bg-white border border-slate-100 rounded-2xl hover:shadow-sm hover:border-slate-200 transition text-left cursor-pointer group w-full">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: (pasta.cor || '#64748B') + '20' }}>
        <FolderOpen size={20} style={{ color: pasta.cor || '#64748B' }} />
      </div>
      <div className="flex-1 min-w-0 w-full">
        <p className="font-bold text-slate-800 text-sm truncate group-hover:text-teal-700 transition">{pasta.nome}</p>
        {nomeExtra && <p className="text-[10px] text-slate-400 truncate">{nomeExtra}</p>}
        <div className="flex items-center gap-1.5 mt-1">
          {icones[pasta.tipo]}
          <span className="text-[10px] text-slate-400">{count} doc{count !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </button>
  );
}

function ModalCriarPasta({ colaboradores, setores, currentUserId, currentUser, novaPasta, setNovaPasta, onConfirmar, onFechar }: any) {
  const podeCriar =
    novaPasta.nome.trim() &&
    (novaPasta.tipo !== 'colaborador' || novaPasta.colaboradorId) &&
    (novaPasta.tipo !== 'departamento' || novaPasta.setorId);

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-extrabold text-slate-900">Nova Pasta</h3>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Nome da Pasta</label>
            <input value={novaPasta.nome} onChange={e => setNovaPasta((p: any) => ({ ...p, nome: e.target.value }))}
              placeholder="Ex.: Documentos de Admissão, Contratos 2026..."
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Tipo de Pasta</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: 'colaborador', label: 'Colaborador', desc: 'Vinculada a um colaborador', icone: <UserCircle size={16} /> },
                { id: 'pessoal', label: 'Minha Pasta', desc: 'Visível apenas a mim', icone: <Lock size={16} /> },
                { id: 'departamento', label: 'Departamento', desc: 'Visível ao setor', icone: <Building2 size={16} /> },
              ] as const).map(opt => (
                <button key={opt.id} type="button"
                  onClick={() => setNovaPasta((p: any) => ({ ...p, tipo: opt.id }))}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${novaPasta.tipo === opt.id ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <div className={novaPasta.tipo === opt.id ? 'text-teal-600' : 'text-slate-400'}>{opt.icone}</div>
                  <p className={`text-xs font-bold mt-1 ${novaPasta.tipo === opt.id ? 'text-teal-700' : 'text-slate-700'}`}>{opt.label}</p>
                  <p className="text-[10px] text-slate-400 leading-tight">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {novaPasta.tipo === 'colaborador' && (
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Colaborador *</label>
              <select value={novaPasta.colaboradorId}
                onChange={e => setNovaPasta((p: any) => ({ ...p, colaboradorId: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none cursor-pointer">
                <option value="">Selecionar colaborador...</option>
                {colaboradores.map((c: Colaborador) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          )}

          {novaPasta.tipo === 'departamento' && (
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Departamento *</label>
              <select value={novaPasta.setorId}
                onChange={e => setNovaPasta((p: any) => ({ ...p, setorId: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none cursor-pointer">
                <option value="">Selecionar departamento...</option>
                {setores.map((s: Setor) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Cor</label>
            <div className="flex gap-2 flex-wrap">
              {CORES_PASTA.map(cor => (
                <button key={cor} type="button" onClick={() => setNovaPasta((p: any) => ({ ...p, cor }))}
                  className={`w-7 h-7 rounded-full cursor-pointer transition ${novaPasta.cor === cor ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: cor }} />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
          <button onClick={onFechar} className="flex-1 py-2.5 border border-slate-200 text-slate-600 bg-slate-50 rounded-xl text-sm font-semibold cursor-pointer hover:bg-slate-100">Cancelar</button>
          <button onClick={onConfirmar} disabled={!podeCriar}
            className="flex-1 py-2.5 bg-teal-500 text-slate-950 font-bold rounded-xl text-sm cursor-pointer hover:bg-teal-400 disabled:opacity-40 disabled:cursor-not-allowed">
            Criar Pasta
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalUpload({ modoGlobal, colaboradores, pastaSelecionada, uploadColaboradorId, setUploadColaboradorId, uploadData, setUploadData, selectedFile, setSelectedFile, fileInputRef, isUploading, isDragging, setIsDragging, handleFileSelect, onUpload, onFechar }: any) {
  // Colaborador só é necessário quando:
  //   - Modo global E sem pasta selecionada (upload avulso)
  //   - Modo global E pasta é de colaborador (sem colaboradorId definido)
  // NÃO é necessário para pastas de departamento nem pessoal
  const pastaExigeCaborador = modoGlobal && (!pastaSelecionada || pastaSelecionada.tipo === 'colaborador');
  const colaboradorJaDefinido = !!pastaSelecionada?.colaboradorId;
  const mostrarSelectColaborador = pastaExigeCaborador && !colaboradorJaDefinido;
  const podeEnviar = selectedFile && uploadData.nome.trim() && (
    !mostrarSelectColaborador || uploadColaboradorId
  );
  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-extrabold text-slate-900">Enviar Documento</h3>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition ${isDragging ? 'border-teal-400 bg-teal-50' : selectedFile ? 'border-teal-300 bg-teal-50/50' : 'border-slate-200 hover:border-teal-300'}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => { e.preventDefault(); setIsDragging(false); handleFileSelect(e.dataTransfer.files); }}>
            <input type="file" ref={fileInputRef} className="hidden"
              onChange={e => handleFileSelect(e.target.files)} />
            {selectedFile ? (
              <div className="flex items-center justify-center gap-2 text-teal-700">
                {getIconePorTipo(selectedFile.type)}
                <div className="text-left">
                  <p className="text-sm font-bold">{selectedFile.name}</p>
                  <p className="text-xs text-slate-400">{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
              </div>
            ) : (
              <>
                <Upload size={28} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm text-slate-500 font-semibold">Arraste ou clique para selecionar</p>
                <p className="text-xs text-slate-400 mt-0.5">PDF, DOCX, PNG, JPG, etc.</p>
              </>
            )}
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Nome do Documento</label>
            <input value={uploadData.nome} onChange={e => setUploadData((p: any) => ({ ...p, nome: e.target.value }))}
              placeholder="Nome do documento..."
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
          </div>
          {mostrarSelectColaborador && (
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Colaborador</label>
              <select value={uploadColaboradorId} onChange={e => setUploadColaboradorId(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none cursor-pointer">
                <option value="">Selecionar colaborador...</option>
                {colaboradores.map((c: Colaborador) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          )}
          {pastaSelecionada?.tipo === 'departamento' && (
            <div className="flex items-center gap-2 px-3 py-2 bg-teal-50 border border-teal-200 rounded-xl">
              <Building2 size={13} className="text-teal-600 shrink-0" />
              <p className="text-xs text-teal-700 font-semibold">
                Documento de departamento — visível a todos do setor.
              </p>
            </div>
          )}
          {pastaSelecionada?.tipo === 'pessoal' && (
            <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-xl">
              <Lock size={13} className="text-indigo-600 shrink-0" />
              <p className="text-xs text-indigo-700 font-semibold">
                Documento pessoal — visível apenas a você.
              </p>
            </div>
          )}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Categoria</label>
            <div className="grid grid-cols-3 gap-1.5">
              {CATEGORIAS.map(cat => (
                <button key={cat.id} type="button"
                  onClick={() => setUploadData((p: any) => ({ ...p, categoria: cat.id }))}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${uploadData.categoria === cat.id ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  <span className={uploadData.categoria === cat.id ? 'text-teal-600' : cat.cor}>{cat.icone}</span>
                  <span className="truncate">{cat.nome}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
          <button onClick={onFechar} className="flex-1 py-2.5 border border-slate-200 text-slate-600 bg-slate-50 rounded-xl text-sm font-semibold cursor-pointer hover:bg-slate-100">Cancelar</button>
          <button onClick={onUpload} disabled={!podeEnviar || isUploading}
            className="flex-1 py-2.5 bg-teal-500 text-slate-950 font-bold rounded-xl text-sm cursor-pointer hover:bg-teal-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {isUploading ? <><div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />Enviando...</> : <><Upload size={14} />Enviar</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalMoverDoc({ doc, pastas, colaboradores, onMover, onFechar }: {
  doc: Documento; pastas: PastaDocumento[];
  colaboradores: Colaborador[]; onMover: (id: string) => void; onFechar: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-extrabold text-slate-900">Mover Documento</h3>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X size={18} /></button>
        </div>
        <p className="text-sm text-slate-500 mb-4">Selecione a pasta de destino para <strong className="text-slate-800">{doc.nome}</strong>:</p>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {pastas.map(p => {
            const col = colaboradores.find(c => c.id === p.colaboradorId);
            const icones: Record<TipoPasta, React.ReactNode> = {
              colaborador: <UserCircle size={15} className="text-slate-400" />,
              pessoal: <Lock size={15} className="text-indigo-400" />,
              departamento: <Building2 size={15} className="text-teal-400" />,
            };
            return (
              <button key={p.id} onClick={() => onMover(p.id)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-teal-50 hover:text-teal-700 rounded-xl text-sm text-left transition cursor-pointer border border-transparent hover:border-teal-200">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: (p.cor || '#64748B') + '20' }}>
                  <Folder size={16} style={{ color: p.cor || '#64748B' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{p.nome}</p>
                  {col && <p className="text-[10px] text-slate-400 truncate">{col.nome}</p>}
                </div>
                {icones[p.tipo]}
                <ChevronRight size={14} className="text-slate-300 shrink-0" />
              </button>
            );
          })}
          {pastas.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Sem outras pastas disponíveis.</p>}
        </div>
      </div>
    </div>
  );
}
