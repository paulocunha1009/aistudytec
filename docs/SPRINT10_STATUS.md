# Sprint 10 — jornada docente em PostgreSQL

Atualizado em 23 de julho de 2026. Status: em andamento.

## Incremento 1 — turmas e blueprint curricular

O primeiro fluxo vertical removeu a dependência de Flask/SQLite da criação e listagem de turmas. O frontend usa Supabase sob RLS e a criação ocorre por função PostgreSQL auditada, que deriva o proprietário da sessão autenticada.

### Catálogo importado

Fonte recebida do Product Owner: `sidep-ce-componentes-descritores-tecnico-em-informatica.md`.

- curso: Técnico em Informática;
- 22 componentes curriculares;
- 10 competências;
- 40 descritores;
- níveis: básico, intermediário e avançado;
- SHA-256 da origem: `8065FBBBCAF9E1317753C53F3DA9EF14C15DC30279061000B4694AD99343D7E9`;
- classificação: `internal_curated`.

O catálogo não é apresentado como fonte oficial enquanto a ementa documental utilizada na elaboração não estiver vinculada ao registro de proveniência.

### Contrato pedagógico

- uma turma pode selecionar vários componentes;
- o professor escolhe descritores pertencentes aos componentes selecionados;
- competências são derivadas automaticamente dos descritores;
- o banco rejeita descritor incompatível, inexistente ou repetido;
- o blueprint é persistido separadamente dos conteúdos gerados;
- a IA deverá usar o blueprint como restrição de geração;
- conteúdo gerado permanece rascunho até validação e publicação docente.

### Segurança

- professor ativo cria turma em `aal1`;
- master somente cria turma administrativa em `aal2`;
- proprietário da turma vem de `auth.uid()`, nunca do payload do navegador;
- código de oito caracteres é gerado no PostgreSQL;
- outro professor não lê a turma;
- usuário anônimo não lê o catálogo;
- usuário autenticado lê o catálogo, mas não pode alterá-lo;
- criação registra `class.created` em `audit_events`.

### Homologação real

Turma criada no staging:

- nome: `Turma Piloto — Técnico em Informática`;
- código: `756AD7FD`;
- ano: 1º ano;
- componentes: Informática Básica; Arquitetura e Manutenção de Computadores;
- descritores: D01, D02, D03, D11 e D12;
- proprietário: master verificado `paulohcordeiroc@gmail.com`.

### Evidências

- migrações `20260723000700`, `20260723000800` e `20260723000900` aplicadas;
- seis suítes e 27 testes frontend aprovados;
- build de produção aprovado;
- testes pgTAP adicionados para criação, isolamento, catálogo e coerência do blueprint.

## Incremento 2 — matrícula docente de alunos credenciados

O professor responsável pela turma agora pode matricular e remover alunos diretamente na área de Gestão. A operação usa o e-mail normalizado como chave de busca, mas somente aceita contas previamente autorizadas pelo master, ativas e com papel de aluno.

### Regras de segurança

- apenas o proprietário da turma ou o master em `aal2` administra a matrícula;
- a identidade é resolvida no PostgreSQL, sem aceitar UUID informado pelo navegador;
- contas pendentes, suspensas ou com outro papel são rejeitadas;
- a remoção é lógica por `left_at`, preservando histórico;
- uma nova matrícula reativa o vínculo anterior sem duplicá-lo;
- matrícula e remoção geram os eventos auditáveis `class.student_enrolled` e `class.student_removed`.

### Homologação real

- turma: `Turma Piloto — Técnico em Informática`;
- aluno: `Phc Informática`;
- conta: `atendimentophcinfor@gmail.com`;
- resultado: aluno matriculado e exibido na lista da turma;
- ação de remoção disponibilizada ao responsável pela turma;
- migração `20260723001000` aplicada no staging;
- sete suítes e 30 testes frontend aprovados;
- build de produção aprovado;
- teste pgTAP `007_teacher_enrollment.test.sql` adicionado para autorização, papéis, isolamento, remoção e rematrícula.

## Incremento 3 — tópicos orientados pelo currículo

- listagem e criação de tópicos migradas do servidor legado para Supabase;
- todo tópico docente exige ao menos um descritor;
- somente descritores pertencentes ao blueprint da turma são aceitos;
- vínculo persistido em `topic_curriculum_descriptors`;
- criação protegida pela função `create_teacher_topic`;
- evento `topic.created` registrado na auditoria;
- interface homologada com D01, D02, D03, D11 e D12 da turma piloto.

