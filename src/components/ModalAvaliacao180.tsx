/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Star, CheckCircle, AlertCircle, User, Calendar } from 'lucide-react';
import { Colaborador, AvaliacaoExperiencia, Cargo, Setor } from '../types';

interface RespostaAvaliacao {
  perguntaId: string;
  nota: number;
  comentario: string;
}

interface ModalAvaliacao180Props {
  isOpen: boolean;
  onClose: () => void;
  colaborador: Colaborador;
  avaliacao: AvaliacaoExperiencia;
  onSave: (respostas: RespostaAvaliacao[], resultado: 'aprovado' | 'reprovado', observacoes: string) => void;
  cargo?: Cargo;
  setor?: Setor;
}

// Perguntas da Avaliação 180°
const PERGUNTAS_AVALIACAO_180 = [
  {
    id: 'comp_tecnica',
    categoria: 'Competências Técnicas',
    perguntas: [
      {
        id: 'tec_1',
        texto: 'O colaborador demonstra conhecimento técnico adequado para a função?',
        peso: 3,
      },
      {
        id: 'tec_2',
        texto: 'A qualidade do trabalho entregue atende aos padrões esperados?',
        peso: 3,
      },
      {
        id: 'tec_3',
        texto: 'O colaborador consegue resolver problemas técnicos de forma autônoma?',
        peso: 2,
      },
    ],
  },
  {
    id: 'comp_comportamentais',
    categoria: 'Competências Comportamentais',
    perguntas: [
      {
        id: 'comp_1',
        texto: 'O colaborador demonstra comprometimento com as atividades e prazos?',
        peso: 3,
      },
      {
        id: 'comp_2',
        texto: 'A comunicação com colegas, líderes e clientes é efetiva?',
        peso: 2,
      },
      {
        id: 'comp_3',
        texto: 'O colaborador demonstra trabalho em equipe e colaboração?',
        peso: 2,
      },
      {
        id: 'comp_4',
        texto: 'O colaborador demonstra proatividade e iniciativa?',
        peso: 2,
      },
      {
        id: 'comp_5',
        texto: 'O colaborador demonstra capacidade de adaptação a mudanças?',
        peso: 2,
      },
    ],
  },
  {
    id: 'metas_obj',
    categoria: 'Metas e Objetivos',
    perguntas: [
      {
        id: 'met_1',
        texto: 'As metas estabelecidas foram cumpridas de forma satisfatória?',
        peso: 3,
      },
      {
        id: 'met_2',
        texto: 'O colaborador demonstra alinhamento com os objetivos da empresa?',
        peso: 2,
      },
      {
        id: 'met_3',
        texto: 'A gestão do tempo e priorização de tarefas é adequada?',
        peso: 2,
      },
    ],
  },
  {
    id: 'desenvolvimento',
    categoria: 'Desenvolvimento e Crescimento',
    perguntas: [
      {
        id: 'dev_1',
        texto: 'O colaborador demonstra interesse em aprender e se desenvolver?',
        peso: 2,
      },
      {
        id: 'dev_2',
        texto: 'O colaborador aceita feedback de forma construtiva?',
        peso: 2,
      },
      {
        id: 'dev_3',
        texto: 'Há demonstração de crescimento desde a admissão?',
        peso: 2,
      },
    ],
  },
];

