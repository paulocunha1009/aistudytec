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

## Próximo incremento

- matrícula de alunos credenciados pelo professor;
- gestão de tópicos diretamente no PostgreSQL;
- seleção de descritores por tópico e por questão;
- geração orientada pelo blueprint;
- preview e gate de publicação docente.