## Incremento 4 — cadastro delegado de alunos

- professor cadastra aluno por e-mail dentro de turma própria;
- conta ativa existente é matriculada imediatamente;
- conta nova recebe autorização exclusiva de aluno e entra pelo Google;
- no primeiro acesso, perfil e matrícula são ativados automaticamente;
- professor não informa nem altera papel, portanto não pode criar professor ou master;
- professor não acessa turmas, alunos ou autorizações de outro professor;
- autorizações pendentes ficam visíveis somente ao criador e podem ser revogadas;
- master em `aal2` mantém autoridade global;
- operações permanecem auditadas e nenhuma senha provisória é criada.

### Evidências técnicas adicionais

- migrações `20260723001100`, `20260723001200` e `20260723001300` aplicadas no staging;
- oito suítes e 36 testes frontend aprovados;
- build de produção aprovado;
- testes pgTAP `008_curriculum_guided_topics.test.sql` e `009_teacher_delegated_student_access.test.sql` adicionados.

## Incremento 5 — geração fundamentada e gate docente

- revisão e edição migradas do Flask/SQLite para Supabase;
- Edge Function autenticada `generate-topic` publicada;
- chaves Gemini e YouTube armazenadas somente no cofre server-side;
- pesquisa Gemini fundamentada com Google Search antes da geração;
- fontes do grounding preservadas em `topic_sources`;
- geração restrita aos descritores e competências do tópico;
- três explicações e três trilhas imersivas estruturadas;
- nove questões com habilidade, feedback, dificuldade, gabarito privado e descritor;
- vídeos do YouTube entram como candidatos não aprovados;
- publicação exige explicações detalhadas, trilhas completas, oito ou mais questões e um vídeo aprovado por nível;
- versão, revisor, data e auditoria são registrados na publicação.

### Homologação real

- tópico: `Fundamentos de hardware e segurança digital`;
- turma: `Turma Piloto — Técnico em Informática`;
- descritores: D01, D03 e D11;
- resultado: status `generated`, três níveis preenchidos e nove questões;
- gate validado: publicação bloqueada até aprovação de um vídeo por nível;
- nenhum conteúdo foi liberado ao aluno sem curadoria docente.

## Incremento 6 — transparência e checklist de curadoria

- checklist visual apresenta quatro critérios do gate em tempo real;
- fontes fundamentadas são exibidas ao professor e preparadas para a experiência publicada do aluno;
- política server-side aceita somente universidades, órgãos públicos, documentação primária e jornalismo de grande prestígio;
- agregadores e fontes fora da lista institucional são eliminados antes da persistência;
- geração falha de forma segura se não encontrar ao menos duas fontes confiáveis;
- ranking de vídeos exige correspondência textual com o tema, considera duração e relevância;
- o mesmo vídeo não é repetido entre níveis;
- professor pode aprovar e também desfazer a aprovação de um vídeo.

### Homologação real

- checklist do tópico piloto: 3/4 critérios;
- pendência corretamente identificada: aprovação humana de um vídeo por nível;
- fontes preservadas após o filtro: USP, UFSC, RNP, Governo Federal e IBM;
- fontes como Medium, Scribd e Wikipédia foram removidas pela política;
- nove suítes e 39 testes frontend aprovados;
- build de produção aprovado.

## Próximo incremento

- permitir troca manual de vídeos inadequados sem regenerar todo o material;
- exibir descritor e competência em cada questão na curadoria;
- homologar a publicação final com decisão explícita do professor;
- migrar a leitura do aluno e o quiz remanescentes para Supabase.

## Ajuste de experiência — curadoria de vídeos

- cada candidato é um link real para `youtube.com/watch`, compatível com botão direito e abertura em nova aba;
- aprovação e remoção de aprovação usam atualização otimista;
- somente o cartão alterado é atualizado, sem recarregar o tópico;
- posição de rolagem, textos em edição e contexto visual são preservados;
- em caso de falha no banco, o cartão retorna ao estado anterior e apresenta erro;
- homologado visualmente com o tópico publicado da turma piloto.

## Incremento 7 — substituição segura de vídeos

