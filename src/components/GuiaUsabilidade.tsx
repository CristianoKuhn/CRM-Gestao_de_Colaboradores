/**
 * GuiaUsabilidade — Gestão360
 *
 * Manual completo do sistema com:
 * - Guia de uso de cada módulo com exemplos práticos
 * - Documentação técnica da arquitetura
 * - Exportação para PDF via window.print()
 */

import React, { useState } from 'react';
import { X, BookOpen, Download, ChevronRight, ChevronDown, ExternalLink } from 'lucide-react';

interface SecaoGuia {
  id: string;
  titulo: string;
  emoji: string;
  conteudo: React.ReactNode;
}

// ── Utilitário de seção ────────────────────────────────────────────────────

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-bold text-slate-800 mb-2 pb-1 border-b border-slate-100">{titulo}</h3>
      <div className="text-sm text-slate-600 leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

function Exemplo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-50 border-l-4 border-teal-400 rounded-r-xl px-4 py-3 my-2">
      <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wider mb-1">Exemplo prático</p>
      <p className="text-xs text-slate-500 mb-1 font-semibold">{label}</p>
      <div className="text-xs text-slate-600">{children}</div>
    </div>
  );
}

function Destaque({ tipo, children }: { tipo: 'dica' | 'atencao' | 'info'; children: React.ReactNode }) {
  const cfg = {
    dica: { bg: 'bg-emerald-50', border: 'border-emerald-300', label: '💡 Dica', text: 'text-emerald-800' },
    atencao: { bg: 'bg-amber-50', border: 'border-amber-300', label: '⚠️ Atenção', text: 'text-amber-800' },
    info: { bg: 'bg-blue-50', border: 'border-blue-300', label: 'ℹ️ Informação', text: 'text-blue-800' },
  }[tipo];
  return (
    <div className={`${cfg.bg} border ${cfg.border} rounded-xl px-4 py-3 my-2`}>
      <p className={`text-[10px] font-bold ${cfg.text} mb-1`}>{cfg.label}</p>
      <div className={`text-xs ${cfg.text}`}>{children}</div>
    </div>
  );
}

// ── Conteúdo das seções ────────────────────────────────────────────────────