export default function ModalAvaliacao180({
  isOpen,
  onClose,
  colaborador,
  avaliacao,
  onSave,
  cargo,
  setor,
}: ModalAvaliacao180Props) {
  const [respostas, setRespostas] = useState<Record<string, RespostaAvaliacao>>({});
  const [observacoes, setObservacoes] = useState('');
  const [resultado, setResultado] = useState<'aprovado' | 'reprovado'>('aprovado');
  const [etapaAtual, setEtapaAtual] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isOpen) return null;

  const todasPerguntas = PERGUNTAS_AVALIACAO_180.flatMap(cat => cat.perguntas);
  const perguntasRespondidas = Object.keys(respostas).length;
  const totalPerguntas = todasPerguntas.length;
  const progresso = (perguntasRespondidas / totalPerguntas) * 100;

  const handleNota = (perguntaId: string, nota: number) => {
    setRespostas(prev => ({
      ...prev,
      [perguntaId]: {
        perguntaId,
        nota,
        comentario: prev[perguntaId]?.comentario || '',
      },
    }));
  };

  const handleComentario = (perguntaId: string, comentario: string) => {
    setRespostas(prev => ({
      ...prev,
      [perguntaId]: {
        perguntaId,
        nota: prev[perguntaId]?.nota || 0,
        comentario,
      },
    }));
  };

  const calcularMediaPonderada = () => {
    let somaNotas = 0;
    let somaPesos = 0;

    todasPerguntas.forEach(p => {
      const resposta = respostas[p.id];
      if (resposta && resposta.nota > 0) {
        somaNotas += resposta.nota * p.peso;
        somaPesos += p.peso;
      }
    });

    return somaPesos > 0 ? somaNotas / somaPesos : 0;
  };

  const podeAvancar = () => {
    const categoria = PERGUNTAS_AVALIACAO_180[etapaAtual];
    return categoria.perguntas.every(p => respostas[p.id]?.nota > 0);
  };

  const handleSalvar = () => {
    const respostasArray: RespostaAvaliacao[] = Object.values(respostas);
    onSave(respostasArray, resultado, observacoes);
    onClose();
  };

  const calcularMedia = () => {
    let total = 0;
    let count = 0;
    Object.values(respostas).forEach((r: RespostaAvaliacao) => {
      if (r.nota > 0) {
        total += r.nota;
        count++;
      }
    });
    return count > 0 ? (total / count).toFixed(1) : '0';
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Star size={24} />
                Avaliação 180° - {avaliacao.dias} Dias
              </h2>
              <p className="text-indigo-100 text-sm mt-1">
                Avaliação de desempenho do período de experiência
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition cursor-pointer"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Info do Colaborador */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white font-bold">
            {colaborador.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
          </div>
          <div>
            <p className="font-bold text-slate-900">{colaborador.nome}</p>
            <p className="text-sm text-slate-500">
              {cargo?.nome || 'Cargo'} • {setor?.nome || 'Setor'}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1 text-slate-500">
              <Calendar size={16} />
              Admissão: {new Date(colaborador.dataAdmissao).toLocaleDateString('pt-BR')}
            </div>
            <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-bold">
              Vencimento: {new Date(avaliacao.dataVencimento).toLocaleDateString('pt-BR')}
            </div>
          </div>
        </div>

        {/* Progresso */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">
              Progresso: {perguntasRespondidas}/{totalPerguntas} perguntas
            </span>
            <span className="text-xs font-bold text-indigo-600">
              Média Atual: {calcularMedia()}
            </span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
              style={{ width: `${progresso}%` }}
            />
          </div>
        </div>

        {/* Navegação por Etapas */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 flex gap-2 overflow-x-auto">
          {PERGUNTAS_AVALIACAO_180.map((cat, idx) => {
            const respondidas = cat.perguntas.filter(p => respostas[p.id]?.nota > 0).length;
            const total = cat.perguntas.length;
            const completo = respondidas === total;
            
            return (
              <button
                key={cat.id}
                onClick={() => setEtapaAtual(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                  etapaAtual === idx
                    ? 'bg-indigo-600 text-white'
                    : completo
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.categoria} ({respondidas}/{total})
              </button>
            );
          })}
        </div>

        {/* Conteúdo */}
        <div className="p-6 overflow-y-auto max-h-[40vh]">
          {showConfirm ? (
            <div className="space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <h3 className="font-bold text-amber-800 flex items-center gap-2 mb-3">
                  <AlertCircle size={20} />
                  Confirmar Avaliação
                </h3>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-white rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-indigo-600">{calcularMedia()}</p>
                    <p className="text-xs text-slate-500">Média Geral</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center">
                    <p className={`text-2xl font-bold ${calcularMediaPonderada() >= 3.5 ? 'text-green-600' : 'text-amber-600'}`}>
                      {calcularMediaPonderada().toFixed(1)}
                    </p>
                    <p className="text-xs text-slate-500">Média Ponderada</p>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Resultado Final
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setResultado('aprovado')}
                      className={`flex-1 py-3 rounded-xl font-medium transition cursor-pointer ${
                        resultado === 'aprovado'
                          ? 'bg-green-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      ✓ Aprovado
                    </button>
                    <button
                      onClick={() => setResultado('reprovado')}
                      className={`flex-1 py-3 rounded-xl font-medium transition cursor-pointer ${
                        resultado === 'reprovado'
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      ✗ Reprovado
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Observações e Comentários Finais
                  </label>
                  <textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Descreva pontos fortes, áreas de melhoria, plano de ação..."
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-32 resize-none"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <h3 className="font-bold text-slate-800 text-lg">
                {PERGUNTAS_AVALIACAO_180[etapaAtual].categoria}
              </h3>
              
              {PERGUNTAS_AVALIACAO_180[etapaAtual].perguntas.map((pergunta) => (
                <div key={pergunta.id} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{pergunta.texto}</p>
                      <p className="text-xs text-slate-400 mt-1">Peso: {pergunta.peso}</p>
                    </div>
                  </div>
                  
                  {/* Escala de 1-5 */}
                  <div className="flex gap-2 mb-3">
                    {[1, 2, 3, 4, 5].map((nota) => (
                      <button
                        key={nota}
                        onClick={() => handleNota(pergunta.id, nota)}
                        className={`flex-1 py-3 rounded-xl font-bold transition cursor-pointer ${
                          respostas[pergunta.id]?.nota === nota
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300'
                        }`}
                      >
                        {nota}
                      </button>
                    ))}
                  </div>
                  
                  {/* Legenda */}
                  <div className="flex justify-between text-[10px] text-slate-400 mb-3">
                    <span>1 - Não Atende</span>
                    <span>3 - Atende Parcialmente</span>
                    <span>5 - Supera Expectativas</span>
                  </div>
                  
                  {/* Comentário opcional */}
                  <textarea
                    value={respostas[pergunta.id]?.comentario || ''}
                    onChange={(e) => handleComentario(pergunta.id, e.target.value)}
                    placeholder="Comentário opcional (evidências, exemplos)..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none h-16"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="text-sm text-slate-500">
            {showConfirm ? (
              <span className="text-amber-600 font-medium">
                Revise as informações antes de confirmar
              </span>
            ) : (
              <span>
                Categoria {etapaAtual + 1} de {PERGUNTAS_AVALIACAO_180.length}
              </span>
            )}
          </div>
          
          <div className="flex gap-3">
            {showConfirm ? (
              <>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-300 transition cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  onClick={handleSalvar}
                  className="px-6 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle size={18} />
                  Confirmar Avaliação
                </button>
              </>
            ) : (
              <>
                {etapaAtual > 0 && (
                  <button
                    onClick={() => setEtapaAtual(prev => prev - 1)}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-300 transition cursor-pointer"
                  >
                    Anterior
                  </button>
                )}
                {etapaAtual < PERGUNTAS_AVALIACAO_180.length - 1 ? (
                  <button
                    onClick={() => setEtapaAtual(prev => prev + 1)}
                    disabled={!podeAvancar()}
                    className={`px-4 py-2 rounded-xl font-medium transition cursor-pointer ${
                      podeAvancar()
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    Próximo
                  </button>
                ) : (
                  <button
                    onClick={() => setShowConfirm(true)}
                    disabled={perguntasRespondidas < totalPerguntas}
                    className={`px-6 py-2 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer ${
                      perguntasRespondidas >= totalPerguntas
                        ? 'bg-amber-500 text-white hover:bg-amber-600'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Star size={18} />
                    Finalizar Avaliação
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
