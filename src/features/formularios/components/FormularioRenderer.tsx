/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState } from 'react';
import { FormularioTemplate, RespostaCampo } from '../../../types';
import CampoGenerico from './campos/CampoGenerico';
import {
  deveExibirPergunta,
  listarPerguntasPendentes,
  calcularProgresso,
  respostasParaMapa,
} from '../engine/validacaoEngine';

// ═══════════════════════════════════════════════════════════════════
// MOTOR DE FORMULÁRIOS INTELIGENTES COM WORKFLOW — Sprint 3
//
// FormularioRenderer — 100% dirigido por dados (`template.categorias`),
// nenhuma pergunta hard-coded. Reaproveita a UX já validada em
// ModalAvaliacao180 (navegação por categoria, barra de progresso), mas
// funciona para qualquer FormularioTemplate, não só avaliação 180°.
// ═══════════════════════════════════════════════════════════════════

export interface FormularioRendererProps {
  template: FormularioTemplate;
  respostas: RespostaCampo[];
  papel: string;
  onChangeResposta: (perguntaId: string, valor: unknown, comentario?: string) => void;
  onSalvarRascunho: () => void;
  onConcluir: () => void;
  salvando?: boolean;
  somenteLeitura?: boolean;
  /** Rótulo extra mostrado no cabeçalho, ex.: "Atrasada — vencida em 12/06" */
  avisoPrazo?: string;
}

export default function FormularioRenderer({
  template,
  respostas,
  papel,
  onChangeResposta,
  onSalvarRascunho,
  onConcluir,
  salvando,
  somenteLeitura,
  avisoPrazo,
}: FormularioRendererProps) {
  const [etapaAtual, setEtapaAtual] = useState(0);
  const [mostrarPendencias, setMostrarPendencias] = useState(false);

  const respostasDoPapel = respostas.filter((r) => r.papel === papel);
  const respostasPorPergunta = respostasParaMapa(respostasDoPapel);
  const categorias = template.categorias;
  const categoriaAtual = categorias[etapaAtual];
  const ultimaEtapa = etapaAtual === categorias.length - 1;

  const progresso = calcularProgresso(template, respostasPorPergunta);
  const pendentes = listarPerguntasPendentes(template, respostasPorPergunta);

  const handleConcluirClick = () => {
    if (pendentes.length > 0) {
      setMostrarPendencias(true);
      return;
    }
    onConcluir();
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-slate-800">{template.nome}</h3>
          {avisoPrazo && (
            <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
              {avisoPrazo}
            </span>
          )}
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5">
          <div
            className="bg-emerald-500 h-1.5 rounded-full transition-all"
            style={{ width: `${progresso}%` }}
          />
        </div>
        <div className="flex gap-3 mt-2 flex-wrap">
          {categorias.map((cat, idx) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setEtapaAtual(idx)}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-full transition ${
                idx === etapaAtual
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {cat.nome}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {categoriaAtual?.perguntas
          .filter((pergunta) => deveExibirPergunta(pergunta, respostasPorPergunta))
          .map((pergunta) => {
            const resposta = respostasPorPergunta[pergunta.id];
            const pendente = pendentes.some((p) => p.id === pergunta.id);
            return (
              <div key={pergunta.id}>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                  {pergunta.label}
                  {pergunta.obrigatoria && <span className="text-rose-500 ml-1">*</span>}
                </label>
                {pergunta.descricao && (
                  <p className="text-[11px] text-slate-400 mb-1.5">{pergunta.descricao}</p>
                )}
                <CampoGenerico
                  pergunta={pergunta}
                  valor={resposta?.valor ?? null}
                  comentario={resposta?.comentario}
                  onChange={(valor, comentario) => onChangeResposta(pergunta.id, valor, comentario)}
                  somenteLeitura={somenteLeitura}
                />
                {mostrarPendencias && pendente && (
                  <p className="text-[11px] text-rose-500 mt-1">Este campo é obrigatório.</p>
                )}
              </div>
            );
          })}
      </div>

      {!somenteLeitura && (
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex gap-2">
            {etapaAtual > 0 && (
              <button
                type="button"
                onClick={() => setEtapaAtual((e) => e - 1)}
                className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Voltar
              </button>
            )}
            {!ultimaEtapa && (
              <button
                type="button"
                onClick={() => setEtapaAtual((e) => e + 1)}
                className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Próxima categoria
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={salvando}
              onClick={onSalvarRascunho}
              className="px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition disabled:opacity-50"
            >
              {salvando ? 'Salvando…' : 'Salvar rascunho'}
            </button>
            {ultimaEtapa && (
              <button
                type="button"
                disabled={salvando}
                onClick={handleConcluirClick}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition disabled:opacity-50"
              >
                Concluir avaliação
              </button>
            )}
          </div>
        </div>
      )}

      {mostrarPendencias && pendentes.length > 0 && (
        <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          Ainda há {pendentes.length} campo(s) obrigatório(s) sem resposta. Eles estão marcados com{' '}
          <span className="text-rose-500">*</span> — o rascunho já está salvo, você pode voltar depois.
        </p>
      )}
    </div>
  );
}
