/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Usuario, Setor, Cargo, ConfiguracaoEscala, TurnoPadrao, RegraCobertura } from '../../types';
import { DataService } from '../../services/DataService';
import AssistenteConfiguracaoInicial from './components/AssistenteConfiguracaoInicial';
import ConfiguracaoEscalaForm from './components/ConfiguracaoEscalaForm';
import TurnosPadraoManager from './components/TurnosPadraoManager';
import RegrasCoberturaManager from './components/RegrasCoberturaManager';
import { ResultadoAssistente } from './engine/presetsConfiguracaoInicial';
import { CalendarRange, Wand2, Settings2, Clock3, ShieldCheck, RefreshCw, Lock } from 'lucide-react';

interface EscalaInteligenteProps {
  currentUser: Usuario;
  empresaId: string;
  setores: Setor[];
  cargos: Cargo[];
}

type AbaInterna = 'configuracao' | 'turnos' | 'cobertura';

const EscalaInteligente: React.FC<EscalaInteligenteProps> = ({ currentUser, empresaId, setores, cargos }) => {
  const [carregando, setCarregando] = useState(true);
  const [configuracao, setConfiguracao] = useState<ConfiguracaoEscala | null>(null);
  const [turnos, setTurnos] = useState<TurnoPadrao[]>([]);
  const [regras, setRegras] = useState<RegraCobertura[]>([]);
  const [mostrarAssistente, setMostrarAssistente] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<AbaInterna>('configuracao');

  // Só quem administra a operação pode configurar — mesma régua de permissão já usada em Config.tsx.
  const podeConfigurar =
    currentUser.perfil === 'Administrador' || currentUser.perfil === 'Supervisor' || currentUser.perfil === 'Coordenador';

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    try {
      const [config, turnosPadrao, regrasCobertura] = await Promise.all([
        DataService.getConfiguracaoEscala(),
        DataService.getTurnosPadrao(),
        DataService.getRegrasCobertura(),
      ]);
      setConfiguracao(config);
      setTurnos(turnosPadrao);
      setRegras(regrasCobertura);
      setMostrarAssistente(!config);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const concluirAssistente = async (resultado: ResultadoAssistente) => {
    await DataService.saveConfiguracaoEscala(resultado.configuracao);
    for (const turno of resultado.turnos) {
      await DataService.saveTurnoPadrao({ ...turno, id: `turno-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` });
    }
    for (const regra of resultado.regras) {
      await DataService.saveRegraCobertura({
        ...regra,
        id: `regra-cobertura-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      });
    }
    await carregarDados();
    setMostrarAssistente(false);
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <RefreshCw size={20} className="animate-spin mr-2" /> Carregando Escala Inteligente…
      </div>
    );
  }

  if (mostrarAssistente) {
    return (
      <div className="p-6">
        <AssistenteConfiguracaoInicial
          empresaId={empresaId}
          setores={setores}
          onConcluir={concluirAssistente}
          onCancelar={configuracao ? () => setMostrarAssistente(false) : undefined}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-teal-50 flex items-center justify-center">
            <CalendarRange size={22} className="text-teal-600" />
          </div>
          <div>
            <h1 className="font-bold text-xl text-slate-800">Escala Inteligente</h1>
            <p className="text-sm text-slate-500">Base configurada. Calendário, validador e gerador chegam nas próximas fases.</p>
          </div>
        </div>
        {podeConfigurar && (
          <button
            onClick={() => setMostrarAssistente(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
          >
            <Wand2 size={14} /> Executar assistente novamente
          </button>
        )}
      </div>

      {!podeConfigurar && (
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
          <Lock size={14} />
          Você tem acesso de leitura à configuração da escala. Ajustes ficam com Administrador, Supervisor ou
          Coordenador.
        </div>
      )}

      {/* Navegação entre as três telas de configuração */}
      <div className="flex items-center gap-1.5 bg-slate-100 rounded-2xl p-1 w-fit">
        {(
          [
            { id: 'configuracao', label: 'Configuração geral', icon: Settings2 },
            { id: 'turnos', label: 'Turnos padrão', icon: Clock3 },
            { id: 'cobertura', label: 'Cobertura mínima', icon: ShieldCheck },
          ] as { id: AbaInterna; label: string; icon: typeof Settings2 }[]
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setAbaAtiva(id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
              abaAtiva === id ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {abaAtiva === 'configuracao' && configuracao && (
        <ConfiguracaoEscalaForm
          configuracao={configuracao}
          onSalvar={async (config) => {
            await DataService.saveConfiguracaoEscala(config);
            setConfiguracao(config);
          }}
          somenteLeitura={!podeConfigurar}
        />
      )}

      {abaAtiva === 'turnos' && (
        <TurnosPadraoManager
          empresaId={empresaId}
          turnos={turnos}
          setores={setores}
          onSalvar={async (turno) => {
            await DataService.saveTurnoPadrao(turno);
            await carregarDados();
          }}
          onExcluir={async (id) => {
            await DataService.deleteTurnoPadrao(id);
            await carregarDados();
          }}
          somenteLeitura={!podeConfigurar}
        />
      )}

      {abaAtiva === 'cobertura' && (
        <RegrasCoberturaManager
          empresaId={empresaId}
          regras={regras}
          setores={setores}
          cargos={cargos}
          onSalvar={async (regra) => {
            await DataService.saveRegraCobertura(regra);
            await carregarDados();
          }}
          onExcluir={async (id) => {
            await DataService.deleteRegraCobertura(id);
            await carregarDados();
          }}
          somenteLeitura={!podeConfigurar}
        />
      )}
    </div>
  );
};

export default EscalaInteligente;
