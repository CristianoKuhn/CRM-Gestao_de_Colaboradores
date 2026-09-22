/**
 * GuiaUsabilidade — Gestão360
 * Manual completo do sistema com todas as funcionalidades detalhadas,
 * exemplos práticos e documentação técnica. Exportável como PDF.
 */

import React, { useState, useRef } from 'react';
import { X, BookOpen, Download, ChevronRight, Search } from 'lucide-react';

// ── Componentes de formatação ──────────────────────────────────────────────

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-extrabold text-slate-800 mb-2 mt-4 flex items-center gap-1.5">{children}</h3>;
}
function H4({ children }: { children: React.ReactNode }) {
  return <h4 className="text-xs font-bold text-slate-700 mb-1.5 mt-3">{children}</h4>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-slate-600 leading-relaxed mb-2">{children}</p>;
}
function Li({ children }: { children: React.ReactNode }) {
  return <li className="text-xs text-slate-600 leading-relaxed ml-4">{children}</li>;
}
function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc space-y-1 mb-2">{children}</ul>;
}
function Ol({ children }: { children: React.ReactNode }) {
  return <ol className="list-decimal ml-4 space-y-1 mb-2">{children}</ol>;
}

function Box({ tipo, titulo, children }: { tipo: 'exemplo' | 'atencao' | 'dica' | 'regra'; titulo?: string; children: React.ReactNode }) {
  const cfg = {
    exemplo: { bg: 'bg-teal-50 border-teal-300', label: '📌 Exemplo prático', t: 'text-teal-800', b: 'border-l-4 border-teal-400' },
    atencao: { bg: 'bg-amber-50 border-amber-300', label: '⚠️ Atenção', t: 'text-amber-800', b: 'border-l-4 border-amber-400' },
    dica:    { bg: 'bg-blue-50 border-blue-300',   label: '💡 Dica',     t: 'text-blue-800',  b: 'border-l-4 border-blue-400' },
    regra:   { bg: 'bg-indigo-50 border-indigo-300', label: '📋 Regra do sistema', t: 'text-indigo-800', b: 'border-l-4 border-indigo-400' },
  }[tipo];
  return (
    <div className={`${cfg.bg} ${cfg.b} rounded-r-xl px-4 py-3 my-3`}>
      <p className={`text-[10px] font-extrabold ${cfg.t} uppercase tracking-wider mb-1.5`}>{titulo || cfg.label}</p>
      <div className={`text-xs ${cfg.t} leading-relaxed space-y-1`}>{children}</div>
    </div>
  );
}

