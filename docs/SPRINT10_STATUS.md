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

- automatizar cenários E2E isolados sem contaminar dados acadêmicos reais;
- revisar a experiência móvel e os estados de erro do fluxo autenticado;
- preparar o corte de release para Vercel.