- professor pode informar um link do YouTube separadamente em cada nível;
- Edge Function valida URL, existência, acesso público e permissão de incorporação;
- somente vídeos entre 3 e 20 minutos são aceitos;
- título e descrição precisam apresentar relação textual com o tópico;
- vídeo validado entra como candidato e ainda exige aprovação humana;
- aprovação usa função PostgreSQL auditada e mantém somente um vídeo aprovado por nível;
- qualquer alteração de aprovação em conteúdo publicado devolve o tópico para `generated`;
- nova publicação e nova decisão docente tornam-se obrigatórias após a mudança;
- cada questão agora exibe seu descritor e competência, como `D11 · C03`;
- controles homologados sem alterar o tópico real já publicado;
- nove suítes e 41 testes frontend aprovados.

## Incremento 8 — experiência publicada e quiz seguro do aluno

- área de estudo deixou de gerar temas livres e agora apresenta somente materiais revisados e publicados;
- materiais são descobertos pelas matrículas ativas do aluno, inclusive quando ele participa de mais de uma turma;
- cada cartão identifica a turma, o ano, a versão e a natureza da publicação docente;
- explicações, trilhas imersivas, fontes confiáveis, vídeos aprovados e questões são lidos diretamente do Supabase;
- vídeos não aprovados e tópicos em rascunho continuam invisíveis ao estudante pelas políticas RLS;
- o navegador envia somente o identificador da questão e a alternativa escolhida;
- o gabarito permanece em `quiz_answer_keys` e a correção ocorre exclusivamente na função server-side `submit_published_topic_quiz`;
- a função exige conta de aluno, matrícula ativa e tópico publicado;
- tentativa, respostas, pontuação, domínio acumulado por habilidade e auditoria são persistidos atomicamente;
- feedback imediato não revela a resposta correta durante a tentativa;
- migração `20260723001800_secure_student_quiz.sql` aplicada no staging;
- lint remoto do schema aprovado sem erros;
- dez suítes e 43 testes frontend aprovados;
- teste pgTAP `011_secure_student_quiz.test.sql` cobre correção, progresso, sigilo do gabarito, auditoria e isolamento de aluno externo;
- build de produção aprovado.

## Próximo incremento

- oferecer ao professor indicadores agregados por turma e descritor sem expor respostas individuais indevidas;
- homologar visualmente toda a jornada com uma conta real de aluno matriculado.

## Incremento 9 — plano diário, revisões e mapa real

- `ProgressView` deixou de consumir os endpoints legados de domínio, revisão e histórico;
- mapa de habilidades lê `skill_mastery` diretamente do Supabase e filtra explicitamente pelo usuário da sessão;
- linha do tempo usa tentativas concluídas de `quiz_attempts`, vinculadas ao título real do tópico;
- plano diário apresenta somente revisões pendentes já vencidas e oferece continuidade pelo último tópico estudado;
- abertura de uma atividade reutiliza o contrato seguro de tópico publicado;
- fluxo antigo de entrada em turma por código foi removido da jornada privada;
- matrícula passa a ser exclusivamente aquela autorizada pelo professor ou master;
- habilidades com domínio acumulado abaixo de 70% geram revisão para três dias;
- uma nova tentativa na habilidade conclui a revisão pendente anterior;
- ao atingir 70% ou mais, a habilidade não recebe uma nova revisão;
- índice parcial garante no máximo uma revisão pendente por aluno e habilidade, preservando o histórico resolvido;
- duplicidades legadas são resolvidas de forma não destrutiva durante a migration;
- migração `20260723001900_student_review_cycle.sql` aplicada no staging;
- lint remoto do schema aprovado sem erros;
- onze suítes e 44 testes frontend aprovados;
- build de produção aprovado.

## Próximo incremento

- homologar visualmente a jornada completa usando uma conta real de aluno.

## Incremento 10 — painel docente por evidências reais

- dashboard docente deixou de consumir o endpoint legado `classDashboard`;
- função `get_class_learning_dashboard` agrega os dados no PostgreSQL;
- acesso exige professor proprietário da turma ou master com MFA `aal2`;
- outro professor recebe bloqueio explícito e não acessa dados da turma;
- resumo apresenta estudantes ativos, revisões vencidas, habilidades abaixo de 70% com evidência repetida e alunos sem tentativa;
- fila de intervenção diferencia revisão vencida, ausência de atividade, reforço e pouca evidência;
- cartões por aluno usam somente tentativas, domínio acumulado e última prática registrados;
- nova seção curricular agrega acertos, respostas e estudantes com evidência por descritor;
- porcentagens são identificadas como evidência observada e não como diagnóstico de capacidade ou esforço;
- gabaritos permanecem fora do contrato do painel;
- migração `20260723002000_class_learning_dashboard.sql` aplicada no staging;
- lint remoto do schema aprovado sem erros;
- doze suítes e 45 testes frontend aprovados;
- teste pgTAP `012_class_learning_dashboard.test.sql` cobre agregação e isolamento entre professores;
- build de produção aprovado.

