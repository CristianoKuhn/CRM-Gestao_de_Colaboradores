// ── Motor de Disponibilidade Operacional — contratos compartilhados ─────────
// Mesmo espírito de features/escala-inteligente/engine/tiposMotor.ts: tipos
// puros, sem React e sem chamadas de rede, usados pelos demais arquivos deste
// motor. A Fase 2 só usa os tipos ligados a férias — os demais (Logger, por
// exemplo) já nascem genéricos para as fases seguintes.

export interface LoggerDisponibilidade {
  info(mensagem: string): void;
  aviso(mensagem: string): void;
}

export const consoleLoggerDisponibilidade: LoggerDisponibilidade = {
  info: (m) => console.log(`[Disponibilidade] ${m}`),
  aviso: (m) => console.warn(`[Disponibilidade] ${m}`),
};