const SECOES: SecaoGuia[] = [
  {
    id: 'inicio',
    titulo: 'Primeiros Passos',
    emoji: '🚀',
    conteudo: (
      <div>
        <Secao titulo="Acessando o Gestão360">
          <p>Acesse o sistema pelo navegador em <strong>crm-gestao-de-colaboradores.vercel.app</strong>. O app também pode ser instalado no computador como aplicativo (PWA) — clique no ícone de instalação na barra de endereço do Chrome/Edge.</p>
          <p>O login é feito com <strong>e-mail e senha</strong> cadastrados pelo Administrador. No primeiro acesso, o sistema pedirá que você defina uma nova senha.</p>
        </Secao>
        <Secao titulo="Perfis de Acesso">
          <p>Existem 4 perfis com permissões crescentes:</p>
          <ul className="list-disc ml-5 space-y-1 text-xs">
            <li><strong>Administrador</strong> — acesso total, gerencia usuários e configurações</li>
            <li><strong>Coordenador</strong> — acesso a múltiplos setores, pode configurar Trilha & Matriz</li>
            <li><strong>Supervisor</strong> — visão analítica, sem edição de configurações</li>
            <li><strong>Líder</strong> — acesso ao próprio setor, registra interações e feedbacks</li>
          </ul>
        </Secao>
        <Secao titulo="Visibilidade por Setor">
          <p>Cada usuário vê apenas os colaboradores dos <strong>Setores Permitidos</strong> configurados em Gerenciar Usuários. Administradores sem setores marcados têm visão total da empresa.</p>
          <Destaque tipo="dica">Para um gestor de departamento não enxergar dados de outros departamentos, marque apenas o setor dele em "Setores Permitidos" no cadastro do usuário.</Destaque>
        </Secao>
      </div>
    ),
  },
  {
    id: 'usuarios',
    titulo: 'Gerenciar Usuários',
    emoji: '👥',
    conteudo: (
      <div>
        <Secao titulo="Criando um Novo Usuário">
          <p>Vá em <strong>Gerenciar Usuários → + Novo Usuário</strong>. Preencha nome, e-mail e senha inicial. O usuário receberá uma senha provisória e será solicitado a trocá-la no primeiro login.</p>
          <Exemplo label="Criando um Líder do Suporte Técnico">
            Nome: "Josiel Rodrigues" · E-mail: josiel@empresa.com.br · Perfil: Líder · Setor Permitido: SUPORTE TÉCNICO. Marque as dashboards que ele deve acessar (ex.: Colaboradores, Tarefas, Metas Liderança).
          </Exemplo>
        </Secao>
        <Secao titulo="Dashboards Habilitadas">
          <p>No cadastro do usuário, marque quais telas ele pode acessar. Dashboards não marcadas não aparecem no menu lateral daquele usuário. O Dashboard principal e o acesso a Gerenciar Usuários (somente Administrador) são fixos.</p>
        </Secao>
        <Secao titulo="Redefinindo Senhas">
          <p>Para redefinir a senha de um usuário, abra seu cadastro e preencha o campo "Senha / Hash de Acesso". <strong>Deixe o campo vazio</strong> se não quiser alterar a senha — alterar outros campos sem preencher a senha preserva a senha existente.</p>
          <Destaque tipo="atencao">Preencher o campo de senha e salvar força o usuário a redefinir a senha no próximo login (senha provisória).</Destaque>
        </Secao>
      </div>
    ),
  },
  {
    id: 'colaboradores',
    titulo: 'Colaboradores',
    emoji: '🧑‍💼',
    conteudo: (
      <div>
        <Secao titulo="Cadastrando um Colaborador">
          <p>Em <strong>Colaboradores → + Novo Colaborador</strong>, preencha nome, e-mail, setor, cargo, líder direto, data de admissão e cidade base. A situação inicial é "Ativo".</p>
          <Destaque tipo="info">O campo <strong>Cidade Base</strong> ativa um filtro de localização nas telas de Colaboradores e Tarefas de Liderança — útil para times distribuídos geograficamente.</Destaque>
        </Secao>
        <Secao titulo="Filtros Disponíveis">
          <p>Na tela de Colaboradores você pode filtrar por: Setor, Cargo, Situação (Ativo/Desligado) e Cidade Base. O filtro padrão ao abrir é "Ativo".</p>
        </Secao>
        <Secao titulo="Perfil do Colaborador — Abas">
          <p>Cada colaborador tem duas abas principais:</p>
          <ul className="list-disc ml-5 space-y-1 text-xs">
            <li><strong>CRM & Timeline</strong> — histórico completo de interações, feedbacks, PDIs, ocorrências e documentos</li>
            <li><strong>Desenvolvimento</strong> — Matriz de Capacidades, evidências, prontidão para o próximo cargo e Análise por IA</li>
          </ul>
        </Secao>
      </div>
    ),
  },
  {
    id: 'timeline',
    titulo: 'Timeline & CRM',
    emoji: '📋',
    conteudo: (
      <div>
        <Secao titulo="Tipos de Registro">
          <p>A timeline suporta 14 tipos de registro. Os principais:</p>
          <ul className="list-disc ml-5 space-y-1 text-xs">
            <li><strong>Feedback Positivo/Corretivo</strong> — registro de feedback formal com o colaborador</li>
            <li><strong>Conversa Individual (1:1)</strong> — check-in periódico de alinhamento</li>
            <li><strong>PDI</strong> — Plano de Desenvolvimento Individual</li>
            <li><strong>Reconhecimento</strong> — reconhecimento formal registrado e espelhado na tela de Reconhecimentos</li>
            <li><strong>Advertência/Suspensão</strong> — registros disciplinares com suporte a anexo de documento</li>
            <li><strong>Observação Geral</strong> — anotação informal (não conta nas Metas de Liderança)</li>
          </ul>
        </Secao>
        <Secao titulo="Geração Automática de Tarefas">
          <p>Ao registrar qualquer interação, você pode marcar "Gerar tarefa de acompanhamento". Isso cria automaticamente uma Tarefa de Liderança vinculada ao colaborador com prazo definido.</p>
          <Exemplo label="Feedback Corretivo com acompanhamento">
            Após registrar um Feedback Corretivo sobre pontualidade, marque "Gerar tarefa → 30 dias". O sistema cria automaticamente uma tarefa "Acompanhar evolução de pontualidade" com vencimento em 30 dias.
          </Exemplo>
        </Secao>
        <Secao titulo="Resumo Inteligente (IA)">
          <p>Na Timeline de cada colaborador, há um botão "Atualizar Resumo" que usa IA (Gemini) para gerar um resumo narrativo incremental do histórico. O resumo é salvo e só é recalculado quando há novos registros.</p>
        </Secao>
        <Secao titulo="Anexar Arquivos">
          <p>Qualquer registro da timeline pode ter arquivos anexados (PDF, imagem, DOC). Os arquivos são enviados ao Google Drive e o link fica registrado na timeline.</p>
        </Secao>
      </div>
    ),
  },
  {
    id: 'tarefas',
    titulo: 'Tarefas de Liderança',
    emoji: '✅',
    conteudo: (
      <div>
        <Secao titulo="O que são Tarefas de Liderança">
          <p>São ações de acompanhamento vinculadas a um colaborador e a um responsável (líder). Podem ser criadas manualmente ou geradas automaticamente por registros da Timeline.</p>
        </Secao>
        <Secao titulo="Concluindo uma Tarefa">
          <p>Ao clicar "Concluir" em uma tarefa pendente, o sistema abre automaticamente o perfil do colaborador para registrar o relato do que foi feito. <strong>A tarefa só é marcada como concluída após esse registro.</strong> Isso garante rastreabilidade completa.</p>
          <Destaque tipo="info">Tarefas concluídas com relato contam como interação no Motor de Metas — um feedback que gerou uma tarefa e foi concluído contribui duas vezes: o registro original e a conclusão.</Destaque>
        </Secao>
        <Secao titulo="Filtros">
          <p>A tela abre com filtro "Pendentes" por padrão. Você pode filtrar por: Pendentes, Atrasadas, Concluídas, Todas e por Cidade Base.</p>
        </Secao>
      </div>
    ),
  },
  {
    id: 'metas',
    titulo: 'Metas de Liderança',
    emoji: '🎯',
    conteudo: (
      <div>
        <Secao titulo="Como funcionam as Metas">
          <p>O Motor de Metas conta automaticamente todas as interações registradas na Timeline dentro do período selecionado. Ele possui 3 fontes de dados:</p>
          <ol className="list-decimal ml-5 space-y-1 text-xs">
            <li><strong>Timeline</strong> (primária) — todos os registros com tipos mapeados</li>
            <li><strong>Tarefas concluídas</strong> (secundária) — conclusão de ciclo de acompanhamento</li>
            <li><strong>Acompanhamentos</strong> (complementar) — avaliações 180° e formulários</li>
          </ol>
          <Destaque tipo="info"><strong>Observação Geral</strong> é o único tipo de registro que NÃO conta nas metas — existe para anotações informais sem impacto em indicadores.</Destaque>
        </Secao>
        <Secao titulo="Criando uma Meta por Líder">
          <p>Clique em "+ Nova Meta" → selecione o líder → escolha um Grupo de Interações (ex.: "Feedbacks Construtivos") → defina a quantidade mínima e o período. O sistema passará a contar automaticamente todos os registros daquele líder que se encaixem no grupo.</p>
          <Exemplo label="Meta mensal de feedbacks para Josiel">
            Líder: Josiel Rodrigues · Grupo: Feedbacks Construtivos · Mínimo: 4 feedbacks/mês. O sistema conta todos os Feedbacks Positivos, Corretivos e Acompanhamentos registrados pelo Josiel no mês selecionado.
          </Exemplo>
        </Secao>
        <Secao titulo="Meta por Setor">
          <p>Metas de setor somam as interações de <strong>todos os líderes</strong> com colaboradores daquele setor. Você pode selecionar múltiplos setores numa mesma meta (útil para gestores que coordenam mais de um departamento).</p>
        </Secao>
        <Secao titulo="Grupos de Meta">
          <p>Configure grupos em <strong>Configurações Gerais → Trilha & Matriz → Grupos de Meta</strong>. Cada grupo combina múltiplos tipos de interação sob um nome de negócio. Exemplo: o grupo "Conversas de Desenvolvimento" pode incluir PDI + Conversa Individual + Acompanhamento.</p>
        </Secao>
        <Secao titulo="Retroatividade">
          <p>O seletor de período no canto superior direito da tela de Metas permite navegar para meses anteriores — o sistema lê toda a timeline histórica retroativamente, sem nenhuma configuração adicional.</p>
        </Secao>
      </div>
    ),
  },
  {
    id: 'desenvolvimento',
    titulo: 'Desenvolvimento de Colaboradores',
    emoji: '📈',
    conteudo: (
      <div>
        <Secao titulo="Arquitetura de Competências">
          <p>O módulo usa uma hierarquia de 4 níveis:</p>
          <ul className="list-disc ml-5 space-y-1 text-xs">
            <li><strong>Competências</strong> — agrupamento macro (ex.: "Comunicação", "Técnico de Rede")</li>
            <li><strong>Capacidades</strong> — habilidades específicas dentro de uma competência</li>
            <li><strong>Escala de Domínio</strong> — régua de avaliação (ex.: 1 a 5 ou Básico/Intermediário/Avançado)</li>
            <li><strong>Evidências</strong> — registros concretos que comprovam o domínio (observação do gestor ou certificado)</li>
          </ul>
        </Secao>
        <Secao titulo="Trilha de Carreira">
          <p>Cada cargo possui um <strong>próximo cargo</strong> configurado na Trilha. O sistema calcula automaticamente o Card de Prontidão do colaborador comparando o perfil de capacidades atual com os requisitos do próximo cargo.</p>
          <ul className="list-disc ml-5 text-xs space-y-0.5">
            <li>🔴 Com Lacunas — há capacidades obrigatórias não atingidas</li>
            <li>🟡 Em Progresso — parcialmente atingido</li>
            <li>🟢 Pronto — todos os requisitos atendidos</li>
          </ul>
          <Destaque tipo="atencao">Após configurar a Trilha em Configurações Gerais, execute a função <code>configurarTrilhaCargosPorSetorPrincipal()</code> e <code>recalcularProntidaoAgora()</code> no editor do Google Apps Script para ativar os cálculos.</Destaque>
        </Secao>
        <Secao titulo="Registrando Evidências">
          <p>No perfil do colaborador → aba Desenvolvimento → "Registrar Evidência". Escolha entre:</p>
          <ul className="list-disc ml-5 text-xs space-y-0.5">
            <li><strong>Observação</strong> — descrição de situação real observada pelo gestor</li>
            <li><strong>Certificado/Curso</strong> — nome do curso, instituição, carga horária e link do certificado</li>
          </ul>
        </Secao>
      </div>
    ),
  },
  {
    id: 'ia',
    titulo: 'IA Lisa e Análise de Competências',
    emoji: '🤖',
    conteudo: (
      <div>
        <Secao titulo="Lisa — Assistente Conversacional">
          <p>A Lisa é a assistente de IA integrada ao sistema, acessível pelo ícone de chat em qualquer tela. Ela tem contexto completo do sistema: colaboradores, metas, alertas e configurações.</p>
          <Exemplo label="Perguntas úteis para a Lisa">
            "Quais colaboradores do Suporte Técnico não têm registro nos últimos 30 dias?" · "Gere um resumo das metas de setembro para o Josiel" · "Quem está mais próximo de prontidão para promoção?"
          </Exemplo>
        </Secao>
        <Secao titulo="Resumo Inteligente da Timeline">
          <p>Na aba CRM de cada colaborador, o botão "Atualizar Resumo" envia o histórico para a IA e retorna um resumo narrativo em linguagem natural. O resumo é incremental — apenas os registros novos desde o último resumo são enviados, economizando tokens.</p>
        </Secao>
        <Secao titulo="Análise de Competências por IA">
          <p>Na aba Desenvolvimento, o painel "Análise Inteligente de Competências" identifica automaticamente:</p>
          <ul className="list-disc ml-5 text-xs space-y-0.5">
            <li><strong>Competências identificadas</strong> — capacidades demonstradas nos registros (com nível e confiança)</li>
            <li><strong>Padrões de comportamento</strong> — persistência positiva (comportamento consolidado) e negativa (recorrência de problemas)</li>
            <li><strong>Recomendações de treinamento</strong> — sugestões específicas baseadas nos gaps, ordenadas por urgência</li>
          </ul>
          <Destaque tipo="info">A análise é acionada pelo botão "Iniciar Análise com IA" e fica em cache local. É rerealizada automaticamente quando há 3 ou mais registros novos desde a última análise.</Destaque>
        </Secao>
      </div>
    ),
  },
  {
    id: 'config',
    titulo: 'Configurações Gerais',
    emoji: '⚙️',
    conteudo: (
      <div>
        <Secao titulo="Estrutura Organizacional">
          <p>Em Configurações Gerais você cadastra a hierarquia base:</p>
          <ol className="list-decimal ml-5 text-xs space-y-1">
            <li><strong>Empresa</strong> — razão social e dados da organização</li>
            <li><strong>Setores</strong> — departamentos (ex.: Suporte Técnico, Retenção, Laboratório)</li>
            <li><strong>Cargos</strong> — vinculados a setores, com ordem hierárquica e próximo cargo na trilha</li>
          </ol>
        </Secao>
        <Secao titulo="Trilha & Matriz">
          <p>Configurar a Matriz de Competências envolve:</p>
          <ol className="list-decimal ml-5 text-xs space-y-1">
            <li>Criar <strong>Escalas de Domínio</strong> (a régua de avaliação do setor)</li>
            <li>Cadastrar <strong>Competências e Capacidades</strong> na Biblioteca</li>
            <li>Criar uma <strong>Versão da Matriz</strong> (snapshot do modelo de competências)</li>
            <li>Associar <strong>Capacidades a Cargos</strong> com grau mínimo esperado e se é obrigatória</li>
          </ol>
          <Destaque tipo="dica">Versões da matriz permitem evoluir o modelo de competências sem perder o histórico de avaliações antigas.</Destaque>
        </Secao>
        <Secao titulo="Grupos de Meta e Alertas">
          <p>Configure <strong>Grupos de Meta</strong> (agrupamentos de tipos de interação para as Metas de Liderança) e <strong>Configuração de Alertas</strong> (quantos dias sem interação dispara um alerta automático para o líder).</p>
        </Secao>
        <Secao titulo="URL do Backend">
          <p>Em Configurações Gerais → Google Apps Script, cole a URL do backend implantado. <strong>Após qualquer novo deploy do Apps Script</strong>, a URL muda se você criou uma Nova Implantação — nesse caso, atualize aqui.</p>
          <Destaque tipo="atencao">Se a URL estiver errada ou desatualizada, o app perde a conexão com o banco de dados e opera em modo offline (dados do cache local).</Destaque>
        </Secao>
      </div>
    ),
  },
  {
    id: 'docs',
    titulo: 'Central de Documentos',
    emoji: '📂',
    conteudo: (
      <div>
        <Secao titulo="Sistema de Pastas">
          <p>A Central Docs organiza documentos em 3 tipos de pastas:</p>
          <ul className="list-disc ml-5 text-xs space-y-1">
            <li><strong>Pasta de Colaborador</strong> — vinculada a um colaborador específico. Visível a quem tem acesso ao perfil dele.</li>
            <li><strong>Minha Pasta</strong> — privada. Visível apenas ao usuário que a criou.</li>
            <li><strong>Pasta do Departamento</strong> — visível a todos os usuários do setor vinculado.</li>
          </ul>
        </Secao>
        <Secao titulo="Criando Pastas">
          <p>Clique em "+ Nova Pasta", escolha o tipo, vincule ao colaborador ou departamento, selecione uma cor e confirme. Pastas de colaborador evitam duplicação — uma pasta por colaborador, com todos os documentos daquela pessoa dentro.</p>
        </Secao>
        <Secao titulo="Movendo Documentos">
          <p>Ao passar o mouse sobre um documento dentro de uma pasta, o ícone de mover (→) aparece. Clique para selecionar a pasta de destino. Você precisará ter permissão de edição no colaborador de destino.</p>
        </Secao>
        <Secao titulo="Categorias de Documento">
          <p>Cada documento recebe uma categoria: Certificado, Termo Assinado, Advertência, Avaliação, Feedback PDF, Contrato, Currículo, Documento Pessoal ou Outros.</p>
        </Secao>
      </div>
    ),
  },
  {
    id: 'indicadores',
    titulo: 'Indicadores Operacionais',
    emoji: '📊',
    conteudo: (
      <div>
        <Secao titulo="Acesso via SSO">
          <p>O App-Indicadores-Operacionais é acessado diretamente pelo botão <strong>"Indicadores Operacionais"</strong> no final do menu lateral do Gestão360. O acesso é via SSO (Single Sign-On) — sem precisar digitar senha novamente.</p>
          <Exemplo label="Como acessar">
            1. Clique em "Indicadores Operacionais" no menu lateral. 2. Aguarde 1–2 segundos enquanto o acesso é preparado. 3. Clique em "Abrir Indicadores Operacionais" no popover que aparece. O app abre em nova aba já logado.
          </Exemplo>
        </Secao>
        <Secao titulo="Permissões por Perfil">
          <ul className="list-disc ml-5 text-xs space-y-1">
            <li><strong>Administrador</strong> — acesso total, todos os departamentos</li>
            <li><strong>Coordenador</strong> — acesso total, departamentos do seu setor</li>
            <li><strong>Supervisor/Líder</strong> — somente Painel Executivo, Evolução Histórica e Análise por Colaborador</li>
          </ul>
        </Secao>
        <Secao titulo="Mapeamento de Setores">
          <p>Os setores do Gestão360 são mapeados automaticamente para os departamentos do app de Indicadores:</p>
          <ul className="list-disc ml-5 text-xs space-y-0.5">
            <li>Suporte Técnico → call_center, multichannel, protocolos, deslocamentos</li>
            <li>Retenção → retenção e qualidade</li>
          </ul>
        </Secao>
      </div>
    ),
  },
  {
    id: 'tecnico',
    titulo: 'Documentação Técnica',
    emoji: '🔧',
    conteudo: (
      <div>
        <Secao titulo="Arquitetura do Sistema">
          <div className="bg-slate-900 text-emerald-400 rounded-xl p-4 font-mono text-[10px] leading-relaxed">
            {`┌─────────────────────────────────────────┐
│         Gestão360 — Arquitetura         │
├──────────────────┬──────────────────────┤
│   Frontend       │   Backend            │
│   React 18       │   Google Apps Script │
│   TypeScript     │   (serverless)       │
│   Tailwind CSS   │                      │
│   Vite           │   Banco de Dados     │
│   Vercel (CDN)   │   Google Sheets      │
│                  │   (~55 abas)         │
├──────────────────┴──────────────────────┤
│   IA: Gemini 2.5 Flash (Google)         │
│   Armazenamento de arquivos: Drive      │
│   Hospedagem: Vercel (Edge Network)     │
└─────────────────────────────────────────┘`}
          </div>
        </Secao>
        <Secao titulo="Banco de Dados (Google Sheets)">
          <p>O banco é uma planilha Google Sheets com ~55 abas. As principais:</p>
          <div className="overflow-x-auto">
            <table className="text-xs w-full border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="text-left px-2 py-1.5 font-bold text-slate-700 border border-slate-200">Grupo</th>
                  <th className="text-left px-2 py-1.5 font-bold text-slate-700 border border-slate-200">Abas principais</th>
                </tr>
              </thead>
              <tbody className="text-slate-600">
                {[
                  ['Cadastro', 'Colaboradores, Usuarios, Cargos, Setores, Empresas'],
                  ['CRM/Timeline', 'Registros, Tarefas, Documentos, ResumosLinhaTempo'],
                  ['Metas', 'MetasLideranca, MetasSetor, GruposMeta, Acompanhamentos'],
                  ['Desenvolvimento', 'Evidencias, PerfilCapacidades, MatrizVersoes, MatrizCapacidadesCargo, CapacidadesBiblioteca, CompetenciasBiblioteca'],
                  ['Formulários', 'FormularioTemplates, FormularioInstancias'],
                  ['Férias', 'Ferias, DayOff, Folgas, PeriodosAquisitivos'],
                  ['Sessões', 'Sessoes (auth + SSO tokens)'],
                ].map(([grupo, abas]) => (
                  <tr key={grupo} className="border-b border-slate-100">
                    <td className="px-2 py-1.5 font-semibold border border-slate-200">{grupo}</td>
                    <td className="px-2 py-1.5 border border-slate-200">{abas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Secao>
        <Secao titulo="Performance e Limitações">
          <ul className="list-disc ml-5 text-xs space-y-1">
            <li><strong>Latência por request:</strong> 1–3 segundos (latência do Google Apps Script — serverless sem instância quente)</li>
            <li><strong>loadAllData():</strong> carrega ~17 chamadas em paralelo (Promise.allSettled) — ~3–5s total na abertura do app</li>
            <li><strong>Limite prático de Google Sheets:</strong> até ~5 milhões de células por planilha</li>
            <li><strong>Recomendação para migrar banco:</strong> quando ultrapassar 500 colaboradores ativos ou 10.000 registros na Timeline</li>
          </ul>
        </Secao>
        <Secao titulo="Quando Migrar o Banco de Dados">
          <p>O Google Sheets funciona bem até ~200 colaboradores e ~5.000 registros de timeline. Acima disso, considere migrar para <strong>Supabase</strong> (PostgreSQL gerenciado, gratuito até 500MB):</p>
          <ol className="list-decimal ml-5 text-xs space-y-1">
            <li>A infraestrutura de DataService já suporta Supabase — há uma implementação alternativa pronta</li>
            <li>Migração: exportar cada aba como CSV → importar no Supabase → atualizar a URL nas Configurações Gerais</li>
            <li>Tempo estimado de migração: 2–4 horas para um DBA experiente</li>
            <li>Benefícios: latência &lt;100ms, índices, transações, sem limite de células</li>
          </ol>
          <Destaque tipo="dica">Para verificar o tamanho atual do banco, abra a planilha do Google Sheets e veja o rodapé — o número de células usadas aparece ao selecionar toda a planilha com Ctrl+A.</Destaque>
        </Secao>
        <Secao titulo="Dicas de Manutenção">
          <ul className="list-disc ml-5 text-xs space-y-1">
            <li>Após qualquer novo deploy do Apps Script, execute <code>configurarTrilhaCargosPorSetorPrincipal()</code> e <code>recalcularProntidaoAgora()</code> no editor</li>
            <li>Para limpar dados de exemplo antigos: execute <code>limparDadosSeedLegados()</code></li>
            <li>O diagnóstico de versão do backend: chame a action <code>diagnostico</code> ou <code>ping</code> no Apps Script para confirmar qual versão está em produção</li>
            <li>Backup: o Google Sheets tem histórico de versões nativo (Arquivo → Histórico de versões)</li>
          </ul>
        </Secao>
        <Secao titulo="Variáveis de Ambiente (Vercel)">
          <p>O app depende de uma variável de ambiente para a IA:</p>
          <div className="bg-slate-900 text-emerald-400 rounded-xl p-3 font-mono text-[10px]">
            GEMINI_API_KEY=sua_chave_aqui
          </div>
          <p className="text-xs text-slate-500 mt-1">Configure em: Vercel Dashboard → Projeto → Settings → Environment Variables</p>
        </Secao>
        <Secao titulo="Stack Completa">
          <div className="grid grid-cols-2 gap-2">
            {[
              ['React 18 + TypeScript', 'Interface'],
              ['Vite 5', 'Build tool'],
              ['Tailwind CSS 3', 'Estilização'],
              ['Lucide React', 'Ícones'],
              ['Vercel', 'Hospedagem frontend'],
              ['Google Apps Script', 'Backend serverless'],
              ['Google Sheets', 'Banco de dados'],
              ['Google Drive', 'Armazenamento de arquivos'],
              ['Gemini 2.5 Flash', 'IA generativa'],
              ['PWA (Service Worker)', 'App instalável'],
            ].map(([tech, role]) => (
              <div key={tech} className="bg-slate-50 rounded-xl px-3 py-2">
                <p className="font-bold text-xs text-slate-800">{tech}</p>
                <p className="text-[10px] text-slate-400">{role}</p>
              </div>
            ))}
          </div>
        </Secao>
      </div>
    ),
  },
];

// ── Componente principal ────────────────────────────────────────────────────

interface GuiaUsabilidadeProps {
  onFechar: () => void;
}

export default function GuiaUsabilidade({ onFechar }: GuiaUsabilidadeProps) {
  const [secaoAberta, setSecaoAberta] = useState<string>('inicio');
  const [buscando, setBuscando] = useState('');

  const handleImprimirPDF = () => {
    window.print();
  };

  const secoesFiltradas = buscando
    ? SECOES.filter(s => s.titulo.toLowerCase().includes(buscando.toLowerCase()))
    : SECOES;

  const secaoAtual = SECOES.find(s => s.id === secaoAberta) || SECOES[0];

  return (
    <>
      {/* CSS de impressão */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #guia-print { display: block !important; }
          .no-print { display: none !important; }
          #guia-print { font-size: 11px; color: #1e293b; }
          #guia-print h1 { font-size: 20px; margin-bottom: 8px; }
          #guia-print h2 { font-size: 14px; margin-top: 20px; margin-bottom: 6px; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; }
          #guia-print h3 { font-size: 11px; font-weight: 700; margin-top: 12px; }
          #guia-print pre, #guia-print code { background: #f1f5f9; border-radius: 4px; padding: 2px 6px; font-size: 10px; }
          @page { margin: 2cm; }
        }
      `}</style>

      {/* Versão para impressão (oculta na tela) */}
      <div id="guia-print" style={{ display: 'none' }}>
        <h1>Manual do Gestão360</h1>
        <p style={{ color: '#64748b', fontSize: '10px' }}>Gerado em {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
        {SECOES.map(s => (
          <div key={s.id}>
            <h2>{s.emoji} {s.titulo}</h2>
            {s.conteudo}
          </div>
        ))}
      </div>

      {/* Modal */}
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center">
                <BookOpen size={18} className="text-teal-600" />
              </div>
              <div>
                <h2 className="font-extrabold text-slate-900">Manual do Gestão360</h2>
                <p className="text-xs text-slate-400">Guia completo de uso e documentação técnica</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleImprimirPDF}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-700 cursor-pointer transition"
              >
                <Download size={13} /> Baixar PDF
              </button>
              <button onClick={onFechar} className="p-2 text-slate-400 hover:text-slate-700 cursor-pointer hover:bg-slate-100 rounded-xl transition">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Corpo */}
          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar de navegação */}
            <div className="w-56 border-r border-slate-100 flex flex-col shrink-0">
              <div className="p-3 border-b border-slate-100">
                <input
                  value={buscando} onChange={e => setBuscando(e.target.value)}
                  placeholder="Buscar seção..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
              <nav className="flex-1 overflow-y-auto p-2">
                {secoesFiltradas.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setSecaoAberta(s.id); setBuscando(''); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-sm transition mb-0.5 cursor-pointer ${
                      secaoAberta === s.id
                        ? 'bg-teal-50 text-teal-700 font-bold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span className="text-base leading-none">{s.emoji}</span>
                    <span className="truncate text-xs">{s.titulo}</span>
                    {secaoAberta === s.id && <ChevronRight size={12} className="ml-auto shrink-0 text-teal-500" />}
                  </button>
                ))}
              </nav>
            </div>

            {/* Conteúdo da seção */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-2xl">
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-3xl">{secaoAtual.emoji}</span>
                  <h2 className="text-xl font-extrabold text-slate-900">{secaoAtual.titulo}</h2>
                </div>
                {secaoAtual.conteudo}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