### Homologação visual real

- turma: `Turma Piloto — Técnico em Informática`;
- estudante ativo: `Phc Informática`;
- painel exibiu um estudante e uma intervenção por ausência de tentativa;
- revisões vencidas e habilidades abaixo de 70% permaneceram em zero;
- descritores permaneceram no estado vazio porque ainda não existe quiz concluído pelo aluno;
- nenhum dado acadêmico fictício foi criado para preencher o painel.

## Próximo incremento

- preparar os testes E2E autenticados do fluxo completo.

## Incremento 11 — homologação E2E autenticada

- jornada real executada do material publicado até o painel docente;
- aluno autorizado concluiu as nove questões do tópico piloto;
- correção server-side registrou 9/9 sem expor o gabarito;
- nove habilidades receberam uma evidência cada;
- D01, D03 e D11 receberam três respostas corretas cada;
- painel removeu corretamente o sinal `sem tentativa`;
- painel apresentou `Pouca evidência`, pois uma resposta por habilidade não sustenta domínio consolidado;
- nenhuma revisão foi agendada porque o domínio acumulado observado ficou acima de 70%;
- botão `Atualizar evidências` permite sincronização manual sem recarregar a aplicação;
- horário da última atualização fica explícito ao professor;
- evidência detalhada registrada em `docs/E2E_PILOT_2026-07-23.md`;
- resultado não é apresentado como prova de eficácia pedagógica.

## Próximo incremento

## Incremento 12 — quality gate e preparação da Vercel

- Playwright configurado para Chromium em desktop e viewport móvel;
- smoke E2E comprova que o portal privado bloqueia a aplicação antes da autenticação;
- testes de navegador não reutilizam nem versionam sessões reais;
- pipeline GitHub Actions executa testes frontend, build e Playwright;
- job independente inicia Supabase descartável e executa pgTAP com rollback;
- relatórios, vídeos, screenshots e traces do Playwright ficam fora do Git;
- `vercel.json` define fallback da SPA e headers defensivos;
- Content Security Policy limita scripts, conexões, frames e formulários;
- fallback residual para Flask removido do frontend;
- README e guia de implantação atualizados para Supabase + Vercel;
- checklist operacional criado em `docs/VERCEL_RELEASE.md`;
- segredos Gemini e YouTube permanecem exclusivamente no Supabase;
- três smoke tests E2E aprovados e um caso desktop não aplicável ignorado;
- doze suítes, 45 testes frontend e build de produção aprovados.

### Débito técnico identificado

O `npm audit` reportou dependências vulneráveis herdadas do Create React App. Não foi aplicado `audit fix --force`, pois a correção quebraria o toolchain sem migração controlada. A substituição do Create React App por Vite entra como requisito de hardening antes do piloto ampliado.

## Próximo incremento

- criar e homologar o primeiro deploy Preview na Vercel.

## Incremento 13 — migração para Vite

- `react-scripts` e Create React App removidos do projeto;
- Vite 6 assumiu desenvolvimento, build e preview;
- Vitest 3 substituiu Jest mantendo as 45 verificações existentes;
- mocks foram convertidos para `vi` com içamento correto;
- Tailwind passou a usar PostCSS e Autoprefixer explicitamente;
- variáveis públicas adotaram o prefixo `VITE_`;
- compatibilidade temporária com o `.env.local` anterior foi mantida somente no ambiente local;
- output de produção mudou de `build` para `dist`;
- Vercel, GitHub Actions, Playwright, README e runbooks foram atualizados;
- workflow legado duplicado foi removido;
- build transformou 1.331 módulos com sucesso;
- três smoke tests E2E passaram contra servidor Vite isolado;
- sessão autenticada existente, gestão, painel e dados reais foram homologados visualmente no Vite;
- `npm audit --audit-level=low` retornou zero vulnerabilidades;
- servidor CRA antigo foi encerrado e a porta 3000 passou a ser atendida pelo Vite.

