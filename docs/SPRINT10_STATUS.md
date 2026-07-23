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
