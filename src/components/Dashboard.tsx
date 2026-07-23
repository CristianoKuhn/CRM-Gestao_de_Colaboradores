# Motor de Formulários Inteligentes com Workflow — Documentação Técnica
Gestão360 · CRM-Gestao_de_Colaboradores
*Documento vivo — atualize esta seção sempre que o motor ganhar um novo tipo de processo, campo ou regra.*

---

## 1. O que é isto

Uma plataforma genérica de formulários corporativos com fluxo de trabalho, construída sobre React + TypeScript (frontend) e Google Apps Script + Google Sheets (backend). Ela nasceu para resolver um bug específico — o status "Atrasada" bloqueando a execução de avaliações — mas foi generalizada para suportar qualquer processo baseado em formulário: avaliações de experiência, 180°, 360°, anuais, feedbacks, PDI, pesquisas de clima/satisfação, onboarding, offboarding, checklists, auditorias, inspeções.

**Princípio central, válido para todo o sistema:** *status é dado, ação é derivada*. Nenhuma tela decide sozinha se uma ação está disponível a partir de uma condição solta (`{atrasado} && <botão>`); essa decisão é sempre calculada por uma função do motor, a partir dos fatos (estado do workflow + indicador de prazo + papel do usuário).

---

## 2. Mapa de arquivos

```
src/types.ts                                   → entidades do motor (seção 4)
src/services/DataService.ts                    → CRUD + fallback local + facade

src/features/formularios/
  engine/
    workflowEngine.ts       → transições de estado, genérico por WorkflowDefinicao
    slaEngine.ts             → atraso (eixo ortogonal ao workflow — seção 5)
    validacaoEngine.ts       → obrigatoriedade + exibirSe
    calculoEngine.ts         → média simples/ponderada, condicionais, parecer
    comparativoEngine.ts     → diff de respostas entre papéis (autoavaliação)
    acoesDisponiveis.ts      → motor simplificado usado pelo Dashboard (lembretes)
  components/
    FormularioRenderer.tsx   → orquestra um FormularioTemplate genérico
    PainelResultado.tsx      → média/parecer em tempo real
    HistoricoInstancias.tsx  → linha do tempo (usado no perfil do colaborador)
    ComparativoRespostas.tsx → visão lado a lado gestor × colaborador
    PainelAnalyticsFormularios.tsx → métricas agregadas (Dashboard)
    campos/
      CampoGenerico.tsx      → factory por PerguntaFormulario.tipo
      CampoNota.tsx, CampoTextoCurto.tsx, CampoTextoLongo.tsx, CampoSimNao.tsx

src/components/
  ModalFormularioAvaliacao.tsx → carrega template+instância+respostas e monta a tela
  Dashboard.tsx                 → aciona o modal a partir dos lembretes
  ColaboradorProfile.tsx        → exibe o HistoricoInstancias do colaborador

Code.gs (Apps Script)           → SHEETS, ações get/save, seedFormulariosIniciais_()
```

---

## 3. Camadas e responsabilidades

| Camada | Onde vive | Responsabilidade |
|---|---|---|
| Dado do processo | `FormularioTemplate` (planilha `FormularioTemplates`) | O que perguntar, como calcular, qual workflow seguir — **nunca hard-coded em componente** |
| Fluxo | `WorkflowDefinicao` (planilha `WorkflowDefinicoes`) | Estados e transições, desacoplados de qualquer processo |
| Instância | `FormularioInstancia` (planilha `FormularioInstancias`) | Uma execução do processo para uma entidade (hoje sempre um colaborador) |
| Resposta | `RespostaCampo` (planilha `RespostasCampos`) | Um valor por pergunta × instância × papel |
| Histórico | `HistoricoEstadoInstancia` (planilha `HistoricoEstadosInstancias`) | Toda transição de estado, com quem e quando |
| Motores | `src/features/formularios/engine/*.ts` | Funções puras que leem os dados acima e devolvem decisões (estado, ação, cálculo, validação) |
| UI | `FormularioRenderer` + `campos/*` | Renderiza `FormularioTemplate.categorias` sem nenhuma pergunta hard-coded |
| Orquestração | `ModalFormularioAvaliacao.tsx` | Carrega tudo, chama os motores, persiste via `DataService` |

---

## 4. Modelo de dados (resumo — ver `types.ts` para os tipos completos)

