/**
 * MensagemDoDia.tsx — Balão flutuante com mensagem diária para líderes
 *
 * Animações:
 *  - Float: onda senoidal orgânica em loop infinito (wrapper externo isolado)
 *  - Entrada do balão: slide-up + scale suave
 *  - Troca de mensagem: 3 fases — saindo → troca → entrando (fade+slide vertical)
 *  - Mudança de cor: paleta rotativa de 10 cores vivas; cada navegação avança 1 cor
 *    usando CSS transition real (não React state batch) via DOM direto
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';

// ─── Banco de mensagens ────────────────────────────────────────────────────────
interface Mensagem { id: number; categoria: string; texto: string; }
const MENSAGENS: Mensagem[] = 
[
  { id: 1, categoria: "Prioridade", texto: "Como está sua agenda hoje? Escolha o que realmente precisa da sua liderança e avance." },
  { id: 2, categoria: "Prioridade", texto: "Nem tudo é urgente. Antes de começar, pergunte: o que realmente precisa da minha atenção hoje?" },
  { id: 3, categoria: "Prioridade", texto: "Uma agenda cheia não significa um dia produtivo. Reserve espaço para o que gera resultado." },
  { id: 4, categoria: "Prioridade", texto: "Se tudo é prioridade, nada é prioridade. Defina o que merece sua energia primeiro." },
  { id: 5, categoria: "Prioridade", texto: "Antes de aceitar uma nova demanda, confirme se ela realmente precisa ser feita agora." },
  { id: 6, categoria: "Prioridade", texto: "Comece pelo que destrava outras pessoas. Liderança também é remover obstáculos." },
  { id: 7, categoria: "Prioridade", texto: "O que você pode concluir hoje que deixará o amanhã mais leve?" },
  { id: 8, categoria: "Prioridade", texto: "Não deixe o importante ser sempre vencido pelo urgente." },
  { id: 9, categoria: "Prioridade", texto: "Uma boa agenda não controla você; ela protege o que importa." },
  { id: 10, categoria: "Prioridade", texto: "Escolha três entregas essenciais para hoje. O restante pode esperar." },
  { id: 11, categoria: "Prioridade", texto: "Se você não definir suas prioridades, as interrupções definirão por você." },
  { id: 12, categoria: "Prioridade", texto: "Antes de abrir novas tarefas, veja quais antigas podem ser encerradas." },
  { id: 13, categoria: "Prioridade", texto: "Pergunte-se: estou ocupado ou estou avançando?" },
  { id: 14, categoria: "Prioridade", texto: "Um líder também precisa saber dizer \'agora não\' para preservar o que é importante." },
  { id: 15, categoria: "Prioridade", texto: "Hoje, proteja um bloco de tempo para uma tarefa importante que costuma ser adiada." },
  { id: 16, categoria: "Pessoas", texto: "Hoje, pergunte a alguém do time: \'Como posso facilitar seu trabalho?\'" },
  { id: 17, categoria: "Pessoas", texto: "Uma conversa de cinco minutos pode evitar um problema que levaria horas para resolver." },
  { id: 18, categoria: "Pessoas", texto: "Não olhe apenas para o que a pessoa entrega. Observe também o que ela está aprendendo." },
  { id: 19, categoria: "Pessoas", texto: "Reconheça uma atitude positiva que talvez ninguém mais tenha percebido." },
  { id: 20, categoria: "Pessoas", texto: "Liderança começa quando você demonstra interesse genuíno pelas pessoas." },
  { id: 21, categoria: "Pessoas", texto: "Quem se sente ouvido tende a participar mais. Crie espaço para escutar." },
  { id: 22, categoria: "Pessoas", texto: "Antes de corrigir uma pessoa, procure entender o contexto." },
  { id: 23, categoria: "Pessoas", texto: "Uma equipe forte não é aquela sem problemas; é aquela que consegue conversar sobre eles." },
  { id: 24, categoria: "Pessoas", texto: "Hoje, dê um feedback específico. Diga exatamente o que foi positivo ou o que precisa mudar." },
  { id: 25, categoria: "Pessoas", texto: "Não espere a avaliação formal para reconhecer um bom trabalho." },
  { id: 26, categoria: "Pessoas", texto: "Pergunte a alguém do time qual obstáculo mais atrapalha sua rotina." },
  { id: 27, categoria: "Pessoas", texto: "Cada pessoa pode precisar de um tipo diferente de orientação. Observe antes de conduzir." },
  { id: 28, categoria: "Pessoas", texto: "Delegar não é abandonar. É confiar, acompanhar e desenvolver." },
  { id: 29, categoria: "Pessoas", texto: "Seu time percebe mais suas atitudes do que seus discursos." },
  { id: 30, categoria: "Pessoas", texto: "Hoje pode ser um bom dia para agradecer alguém por uma contribuição concreta." },
  { id: 31, categoria: "Liderança", texto: "Antes de cobrar um resultado, confirme se a pessoa tinha clareza, recursos e direção." },
  { id: 32, categoria: "Liderança", texto: "Liderar não é ter todas as respostas. É criar condições para que boas respostas apareçam." },
  { id: 33, categoria: "Liderança", texto: "Uma cobrança sem diagnóstico pode corrigir o sintoma e manter a causa." },
  { id: 34, categoria: "Liderança", texto: "Quando um erro acontecer, pergunte primeiro: \'O que podemos aprender com isso?\'" },
  { id: 35, categoria: "Liderança", texto: "Seu comportamento em um dia difícil ensina mais do que muitos treinamentos." },
  { id: 36, categoria: "Liderança", texto: "Liderança é transformar problemas em conversas produtivas." },
  { id: 37, categoria: "Liderança", texto: "Se você quer autonomia no time, dê contexto, não apenas ordens." },
  { id: 38, categoria: "Liderança", texto: "Hoje, observe se você está desenvolvendo pessoas ou apenas distribuindo tarefas." },
  { id: 39, categoria: "Liderança", texto: "Uma boa decisão considera o resultado de hoje e o efeito que deixará para amanhã." },
  { id: 40, categoria: "Liderança", texto: "O líder que explica o porquê ajuda a equipe a tomar melhores decisões sozinha." },
  { id: 41, categoria: "Liderança", texto: "Se uma pessoa depende de você para tudo, talvez exista uma oportunidade de desenvolver autonomia." },
  { id: 42, categoria: "Liderança", texto: "Não confunda presença com liderança. Esteja disponível quando sua equipe realmente precisar." },
  { id: 43, categoria: "Liderança", texto: "A melhor cobrança é aquela que deixa claro o caminho para melhorar." },
  { id: 44, categoria: "Liderança", texto: "Pergunte menos \'quem errou?\' e mais \'onde o processo falhou?\'" },
  { id: 45, categoria: "Liderança", texto: "Liderar também é criar segurança para que as pessoas tragam problemas cedo." },
  { id: 46, categoria: "Reflexão", texto: "Pare por dois minutos e pergunte: o que merece minha atenção neste momento?" },
  { id: 47, categoria: "Reflexão", texto: "O que você fez ontem que vale a pena repetir hoje?" },
  { id: 48, categoria: "Reflexão", texto: "Existe alguma conversa importante que você está adiando?" },
  { id: 49, categoria: "Reflexão", texto: "Que decisão pequena de hoje pode evitar um problema maior amanhã?" },
  { id: 50, categoria: "Reflexão", texto: "Você está trabalhando no problema ou apenas reagindo aos sintomas?" },
  { id: 51, categoria: "Reflexão", texto: "O que seu time precisa mais de você hoje: direção, apoio, autonomia ou escuta?" },
  { id: 52, categoria: "Reflexão", texto: "Qual hábito seu como líder merece ser fortalecido?" },
  { id: 53, categoria: "Reflexão", texto: "Existe algo que você está cobrando dos outros sem praticar pessoalmente?" },
  { id: 54, categoria: "Reflexão", texto: "O que você pode simplificar hoje?" },
  { id: 55, categoria: "Reflexão", texto: "Qual foi a última vez que você perguntou ao time como está o processo, e não apenas o resultado?" },
  { id: 56, categoria: "Reflexão", texto: "Antes de encerrar o dia, identifique uma coisa que funcionou bem." },
  { id: 57, categoria: "Reflexão", texto: "O que você aprendeu hoje que poderá ensinar amanhã?" },
  { id: 58, categoria: "Reflexão", texto: "Nem toda pausa é perda de tempo. Às vezes, ela evita uma decisão ruim." },
  { id: 59, categoria: "Reflexão", texto: "Reserve um momento para olhar o cenário de cima, não apenas as tarefas da sua frente." },
  { id: 60, categoria: "Reflexão", texto: "Uma boa liderança também sabe quando parar, observar e recalibrar." },
  { id: 61, categoria: "Comunicação", texto: "Uma mensagem clara economiza várias mensagens de correção depois." },
  { id: 62, categoria: "Comunicação", texto: "Antes de enviar uma orientação, pergunte: alguém pode interpretar isso de duas formas?" },
  { id: 63, categoria: "Comunicação", texto: "Comunicar não é apenas falar. É verificar se a outra pessoa entendeu." },
  { id: 64, categoria: "Comunicação", texto: "Hoje, substitua uma suposição por uma pergunta." },
  { id: 65, categoria: "Comunicação", texto: "Feedback vago gera melhoria vaga. Seja específico." },
  { id: 66, categoria: "Comunicação", texto: "Se uma orientação precisa ser repetida muitas vezes, talvez o problema esteja na forma como ela foi comunicada." },
  { id: 67, categoria: "Comunicação", texto: "Conflitos pequenos ficam grandes quando ninguém cria espaço para conversar." },
  { id: 68, categoria: "Comunicação", texto: "Diga o que precisa ser feito, por que importa e como saberemos que deu certo." },
  { id: 69, categoria: "Comunicação", texto: "Uma conversa difícil conduzida com respeito pode fortalecer uma relação." },
  { id: 70, categoria: "Comunicação", texto: "Não use silêncio para resolver aquilo que precisa de diálogo." },
  { id: 71, categoria: "Comunicação", texto: "Escute até o fim antes de preparar sua resposta." },
  { id: 72, categoria: "Comunicação", texto: "Quando houver dúvida, confirme o entendimento antes de seguir." },
  { id: 73, categoria: "Comunicação", texto: "A comunicação de um líder deve reduzir ruído, não aumentar ansiedade." },
  { id: 74, categoria: "Comunicação", texto: "Hoje, escolha uma conversa importante e conduza-a com objetividade e respeito." },
  { id: 75, categoria: "Comunicação", texto: "Clareza é uma forma de cuidado com a equipe." },
  { id: 76, categoria: "Desenvolvimento", texto: "Todo dia pode ter uma pequena oportunidade de desenvolver alguém." },
  { id: 77, categoria: "Desenvolvimento", texto: "Delegue uma tarefa que permita a alguém praticar uma competência nova." },
  { id: 78, categoria: "Desenvolvimento", texto: "Não entregue apenas respostas; ensine como chegar a elas." },
  { id: 79, categoria: "Desenvolvimento", texto: "Pergunte a um colaborador qual habilidade ele gostaria de desenvolver." },
  { id: 80, categoria: "Desenvolvimento", texto: "O desenvolvimento acontece quando existe desafio acompanhado de orientação." },
  { id: 81, categoria: "Desenvolvimento", texto: "Um erro acompanhado de aprendizado pode se tornar uma evolução." },
  { id: 82, categoria: "Desenvolvimento", texto: "Identifique hoje uma pessoa que está pronta para receber mais responsabilidade." },
  { id: 83, categoria: "Desenvolvimento", texto: "Seu melhor legado como líder é deixar pessoas mais preparadas do que encontrou." },
  { id: 84, categoria: "Desenvolvimento", texto: "Faça uma pergunta que provoque reflexão em vez de entregar uma solução pronta." },
  { id: 85, categoria: "Desenvolvimento", texto: "Reconheça progresso, não apenas excelência." },
  { id: 86, categoria: "Desenvolvimento", texto: "Uma pequena evolução repetida todos os dias gera uma grande diferença." },
  { id: 87, categoria: "Desenvolvimento", texto: "Observe quem está fazendo bem e descubra o que pode ser compartilhado com o restante do time." },
  { id: 88, categoria: "Desenvolvimento", texto: "Crie espaço para que alguém tente, erre com responsabilidade e aprenda." },
  { id: 89, categoria: "Desenvolvimento", texto: "Hoje, ensine algo que você gostaria que sua equipe soubesse fazer sem depender de você." },
  { id: 90, categoria: "Desenvolvimento", texto: "Desenvolver pessoas é construir capacidade para o futuro." },
  { id: 91, categoria: "Resultados", texto: "Resultado sustentável nasce de processo claro, acompanhamento e pessoas preparadas." },
  { id: 92, categoria: "Resultados", texto: "Olhe o indicador, mas procure entender a história por trás dele." },
  { id: 93, categoria: "Resultados", texto: "Um número mostra o que aconteceu. A investigação ajuda a descobrir por quê." },
  { id: 94, categoria: "Resultados", texto: "Antes de comemorar um resultado, pergunte o que o tornou possível." },
  { id: 95, categoria: "Resultados", texto: "Antes de corrigir um indicador, descubra qual comportamento ou processo o influencia." },
  { id: 96, categoria: "Resultados", texto: "Não transforme uma meta em pressão sem transformar também em direção." },
  { id: 97, categoria: "Resultados", texto: "Hoje, escolha um indicador e pergunte: qual ação concreta pode movê-lo?" },
  { id: 98, categoria: "Resultados", texto: "Resultado sem contexto pode enganar. Sempre procure entender a causa." },
  { id: 99, categoria: "Resultados", texto: "Pequenos ganhos consistentes são mais úteis do que grandes esforços sem continuidade." },
  { id: 100, categoria: "Resultados", texto: "Acompanhar não é controlar cada passo; é perceber cedo quando algo saiu da rota." },
  { id: 101, categoria: "Resultados", texto: "Se uma meta não está sendo atingida, transforme o problema em plano de ação." },
  { id: 102, categoria: "Resultados", texto: "Celebre avanços reais, mesmo quando o objetivo final ainda estiver distante." },
  { id: 103, categoria: "Resultados", texto: "Uma equipe precisa saber como seu trabalho se conecta ao resultado maior." },
  { id: 104, categoria: "Resultados", texto: "Não peça velocidade onde o processo ainda não oferece clareza." },
  { id: 105, categoria: "Resultados", texto: "O indicador é um sinal. A liderança decide o que fazer com ele." },
  { id: 106, categoria: "Equilíbrio", texto: "Liderar bem também exige energia para continuar liderando bem amanhã." },
  { id: 107, categoria: "Equilíbrio", texto: "Nem toda demanda precisa ser resolvida imediatamente." },
  { id: 108, categoria: "Equilíbrio", texto: "Faça uma pausa curta para respirar antes de entrar em uma conversa difícil." },
  { id: 109, categoria: "Equilíbrio", texto: "Sua agenda também precisa ter espaço para pensar." },
  { id: 110, categoria: "Equilíbrio", texto: "Não confunda disponibilidade constante com liderança eficiente." },
  { id: 111, categoria: "Equilíbrio", texto: "Um líder cansado pode enxergar urgência onde existe apenas pressão." },
  { id: 112, categoria: "Equilíbrio", texto: "Proteja seu foco. Interrupção constante também tem custo." },
  { id: 113, categoria: "Equilíbrio", texto: "Hoje, escolha conscientemente quando estar disponível e quando estar concentrado." },
  { id: 114, categoria: "Equilíbrio", texto: "Uma pausa pode ser parte do trabalho quando ela melhora sua próxima decisão." },
  { id: 115, categoria: "Equilíbrio", texto: "Você não precisa carregar sozinho tudo o que pode ser compartilhado com o time." },
  { id: 116, categoria: "Equilíbrio", texto: "Organização é também uma forma de reduzir desgaste." },
  { id: 117, categoria: "Equilíbrio", texto: "Antes de assumir mais uma tarefa, verifique o que precisa sair da sua lista." },
  { id: 118, categoria: "Equilíbrio", texto: "Encerrar o dia com clareza ajuda a começar o próximo com direção." },
  { id: 119, categoria: "Equilíbrio", texto: "Seu time precisa de um líder presente, não de alguém permanentemente sobrecarregado." },
  { id: 120, categoria: "Equilíbrio", texto: "Cuidar da própria energia também é responsabilidade de liderança." },
  { id: 121, categoria: "Cultura", texto: "A cultura aparece principalmente naquilo que a equipe tolera, reconhece e repete." },
  { id: 122, categoria: "Cultura", texto: "O que você reconhece hoje pode virar comportamento comum amanhã." },
  { id: 123, categoria: "Cultura", texto: "Se deseja colaboração, reconheça atitudes colaborativas." },
  { id: 124, categoria: "Cultura", texto: "Regras claras ajudam, mas exemplos consistentes ajudam ainda mais." },
  { id: 125, categoria: "Cultura", texto: "A cultura é construída nas pequenas decisões do cotidiano." },
  { id: 126, categoria: "Cultura", texto: "Não deixe um comportamento inadequado passar apenas porque o resultado foi bom." },
  { id: 127, categoria: "Cultura", texto: "Coerência gera confiança: faça com que suas atitudes combinem com suas orientações." },
  { id: 128, categoria: "Cultura", texto: "Hoje, observe qual comportamento você está reforçando sem perceber." },
  { id: 129, categoria: "Cultura", texto: "Uma equipe aprende rapidamente o que realmente importa para sua liderança." },
  { id: 130, categoria: "Cultura", texto: "Valorize quem ajuda o time, não apenas quem aparece individualmente." },
  { id: 131, categoria: "Cultura", texto: "O ambiente muda quando as pessoas percebem que podem falar sem medo de serem ignoradas." },
  { id: 132, categoria: "Cultura", texto: "Cultura saudável não significa ausência de cobrança; significa cobrança com respeito e clareza." },
  { id: 133, categoria: "Cultura", texto: "O exemplo do líder é uma das mensagens mais frequentes que o time recebe." },
  { id: 134, categoria: "Cultura", texto: "Pequenos rituais de reconhecimento podem fortalecer grandes comportamentos." },
  { id: 135, categoria: "Cultura", texto: "Pergunte-se: que tipo de ambiente minhas atitudes estão ajudando a construir?" },
  { id: 136, categoria: "Gatilho de liderança", texto: "Hoje, transforme uma reclamação em uma pergunta: o que precisamos mudar para que isso não se repita?" },
  { id: 137, categoria: "Gatilho de liderança", texto: "Antes de concluir que alguém não está comprometido, investigue se existe um obstáculo que ainda não foi percebido." },
  { id: 138, categoria: "Gatilho de liderança", texto: "Qual tarefa você poderia eliminar, automatizar ou simplificar hoje?" },
  { id: 139, categoria: "Gatilho de liderança", texto: "Se você tivesse apenas uma hora para liderar hoje, onde colocaria sua atenção?" },
  { id: 140, categoria: "Gatilho de liderança", texto: "Hoje, dê contexto antes de dar cobrança." },
  { id: 141, categoria: "Gatilho de liderança", texto: "Pergunte ao seu time: \'O que eu poderia fazer melhor como líder?\'" },
  { id: 142, categoria: "Gatilho de liderança", texto: "Uma reunião boa termina com clareza: quem fará o quê e até quando?" },
  { id: 143, categoria: "Gatilho de liderança", texto: "Se uma pessoa trouxe um problema, agradeça por ela ter trazido antes que ele crescesse." },
  { id: 144, categoria: "Gatilho de liderança", texto: "Não espere uma crise para descobrir como sua equipe está se sentindo." },
  { id: 145, categoria: "Gatilho de liderança", texto: "Hoje, observe mais um processo do que uma pessoa." },
  { id: 146, categoria: "Gatilho de liderança", texto: "Uma meta clara precisa de um próximo passo claro." },
  { id: 147, categoria: "Gatilho de liderança", texto: "Escolha uma pendência antiga e decida: resolver, delegar, agendar ou eliminar." },
  { id: 148, categoria: "Gatilho de liderança", texto: "Antes de tomar uma decisão rápida, confira se você está reagindo a fatos ou a suposições." },
  { id: 149, categoria: "Gatilho de liderança", texto: "Hoje, faça uma pergunta que ninguém espera e que pode revelar uma oportunidade." },
  { id: 150, categoria: "Gatilho de liderança", texto: "Quando o resultado melhorar, descubra qual prática ajudou e transforme-a em padrão." },
  { id: 151, categoria: "Gatilho de liderança", texto: "Quando o resultado piorar, procure a causa antes de procurar um culpado." },
  { id: 152, categoria: "Gatilho de liderança", texto: "Seu time não precisa apenas saber o que fazer; precisa entender o que é sucesso." },
  { id: 153, categoria: "Gatilho de liderança", texto: "Hoje, dê autonomia acompanhada: confie e combine um ponto de acompanhamento." },
  { id: 154, categoria: "Gatilho de liderança", texto: "Um bom líder percebe problemas pequenos antes que eles virem grandes." },
  { id: 155, categoria: "Gatilho de liderança", texto: "O melhor momento para registrar uma decisão é enquanto ela ainda está clara." },
  { id: 156, categoria: "Gatilho de liderança", texto: "Hoje, procure uma pessoa que está fazendo algo bem e diga exatamente o que você percebeu." },
  { id: 157, categoria: "Gatilho de liderança", texto: "Uma pergunta bem feita pode desenvolver mais do que uma resposta pronta." },
  { id: 158, categoria: "Gatilho de liderança", texto: "Antes da próxima reunião, defina qual decisão precisa sair dela." },
  { id: 159, categoria: "Gatilho de liderança", texto: "Se a equipe está sempre esperando você, talvez seja hora de devolver algumas decisões a ela." },
  { id: 160, categoria: "Gatilho de liderança", texto: "Hoje, escolha uma regra do processo e pergunte se ela ainda faz sentido." },
  { id: 161, categoria: "Gatilho de liderança", texto: "Não confunda rapidez com pressa. Faça o necessário com clareza." },
  { id: 162, categoria: "Gatilho de liderança", texto: "Quando alguém discordar de você, procure primeiro entender a lógica por trás da discordância." },
  { id: 163, categoria: "Gatilho de liderança", texto: "Uma liderança madura consegue mudar de ideia quando novos fatos aparecem." },
  { id: 164, categoria: "Gatilho de liderança", texto: "Hoje, revise uma promessa que você fez e confirme se está sendo cumprida." },
  { id: 165, categoria: "Gatilho de liderança", texto: "Se algo depende sempre de uma única pessoa, existe uma oportunidade de criar redundância." },
  { id: 166, categoria: "Gatilho de liderança", texto: "Reconheça uma melhoria de processo, mesmo que o resultado final ainda não tenha aparecido." },
  { id: 167, categoria: "Gatilho de liderança", texto: "Hoje, observe quem está silenciosamente ajudando o time." },
  { id: 168, categoria: "Gatilho de liderança", texto: "Uma equipe aprende quando o líder transforma experiência em aprendizado compartilhado." },
  { id: 169, categoria: "Gatilho de liderança", texto: "Antes de encerrar uma tarefa, pergunte se ela realmente resolveu o problema." },
  { id: 170, categoria: "Gatilho de liderança", texto: "Não deixe uma decisão simples consumir energia que deveria estar em decisões importantes." },
  { id: 171, categoria: "Gatilho de liderança", texto: "Hoje, escolha uma conversa e entre nela com a intenção de compreender antes de convencer." },
  { id: 172, categoria: "Gatilho de liderança", texto: "Se você quer mais responsabilidade, deixe também claro qual autonomia acompanha essa responsabilidade." },
  { id: 173, categoria: "Gatilho de liderança", texto: "Uma boa rotina reduz a necessidade de improviso." },
  { id: 174, categoria: "Gatilho de liderança", texto: "Hoje, procure uma oportunidade de tornar uma orientação mais simples." },
  { id: 175, categoria: "Gatilho de liderança", texto: "Quando algo der errado, separe o fato da interpretação antes de agir." },
  { id: 176, categoria: "Gatilho de liderança", texto: "Seu time precisa saber quando você está cobrando, quando está orientando e quando está apenas ouvindo." },
  { id: 177, categoria: "Gatilho de liderança", texto: "Hoje, transforme uma pendência em próximo passo." },
  { id: 178, categoria: "Gatilho de liderança", texto: "Uma equipe confia mais quando percebe consistência entre discurso e prática." },
  { id: 179, categoria: "Gatilho de liderança", texto: "Não espere perfeição para reconhecer progresso." },
  { id: 180, categoria: "Gatilho de liderança", texto: "Hoje, pergunte: qual problema estamos aceitando como normal?" },
  { id: 181, categoria: "Gatilho de liderança", texto: "Uma boa liderança não elimina todos os problemas; melhora a capacidade do time de resolvê-los." },
  { id: 182, categoria: "Gatilho de liderança", texto: "Antes de adicionar uma nova regra, verifique se uma regra existente já resolve o problema." },
  { id: 183, categoria: "Gatilho de liderança", texto: "Hoje, faça uma pequena coisa que facilite o trabalho de quem virá depois." },
  { id: 184, categoria: "Gatilho de liderança", texto: "Se uma informação é importante, certifique-se de que ela está acessível a quem precisa dela." },
  { id: 185, categoria: "Gatilho de liderança", texto: "Uma decisão bem explicada reduz retrabalho." },
  { id: 186, categoria: "Gatilho de liderança", texto: "Hoje, dê espaço para alguém conduzir uma conversa que normalmente seria sua." },
  { id: 187, categoria: "Gatilho de liderança", texto: "Quando você delegar, combine expectativa, prazo e ponto de acompanhamento." },
  { id: 188, categoria: "Gatilho de liderança", texto: "Um líder também precisa admitir quando não sabe." },
  { id: 189, categoria: "Gatilho de liderança", texto: "Hoje, troque uma crítica por uma sugestão concreta de melhoria." },
  { id: 190, categoria: "Gatilho de liderança", texto: "Se o mesmo problema retorna, talvez esteja faltando uma mudança de processo." },
  { id: 191, categoria: "Gatilho de liderança", texto: "Antes de cobrar velocidade, veja se existem obstáculos desnecessários no caminho." },
  { id: 192, categoria: "Gatilho de liderança", texto: "Hoje, escolha uma pequena melhoria que possa ser implementada sem esperar um projeto grande." },
  { id: 193, categoria: "Gatilho de liderança", texto: "Uma boa pergunta para terminar o dia: o que eu faria diferente se pudesse repetir este dia?" },
  { id: 194, categoria: "Gatilho de liderança", texto: "Antes de ir embora, deixe amanhã um pouco mais organizado do que encontrou hoje." },
  { id: 195, categoria: "Gatilho de liderança", texto: "Seu calendário mostra suas prioridades. Ele também mostra o que está ficando sem espaço." },
  { id: 196, categoria: "Gatilho de liderança", texto: "Hoje, proteja uma conversa importante de distrações." },
  { id: 197, categoria: "Gatilho de liderança", texto: "Não espere que as pessoas adivinhem sua expectativa. Torne-a explícita." },
  { id: 198, categoria: "Gatilho de liderança", texto: "Uma equipe madura precisa de espaço para discordar com respeito." },
  { id: 199, categoria: "Gatilho de liderança", texto: "Hoje, verifique se alguma decisão sua está criando um efeito que você não pretendia." },
  { id: 200, categoria: "Gatilho de liderança", texto: "Quando ensinar algo, explique também como saber que a tarefa foi bem executada." },
  { id: 201, categoria: "Gatilho de liderança", texto: "Um processo claro reduz a dependência de pessoas específicas." },
  { id: 202, categoria: "Gatilho de liderança", texto: "Hoje, identifique uma tarefa que poderia ser documentada." },
  { id: 203, categoria: "Gatilho de liderança", texto: "Reconhecimento específico ensina à equipe quais comportamentos devem continuar." },
  { id: 204, categoria: "Gatilho de liderança", texto: "Se você só conversa com alguém quando existe problema, está perdendo oportunidades de relacionamento." },
  { id: 205, categoria: "Gatilho de liderança", texto: "Hoje, faça contato com alguém do time sem falar de cobrança ou resultado." },
  { id: 206, categoria: "Gatilho de liderança", texto: "Uma boa liderança alterna direção, acompanhamento, desenvolvimento e escuta." },
  { id: 207, categoria: "Gatilho de liderança", texto: "Antes de encerrar uma reunião, pergunte: todos sabem qual é o próximo passo?" },
  { id: 208, categoria: "Gatilho de liderança", texto: "Hoje, olhe para uma meta e traduza-a em comportamento observável." },
  { id: 209, categoria: "Gatilho de liderança", texto: "Um problema compartilhado cedo é mais fácil de resolver do que um problema escondido." },
  { id: 210, categoria: "Gatilho de liderança", texto: "Hoje, escolha uma preocupação e transforme-a em uma ação concreta." },
  { id: 211, categoria: "Gatilho de liderança", texto: "Se você está repetindo a mesma cobrança, talvez esteja na hora de mudar a abordagem." },
  { id: 212, categoria: "Gatilho de liderança", texto: "Uma equipe não precisa de respostas para tudo; precisa saber onde encontrar respostas." },
  { id: 213, categoria: "Gatilho de liderança", texto: "Hoje, pergunte a alguém experiente do time o que ele faria diferente." },
  { id: 214, categoria: "Gatilho de liderança", texto: "Aprender com quem executa o trabalho é uma forma poderosa de melhorar processos." },
  { id: 215, categoria: "Gatilho de liderança", texto: "Antes de alterar um processo, entenda por que ele foi criado." },
  { id: 216, categoria: "Gatilho de liderança", texto: "Hoje, procure uma causa que esteja escondida atrás de um sintoma." },
  { id: 217, categoria: "Gatilho de liderança", texto: "Uma boa decisão não precisa ser perfeita; precisa ser consciente, clara e acompanhada." },
  { id: 218, categoria: "Gatilho de liderança", texto: "Quando a prioridade mudar, comunique a mudança e explique o motivo." },
  { id: 219, categoria: "Gatilho de liderança", texto: "Hoje, confirme se aquilo que você considera óbvio também é óbvio para a equipe." },
  { id: 220, categoria: "Gatilho de liderança", texto: "Não transforme uma exceção em regra sem entender sua frequência e impacto." },
  { id: 221, categoria: "Gatilho de liderança", texto: "Uma pequena conversa hoje pode evitar um grande desalinhamento amanhã." },
  { id: 222, categoria: "Gatilho de liderança", texto: "Hoje, reconheça alguém que ajudou outra pessoa a crescer." },
  { id: 223, categoria: "Gatilho de liderança", texto: "Seu papel não é fazer tudo. É fazer o que somente sua liderança pode fazer." },
  { id: 224, categoria: "Gatilho de liderança", texto: "Antes de resolver algo para alguém, pergunte se a pessoa consegue resolver com sua orientação." },
  { id: 225, categoria: "Gatilho de liderança", texto: "Hoje, entregue uma responsabilidade acompanhada de confiança." },
  { id: 226, categoria: "Gatilho de liderança", texto: "Uma boa cultura também se constrói quando ninguém está olhando." },
  { id: 227, categoria: "Gatilho de liderança", texto: "Observe o que acontece quando você deixa uma decisão nas mãos do time." },
  { id: 228, categoria: "Gatilho de liderança", texto: "Hoje, pergunte: o que está consumindo nossa energia sem gerar valor?" },
  { id: 229, categoria: "Gatilho de liderança", texto: "Se uma reunião não precisa existir, não marque. Se precisa, tenha um objetivo claro." },
  { id: 230, categoria: "Gatilho de liderança", texto: "Uma agenda inteligente reserva espaço para imprevistos sem deixar tudo virar imprevisto." },
  { id: 231, categoria: "Gatilho de liderança", texto: "Hoje, encerre uma pendência que está ocupando espaço mental." },
  { id: 232, categoria: "Gatilho de liderança", texto: "Não deixe uma pequena falta de clareza virar uma grande cobrança." },
  { id: 233, categoria: "Gatilho de liderança", texto: "Hoje, escolha uma pessoa e pergunte o que poderia tornar seu dia melhor." },
  { id: 234, categoria: "Gatilho de liderança", texto: "Quando uma pessoa evolui, o resultado do time também ganha uma nova possibilidade." },
  { id: 235, categoria: "Gatilho de liderança", texto: "Uma liderança consistente é construída mais por hábitos do que por grandes discursos." },
  { id: 236, categoria: "Gatilho de liderança", texto: "Hoje, faça uma revisão rápida: pessoas, prioridades, processos e resultados. O que pede atenção?" },
  { id: 237, categoria: "Gatilho de liderança", texto: "Se algo não está funcionando, dê nome ao problema antes de procurar a solução." },
  { id: 238, categoria: "Gatilho de liderança", texto: "Hoje, procure uma oportunidade de substituir retrabalho por prevenção." },
  { id: 239, categoria: "Gatilho de liderança", texto: "Uma boa orientação deixa menos espaço para interpretação e mais espaço para execução." },
  { id: 240, categoria: "Gatilho de liderança", texto: "Antes de cobrar autonomia, certifique-se de que você realmente a está permitindo." },
  { id: 241, categoria: "Gatilho de liderança", texto: "Hoje, permita que alguém apresente uma solução antes de você apresentar a sua." },
  { id: 242, categoria: "Gatilho de liderança", texto: "Se você quer que o time pense, faça perguntas que exijam pensamento." },
  { id: 243, categoria: "Gatilho de liderança", texto: "Um líder atento percebe mudanças de comportamento antes de aparecerem nos indicadores." },
  { id: 244, categoria: "Gatilho de liderança", texto: "Hoje, observe uma reunião: quem fala, quem escuta e quem não participa?" },
  { id: 245, categoria: "Gatilho de liderança", texto: "Uma equipe forte não depende de uma única pessoa para manter o processo funcionando." },
  { id: 246, categoria: "Gatilho de liderança", texto: "Hoje, escolha uma atividade que possa ser compartilhada ou ensinada a outra pessoa." },
  { id: 247, categoria: "Gatilho de liderança", texto: "Não deixe uma boa ideia morrer porque ela ainda não está perfeita." },
  { id: 248, categoria: "Gatilho de liderança", texto: "Hoje, registre uma decisão importante para que ela não dependa da memória." },
  { id: 249, categoria: "Gatilho de liderança", texto: "Uma rotina bem desenhada libera energia para resolver o que é realmente novo." },
  { id: 250, categoria: "Gatilho de liderança", texto: "Antes de criar uma cobrança, defina como a pessoa poderá saber que está evoluindo." },
  { id: 251, categoria: "Gatilho de liderança", texto: "Hoje, pergunte: estamos medindo aquilo que realmente queremos melhorar?" },
  { id: 252, categoria: "Gatilho de liderança", texto: "Um indicador ruim pode ser um convite para investigar, não apenas para cobrar." },
  { id: 253, categoria: "Gatilho de liderança", texto: "Hoje, escolha uma métrica e procure uma história humana por trás dela." },
  { id: 254, categoria: "Gatilho de liderança", texto: "Não deixe o número esconder a experiência de quem está vivendo o processo." },
  { id: 255, categoria: "Gatilho de liderança", texto: "Uma boa gestão conecta pessoas, processos e resultados." },
  { id: 256, categoria: "Gatilho de liderança", texto: "Hoje, procure uma oportunidade de aproximar áreas que dependem umas das outras." },
  { id: 257, categoria: "Gatilho de liderança", texto: "Quando duas áreas entram em conflito, procure primeiro entender o fluxo entre elas." },
  { id: 258, categoria: "Gatilho de liderança", texto: "Uma boa passagem de bastão precisa de informação suficiente para evitar retrabalho." },
  { id: 259, categoria: "Gatilho de liderança", texto: "Hoje, confirme se alguma etapa do processo está esperando mais do que deveria." },
  { id: 260, categoria: "Gatilho de liderança", texto: "Se uma área depende da outra, clareza na comunicação é parte do resultado." },
  { id: 261, categoria: "Gatilho de liderança", texto: "Hoje, procure uma pequena fricção entre departamentos que possa ser eliminada." },
  { id: 262, categoria: "Gatilho de liderança", texto: "Uma liderança transversal começa quando você entende o impacto do seu processo no processo do outro." },
  { id: 263, categoria: "Gatilho de liderança", texto: "Não resolva apenas o problema do seu setor se ele continuar aparecendo no setor seguinte." },
  { id: 264, categoria: "Gatilho de liderança", texto: "Hoje, pense no cliente interno que recebe aquilo que sua equipe entrega." },
  { id: 265, categoria: "Gatilho de liderança", texto: "Uma experiência ruim muitas vezes nasce de um processo que ninguém revisou há algum tempo." },
  { id: 266, categoria: "Gatilho de liderança", texto: "Hoje, pergunte: o que nosso cliente ou colaborador está tendo que repetir?" },
  { id: 267, categoria: "Gatilho de liderança", texto: "Eliminar uma repetição desnecessária também é uma forma de cuidar das pessoas." },
  { id: 268, categoria: "Gatilho de liderança", texto: "Hoje, procure um ponto de atrito que possa ser simplificado." },
  { id: 269, categoria: "Gatilho de liderança", texto: "Um processo eficiente deve ser compreensível para quem realmente o executa." },
  { id: 270, categoria: "Gatilho de liderança", texto: "Antes de cobrar aderência a um processo, confirme se ele é praticável." },
  { id: 271, categoria: "Gatilho de liderança", texto: "Hoje, observe se existe alguma etapa que todos fazem apenas porque sempre foi assim." },
  { id: 272, categoria: "Gatilho de liderança", texto: "Uma mudança sustentável começa quando o motivo da mudança é compreendido." },
  { id: 273, categoria: "Gatilho de liderança", texto: "Hoje, explique o porquê de uma decisão importante para a equipe." },
  { id: 274, categoria: "Gatilho de liderança", texto: "Não peça mudança sem mostrar qual problema ela pretende resolver." },
  { id: 275, categoria: "Gatilho de liderança", texto: "Uma equipe comprometida precisa enxergar sentido no que faz." },
  { id: 276, categoria: "Gatilho de liderança", texto: "Hoje, conecte uma tarefa cotidiana ao impacto que ela gera no cliente." },
  { id: 277, categoria: "Gatilho de liderança", texto: "Quando o propósito fica claro, pequenas tarefas ganham significado." },
  { id: 278, categoria: "Gatilho de liderança", texto: "Hoje, reconheça alguém que demonstrou responsabilidade mesmo diante de uma dificuldade." },
  { id: 279, categoria: "Gatilho de liderança", texto: "Uma pessoa pode precisar de cobrança e, ao mesmo tempo, de apoio." },
  { id: 280, categoria: "Gatilho de liderança", texto: "Hoje, diferencie falta de vontade de falta de clareza, capacidade ou recurso." },
  { id: 281, categoria: "Gatilho de liderança", texto: "Antes de concluir que alguém não consegue, pergunte se já recebeu orientação suficiente." },
  { id: 282, categoria: "Gatilho de liderança", texto: "Desenvolvimento começa onde existe disposição para aprender e espaço para praticar." },
  { id: 283, categoria: "Gatilho de liderança", texto: "Hoje, escolha uma competência e observe onde alguém do time poderia exercitá-la." },
  { id: 284, categoria: "Gatilho de liderança", texto: "Um feedback útil aponta comportamento, impacto e próximo passo." },
  { id: 285, categoria: "Gatilho de liderança", texto: "Hoje, dê um feedback que a pessoa consiga transformar em ação." },
  { id: 286, categoria: "Gatilho de liderança", texto: "Não espere o momento perfeito para uma conversa de desenvolvimento." },
  { id: 287, categoria: "Gatilho de liderança", texto: "Uma conversa de desenvolvimento não precisa ser longa para ser significativa." },
  { id: 288, categoria: "Gatilho de liderança", texto: "Hoje, pergunte: qual aprendizado recente merece ser compartilhado com o time?" },
  { id: 289, categoria: "Gatilho de liderança", texto: "Uma equipe aprende mais quando conhecimento deixa de ficar preso em poucas pessoas." },
  { id: 290, categoria: "Gatilho de liderança", texto: "Hoje, peça que alguém ensine ao restante do time uma prática que domina." },
  { id: 291, categoria: "Gatilho de liderança", texto: "Delegar uma apresentação pode ser uma oportunidade de desenvolver comunicação." },
  { id: 292, categoria: "Gatilho de liderança", texto: "Hoje, dê a alguém a chance de conduzir uma pequena decisão." },
  { id: 293, categoria: "Gatilho de liderança", texto: "Autonomia cresce quando existe confiança acompanhada de responsabilidade." },
  { id: 294, categoria: "Gatilho de liderança", texto: "Hoje, observe onde sua equipe ainda depende demais de você." },
  { id: 295, categoria: "Gatilho de liderança", texto: "Se tudo precisa passar por você, seu próximo projeto pode ser desenvolver o time." },
  { id: 296, categoria: "Gatilho de liderança", texto: "Hoje, escolha uma decisão que pode ser descentralizada." },
  { id: 297, categoria: "Gatilho de liderança", texto: "Uma liderança escalável não aumenta sua própria carga; aumenta a capacidade da equipe." },
  { id: 298, categoria: "Gatilho de liderança", texto: "Hoje, pense no que você precisa parar de fazer para conseguir liderar melhor." },
  { id: 299, categoria: "Gatilho de liderança", texto: "Nem toda boa liderança aparece em uma entrega. Algumas aparecem na prevenção de problemas." },
  { id: 300, categoria: "Gatilho de liderança", texto: "Hoje, valorize uma prevenção que evitou retrabalho." },
  { id: 301, categoria: "Gatilho de liderança", texto: "Uma boa rotina de acompanhamento evita surpresas no fim do mês." },
  { id: 302, categoria: "Gatilho de liderança", texto: "Hoje, faça uma checagem rápida das principais entregas antes que elas se tornem urgentes." },
  { id: 303, categoria: "Gatilho de liderança", texto: "Se uma tarefa tem prazo, ela também precisa ter responsável e expectativa clara." },
  { id: 304, categoria: "Gatilho de liderança", texto: "Hoje, confira se suas pendências realmente têm dono." },
  { id: 305, categoria: "Gatilho de liderança", texto: "Uma lista sem responsável é apenas uma lista de intenções." },
  { id: 306, categoria: "Gatilho de liderança", texto: "Hoje, transforme uma intenção em compromisso com prazo." },
  { id: 307, categoria: "Gatilho de liderança", texto: "Não deixe decisões importantes perdidas em conversas informais." },
  { id: 308, categoria: "Gatilho de liderança", texto: "Hoje, registre o que precisa ser lembrado." },
  { id: 309, categoria: "Gatilho de liderança", texto: "Uma informação certa no momento certo pode economizar muito trabalho." },
  { id: 310, categoria: "Gatilho de liderança", texto: "Hoje, pergunte se alguém está esperando uma informação sua." },
  { id: 311, categoria: "Gatilho de liderança", texto: "Se você demora para responder uma decisão, talvez esteja bloqueando outras pessoas." },
  { id: 312, categoria: "Gatilho de liderança", texto: "Hoje, identifique quem precisa de uma decisão sua para avançar." },
  { id: 313, categoria: "Gatilho de liderança", texto: "Uma liderança eficiente também é uma liderança previsível." },
  { id: 314, categoria: "Gatilho de liderança", texto: "Hoje, cumpra um combinado que você fez, mesmo que ninguém esteja cobrando." },
  { id: 315, categoria: "Gatilho de liderança", texto: "Coerência é fazer o combinado quando seria mais fácil deixar para depois." },
  { id: 316, categoria: "Gatilho de liderança", texto: "Hoje, observe uma promessa de liderança que você pode reforçar com uma atitude." },
  { id: 317, categoria: "Gatilho de liderança", texto: "Uma equipe percebe rapidamente quando critérios mudam conforme a pessoa." },
  { id: 318, categoria: "Gatilho de liderança", texto: "Hoje, revise se suas cobranças estão usando critérios claros e consistentes." },
  { id: 319, categoria: "Gatilho de liderança", texto: "Justiça percebida começa com clareza e consistência." },
  { id: 320, categoria: "Gatilho de liderança", texto: "Hoje, explique o critério por trás de uma decisão que pode gerar dúvida." },
  { id: 321, categoria: "Gatilho de liderança", texto: "Uma decisão difícil fica mais compreensível quando o processo de decisão é transparente." },
  { id: 322, categoria: "Gatilho de liderança", texto: "Hoje, separe preferência pessoal de necessidade do negócio." },
  { id: 323, categoria: "Gatilho de liderança", texto: "Boa gestão exige decisões baseadas em contexto, não apenas em hábito." },
  { id: 324, categoria: "Gatilho de liderança", texto: "Hoje, questione uma decisão antiga: ela ainda faz sentido para o cenário atual?" },
  { id: 325, categoria: "Gatilho de liderança", texto: "Melhoria contínua começa com a coragem de revisar o que já fazemos." },
  { id: 326, categoria: "Gatilho de liderança", texto: "Hoje, escolha uma coisa para melhorar apenas 1%." },
  { id: 327, categoria: "Gatilho de liderança", texto: "Pequenas melhorias acumuladas podem transformar uma rotina." },
  { id: 328, categoria: "Gatilho de liderança", texto: "Hoje, não procure uma revolução. Procure uma melhoria que possa ser mantida." },
  { id: 329, categoria: "Gatilho de liderança", texto: "Uma mudança simples que permanece vale mais que uma grande mudança que dura uma semana." },
  { id: 330, categoria: "Gatilho de liderança", texto: "Hoje, pense: o que podemos tornar mais simples, mais claro ou mais rápido?" },
  { id: 331, categoria: "Gatilho de liderança", texto: "Se um processo exige muitas explicações, talvez ele precise ser redesenhado." },
  { id: 332, categoria: "Gatilho de liderança", texto: "Hoje, escolha uma instrução e tente reduzi-la ao essencial." },
  { id: 333, categoria: "Gatilho de liderança", texto: "Clareza também é produtividade." },
  { id: 334, categoria: "Gatilho de liderança", texto: "Hoje, elimine uma informação desnecessária de uma comunicação." },
  { id: 335, categoria: "Gatilho de liderança", texto: "Quanto menos ruído, mais energia sobra para o que importa." },
  { id: 336, categoria: "Gatilho de liderança", texto: "Hoje, proteja seu time de uma distração que não precisa chegar até ele." },
  { id: 337, categoria: "Gatilho de liderança", texto: "Uma boa liderança também filtra ruídos." },
  { id: 338, categoria: "Gatilho de liderança", texto: "Hoje, pergunte: isso realmente precisa chegar ao time agora?" },
  { id: 339, categoria: "Gatilho de liderança", texto: "Nem toda informação precisa virar ação." },
  { id: 340, categoria: "Gatilho de liderança", texto: "Hoje, diferencie informação, decisão e ação." },
  { id: 341, categoria: "Gatilho de liderança", texto: "Uma equipe eficiente sabe o que precisa saber, decidir e executar." },
  { id: 342, categoria: "Gatilho de liderança", texto: "Hoje, transforme uma reunião informativa em uma comunicação objetiva se não houver decisão a tomar." },
  { id: 343, categoria: "Gatilho de liderança", texto: "Tempo de equipe também é recurso de gestão." },
  { id: 344, categoria: "Gatilho de liderança", texto: "Hoje, respeite o tempo das pessoas começando reuniões no horário e com objetivo claro." },
  { id: 345, categoria: "Gatilho de liderança", texto: "Uma reunião sem objetivo tende a consumir tempo sem produzir clareza." },
  { id: 346, categoria: "Gatilho de liderança", texto: "Hoje, termine uma reunião perguntando: o que ficou decidido?" },
  { id: 347, categoria: "Gatilho de liderança", texto: "Se ninguém sabe o que acontece depois da reunião, ela ainda não terminou." },
  { id: 348, categoria: "Gatilho de liderança", texto: "Hoje, escolha uma reunião que pode ser mais curta sem perder qualidade." },
  { id: 349, categoria: "Gatilho de liderança", texto: "Eficiência não é fazer tudo mais rápido; é evitar trabalho que não precisa existir." },
  { id: 350, categoria: "Gatilho de liderança", texto: "Hoje, questione uma tarefa que consome tempo e entrega pouco valor." },
  { id: 351, categoria: "Gatilho de liderança", texto: "Uma boa gestão protege tempo para pensar." },
  { id: 352, categoria: "Gatilho de liderança", texto: "Hoje, reserve alguns minutos sem notificações para analisar o cenário." },
  { id: 353, categoria: "Gatilho de liderança", texto: "Decisões melhores precisam de espaço mental." },
  { id: 354, categoria: "Gatilho de liderança", texto: "Hoje, não responda imediatamente a uma situação que merece análise." },
  { id: 355, categoria: "Gatilho de liderança", texto: "Uma pausa entre estímulo e resposta pode melhorar uma decisão." },
  { id: 356, categoria: "Gatilho de liderança", texto: "Hoje, respire antes de responder uma mensagem difícil." },
  { id: 357, categoria: "Gatilho de liderança", texto: "Seu tom também comunica sua liderança." },
  { id: 358, categoria: "Gatilho de liderança", texto: "Hoje, revise uma mensagem antes de enviá-la e retire qualquer frase que possa soar mais dura do que precisa." },
  { id: 359, categoria: "Gatilho de liderança", texto: "Respeito não diminui a firmeza; melhora a forma como ela é recebida." },
  { id: 360, categoria: "Gatilho de liderança", texto: "Hoje, seja firme sobre o problema e respeitoso com a pessoa." },
  { id: 361, categoria: "Gatilho de liderança", texto: "Uma conversa difícil pode ser conduzida com objetividade sem perder humanidade." },
  { id: 362, categoria: "Gatilho de liderança", texto: "Hoje, fale sobre o comportamento observado, não sobre a personalidade de alguém." },
  { id: 363, categoria: "Gatilho de liderança", texto: "Feedback sobre fatos abre mais espaço para mudança." },
  { id: 364, categoria: "Gatilho de liderança", texto: "Hoje, separe intenção de impacto: o que a pessoa quis fazer e o que realmente aconteceu?" },
  { id: 365, categoria: "Gatilho de liderança", texto: "Nem todo conflito nasce de má intenção. Às vezes nasce de percepções diferentes." }
];

// ─── Paleta rotativa de 10 cores vivas ────────────────────────────────────────
// Independente da categoria — muda a cada navegação garantindo variedade visual
const PALETA = [
  { grad: 'linear-gradient(135deg, #6d28d9, #4c1d95)', sombra: '0 20px 48px -8px rgba(109,40,217,0.55)', icone: '💜' },  // violeta
  { grad: 'linear-gradient(135deg, #0891b2, #164e63)', sombra: '0 20px 48px -8px rgba(8,145,178,0.55)',  icone: '💙' },  // ciano
  { grad: 'linear-gradient(135deg, #dc2626, #7f1d1d)', sombra: '0 20px 48px -8px rgba(220,38,38,0.55)',  icone: '❤️'  },  // vermelho
  { grad: 'linear-gradient(135deg, #059669, #064e3b)', sombra: '0 20px 48px -8px rgba(5,150,105,0.55)',  icone: '💚' },  // verde
  { grad: 'linear-gradient(135deg, #d97706, #78350f)', sombra: '0 20px 48px -8px rgba(217,119,6,0.55)',  icone: '🧡' },  // âmbar
  { grad: 'linear-gradient(135deg, #db2777, #831843)', sombra: '0 20px 48px -8px rgba(219,39,119,0.55)', icone: '🩷' },  // rosa
  { grad: 'linear-gradient(135deg, #2563eb, #1e3a8a)', sombra: '0 20px 48px -8px rgba(37,99,235,0.55)',  icone: '💙' },  // azul
  { grad: 'linear-gradient(135deg, #0d9488, #134e4a)', sombra: '0 20px 48px -8px rgba(13,148,136,0.55)', icone: '💚' },  // teal
  { grad: 'linear-gradient(135deg, #9333ea, #581c87)', sombra: '0 20px 48px -8px rgba(147,51,234,0.55)', icone: '💜' },  // roxo
  { grad: 'linear-gradient(135deg, #ea580c, #7c2d12)', sombra: '0 20px 48px -8px rgba(234,88,12,0.55)',  icone: '🧡' },  // laranja
];

// ─── Helpers de data ──────────────────────────────────────────────────────────
function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000);
}
function getDataHoje(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// ─── localStorage ─────────────────────────────────────────────────────────────
const LS_DATA       = 'gestao360_msg_data';
const LS_IDX_MANUAL = 'gestao360_msg_idx';
const LS_COR_IDX    = 'gestao360_msg_cor';
const LS_FECHADO    = 'gestao360_msg_fechado';

function getIndiceBase(): number {
  return getDayOfYear(new Date()) % MENSAGENS.length;
}
function lerEstado(): { indice: number; corIdx: number; fechado: boolean } {
  try {
    const dataStorage = localStorage.getItem(LS_DATA);
    const hoje = getDataHoje();
    if (dataStorage !== hoje) {
      localStorage.setItem(LS_DATA, hoje);
      localStorage.removeItem(LS_IDX_MANUAL);
      localStorage.removeItem(LS_COR_IDX);
      localStorage.removeItem(LS_FECHADO);
      return { indice: getIndiceBase(), corIdx: getIndiceBase() % PALETA.length, fechado: false };
    }
    const idxManual = localStorage.getItem(LS_IDX_MANUAL);
    const corIdx    = localStorage.getItem(LS_COR_IDX);
    return {
      indice:  idxManual ? parseInt(idxManual) : getIndiceBase(),
      corIdx:  corIdx    ? parseInt(corIdx)    : getIndiceBase() % PALETA.length,
      fechado: localStorage.getItem(LS_FECHADO) === 'true',
    };
  } catch {
    return { indice: getIndiceBase(), corIdx: 0, fechado: false };
  }
}

type Fase = 'idle' | 'saindo' | 'entrando';

// ─── Componente ───────────────────────────────────────────────────────────────
interface MensagemDoDiaProps { userId?: string; }

export default function MensagemDoDia({ userId }: MensagemDoDiaProps) {
  const [aberto,  setAberto]  = useState(false);
  const [visivel, setVisivel] = useState(false);
  const [indice,  setIndice]  = useState(getIndiceBase);
  const [corIdx,  setCorIdx]  = useState(() => getIndiceBase() % PALETA.length);
  const [fase,    setFase]    = useState<Fase>('idle');

  // Ref para a div do gradiente — manipulação direta do DOM para o crossfade
  // (evita o problema do React batching que impede ver a transição opacity 0→1)
  const gradRefAtual = useRef<HTMLDivElement>(null);
  const gradRefAlvo  = useRef<HTMLDivElement>(null);
  const navegandoRef = useRef(false);
  const corIdxRef    = useRef(corIdx); // ref síncrono para usar dentro de callbacks

  useEffect(() => { corIdxRef.current = corIdx; }, [corIdx]);

  // Montagem
  useEffect(() => {
    const estado = lerEstado();
    setIndice(estado.indice);
    setCorIdx(estado.corIdx);
    corIdxRef.current = estado.corIdx;
    if (!estado.fechado) {
      setTimeout(() => {
        setAberto(true);
        requestAnimationFrame(() => requestAnimationFrame(() => setVisivel(true)));
      }, 700);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const mensagem = MENSAGENS[indice] ?? MENSAGENS[0];
  const cor      = PALETA[corIdx] ?? PALETA[0];

  const fechar = useCallback(() => {
    setVisivel(false);
    setTimeout(() => setAberto(false), 500);
    try { localStorage.setItem(LS_FECHADO, 'true'); } catch { /* ok */ }
  }, []);

  const navegar = useCallback((dir: 1 | -1) => {
    if (navegandoRef.current) return;
    navegandoRef.current = true;

    // ── Fase 1: texto SAI (300ms) ──────────────────────────────────────────────
    setFase('saindo');

    setTimeout(() => {
      // ── Fase 2: atualizar índice, categoria e COR ──────────────────────────
      setIndice(prev => {
        const novoIdx = (prev + dir + MENSAGENS.length) % MENSAGENS.length;
        try { localStorage.setItem(LS_IDX_MANUAL, String(novoIdx)); } catch { /* ok */ }
        return novoIdx;
      });

      // Avançar paleta de cor — sempre muda, independente da categoria
      const novoCorIdx = (corIdxRef.current + 1) % PALETA.length;
      const novaCor = PALETA[novoCorIdx];

      // Crossfade via DOM direto: setar cor alvo → opacity 0 → rAF → opacity 1
      // Isso contorna o React batch e garante que o browser veja dois frames distintos
      if (gradRefAlvo.current) {
        gradRefAlvo.current.style.background = novaCor.grad;
        gradRefAlvo.current.style.transition = 'none';
        gradRefAlvo.current.style.opacity = '0';

        // Dois frames para garantir que o browser registrou opacity:0 antes de animar
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (gradRefAlvo.current) {
              gradRefAlvo.current.style.transition = 'opacity 0.65s cubic-bezier(0.4, 0, 0.2, 1)';
              gradRefAlvo.current.style.opacity = '1';
            }
          });
        });
      }

      // Atualizar cor atual (sob o alvo) após o crossfade terminar
      setTimeout(() => {
        if (gradRefAtual.current) {
          gradRefAtual.current.style.background = novaCor.grad;
        }
        if (gradRefAlvo.current) {
          gradRefAlvo.current.style.transition = 'none';
          gradRefAlvo.current.style.opacity = '0';
        }
        setCorIdx(novoCorIdx);
        corIdxRef.current = novoCorIdx;
        try { localStorage.setItem(LS_COR_IDX, String(novoCorIdx)); } catch { /* ok */ }
      }, 700);

      // ── Fase 3: texto ENTRA (450ms) ────────────────────────────────────────
      setFase('entrando');
      setTimeout(() => {
        setFase('idle');
        navegandoRef.current = false;
      }, 480);

    }, 310);
  }, []);

  if (!aberto) return null;

  return (
    <>
      <style>{`
        @keyframes msgFloat {
          0%   { transform: translateY(0px)   rotate(0deg);    }
          22%  { transform: translateY(-9px)  rotate(0.45deg); }
          48%  { transform: translateY(-14px) rotate(-0.25deg);}
          70%  { transform: translateY(-7px)  rotate(0.3deg);  }
          88%  { transform: translateY(-11px) rotate(-0.3deg); }
          100% { transform: translateY(0px)   rotate(0deg);    }
        }
        @keyframes msgEntrada {
          from { opacity: 0; transform: translateY(36px) scale(0.91); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes msgTextoSai {
          from { opacity: 1; transform: translateY(0)    scale(1);    }
          to   { opacity: 0; transform: translateY(-16px) scale(0.95);}
        }
        @keyframes msgTextoEntra {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }

        .msg-float    { animation: msgFloat   6.5s cubic-bezier(0.37,0,0.63,1) infinite; will-change: transform; }
        .msg-entrada  { animation: msgEntrada 0.6s  cubic-bezier(0.16,1,0.3,1) forwards; }
        .msg-sai      { animation: msgTextoSai   0.3s  cubic-bezier(0.4,0,1,1)       forwards; }
        .msg-entra    { animation: msgTextoEntra 0.5s  cubic-bezier(0.16,1,0.3,1)    forwards; }
      `}</style>

      {/* Float wrapper — isolado para não conflitar com entrada */}
      <div className="msg-float fixed bottom-24 right-6 z-40 w-80 select-none">

        {/* Entrada wrapper */}
        <div
          className={visivel ? 'msg-entrada' : 'opacity-0'}
          style={{ transition: !visivel ? 'opacity 0.4s ease' : undefined }}
        >

          {/* Sombra colorida externa */}
          <div style={{
            position: 'absolute', inset: '-2px', borderRadius: '1.6rem',
            boxShadow: cor.sombra,
            transition: 'box-shadow 0.7s ease',
            pointerEvents: 'none', zIndex: 0,
          }} />

          {/* Gradiente atual (embaixo — base estável) */}
          <div
            ref={gradRefAtual}
            style={{
              position: 'absolute', inset: 0, borderRadius: '1.5rem',
              background: cor.grad,
              zIndex: 1,
            }}
          />

          {/* Gradiente alvo (por cima — faz o crossfade) */}
          <div
            ref={gradRefAlvo}
            style={{
              position: 'absolute', inset: 0, borderRadius: '1.5rem',
              background: cor.grad,
              opacity: 0,
              zIndex: 2,
            }}
          />

          {/* Conteúdo — acima dos gradientes */}
          <div className="relative rounded-3xl overflow-hidden" style={{ zIndex: 3, border: '1px solid rgba(255,255,255,0.22)' }}>

            {/* Brilho linha topo */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'rgba(255,255,255,0.4)' }} />

            {/* Brilho circular interno */}
            <div style={{
              position: 'absolute', top: '8px', left: '12px',
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />

            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2.5">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }}>
                <span className="text-xs leading-none">{CORES_ICONE[mensagem.categoria] ?? '✨'}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/90">
                  {mensagem.categoria}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Sparkles size={11} className="text-white/35" />
                <span className="text-[10px] text-white/35 font-mono">{String(indice + 1).padStart(3, '0')}/365</span>
                <button onClick={fechar} className="ml-1 p-1 rounded-full text-white/55 hover:text-white hover:bg-white/15 transition-colors" title="Fechar">
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* Texto com animação de fase */}
            <div className="px-4 pb-3 min-h-[76px] flex items-center overflow-hidden">
              <p className={`text-[13px] leading-relaxed font-medium text-white ${
                fase === 'saindo'   ? 'msg-sai'   :
                fase === 'entrando' ? 'msg-entra' : ''
              }`}>
                {mensagem.texto}
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 pb-3.5 pt-0.5">
              <p className="text-[9px] text-white/30">Mensagem do Dia · Gestão360</p>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => navegar(-1)} disabled={fase !== 'idle'}
                  className="p-1.5 rounded-xl text-white/55 hover:text-white hover:bg-white/15 transition-colors disabled:opacity-25"
                  title="Anterior"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  onClick={() => navegar(1)} disabled={fase !== 'idle'}
                  className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/15 transition-colors disabled:opacity-25"
                  title="Próxima"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

// Ícones por categoria (separados do crossfade de cor)
const CORES_ICONE: Record<string, string> = {
  'Prioridade': '🎯', 'Pessoas': '🤝', 'Liderança': '🧭',
  'Reflexão': '💭', 'Comunicação': '💬', 'Desenvolvimento': '📈',
  'Resultados': '🏆', 'Equilíbrio': '⚖️', 'Cultura': '🌱',
  'Gatilho de liderança': '⚡',
};
