# Sprint 7 — identidade e infraestrutura Supabase

Atualizado em 22 de julho de 2026.

## Objetivo

Como responsável pela plataforma, quero recriar identidade, dados e autorização a partir do GitHub, para que staging e produção não dependam de SQLite, sessão Flask, senha master em ambiente ou configuração manual de banco.

## Incremento 1 — fundação PostgreSQL/RLS

Entregue no repositório:

- configuração local versionada do Supabase;
- Auth com cadastro público desativado, senha mínima de 12 caracteres, confirmação de e-mail e rotação de refresh token;
- schema PostgreSQL completo com tipos, constraints, índices e relacionamentos;
- perfil ligado a `auth.users`, sem master ou senha no seed;
- professor, estudante e master separados por papel e estado;
- associação aluno-turma normalizada;
- tema livre estruturalmente impedido de ser publicado;
- gabarito separado das questões visíveis;
- domínio de 70% e revisão em três dias preservados como regras da aplicação, com tabelas próprias;
- jobs persistentes com idempotência;
- RLS habilitada em todas as tabelas públicas;
- master condicionado a papel ativo e sessão `aal2` nas policies administrativas;
- teste pgTAP inicial do contrato estrutural.

## Critérios e estado

| Critério | Estado | Evidência |
|---|---|---|
| Nenhuma credencial no schema/seed | atendido | `supabase/seed.sql` vazio e teste sem master |
| Identidade canônica no Auth | atendido em código | FK `profiles.id → auth.users.id` |
| RLS por padrão | atendido em código | RLS em todas as tabelas públicas |
| Gabarito não disponível ao estudante | atendido em desenho | tabela separada, sem policy estudantil |
| Recriação em ambiente limpo | atendido | GitHub Actions recriou PostgreSQL, aplicou migrations, executou pgTAP e lint |
| Regressão do sistema atual | atendido | 50 testes backend, 15 frontend e build aprovados |
| Testes RLS por persona | próximo incremento | sessões JWT de teste e casos negativos |

O schema foi validado em PostgreSQL pelo GitHub Actions no run `29953761085`. A aplicação e o job de migrations/RLS concluíram com sucesso. Testes negativos completos por persona continuam selecionados para a Sprint 8.

## Próximo incremento

Executar o banco local, corrigir qualquer incompatibilidade SQL, ampliar pgTAP para estudante/professor/master com e sem `aal2` e integrar o frontend ao Supabase Auth.

## Incremento 2 — validação contínua e cliente Auth

- GitHub Actions recria o PostgreSQL pelas migrations, executa pgTAP e lint do banco sem depender de credenciais remotas;
- pipeline também executa 50 testes backend, 15 testes frontend e build pelo lockfile;
- Supabase CLI fixado em `2.109.1` para reprodutibilidade;
- cliente Supabase usa PKCE, refresh automático e somente URL/chave publishable;
- exemplo de ambiente não contém segredos;
- integração visual do login permanece deliberadamente desligada até as operações protegidas deixarem de depender da sessão Flask.