## Próximo incremento

- criar o primeiro deploy Preview na Vercel;
- cadastrar as três variáveis públicas do Vite;
- configurar Site URL e redirects com a URL HTTPS gerada;
- executar o smoke de produção antes de promover a release.

## Incremento 14 — primeira release online homologada

- repositório original `paulocunha1009/aistudytec` conectado à Vercel;
- permissão do GitHub App limitada aos repositórios selecionados;
- projeto `SIDEP-CE/aistudytec` criado com raiz `frontend`;
- preset Vite, build `npm run build` e saída `dist` reconhecidos;
- variáveis `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` e
  `VITE_APP_ENV` cadastradas para Production e Preview;
- deploy do commit `02ef064` concluído com status `Ready`;
- domínio oficial atribuído: `https://aistudytec.vercel.app`;
- Site URL do Supabase atualizado para o domínio oficial;
- portal privado e fluxo Google OAuth homologados em HTTPS;
- retorno do OAuth ocorreu no domínio oficial, sem permanecer no callback;
- conta master exigiu e aceitou MFA antes de liberar a administração;
- painel principal, gestão acadêmica e gestão de acessos abriram em produção;
- a tela de acessos exibiu os registros reais existentes, sem criação de dados
  fictícios durante a homologação;
- novas atualizações da branch `main` passam a gerar deploys automaticamente.

### Resultado

A primeira release online está operacional e vinculada ao pipeline Git. A
homologação comprova o funcionamento técnico do acesso master em produção; não
constitui evidência de eficácia pedagógica.

## Próximo incremento

- homologar em produção os perfis professor e aluno;
- executar geração, revisão, publicação e quiz no domínio oficial;
- verificar responsividade nos dispositivos-alvo;
- consolidar o checklist de aceite do piloto controlado.

## Incremento 15 — homologação dos perfis em produção

- conta docente real entrou pelo Google no domínio oficial;
- professor não recebeu o menu master `Acessos`;
- a área `Gestão` respeitou o escopo real e informou que a conta ainda não
  possui turma própria;
- conta real de aluno entrou pelo Google sem MFA administrativo;
- aluno não recebeu menus de gestão ou administração;
- `Minha jornada` recuperou uma tentativa real, nove habilidades consistentes e
  nenhuma revisão vencida;
- linha do tempo confirmou o quiz de 9/9 concluído em 23/07/2026;
- nenhum registro acadêmico fictício foi criado durante os testes;
- foi detectado que o último tópico deixou de estar publicado, embora a
  tentativa histórica continue válida;
- o plano diário foi corrigido para não oferecer uma ação quebrada quando o
  material associado à tentativa não está mais publicado;
- revisões associadas a material indisponível preservam a evidência, mas
  direcionam o aluno para outro conteúdo;
- doze suítes e 46 testes frontend foram aprovados;
- build Vite de produção transformou 1.331 módulos com sucesso.

## Próximo incremento

- vincular uma turma real à conta docente que conduzirá o piloto;
- revisar e publicar um material real dessa turma;
- homologar professor → publicação → aluno → quiz no domínio oficial;
- concluir os testes responsivos e o checklist operacional da Sprint 15.

## Incremento 16 — titularidade docente do piloto

- transferência autorizada pelo Product Owner;
- `Turma Piloto — Técnico em Informática` transferida da conta master para
  `paulo.cunha1@prof.ce.gov.br`;
- operação executada em transação única com validação do proprietário anterior;
- destino validado como perfil `teacher` ativo antes da alteração;
- um tópico docente teve sua titularidade alinhada à nova proprietária da turma;
- uma matrícula ativa e todo o histórico acadêmico foram preservados;
- evento `class.ownership_transferred` registrado em `audit_events`, incluindo
  proprietário anterior, novo proprietário e motivo;
- resultado verificado no banco: turma `756AD7FD`, um tópico alinhado e um aluno
  ativo;
- login real do professor confirmou a turma em `Minhas turmas`;
- professor visualizou o aluno `Phc Informática` e o tópico real
  `Fundamentos de hardware e segurança digital`;
- o tópico permanece em `Gerado (revisar)`, portanto ainda não foi exposto ao
  aluno como material publicado.

## Próximo incremento