- **`FormularioTemplate`** — versionado (`templateFamiliaId` + `versao`); uma vez que exista instância vinculada a um `id` de template, esse `id` é imutável (o backend recusa o save — ver `Code.gs`, ação `saveFormularioTemplate`). `categorias` e `regrasCalculo` são JSON dentro da célula, seguindo o padrão já usado no projeto para estruturas de forma variável.
- **`WorkflowDefinicao`** — `estados` + `transicoes`, reutilizável por N templates. Hoje existem dois: `workflow-simples` (pendente → concluída) e `workflow-padrao-avaliacao` (pendente → em_andamento → concluída → arquivada, com ramificações para rascunho/justificar atraso/reagendar).
- **`FormularioInstancia`** — carrega snapshot organizacional (`setorId`, `cargoId`, `liderId`, `empresaId`) no momento da criação, para Analytics não quebrar se o colaborador mudar de setor depois. Também tem os campos reservados de IA (seção 7).
- **`RespostaCampo`** — uma linha por pergunta × instância × papel. É o "papel" (`'gestor'`, `'colaborador'`, ...) que sustenta autoavaliação sem duplicar entidade.
- **`HistoricoEstadoInstancia`** — gravado toda vez que `estadoWorkflow` muda de fato (não em transições "mesmo estado", como salvar rascunho).

---

## 5. A separação SLA × Workflow

Esta é a decisão de arquitetura mais importante do projeto — é o que resolve o bug original de forma que nenhum processo futuro possa reintroduzi-lo.

`estadoWorkflow` (pendente/em_andamento/concluída/...) e `slaStatus` (no_prazo/atrasado/sem_prazo, calculado por `slaEngine.calcularSla`) são **eixos independentes**. Nenhum grafo de `WorkflowDefinicao` tem um nó `"atrasado"`. A lista de ações de uma instância (`getAcoesDisponiveis`, ou a versão simplificada `getAcoesLembreteAvaliacao` usada hoje no Dashboard) é sempre calculada a partir do `estadoWorkflow`; o `slaStatus` no máximo **adiciona** ações (justificar atraso, reagendar) ou muda a cor do badge — nunca remove a ação de realizar/continuar.

---

## 6. Motor de cálculo — como funciona a prioridade

`calculoEngine.calcularResultado` aplica todas as regras de `template.regrasCalculo` e, para o parecer final, cada regra que "vence" propõe um candidato com uma prioridade:

| Tipo de regra | Prioridade |
|---|---|
| `nota_minima_obrigatoria` (`seFalhar`) | 1000 (sempre vence) |
| `condicional` (`entao.prioridade`) | 100 por padrão, customizável |
| `faixa_parecer` | -1 (é o "padrão", qualquer regra mais específica sobrescreve) |

O parecer final é sempre o candidato de maior prioridade entre os que dispararam — **independente da ordem das regras no array**. É assim que "se Segurança < 8 → Reprovado, mesmo com média 9" funciona sem nenhum código específico do processo.

`formula_customizada` está no tipo (`RegraCalculo.tipo`) e é ignorada com segurança pelo motor — reservada para quando a avaliação de expressões customizadas for implementada.

---

## 7. Preparação para IA (não implementada)

Campos reservados em `FormularioInstancia`, todos nulos até a funcionalidade existir: `iaParecerTecnico`, `iaFeedbackGestor`, `iaFeedbackColaborador`, `iaPontosFortes`, `iaPontosMelhoria`, `iaSugestoesPdi`, `iaRecomendacoesTreinamento`, `iaGeradoEm`, `iaModeloUsado`.

**Ponto de integração:** `ModalFormularioAvaliacao.handleConcluir` (frontend) é onde a instância é marcada como concluída. É ali — ou numa ação nova no `Code.gs` equivalente (`concluirInstanciaComIA`, por exemplo) — que uma chamada a um serviço de IA entraria, populando os campos acima antes ou depois de `saveFormularioInstancia`. `RespostaCampo.comentario` e respostas de texto são guardadas como texto plano (nunca HTML), exatamente para serem consumidas diretamente como contexto por um LLM sem parsing extra.

---

## 8. Preparação para Analytics (implementado: leitura inicial)

`PainelAnalyticsFormularios.tsx` já prova a modelagem: busca todas as `FormularioInstancia`, filtra concluídas e calcula em memória — total concluídas, média geral, distribuição de parecer, tempo médio de conclusão (`dataConclusao - dataInicio`). Nenhuma tabela de agregação foi criada; os dados brutos (respostas normalizadas linha a linha, snapshot organizacional, timestamps de transição) já sustentam isso.

Perguntas ainda não respondidas por código, mas que a modelagem já sustenta sem migração: "qual competência tem menor média" (agrupar `RespostasCampos` por `pergunta_id`), "qual gestor tem maior índice de aprovação" (cruzar `resultado.parecerFinal` com `responsavelId`), "qual departamento evoluiu mais" (cruzar `setorId` snapshot com evolução de `mediaPonderada` ao longo do tempo por colaborador).

---