function Tabela({ colunas, linhas }: { colunas: string[]; linhas: string[][] }) {
  return (
    <div className="overflow-x-auto my-3">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-slate-100">
            {colunas.map(c => <th key={c} className="text-left px-3 py-2 font-bold text-slate-600 border border-slate-200">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
              {l.map((c, j) => <td key={j} className="px-3 py-2 text-slate-600 border border-slate-100">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Conteúdo das seções ────────────────────────────────────────────────────

const SECOES = [
  {
    id: 'inicio', titulo: 'Primeiros Passos', emoji: '🚀',
    conteudo: (
      <div>
        <H3>Acessando o Gestão360</H3>
        <P>Acesse pelo navegador em <strong>crm-gestao-de-colaboradores.vercel.app</strong>. Também pode ser instalado como aplicativo no computador (PWA) — clique no ícone de instalação na barra de endereço do Chrome/Edge. Uma vez instalado, aparece na barra de tarefas como qualquer outro programa e abre instantaneamente sem precisar abrir o navegador.</P>
        <P>O login é feito com <strong>e-mail e senha</strong> cadastrados pelo Administrador. No primeiro acesso, o sistema pede que você defina uma nova senha pessoal.</P>

        <H3>Perfis de Acesso</H3>
        <Tabela
          colunas={['Perfil','O que pode fazer','Visibilidade de dados']}
          linhas={[
            ['Administrador','Tudo — inclusive criar usuários, configurar Trilha & Matriz, acessar qualquer aba','Todos os colaboradores de todos os setores'],
            ['Coordenador','Todas as abas operacionais, exceto Gerenciar Usuários','Apenas os setores marcados em Setores Permitidos'],
            ['Supervisor','Visualização analítica, sem edição de configurações','Setores que supervisiona'],
            ['Líder','Registrar feedbacks, tarefas e desenvolvimento do próprio time','Apenas colaboradores do seu setor'],
          ]}
        />

        <H3>Navegação geral</H3>
        <P>O menu lateral está sempre visível. Clique em qualquer item para navegar. Ao abrir o perfil de um colaborador (em Colaboradores), você entra no CRM individual — use a seta ← para voltar à lista.</P>
        <Box tipo="dica">
          <p>O botão <strong>"Guia de Usabilidade"</strong> no cabeçalho abre este manual a qualquer momento, sem sair da tela atual.</p>
        </Box>
      </div>
    ),
  },

  {
    id: 'usuarios', titulo: 'Gerenciar Usuários', emoji: '👥',
    conteudo: (
      <div>
        <H3>Criando um novo usuário</H3>
        <P>Vá em <strong>Gerenciar Usuários → + Novo Usuário</strong>. Preencha nome, e-mail, senha inicial, perfil e os setores que ele pode acessar. As dashboards que ele vai ver são marcadas individualmente — um Líder que só usa Colaboradores e Tarefas não precisa ver Metas ou Analytics.</P>
        <Box tipo="exemplo" titulo="Criando um Líder do Suporte Técnico">
          <p>Nome: Josiel Rodrigues · E-mail: josiel@empresa.com.br<br/>Perfil: Líder · Setor Permitido: SUPORTE TÉCNICO<br/>Dashboards: Colaboradores, Tarefas de Liderança, Metas Liderança</p>
        </Box>

        <H3>Regra de ouro das senhas</H3>
        <P>Ao editar um usuário existente, <strong>deixe o campo Senha em branco se não quiser alterá-la</strong>. O sistema preserva o hash salvo. Se você preencher com qualquer valor, aquele valor se torna a nova senha provisória — e o usuário será obrigado a redefini-la no próximo login.</P>
        <Box tipo="regra">
          <p>Senhas são armazenadas como hash SHA-256 com salt. Nem o Administrador consegue ver a senha real de outro usuário — apenas redefinir.</p>
        </Box>

        <H3>Setores Permitidos e Acesso Global</H3>
        <P>Um Administrador <strong>sem setores marcados</strong> tem visão global — vê todos os colaboradores da empresa. Um Administrador <strong>com setores marcados</strong> fica restrito àqueles setores, como um Coordenador. Use esse recurso para criar gestores que só enxergam seu departamento mesmo tendo perfil Admin.</P>
      </div>
    ),
  },

  {
    id: 'colaboradores', titulo: 'Colaboradores', emoji: '🧑‍💼',
    conteudo: (
      <div>
        <H3>Cadastrando um colaborador</H3>
        <P>Em <strong>Colaboradores → + Novo Colaborador</strong>: nome, e-mail, setor, cargo, líder direto, data de admissão e cidade base. A situação inicial é sempre "Ativo".</P>
        <Box tipo="dica">
          <p>O campo <strong>Cidade Base</strong> ativa um filtro de localização nas telas de Colaboradores e Tarefas — útil para times distribuídos em várias cidades.</p>
        </Box>

        <H3>Situações do colaborador</H3>
        <P>Apenas dois estados: <strong>Ativo</strong> e <strong>Desligado</strong>. Colaboradores desligados não aparecem nas listas operacionais (Calendário, Metas, DayOff) mas ficam preservados no histórico para fins de auditoria.</P>

        <H3>Abas do perfil</H3>
        <Ul>
          <Li><strong>CRM &amp; Timeline</strong> — histórico completo de feedbacks, PDIs, ocorrências, documentos e registros de qualquer tipo</Li>
          <Li><strong>Desenvolvimento</strong> — Matriz de Capacidades, evidências registradas, Card de Prontidão para o próximo cargo e Análise por IA</Li>
        </Ul>
      </div>
    ),
  },

  {
    id: 'timeline', titulo: 'Timeline & CRM', emoji: '📋',
    conteudo: (
      <div>
        <H3>O que é a Timeline</H3>
        <P>A Timeline é o coração do CRM individual de cada colaborador. Cada registro é um evento datado que conta a história profissional da pessoa — desde feedbacks do dia a dia até mudanças de cargo e reconhecimentos formais.</P>

        <H3>Tipos de registro e o que cada um faz</H3>
        <Tabela
          colunas={['Tipo','Conta nas Metas?','Gera Tarefa?','Observação']}
          linhas={[
            ['Feedback Positivo','✅ Sim','Opcional','Base do reconhecimento informal'],
            ['Feedback Corretivo','✅ Sim','Opcional','Use para registrar conversas de alinhamento'],
            ['Conversa Individual (1:1)','✅ Sim','Opcional','Check-in periódico de alinhamento'],
            ['PDI','✅ Sim','Opcional','Plano de Desenvolvimento Individual formalizado'],
            ['Reconhecimento','✅ Sim','Não','Espelhado automaticamente na tela de Reconhecimento'],
            ['Advertência','✅ Sim','Opcional','Suporta anexo de documento assinado'],
            ['Suspensão','✅ Sim','Não','Registro disciplinar formal'],
            ['Elogio de Cliente','✅ Sim','Não','Feedback externo registrado pelo gestor'],
            ['Reclamação de Cliente','✅ Sim','Opcional','Para acompanhamento e resolução'],
            ['Mudança de Cargo','✅ Sim','Não','Atualiza automaticamente o histórico de trilha'],
            ['Observação Geral','❌ NÃO','Não','Anotação informal — nunca conta em indicadores'],
            ['Acompanhamento','✅ Sim','Não','Resultado de avaliação ou formulário'],
          ]}
        />
        <Box tipo="regra">
          <p><strong>Observação Geral</strong> é o único tipo que não conta nas Metas de Liderança. Use para notas rápidas sem comprometer indicadores.</p>
        </Box>

        <H3>Geração automática de Tarefas</H3>
        <P>Ao criar qualquer registro, marque "Gerar tarefa de acompanhamento" e defina o prazo. O sistema cria automaticamente uma Tarefa de Liderança vinculada ao colaborador. Quando a tarefa é concluída, o sistema abre o perfil do colaborador para registrar o relato — garantindo rastreabilidade.</P>
        <Box tipo="exemplo" titulo="Feedback Corretivo com acompanhamento automático">
          <p>Registre um Feedback Corretivo sobre pontualidade → marque "Gerar tarefa → 30 dias" → o sistema cria "Acompanhar evolução de pontualidade" com vencimento em 30 dias. Ao concluir a tarefa, o relato entra na timeline completando o ciclo.</p>
        </Box>

        <H3>Resumo Inteligente (IA)</H3>
        <P>O botão "Atualizar Resumo" na Timeline usa IA (Gemini) para gerar um resumo narrativo incremental do histórico do colaborador. O processamento é incremental — somente registros novos desde o último resumo são enviados à IA. O resultado fica salvo no banco.</P>
      </div>
    ),
  },

  {
    id: 'tarefas', titulo: 'Tarefas de Liderança', emoji: '✅',
    conteudo: (
      <div>
        <H3>O que são</H3>
        <P>Ações de acompanhamento vinculadas a um colaborador e a um responsável. Podem ser criadas manualmente ou geradas automaticamente por qualquer registro da Timeline.</P>

        <H3>Ciclo de uma tarefa</H3>
        <Ol>
          <li className="text-xs text-slate-600">Tarefa criada (status: Pendente)</li>
          <li className="text-xs text-slate-600">Vencimento se aproxima → aparece em "Atrasadas"</li>
          <li className="text-xs text-slate-600">Gestor clica "Concluir" → sistema abre o perfil do colaborador</li>
          <li className="text-xs text-slate-600">Gestor registra o relato na Timeline → tarefa marcada como Concluída</li>
        </Ol>
        <Box tipo="regra">
          <p>Uma tarefa concluída com relato conta como interação no Motor de Metas. Isso significa que um feedback que gerou uma tarefa contribui <strong>duas vezes</strong>: na criação e na conclusão documentada.</p>
        </Box>

        <H3>Filtros disponíveis</H3>
        <P>A tela abre com filtro "Pendentes" por padrão. Demais opções: Atrasadas, Concluídas, Todas — e por Cidade Base para times distribuídos.</P>
      </div>
    ),
  },

  {
    id: 'metas', titulo: 'Metas de Liderança', emoji: '🎯',
    conteudo: (
      <div>
        <H3>Motor de Contagem de Metas</H3>
        <P>O Motor de Metas contabiliza automaticamente todas as interações registradas na Timeline dentro do período selecionado. Funciona com 3 fontes de dados em paralelo:</P>
        <Ol>
          <li className="text-xs text-slate-600"><strong>Timeline (primária)</strong> — todos os registros com tipos que não sejam "Observação Geral"</li>
          <li className="text-xs text-slate-600"><strong>Tarefas concluídas (secundária)</strong> — conclusão documentada de ciclo de acompanhamento</li>
          <li className="text-xs text-slate-600"><strong>Acompanhamentos (complementar)</strong> — avaliações 180° e formulários finalizados</li>
        </Ol>

        <H3>Grupos de Interação</H3>
        <P>Antes de criar metas, configure os Grupos em <strong>Configurações Gerais → Grupos de Meta</strong>. Um Grupo é um agrupamento de múltiplos tipos de interação sob um nome de negócio.</P>
        <Box tipo="exemplo" titulo="Grupo 'Feedbacks Construtivos'">
          <p>Tipos incluídos: Feedback Positivo, Feedback Corretivo, Conversa Individual<br/>Cor: laranja · Este grupo aparece nas metas como "Feedbacks Construtivos (3 tipos)"</p>
        </Box>

        <H3>Meta por Líder vs. Meta por Setor</H3>
        <Tabela
          colunas={['Tipo','Conta as interações de...','Visível para...']}
          linhas={[
            ['Meta por Líder','Um único líder específico','O próprio líder e seus superiores'],
            ['Meta por Setor','Todos os líderes que têm colaboradores naquele setor','Gestores do setor'],
          ]}
        />
        <P>Uma Meta por Setor pode ser vinculada a <strong>múltiplos setores</strong> — útil para gestores que coordenam mais de um departamento.</P>

        <H3>Retroatividade</H3>
        <P>O seletor de período (mês/ano) no canto superior direito da tela permite navegar para meses anteriores. O sistema relê toda a timeline histórica retroativamente — não há dados pré-calculados que precisem ser regenerados.</P>

        <Box tipo="atencao">
          <p>Metas com <strong>liderId incorreto</strong> (criadas antes de um colaborador ser vinculado ao líder correto) precisam ser recriadas. O sistema usa o liderId salvo no momento da criação.</p>
        </Box>
      </div>
    ),
  },

  {
    id: 'gestao-pessoas', titulo: 'Gestão de Pessoas', emoji: '📅',
    conteudo: (
      <div>
        <H3>O que é a Dashboard de Gestão de Pessoas</H3>
        <P>Central de acompanhamento do ciclo de vida dos colaboradores. Contém 5 sub-abas: Dashboard, Calendário, Férias, DayOff e Desenvolvimento. Cada uma tem um motor específico descrito abaixo.</P>

        {/* CALENDÁRIO */}
        <H3>🗓 Calendário</H3>
        <P>Visão consolidada de todos os eventos da equipe em formato de calendário mensal e lista. Abre sempre no <strong>mês atual</strong>. Colaboradores desligados não aparecem. Filtros: Mês, Setor, Tipo de Evento (Férias, DayOff, Aniversário, PDI, etc.).</P>

        {/* FÉRIAS */}
        <H3>🌴 Motor de Férias — Funcionamento completo</H3>
        <P>A aba Férias é uma planilha inteligente que calcula automaticamente todos os períodos aquisitivos de cada colaborador — passados, presente e futuros (até 3 anos à frente). O gestor não precisa "gerar" períodos manualmente.</P>

        <H4>Colunas da tabela</H4>
        <Tabela
          colunas={['Coluna','Preenchimento','Regra por trás']}
          linhas={[
            ['Colaborador','Automático','Ordenado alfabeticamente, foto e setor'],
            ['Admissão','Automático','Data de admissão do colaborador'],
            ['Início Aquisitivo','Automático','Data de admissão + N anos (aniversário anual)'],
            ['Fim Aquisitivo','Automático','Início + 12 meses - 1 dia'],
            ['Gozados','Automático','Soma dos dias em férias com status ≠ planejada'],
            ['Restantes','Automático','30 - Gozados - Dias planejados'],
            ['Limite Gozo','Automático','Fim do período + 12 meses (prazo concessivo CLT)'],
            ['Concessão Início','Manual pelo gestor','Datepicker inline, valida CLT e recomendação interna'],
            ['Nº Dias','Manual pelo gestor','Mínimo 10 dias (CLT). Ao confirmar, cria o registro de férias'],
            ['Concessão Fim','Automático','Início + Nº Dias - 1 dia'],
            ['Status','Automático','Ativo / Vencido / Futuro / Planejado / Já Gozado'],
          ]}
        />

        <H4>Validações automáticas de início de férias</H4>
        <Ul>
          <Li>🚫 <strong>CLT:</strong> férias não podem iniciar quando, dentro dos 2 dias seguintes, há um DSR (sábado/domingo) ou feriado nacional. O campo exibe aviso em vermelho.</Li>
          <Li>⚠️ <strong>Recomendação interna:</strong> iniciar entre terça e quinta-feira. O campo exibe aviso em amarelo, mas não bloqueia.</Li>
          <Li>📏 <strong>Mínimo de 10 dias</strong> por concessão (configurável em Config).</Li>
        </Ul>

        <H4>Split automático de dias</H4>
        <P>Quando o gestor planeja <strong>menos que os dias restantes</strong> de um período (ex.: planejar 15 de 30 dias), o sistema:</P>
        <Ol>
          <li className="text-xs text-slate-600">Cria a linha da concessão planejada (15 dias)</li>
          <li className="text-xs text-slate-600">Gera automaticamente uma segunda linha residual (15 dias restantes a planejar)</li>
          <li className="text-xs text-slate-600">O gestor pode planejar os dias restantes na segunda linha seguindo o mesmo fluxo</li>
        </Ol>
        <Box tipo="exemplo" titulo="Split: planejando férias em duas parcelas">
          <p>Alisson tem 30 dias disponíveis. O gestor preenche Concessão Início: 23/04/2026 e Nº Dias: 15.<br/>
          → Linha 1: "15 dias planejados" (23/04 a 07/05, status Planejado)<br/>
          → Linha 2: "15 dias restantes" (sem data, status Ativo — aguardando planejamento)</p>
        </Box>

        <H4>Botão "Já Gozado"</H4>
        <P>Para períodos retroativos de colaboradores que tiraram férias antes de o sistema existir, clique <strong>"Já Gozado"</strong>. Isso marca o período como utilizado sem precisar inserir datas detalhadas. O botão <strong>"Desfazer"</strong> reverte a marcação se for feita por engano.</P>

        <H4>Filtros da aba Férias</H4>
        <Ul>
          <Li><strong>Status do período:</strong> Ativo (padrão ao abrir), Vencido, Futuro, Todos</Li>
          <Li><strong>Planejamento:</strong> Todos, Pendentes (sem concessão), Planejados (com concessão)</Li>
          <Li><strong>Busca por nome</strong> e <strong>filtro de setor</strong></Li>
        </Ul>

        {/* DAYOFF */}
        <H3>🎂 Motor de DayOff — Funcionamento completo</H3>
        <P>O DayOff é uma folga especial garantida no mês do aniversário do colaborador. O Motor de DayOff gerencia alertas, agendamentos e persistência no banco de dados.</P>

        <H4>Alerta mensal automático</H4>
        <P>No início de cada mês, um banner roxo aparece no topo da aba DayOff listando os colaboradores que fazem aniversário naquele mês e ainda não tiveram o DayOff organizado. O gestor tem 3 opções para cada colaborador no banner:</P>
        <Tabela
          colunas={['Ação','O que faz','Persistência']}
          linhas={[
            ['Agendar','Abre modal com datepicker. Ao confirmar, salva no banco (Google Sheets) com a data escolhida.','Banco de dados (permanente)'],
            ['Estou ciente','Dispensa o alerta pelo resto do mês, sem obrigação de agendar.','localStorage (até virar o mês)'],
            ['Lembrar amanhã','Remove o alerta hoje, ele retorna no dia seguinte.','localStorage (até amanhã)'],
          ]}
        />
        <Box tipo="regra">
          <p>O agendamento salvo via "Agendar" vai para o Google Sheets via DataService.saveDayOff(). O botão "Desfazer" na tabela reverte o status para "disponível" e limpa a data — também persistindo no banco.</p>
        </Box>

        {/* DESENVOLVIMENTO */}
        <H3>📈 Radar de Desenvolvimento — Funcionamento completo</H3>
        <P>Painel visual que mostra todos os colaboradores ativos ordenados pela urgência de organizar evidências para evolução de cargo. Opera em dois modos selecionáveis:</P>

        <H4>Modo "Ciclo 5 meses" (padrão ao abrir)</H4>
        <P>Baseia-se no conceito de que a cada 5 meses é o período natural de avaliação de cargo — independente de o colaborador ter sido promovido ou não. O ciclo reinicia automaticamente no 6º mês.</P>
        <Tabela
          colunas={['Cor','Situação','Critério']}
          linhas={[
            ['🔴 Iminente','Avaliar urgente','≤15 dias para completar o ciclo (configurável em Config)'],
            ['🟡 Breve','Planejar em breve','16–30 dias para completar o ciclo'],
            ['🔵 Moderado','No radar','31–45 dias'],
            ['🟢 Tranquilo','Sem urgência','Mais de 45 dias para o fim do ciclo'],
          ]}
        />
        <Box tipo="regra">
          <p>A data de início do ciclo é a <strong>última "Mudança de Cargo"</strong> registrada na Timeline para este colaborador. Se não houver registro de mudança, usa a data de admissão. Isso garante que o ciclo respeite o tempo real no cargo atual, não o tempo total de empresa.</p>
        </Box>

        <H4>Modo "Tempo no cargo"</H4>
        <P>Modo complementar que mostra o tempo total acumulado no cargo atual. Útil para identificar colaboradores que há muito tempo não têm evolução formal registrada.</P>
        <Tabela
          colunas={['Cor','Critério']}
          linhas={[
            ['🔴 Urgente','+18 meses no cargo'],
            ['🟡 Atenção','12–18 meses'],
            ['🔵 Planejamento','6–12 meses'],
            ['✅ No prazo','Menos de 6 meses ou trilha não configurada'],
          ]}
        />

        <P><strong>Clicar em qualquer card</strong> abre diretamente a aba Desenvolvimento do perfil do colaborador — sem precisar navegar pelo menu de Colaboradores.</P>
      </div>
    ),
  },

  {
    id: 'desenvolvimento', titulo: 'Motor de Desenvolvimento', emoji: '📈',
    conteudo: (
      <div>
        <H3>Graus de Domínio — Legenda Oficial</H3>
        <P>Todos os colaboradores iniciam no grau 0. O gestor avalia e atualiza o grau diretamente na aba Desenvolvimento, clicando em cada capacidade. O histórico de quem avaliou e quando fica salvo nas Evidências.</P>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 my-3">
          {[
            { ordem: 0, nome: 'Não Iniciado', desc: 'Não avaliado. Ponto de partida de todo colaborador.', cor: '#94a3b8', bg: '#f1f5f9', txt: '#475569' },
            { ordem: 1, nome: 'Consciente', desc: 'Sei que existe, mas ainda não sei usar.', cor: '#3b82f6', bg: '#eff6ff', txt: '#1d4ed8' },
            { ordem: 2, nome: 'Aplicado', desc: 'Resolve necessidades simples com apoio da wiki.', cor: '#10b981', bg: '#ecfdf5', txt: '#065f46' },
            { ordem: 3, nome: 'Avançado', desc: 'Resolve problemas avançados sem consultar documentação.', cor: '#f59e0b', bg: '#fffbeb', txt: '#92400e' },
            { ordem: 4, nome: 'Referência', desc: 'Nível avançado + capacidade de treinar novos colaboradores.', cor: '#8b5cf6', bg: '#f5f3ff', txt: '#5b21b6' },
          ].map(g => (
            <div key={g.ordem} className="rounded-xl p-2.5 text-center" style={{ background: g.bg, border: `1px solid ${g.cor}40` }}>
              <div className="w-6 h-6 rounded-full mx-auto mb-1.5 flex items-center justify-center text-white text-[10px] font-extrabold" style={{ background: g.cor }}>
                {g.ordem}
              </div>
              <p className="text-[10px] font-extrabold mb-0.5" style={{ color: g.txt }}>{g.nome}</p>
              <p className="text-[9px] leading-tight" style={{ color: g.txt, opacity: 0.8 }}>{g.desc}</p>
            </div>
          ))}
        </div>

        <Box tipo="regra" titulo="Como funciona a avaliação de grau">
          <p>Na aba Desenvolvimento do colaborador, clique em qualquer capacidade da lista. Um seletor visual com os 5 graus aparece — clique no grau desejado. Opcionalmente, adicione uma contextualização (ex.: "Resolveu o chamado #1234 sem usar wiki"). A avaliação é salva no banco com data, responsável e contexto — mas <strong>não aparece na timeline de feedbacks/CRM</strong>. O histórico completo de avaliações fica na aba <strong>Evidências</strong> do Desenvolvimento.</p>
        </Box>

        <H3>Arquitetura do Motor</H3>
        <P>O Motor de Desenvolvimento é o conjunto de funcionalidades que permite definir quais competências cada cargo exige, registrar evidências reais de evolução e calcular automaticamente se um colaborador está pronto para o próximo nível.</P>
        <Box tipo="regra" titulo="Regra de ouro">
          <p>"Treinamento concluído ≠ Competência adquirida." Assistir a uma aula marca o colaborador como Treinado. Só uma evidência prática validada por um gestor o marca como Demonstrado — e somente aí o grau de domínio evolui.</p>
        </Box>

        <H3>Hierarquia de conceitos</H3>
        <Tabela
          colunas={['Nível','O que é','Exemplo']}
          linhas={[
            ['Competência','Agrupamento macro de habilidades relacionadas','Resolução de Problemas, Comunicação'],
            ['Capacidade','Habilidade específica dentro de uma competência','Triagem de tickets, Escalonamento de chamados'],
            ['Escala de Domínio','Régua de avaliação (graus do menor ao maior)','0=Não Iniciado, 1=Consciente, 2=Aplicado, 3=Avançado, 4=Referência'],
            ['Evidência','Registro concreto que comprova o domínio','Observação do gestor, certificado de curso, auditoria de ticket'],
            ['Tipo de Evidência','Define se conta como Treinamento ou Demonstração','Participação em treinamento → Treinamento; Atendimento observado → Demonstração'],
          ]}
        />

        <H3>Configuração inicial (Passo a passo)</H3>
        <P>Tudo começa em <strong>Configurações Gerais → Trilha &amp; Matriz</strong>.</P>
        <Ol>
          <li className="text-xs text-slate-600 mb-2"><strong>Passo 1 — Crie a Escala de Domínio</strong> para o setor. Sub-aba Escalas de Domínio → Nova Escala. Defina os graus em ordem crescente com cores.
            <Box tipo="exemplo">
              <p>Escala "Suporte 2026": 0=Não Iniciado (cinza) · 1=Consciente (azul) · 2=Aplicado (verde) · 3=Avançado (âmbar) · 4=Referência (teal)</p>
            </Box>
          </li>
          <li className="text-xs text-slate-600 mb-2"><strong>Passo 2 — Crie Competências e Capacidades.</strong> Sub-aba Competências &amp; Capacidades → Nova Competência → adicione Capacidades dentro dela.
            <Box tipo="exemplo">
              <p>Competência: "Resolução de Problemas" · Capacidades: "Triagem de tickets", "Escalonamento correto", "Comunicação de solução"</p>
            </Box>
          </li>
          <li className="text-xs text-slate-600 mb-2"><strong>Passo 3 — Configure a Matriz por Cargo.</strong> Sub-aba Matriz por Cargo → crie uma Versão (ex.: "2026.1") → defina para cada cargo quais capacidades são exigidas, com o grau mínimo e se é obrigatória.
            <Box tipo="atencao">
              <p>Uma versão de Matriz com avaliações já vinculadas é imutável. Para evoluir o modelo de competências, crie uma nova versão — o histórico de ninguém é alterado retroativamente.</p>
            </Box>
          </li>
          <li className="text-xs text-slate-600 mb-2"><strong>Passo 4 — Configure os Tipos de Evidência.</strong> Sub-aba Catálogos → Tipos de Evidência. Defina se cada tipo conta como "Treinamento" (não evolui grau) ou "Demonstração" (evolui grau mediante validação do gestor).</li>
          <li className="text-xs text-slate-600"><strong>Passo 5 — Configure a Trilha de Carreira.</strong> Em Configurações → Cargos, defina o "Próximo Cargo" para cada cargo na sequência da trilha. Depois execute as funções <code>configurarTrilhaCargosPorSetorPrincipal()</code> e <code>recalcularProntidaoAgora()</code> no editor do Apps Script.</li>
        </Ol>

        <H3>Uso no dia a dia com um colaborador</H3>
        <H4>Card de Prontidão</H4>
        <P>No topo da aba Desenvolvimento de cada colaborador, o sistema calcula automaticamente a prontidão para o próximo cargo:</P>
        <Tabela
          colunas={['Estado','Significado']}
          linhas={[
            ['🟢 Pronto','Todas as capacidades obrigatórias no grau mínimo e demonstradas'],
            ['🟡 Em Desenvolvimento','Sem lacuna grave, mas alguma obrigatória está treinada e não demonstrada'],
            ['🔴 Com Lacunas','Pelo menos uma obrigatória está abaixo do grau mínimo exigido'],
          ]}
        />

        <H4>Registrando uma Evidência</H4>
        <P>Aba Capacidades → "Registrar Evidência". Escolha Competência → Capacidade → Tipo de Evidência. Se o tipo for "Demonstração", a escala aparece e você define o grau demonstrado. A evidência fica pendente até ser validada.</P>
        <Box tipo="atencao">
          <p>Registrar uma evidência não muda nada no perfil automaticamente. Ela fica com status "pendente" até que um responsável clique em <strong>Validar</strong> em Desenvolvimento → Evidências. Só após a validação o grau sobe.</p>
        </Box>

        <H4>Análise de Competências com IA</H4>
        <P>No final da aba Desenvolvimento há o painel "Análise Inteligente de Competências". Clique em "Iniciar Análise com IA" — a IA lê toda a timeline do colaborador e retorna:</P>
        <Ul>
          <Li><strong>Competências identificadas</strong> com nível (Em Desenvolvimento / Aplicado / Referência) e barra de confiança</Li>
          <Li><strong>Padrões de comportamento</strong> — persistência positiva (comportamento consolidado em 3+ registros ao longo de 60+ dias) e negativa (problema recorrente em 2+ ocorrências em 90 dias)</Li>
          <Li><strong>Recomendações de treinamento</strong> específicas, ordenadas por urgência</Li>
        </Ul>
        <Box tipo="dica">
          <p>A análise é cacheada localmente e rerealizada automaticamente quando há 3+ novos registros na timeline desde a última análise. Use o botão "Atualizar" para forçar uma nova análise a qualquer momento.</p>
        </Box>
      </div>
    ),
  },

  {
    id: 'ia', titulo: 'IA Lisa e Resumos', emoji: '🤖',
    conteudo: (
      <div>
        <H3>Lisa — Assistente Conversacional</H3>
        <P>A Lisa é a assistente de IA integrada ao sistema, acessível pelo ícone de chat flutuante. Ela tem contexto completo da plataforma: colaboradores, metas, alertas, configurações e histórico de registros.</P>
        <Box tipo="exemplo" titulo="Perguntas úteis para a Lisa">
          <p>"Quais colaboradores do Suporte não têm registro nos últimos 30 dias?"<br/>
          "Gere um resumo das metas de setembro para o Josiel."<br/>
          "Quem está mais próximo de prontidão para promoção?"<br/>
          "Liste os feedbacks corretivos registrados este mês."</p>
        </Box>

        <H3>Resumo Incremental da Timeline</H3>
        <P>Na aba CRM de cada colaborador, o botão "Atualizar Resumo" usa IA (Gemini 2.5 Flash) para gerar um resumo narrativo em linguagem natural do histórico do colaborador. O processo é incremental — somente registros novos desde o último resumo são enviados, nunca o histórico inteiro de novo. O resultado é salvo no banco (aba ResumosLinhaTempo do Google Sheets).</P>
      </div>
    ),
  },

  {
    id: 'config-geral', titulo: 'Configurações Gerais', emoji: '⚙️',
    conteudo: (
      <div>
        <H3>Estrutura organizacional</H3>
        <P>Em Configurações Gerais você cadastra a hierarquia base na ordem: Empresa → Setores → Cargos. Os Cargos são vinculados a Setores e têm um "Próximo Cargo" que define a trilha de carreira.</P>

        <H3>Grupos de Meta</H3>
        <P>Configure os grupos de interação que serão usados nas Metas de Liderança. Cada grupo combina múltiplos tipos de interação sob um nome de negócio e uma cor.</P>

        <H3>URL do Backend (Google Apps Script)</H3>
        <P>Em Configurações Gerais → Google Apps Script, cole a URL do backend implantado. Após qualquer <strong>novo deploy do Apps Script</strong>, verifique se a URL mudou — se criou uma Nova Implantação em vez de atualizar a versão existente, a URL muda e precisa ser atualizada aqui.</P>
        <Box tipo="atencao">
          <p>Se a URL estiver errada ou desatualizada, o app perde a conexão com o banco e opera em modo offline (dados do cache local). Execute a action <code>diagnostico</code> no console do navegador para verificar qual versão do backend está respondendo.</p>
        </Box>

        <H3>Config da Gestão de Pessoas</H3>
        <P>A aba Config dentro de Gestão de Pessoas parametriza 4 motores:</P>
        <Ul>
          <Li><strong>Radar de Desenvolvimento:</strong> duração do ciclo (padrão: 5 meses) e dias de alerta antes do fim do ciclo</Li>
          <Li><strong>Férias:</strong> antecedência mínima, alertas, mínimo de dias por concessão, parcelas, prazo concessivo, limite simultâneo</Li>
          <Li><strong>DayOff:</strong> prazo em dias para usar o DayOff após o aniversário</Li>
          <Li><strong>Notificações:</strong> quais alertas o sistema gera automaticamente</Li>
        </Ul>
      </div>
    ),
  },

  {
    id: 'docs', titulo: 'Central de Documentos', emoji: '📂',
    conteudo: (
      <div>
        <H3>Sistema de Pastas</H3>
        <P>A Central Docs organiza documentos em pastas com 3 tipos de visibilidade:</P>
        <Tabela
          colunas={['Tipo','Visível para','Ícone']}
          linhas={[
            ['Pasta de Colaborador','Quem tem acesso ao perfil daquele colaborador','👤'],
            ['Minha Pasta (Pessoal)','Apenas o usuário que criou a pasta','🔒'],
            ['Pasta do Departamento','Todos os usuários do setor vinculado','🏢'],
          ]}
        />
        <H3>Criando pastas e movendo documentos</H3>
        <P>Clique em "+ Nova Pasta", escolha o tipo, vincule ao colaborador ou departamento e selecione uma cor. Para mover um documento, passe o mouse sobre ele e clique no ícone de mover (→) — aparece um seletor das demais pastas disponíveis.</P>
        <Box tipo="dica">
          <p>Pastas de colaborador evitam duplicação — uma pasta por colaborador. Documentos existentes sem pasta aparecem automaticamente em uma "pasta virtual" do colaborador até serem organizados.</p>
        </Box>
      </div>
    ),
  },

  {
    id: 'indicadores', titulo: 'Indicadores Operacionais', emoji: '📊',
    conteudo: (
      <div>
        <H3>Acesso via SSO</H3>
        <P>O App-Indicadores-Operacionais é acessado diretamente pelo botão <strong>"Indicadores Operacionais"</strong> no rodapé do menu lateral. O acesso usa SSO (Single Sign-On) — o usuário não precisa digitar senha uma segunda vez.</P>

        <H4>Como funciona o SSO</H4>
        <Ol>
          <li className="text-xs text-slate-600">Clique em "Indicadores Operacionais" no Sidebar</li>
          <li className="text-xs text-slate-600">O sistema gera um token de acesso temporário (válido por 5 minutos, uso único)</li>
          <li className="text-xs text-slate-600">Um popover aparece com o botão "Abrir Indicadores Operacionais"</li>
          <li className="text-xs text-slate-600">Clique no botão — o IO abre em nova aba já logado com as permissões do seu perfil G360</li>
        </Ol>

        <H3>Permissões por perfil</H3>
        <Tabela
          colunas={['Perfil G360','Acesso no IO','Departamentos visíveis']}
          linhas={[
            ['Administrador','Todas as abas + edição','Todos os departamentos'],
            ['Coordenador','Todas as abas + edição','Setores do Setores Permitidos'],
            ['Supervisor','Painel Executivo, Evolução Histórica, Análise por Colaborador','Setores que supervisiona'],
            ['Líder','Painel Executivo, Evolução Histórica, Análise por Colaborador','Apenas o próprio setor'],
          ]}
        />

        <H3>Mapeamento de setores</H3>
        <Tabela
          colunas={['Setor no Gestão360','Departamentos no Indicadores']}
          linhas={[
            ['Suporte Técnico','suporte, call_center, multichannel, protocols, displacements'],
            ['Retenção','retencao, retention'],
          ]}
        />
        <Box tipo="dica">
          <p>O mapeamento de setores é configurável no arquivo <code>api/validar-sso-g360.ts</code> do projeto Indicadores Operacionais. Novos departamentos podem ser adicionados sem redeploy do Gestão360.</p>
        </Box>
      </div>
    ),
  },

  {
    id: 'tecnico', titulo: 'Documentação Técnica', emoji: '🔧',
    conteudo: (
      <div>
        <H3>Arquitetura do sistema</H3>
        <div className="bg-slate-900 text-emerald-400 rounded-xl p-4 font-mono text-[10px] leading-relaxed my-3">
{`GESTÃO360 — Arquitetura de Alto Nível
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FRONTEND (Vercel CDN)          BACKEND (Google Apps Script)
─────────────────────          ────────────────────────────
React 18 + TypeScript   ─────► doGet() / doPost()
Vite 5 (build)                 processRequest(action, data)
Tailwind CSS 3                 getTableData() / saveRow()
Lucide React (ícones)          deleteRow()
date-fns (datas)               ▼
Recharts (gráficos)         Google Sheets (~55 abas)
                               (banco de dados principal)

APIs SERVERLESS (Vercel)
─────────────────────────
/api/analise-colaborador   → Gemini 2.5 Flash (análise IA)
/api/resumo-timeline       → Gemini 2.5 Flash (resumo narrativo)
/api/gerar-token-sso       → Gera token para login no IO
/api/validar-sso-g360      → Valida token SSO no IO

SERVICE WORKER (PWA)
─────────────────────
Cache First (shell HTML/JS/CSS)
Network First (GAS backend, 5 min TTL)
Network Only (APIs Vercel)`}
        </div>

        <H3>Banco de Dados — Google Sheets (~55 abas)</H3>
        <Tabela
          colunas={['Grupo','Abas principais','Função']}
          linhas={[
            ['Cadastro','Colaboradores, Usuarios, Cargos, Setores, Empresas','Estrutura organizacional'],
            ['CRM','Registros, Tarefas, Documentos, ResumosLinhaTempo','Timeline e documentos'],
            ['Metas','MetasLideranca, MetasSetor, GruposMeta, Acompanhamentos','Motor de metas'],
            ['Desenvolvimento','Evidencias, PerfilCapacidades, MatrizVersoes, MatrizCapacidadesCargo, CapacidadesBiblioteca, CompetenciasBiblioteca, EscalasDominio, GrausDominio, TiposEvidencia','Motor de competências'],
            ['Férias','Ferias, PeriodosAquisitivos, MovimentosAusencia, ConfiguracaoFerias, AlertasFerias','Gestão de ausências'],
            ['DayOff','DayOff, Folgas','Benefícios de folga'],
            ['Formulários','FormularioTemplates, FormularioInstancias','Avaliações e pesquisas'],
            ['Reconhecimento','Reconhecimentos, ConfiguracaoReconhecimento','Programa de reconhecimento'],
            ['Alertas','AlertasInteligentes, ConfiguracaoAlertas','Motor de alertas'],
            ['Sessões','Sessoes (auth + SSO tokens)','Autenticação e SSO'],
          ]}
        />

        <H3>Senhas e segurança</H3>
        <P>Senhas armazenadas como hash SHA-256 com salt único por usuário (campo <code>senha_hash</code> + <code>senha_salt</code> na aba Usuarios). Retrocompatibilidade: senhas em texto puro (formato legado) funcionam no login — na primeira redefinição, são automaticamente convertidas para hash.</P>
        <P>SSO tokens são de uso único, expiram em 5 minutos e são armazenados na aba Sessoes. Uma vez consumidos, ficam marcados como <code>usado: true</code> e qualquer nova tentativa de uso é rejeitada.</P>

        <H3>Performance e latência</H3>
        <Tabela
          colunas={['Operação','Tempo típico','Causa']}
          linhas={[
            ['Primeira carga do app (loadAllData)','3–5 segundos','~17 chamadas ao GAS em paralelo (Promise.allSettled)'],
            ['Request individual ao GAS','1–3 segundos','Latência do Apps Script serverless (sem instância quente)'],
            ['Análise IA de competências','10–20 segundos','Gemini 2.5 Flash com thinking LOW'],
            ['Resumo da timeline','5–15 segundos','Gemini 2.5 Flash, processamento incremental'],
            ['PWA após instalação','< 200ms','Service Worker Cache First para o shell'],
          ]}
        />

        <H3>Quando migrar o banco de dados</H3>
        <P>O Google Sheets funciona bem até ~200 colaboradores ativos e ~5.000 registros de timeline. Acima disso, considere migrar para <strong>Supabase</strong> (PostgreSQL gerenciado, gratuito até 500MB):</P>
        <Ul>
          <Li>O DataService já tem uma implementação alternativa para Supabase — troca sem reescrever componentes</Li>
          <Li>Migração: exportar cada aba como CSV → importar no Supabase → atualizar a URL nas Configurações Gerais</Li>
          <Li>Tempo estimado: 2–4 horas para um DBA com acesso ao banco</Li>
          <Li>Benefícios: latência &lt;100ms, índices, transações ACID, sem limite de células</Li>
        </Ul>
        <Box tipo="dica">
          <p>Para verificar o tamanho atual: abra a planilha do Google Sheets → selecione tudo (Ctrl+A) → veja o rodapé "N células" para ter uma ideia do uso atual.</p>
        </Box>

        <H3>Funções manuais do Apps Script</H3>
        <P>Execute estas funções no editor do Google Apps Script após implantações ou configurações iniciais:</P>
        <Tabela
          colunas={['Função','Quando executar']}
          linhas={[
            ['configurarTrilhaCargosPorSetorPrincipal()','Após cadastrar ou reorganizar cargos na trilha'],
            ['recalcularProntidaoAgora()','Após configurar a Matriz por Cargo ou adicionar evidências em massa'],
            ['limparDadosSeedLegados()','Uma única vez após o primeiro deploy em produção'],
            ['autorizarEnvioDeEmailManualmente()','Se houver notificações por e-mail a configurar'],
          ]}
        />

        <H3>Variáveis de ambiente (Vercel)</H3>
        <div className="bg-slate-900 text-emerald-400 rounded-xl px-4 py-3 font-mono text-[10px] my-2">
          GEMINI_API_KEY=sua_chave_aqui
        </div>
        <P>Configure em: Vercel Dashboard → Projeto → Settings → Environment Variables. A chave é obtida no Google AI Studio (aistudio.google.com).</P>

        <H3>Stack completa</H3>
        <Tabela
          colunas={['Tecnologia','Versão','Função']}
          linhas={[
            ['React','18.x','Interface de usuário'],
            ['TypeScript','5.0','Tipagem estática'],
            ['Vite','5.x','Build e HMR'],
            ['Tailwind CSS','3.x','Estilização utilitária'],
            ['Lucide React','0.546','Ícones'],
            ['date-fns','4.x','Manipulação de datas'],
            ['Recharts','3.x','Gráficos'],
            ['Google Apps Script','V8 runtime','Backend serverless'],
            ['Google Sheets','—','Banco de dados'],
            ['Google Drive','—','Armazenamento de arquivos'],
            ['Gemini 2.5 Flash','—','IA generativa (análise + resumos)'],
            ['Vercel','—','Hospedagem frontend + APIs serverless'],
            ['PWA (Service Worker)','—','App instalável, cache offline'],
          ]}
        />
      </div>
    ),
  },
];

// ── Componente principal ────────────────────────────────────────────────────

interface GuiaUsabilidadeProps {
  onFechar: () => void;
}

export default function GuiaUsabilidade({ onFechar }: GuiaUsabilidadeProps) {
  const [secaoAberta, setSecaoAberta] = useState('inicio');
  const [buscando, setBuscando] = useState('');
  const conteudoRef = useRef<HTMLDivElement>(null);

  const handleImprimirPDF = () => window.print();

  const secoesFiltradas = buscando
    ? SECOES.filter(s => s.titulo.toLowerCase().includes(buscando.toLowerCase()))
    : SECOES;

  const secaoAtual = SECOES.find(s => s.id === secaoAberta) || SECOES[0];

  const navegar = (id: string) => {
    setSecaoAberta(id);
    setBuscando('');
    conteudoRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <style>{`
        @media print {
          body > * { display: none !important; }
          #guia-print { display: block !important; font-size: 10px; color: #1e293b; }
          #guia-print h1 { font-size: 20px; margin-bottom: 8px; }
          #guia-print h2 { font-size: 14px; margin-top: 24px; margin-bottom: 6px; border-bottom: 2px solid #0d9488; padding-bottom: 4px; color: #0d9488; }
          #guia-print h3 { font-size: 11px; font-weight: 700; margin-top: 14px; margin-bottom: 4px; }
          #guia-print table { width: 100%; border-collapse: collapse; margin: 8px 0; }
          #guia-print th, #guia-print td { border: 1px solid #cbd5e1; padding: 4px 8px; }
          #guia-print th { background: #f1f5f9; font-weight: 700; }
          #guia-print code { background: #f1f5f9; padding: 1px 4px; border-radius: 3px; font-size: 9px; }
          #guia-print pre { background: #1e293b; color: #34d399; padding: 12px; border-radius: 8px; font-size: 9px; white-space: pre-wrap; }
          .no-print { display: none !important; }
          @page { margin: 2cm; }
        }
      `}</style>

      {/* Versão de impressão — todas as seções em sequência */}
      <div id="guia-print" style={{ display: 'none' }}>
        <h1>Manual do Gestão360</h1>
        <p style={{ color: '#64748b', fontSize: '10px' }}>
          Versão completa · Gerado em {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
        {SECOES.map(s => (
          <div key={s.id} style={{ pageBreakBefore: 'auto' }}>
            <h2>{s.emoji} {s.titulo}</h2>
            {s.conteudo}
          </div>
        ))}
      </div>

      {/* Modal interativo */}
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0 bg-gradient-to-r from-teal-50/60 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center">
                <BookOpen size={18} className="text-teal-600" />
              </div>
              <div>
                <h2 className="font-extrabold text-slate-900 text-sm">Manual do Gestão360</h2>
                <p className="text-[10px] text-slate-400">Guia completo de uso, motores e documentação técnica</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleImprimirPDF}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-700 cursor-pointer transition"
              >
                <Download size={13} /> Baixar PDF
              </button>
              <button
                onClick={onFechar}
                className="p-2 text-slate-400 hover:text-slate-700 cursor-pointer hover:bg-slate-100 rounded-xl transition"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Corpo: sidebar + conteúdo */}
          <div className="flex flex-1 overflow-hidden">

            {/* Sidebar de navegação */}
            <div className="w-52 border-r border-slate-100 flex flex-col shrink-0">
              <div className="p-3 border-b border-slate-100">
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={buscando}
                    onChange={e => setBuscando(e.target.value)}
                    placeholder="Buscar seção..."
                    className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
              </div>
              <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
                {secoesFiltradas.map(s => (
                  <button
                    key={s.id}
                    onClick={() => navegar(s.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition cursor-pointer ${
                      secaoAberta === s.id
                        ? 'bg-teal-50 text-teal-700 font-bold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span className="text-sm leading-none shrink-0">{s.emoji}</span>
                    <span className="text-[11px] truncate">{s.titulo}</span>
                    {secaoAberta === s.id && <ChevronRight size={11} className="ml-auto shrink-0 text-teal-500" />}
                  </button>
                ))}
              </nav>
            </div>

            {/* Conteúdo */}
            <div ref={conteudoRef} className="flex-1 overflow-y-auto p-6">
              <div className="max-w-2xl">
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-3xl">{secaoAtual.emoji}</span>
                  <h2 className="text-xl font-extrabold text-slate-900">{secaoAtual.titulo}</h2>
                </div>
                {secaoAtual.conteudo}

                {/* Navegação entre seções */}
                <div className="flex justify-between mt-8 pt-4 border-t border-slate-100">
                  {(() => {
                    const idx = SECOES.findIndex(s => s.id === secaoAberta);
                    const prev = idx > 0 ? SECOES[idx - 1] : null;
                    const next = idx < SECOES.length - 1 ? SECOES[idx + 1] : null;
                    return (
                      <>
                        {prev ? (
                          <button onClick={() => navegar(prev.id)}
                            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-teal-700 cursor-pointer transition">
                            ← {prev.emoji} {prev.titulo}
                          </button>
                        ) : <span />}
                        {next ? (
                          <button onClick={() => navegar(next.id)}
                            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-teal-700 cursor-pointer transition">
                            {next.emoji} {next.titulo} →
                          </button>
                        ) : <span />}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
