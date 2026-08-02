/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Usuario,
  Setor,
  Programa,
  ProgramaEtapaTemplate,
  AreaDesenvolvimento,
  CompetenciaBiblioteca,
  MaterialBiblioteca,
  Oferta,
} from '../../types';
import { DataService } from '../../services/DataService';
import ProgramaManager from './components/programa/ProgramaManager';
import ProgramaEtapasManager from './components/programa/ProgramaEtapasManager';
import OfertaManager from './components/programa/OfertaManager';
import { ClipboardList, RefreshCw } from 'lucide-react';

interface ProgramasDesenvolvimentoProps {
  currentUser: Usuario;
  setores: Setor[];
}

// Motor de Desenvolvimento de Colaboradores — camada de Programa (definição).
// Ver "Especificação Arquitetural Definitiva v2" e "Modelagem Física (Conceitual)".
// Programa é só o molde: nada aqui é executado por colaborador ainda — isso é
// Oferta/Inscrição/Etapa (execução real), que fica para a próxima rodada do
// Roadmap do Domínio.
const ProgramasDesenvolvimento: React.FC<ProgramasDesenvolvimentoProps> = ({ currentUser, setores }) => {
  const [carregando, setCarregando] = useState(true);
  const [programas, setProgramas] = useState<Programa[]>([]);
  const [etapas, setEtapas] = useState<ProgramaEtapaTemplate[]>([]);
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [areas, setAreas] = useState<AreaDesenvolvimento[]>([]);
  const [competencias, setCompetencias] = useState<CompetenciaBiblioteca[]>([]);
  const [materiais, setMateriais] = useState<MaterialBiblioteca[]>([]);
  const [programaSelecionadoId, setProgramaSelecionadoId] = useState<string | null>(null);

  // Somente Administrador altera a estrutura de um Programa (Regra de Negócio da
  // Especificação v2 — "Quem altera a estrutura de um Programa? Somente Administrador.").
  const podeEditar = currentUser.perfil === 'Administrador';

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    try {
      const [listaProgramas, listaAreas, listaCompetencias, listaMateriais] = await Promise.all([
        DataService.getProgramas(),
        DataService.getAreasDesenvolvimento(),
        DataService.getCompetenciasBiblioteca(),
        DataService.getMateriaisBiblioteca(),
      ]);
      setProgramas(listaProgramas);
      setAreas(listaAreas);
      setCompetencias(listaCompetencias);
      setMateriais(listaMateriais);
      setProgramaSelecionadoId((atual) => atual || listaProgramas.find((p) => p.ativo)?.id || null);
    } finally {
      setCarregando(false);
    }
  }, []);

  const carregarEtapasDoPrograma = useCallback(async (programaId: string) => {
    const [lista, listaOfertas] = await Promise.all([
      DataService.getProgramaEtapasTemplate({ programaId }),
      DataService.getOfertas({ programaId }),
    ]);
    setEtapas(lista);
    setOfertas(listaOfertas);
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  useEffect(() => {
    if (programaSelecionadoId) {
      carregarEtapasDoPrograma(programaSelecionadoId);
    } else {
      setEtapas([]);
      setOfertas([]);
    }
  }, [programaSelecionadoId, carregarEtapasDoPrograma]);

  const salvarPrograma = async (programa: Programa) => {
    await DataService.saveProgramaTemplate(programa);
    await carregarDados();
    setProgramaSelecionadoId(programa.id);
  };

  const salvarEtapa = async (etapa: ProgramaEtapaTemplate) => {
    await DataService.saveProgramaEtapaTemplate(etapa);
    if (programaSelecionadoId) await carregarEtapasDoPrograma(programaSelecionadoId);
  };

  const excluirEtapa = async (id: string) => {
    await DataService.deleteProgramaEtapaTemplate(id);
    if (programaSelecionadoId) await carregarEtapasDoPrograma(programaSelecionadoId);
  };

  const salvarOferta = async (oferta: Oferta) => {
    await DataService.saveOferta(oferta);
    if (programaSelecionadoId) await carregarEtapasDoPrograma(programaSelecionadoId);
  };
  const encerrarOferta = async (id: string) => {
    await DataService.encerrarOferta(id);
    if (programaSelecionadoId) await carregarEtapasDoPrograma(programaSelecionadoId);
  };
  const cancelarOferta = async (id: string) => {
    await DataService.cancelarOferta(id);
    if (programaSelecionadoId) await carregarEtapasDoPrograma(programaSelecionadoId);
  };

  const programaSelecionado = programas.find((p) => p.id === programaSelecionadoId) || null;

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 gap-2">
        <RefreshCw size={18} className="animate-spin" />
        Carregando Programas...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-600">
          <ClipboardList size={22} />
        </div>
        <div>
          <h2 className="font-bold text-xl text-slate-900">Programas de Desenvolvimento</h2>
          <p className="text-sm text-slate-400">
            Onboarding, PDI, Formação de Liderança, Capacitação, Certificação, Plano de Carreira e Universidade
            Corporativa — todos são Programas, parametrizados de formas diferentes.
          </p>
        </div>
      </div>

      {!podeEditar && (
        <div className="text-xs text-amber-700 bg-amber-50 rounded-2xl px-4 py-2.5">
          Você está em modo somente leitura — apenas o Administrador cadastra e edita Programas e suas Etapas.
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <ProgramaManager
          programas={programas}
          areas={areas}
          setores={setores}
          programaSelecionadoId={programaSelecionadoId}
          onSelecionarPrograma={setProgramaSelecionadoId}
          onSalvar={salvarPrograma}
          somenteLeitura={!podeEditar}
        />
        {programaSelecionado ? (
          <div className="space-y-6">
            <ProgramaEtapasManager
              programa={programaSelecionado}
              etapas={etapas}
              competencias={competencias}
              materiais={materiais}
              onSalvar={salvarEtapa}
              onExcluir={excluirEtapa}
              somenteLeitura={!podeEditar}
            />
            <OfertaManager
              programa={programaSelecionado}
              ofertas={ofertas}
              onSalvar={salvarOferta}
              onEncerrar={encerrarOferta}
              onCancelar={cancelarOferta}
              somenteLeitura={!podeEditar}
            />
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex items-center justify-center text-sm text-slate-400 h-full min-h-[200px]">
            Selecione um Programa à esquerda para gerenciar suas Etapas e Ofertas.
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgramasDesenvolvimento;