## 9. Como adicionar um novo tipo de processo (ex.: Pesquisa de Clima)

Nenhuma linha de código deveria ser necessária além de, no máximo, um novo tipo de pergunta (se nenhum dos existentes servir). Passo a passo:

1. Escolher ou criar um `WorkflowDefinicao` (o `workflow-simples` já serve para processos sem aprovação/rascunho complexo).
2. Criar um `FormularioTemplate` novo: `templateFamiliaId` único, `tipoProcesso` livre (ex.: `'pesquisa_clima'`), `categorias`/`perguntas` no formato de `PerguntaFormulario`, `regrasCalculo` (pode ser vazio se não precisar de parecer automático).
3. Se o processo não for por colaborador (ex.: uma auditoria de loja), usar `entidadeTipo` diferente de `'colaborador'` ao criar a `FormularioInstancia` — o modelo já suporta.
4. Reaproveitar `ModalFormularioAvaliacao.tsx` como referência de orquestração, ou construir um modal próprio que monte `FormularioRenderer` do mesmo jeito — o componente já é genérico.

## 10. Como adicionar um novo tipo de campo

Criar `src/features/formularios/components/campos/CampoNovoTipo.tsx` seguindo a interface `CampoProps` (`CampoNota.tsx`) e registrar no `switch` de `CampoGenerico.tsx`. Nenhuma outra tela precisa mudar.

## 11. Como adicionar uma nova regra de cálculo

Adicionar o `tipo` em `RegraCalculo` (`types.ts`) e um `case` novo em `aplicarRegra` (`calculoEngine.ts`). O contrato de saída é sempre: ou escreve em `estado.mediaGeral`/`mediaPonderada`/`camposCalculados`, ou empilha um candidato em `candidatosParecer` com uma prioridade.

---

## 12. Histórico dos sprints

| Sprint | Entregue |
|---|---|
| 1 | Correção do bug (atrasada nunca esconde a ação) + primeira separação status/ação |
| 2 | Modelagem completa (5 novas abas), ações no Apps Script, `DataService`, `workflowEngine`/`slaEngine`, seed dos 2 workflows + template v1 de Experiência |
| 3 | Formulário digital genérico (`FormularioRenderer`, campos, `validacaoEngine`), rascunho persistido |
| 4 | `calculoEngine`, parecer automático, `PainelResultado` em tempo real, `HistoricoInstancias` no perfil, migração da Avaliação 180° para o motor genérico (com escrita em paralelo em `Resultados180`) |
| 5 | `permiteAutoavaliacao`, `comparativoEngine`, `ComparativoRespostas`, `PainelAnalyticsFormularios` |
| 6 | Preparação de IA (já coberta desde o Sprint 2, documentada aqui), esta documentação, remoção do `ModalAvaliacao180.tsx` (código morto) |

---

## 13. Compatibilidade mantida de propósito (não remover sem avaliar)

- **`Resultados180`** continua recebendo escrita em paralelo quando uma Avaliação 180° é concluída pelo motor genérico. Remover exige confirmar que nenhuma tela/relatório antigo ainda lê essa planilha diretamente.
- **`Colaborador.avaliacoesCompletas`** continua sendo atualizado a cada conclusão (Experiência e 180°), porque `Dashboard.calculateReminders` ainda o usa para não gerar lembrete de algo já concluído. A fonte de verdade real passou a ser `FormularioInstancia.estadoWorkflow === 'concluida'`, mas a migração completa dessa leitura não foi feita.

## 14. Limitações conhecidas / próximos passos sugeridos

- Os tipos de pergunta `numero`, `data`, `multipla_escolha`, `lista`, `escala`, `upload_arquivo`, `assinatura` e `campo_calculado` estão previstos no modelo (`TipoPergunta`) mas **não têm componente de campo implementado** — `CampoGenerico` mostra um aviso neutro se um template os referenciar. Implementar sob demanda, seguindo a seção 10.
- `formula_customizada` (motor de cálculo) está no contrato mas não tem avaliador de expressão implementado.
- A geração automática de `FormularioInstancia` a partir de regras de RH (ex.: "criar avaliação de 90 dias automaticamente") não foi implementada — hoje a instância só é criada na primeira vez que alguém abre o formulário pelo Dashboard. Isso é diferente de `gerarAlertasAutomaticos()`, que continua gerando os *lembretes* visuais independentemente.
- Não há tela de administração para criar/editar `FormularioTemplate` e `WorkflowDefinicao` pela interface — hoje isso é feito só via `seedFormulariosIniciais_()` ou diretamente na planilha.
- `ModalAvaliacao180.tsx` deve ser **apagado do repositório** (nenhum arquivo mais o importa desde o Sprint 6).
