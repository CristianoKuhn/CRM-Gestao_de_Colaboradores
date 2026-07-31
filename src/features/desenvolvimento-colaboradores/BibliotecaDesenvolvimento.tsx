/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Usuario,
  Cargo,
  CapacidadeBiblioteca,
  CompetenciaBiblioteca,
  MaterialBiblioteca,
  MatrizCompetenciaCargo,
  AreaDesenvolvimento,
} from '../../types';
import { DataService } from '../../services/DataService';
import CapacidadesCompetenciasManager from './components/biblioteca/CapacidadesCompetenciasManager';
import MateriaisBibliotecaManager from './components/biblioteca/MateriaisBibliotecaManager';
import MatrizCompetenciasCargoManager from './components/biblioteca/MatrizCompetenciasCargoManager';
import AreasDesenvolvimentoManager from './components/biblioteca/AreasDesenvolvimentoManager';
import { GraduationCap, Layers, BookOpen, Target, FolderTree, RefreshCw } from 'lucide-react';

interface BibliotecaDesenvolvimentoProps {
  currentUser: Usuario;
  cargos: Cargo[];
}

type AbaInterna = 'competencias' | 'materiais' | 'matriz' | 'areas';

// Motor de Desenvolvimento de Colaboradores — camada base (Biblioteca Corporativa).
// Ver "Especificação Arquitetural Definitiva v2" e "Modelagem Física (Conceitual)".
// Programa/Oferta/Inscrição/Perfil ainda não existem — esta tela cadastra só os
// insumos que os Programas vão referenciar mais adiante no Roadmap do Domínio.
const BibliotecaDesenvolvimento: React.FC<BibliotecaDesenvolvimentoProps> = ({ currentUser, cargos }) => {
  const [carregando, setCarregando] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState<AbaInterna>('competencias');
  const [capacidades, setCapacidades] = useState<CapacidadeBiblioteca[]>([]);
  const [competencias, setCompetencias] = useState<CompetenciaBiblioteca[]>([]);
  const [materiais, setMateriais] = useState<MaterialBiblioteca[]>([]);
  const [matriz, setMatriz] = useState<MatrizCompetenciaCargo[]>([]);
  const [areas, setAreas] = useState<AreaDesenvolvimento[]>([]);

  // Somente Administrador cadastra/edita a Biblioteca (Regra de Negócio da Especificação
  // v2 — "Quem cria Competências/Capacidades na Biblioteca? Somente Administrador.").
  const podeEditar = currentUser.perfil === 'Administrador';

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    try {
      const [listaCapacidades, listaCompetencias, listaMateriais, listaMatriz, listaAreas] = await Promise.all([
        DataService.getCapacidadesBiblioteca(),
        DataService.getCompetenciasBiblioteca(),
        DataService.getMateriaisBiblioteca(),
        DataService.getMatrizCompetenciasCargo(),
        DataService.getAreasDesenvolvimento(),
      ]);
      setCapacidades(listaCapacidades);
      setCompetencias(listaCompetencias);
      setMateriais(listaMateriais);
      setMatriz(listaMatriz);
      setAreas(listaAreas);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const salvarCapacidade = async (capacidade: CapacidadeBiblioteca) => {
    await DataService.saveCapacidadeBiblioteca(capacidade);
    await carregarDados();
  };
  const salvarCompetencia = async (competencia: CompetenciaBiblioteca) => {
    await DataService.saveCompetenciaBiblioteca(competencia);
    await carregarDados();
  };
  const salvarMaterial = async (material: MaterialBiblioteca) => {
    await DataService.saveMaterialBiblioteca(material);
    await carregarDados();
  };
  const excluirMaterial = async (id: string) => {
    await DataService.deleteMaterialBiblioteca(id);
    await carregarDados();
  };
  const salvarMatriz = async (item: MatrizCompetenciaCargo) => {
    await DataService.saveMatrizCompetenciaCargo(item);
    await carregarDados();
  };
  const excluirMatriz = async (id: string) => {
    await DataService.deleteMatrizCompetenciaCargo(id);
    await carregarDados();
  };
  const salvarArea = async (area: AreaDesenvolvimento) => {
    await DataService.saveAreaDesenvolvimento(area);
    await carregarDados();
  };
  const excluirArea = async (id: string) => {
    await DataService.deleteAreaDesenvolvimento(id);
    await carregarDados();
  };

  const abas: { id: AbaInterna; label: string; icon: React.ElementType }[] = [
    { id: 'competencias', label: 'Capacidades & Competências', icon: Layers },
    { id: 'materiais', label: 'Materiais', icon: BookOpen },
    { id: 'matriz', label: 'Matriz por Cargo', icon: Target },
    { id: 'areas', label: 'Áreas de Desenvolvimento', icon: FolderTree },
  ];

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 gap-2">
        <RefreshCw size={18} className="animate-spin" />
        Carregando Biblioteca Corporativa...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-600">
          <GraduationCap size={22} />
        </div>
        <div>
          <h2 className="font-bold text-xl text-slate-900">Biblioteca Corporativa</h2>
          <p className="text-sm text-slate-400">
            Base do Motor de Desenvolvimento de Colaboradores — Capacidades, Competências, Materiais e Matriz de
            Cargo, reutilizáveis por qualquer Programa futuro.
          </p>
        </div>
      </div>

      {!podeEditar && (
        <div className="text-xs text-amber-700 bg-amber-50 rounded-2xl px-4 py-2.5">
          Você está em modo somente leitura — apenas o Administrador cadastra e edita a Biblioteca Corporativa.
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3">
        {abas.map((aba) => {
          const Icone = aba.icon;
          const ativa = abaAtiva === aba.id;
          return (
            <button
              key={aba.id}
              onClick={() => setAbaAtiva(aba.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                ativa ? 'bg-teal-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <Icone size={15} />
              {aba.label}
            </button>
          );
        })}
      </div>

      {abaAtiva === 'competencias' && (
        <CapacidadesCompetenciasManager
          capacidades={capacidades}
          competencias={competencias}
          onSalvarCapacidade={salvarCapacidade}
          onSalvarCompetencia={salvarCompetencia}
          somenteLeitura={!podeEditar}
        />
      )}
      {abaAtiva === 'materiais' && (
        <MateriaisBibliotecaManager
          materiais={materiais}
          onSalvar={salvarMaterial}
          onExcluir={excluirMaterial}
          somenteLeitura={!podeEditar}
        />
      )}
      {abaAtiva === 'matriz' && (
        <MatrizCompetenciasCargoManager
          cargos={cargos}
          competencias={competencias}
          matriz={matriz}
          onSalvar={salvarMatriz}
          onExcluir={excluirMatriz}
          somenteLeitura={!podeEditar}
        />
      )}
      {abaAtiva === 'areas' && (
        <AreasDesenvolvimentoManager
          areas={areas}
          onSalvar={salvarArea}
          onExcluir={excluirArea}
          somenteLeitura={!podeEditar}
        />
      )}
    </div>
  );
};

export default BibliotecaDesenvolvimento;