- revisar o tópico real nos três níveis;
- validar vídeos, fontes, trilhas e questões;
- publicar somente após aprovação explícita do professor;
- repetir o fluxo do aluno no domínio oficial.

## Incremento 17 — regeneração segura da curadoria audiovisual

- a ação `Regerar vídeos` passou a regenerar somente a seção audiovisual, sem
  substituir explicações, trilhas, fontes ou questões já revisadas;
- vídeos previamente aprovados pelo professor são preservados;
- somente candidatos ainda não aprovados são substituídos;
- a troca ocorre no banco por função transacional `security definer`, com
  validação do professor responsável e registro de auditoria
  `topic.videos_regenerated`;
- vídeos simples e técnicos permanecem limitados a 20 minutos;
- a faixa avançada passou a aceitar aulas de até 45 minutos;
- buscas avançadas priorizam português e canais institucionais brasileiros,
  como universidades, institutos federais, CERT.br, NIC.br, ANPD e RNP;
- vídeos avançados sem indicador institucional são rejeitados antes de chegar
  à curadoria docente;
- a regeneração foi homologada no tópico real e manteve intactas as aprovações
  já existentes;
- a consulta ampliada e processada em lotes encontrou candidatos incorporáveis
  do CERT.br e NIC.br;
- o professor aprovou `Ciclo de palestras Segurança da Internet — CERT.br:
  Autenticação` para o nível avançado;
- o vídeo avançado em inglês foi removido da curadoria aprovada;
- os quatro critérios de revisão permanecem atendidos, mas o tópico não foi
  publicado automaticamente.

## Próximo incremento

- publicar o material apenas mediante confirmação explícita;
- homologar o consumo e o quiz pela conta real do aluno.

## Incremento 18 — publicação e homologação ponta a ponta

- o professor abriu o tópico real da `Turma Piloto — Técnico em Informática`;
- a revisão confirmou os quatro critérios obrigatórios atendidos;
- a publicação exigiu confirmação explícita antes de liberar o conteúdo;
- o sistema confirmou `Tópico publicado para a turma!`;
- o material passou a ser exibido como `Versão 5 · publicação docente`;
- a conta real `atendimentophcinfor@gmail.com`, matriculada na turma, recebeu o
  material imediatamente após a publicação;
- os níveis `Descobrir`, `Aprofundar` e `Conectar` ficaram disponíveis ao aluno;
- o nível avançado exibiu o vídeo institucional
  `Ciclo de palestras Segurança da Internet — CERT.br: Autenticação`;
- leitura guiada, investigação, missão audiovisual, atividade prática,
  metacognição e fontes confiáveis foram carregadas;
- o quiz abriu corretamente com `Questão 1 de 9`;
- o quiz foi fechado sem respostas para não criar evidência acadêmica fictícia
  nem interferir no histórico real do aluno.

## Próximo incremento

- executar uma tentativa real de quiz conduzida pelo aluno;
- validar correção, feedback, habilidades e atualização de progresso;
- homologar o painel docente após a tentativa;
- concluir o checklist responsivo e operacional do piloto.

## Incremento 19 — tentativa real e intervenção docente

- o aluno real concluiu o quiz publicado sem respostas produzidas pela equipe;
- a nova tentativa registrou `5/9` respostas corretas e resultado de `56%`;
- a jornada passou a exibir duas tentativas verificáveis;
- cinco habilidades permaneceram consistentes com evidência acumulada de 100%;
- quatro habilidades ficaram em prática com `50%` em duas respostas:
  identificação de componentes, compreensão de função, comparação e
  identificação e definição de conceitos;
- o plano diário recomendou continuar no material com base no último quiz;
- o painel docente recebeu a tentativa sem atualização manual;
- a fila priorizada classificou o aluno para `Reforço` em quatro habilidades;
- a ação sugerida foi revisar a explicação e observar a próxima tentativa;
- a média descritiva das duas tentativas ficou em `78%`;
- a leitura por descritor apresentou `D11 = 50%`, `D03 = 83%` e `D01 = 100%`;
- o painel preservou os limites pedagógicos declarados: os indicadores
  organizam evidências, mas não diagnosticam capacidade, esforço ou causa.

## Próximo incremento

- executar a intervenção docente sobre as quatro habilidades priorizadas;
- realizar uma nova tentativa após o reforço e comparar a evolução;
- validar responsividade nos dispositivos-alvo;
- concluir o checklist operacional do piloto controlado.
