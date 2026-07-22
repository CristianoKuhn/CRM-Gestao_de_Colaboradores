/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import CampoNota, { CampoProps } from './CampoNota';
import CampoTextoCurto from './CampoTextoCurto';
import CampoTextoLongo from './CampoTextoLongo';
import CampoSimNao from './CampoSimNao';

// ═══════════════════════════════════════════════════════════════════
// MOTOR DE FORMULÁRIOS INTELIGENTES COM WORKFLOW — Sprint 3
//
// CampoGenerico — factory por `pergunta.tipo`. Nenhuma tela precisa de
// switch próprio: adicionar um novo tipo de campo é só um componente novo
// aqui, nunca uma alteração em FormularioRenderer ou em qualquer modal.
//
// Tipos implementados neste sprint: nota, texto_curto, texto_longo, sim_nao
// — suficientes para a Avaliação de Experiência. Os demais tipos previstos
// na arquitetura (numero, data, multipla_escolha, lista, escala, upload_arquivo,
// assinatura, campo_calculado) entram quando um template futuro exigir,
// conforme priorização combinada — ver documento de arquitetura, seção 9,
// pergunta 3. Até lá, `exibirTipoNaoSuportado` evita que o formulário quebre
// se um template referenciar um desses tipos por engano.
// ═══════════════════════════════════════════════════════════════════

function TipoNaoSuportado({ pergunta }: CampoProps) {
  return (
    <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
      Tipo de campo "{pergunta.tipo}" ainda não é suportado nesta versão do motor de formulários.
    </div>
  );
}

export default function CampoGenerico(props: CampoProps) {
  switch (props.pergunta.tipo) {
    case 'nota':
      return <CampoNota {...props} />;
    case 'texto_curto':
      return <CampoTextoCurto {...props} />;
    case 'texto_longo':
      return <CampoTextoLongo {...props} />;
    case 'sim_nao':
      return <CampoSimNao {...props} />;
    default:
      return <TipoNaoSuportado {...props} />;
  }
}
