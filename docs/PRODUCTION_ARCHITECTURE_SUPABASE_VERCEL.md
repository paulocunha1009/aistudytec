# Arquitetura definitiva de produção — Supabase e Vercel

Versão 1.0 — 22 de julho de 2026  
Decisão do Product Owner: esta é a arquitetura-alvo obrigatória para publicação. SQLite, sessão Flask e executor em memória deixam de ser componentes de produção.

## Resultado exigido

Um clone limpo do GitHub deve conseguir criar desenvolvimento e staging a partir de migrations versionadas, executar testes e publicar a aplicação sem editar código, copiar banco local ou armazenar segredos no repositório.

“Pronto para produção” significa implantação real verificada; não significa apenas arquivos de configuração presentes.

## Topologia final

| Camada | Plataforma | Responsabilidade |
|---|---|---|
| Aplicação web | Vercel | build, CDN, domínio, preview e produção |
| Identidade | Supabase Auth | cadastro controlado, login, recuperação, sessões e MFA |
| Autorização | PostgreSQL + RLS | isolamento por usuário, turma, professor e papel |
| Dados | Supabase PostgreSQL | fonte única de verdade e constraints |
| Operações privilegiadas | Supabase Edge Functions | segredos, integrações e regras não expostas ao cliente |
| Trabalho assíncrono | Supabase Queues + consumidor idempotente | geração Gemini/YouTube, retries e retomada |
| Agendamento | Supabase Cron | recuperação de jobs, revisões e manutenção |
| Observabilidade | logs estruturados + tabelas operacionais | correlação, falhas e auditoria minimizada |
| Código e entrega | GitHub Actions | lint, testes, migrations, build e promoção controlada |

## Decisões vinculantes

1. O frontend React continuará funcional durante a migração, mas a sessão Flask será removida do caminho de produção.
2. `auth.users.id` será a identidade canônica. `public.profiles.id` referenciará `auth.users(id)`.
3. Papéis serão armazenados em dados não editáveis pelo usuário e validados por funções/policies; `user_metadata` não concederá autorização.
4. Todas as tabelas expostas terão RLS habilitada e policies positivas. Ausência de policy implica negação.
5. A chave publishable do Supabase pode existir no frontend; `service_role`, Gemini e YouTube existem somente em secrets server-side.
6. O master será criado pelo fluxo administrativo do Supabase, associado a perfil nominal e papel `master`. Não haverá senha master no Git, migration, seed ou variável permanente de bootstrap.
7. MFA TOTP será obrigatório para master. Ações críticas exigirão `aal2` e autenticação recente.
8. Cadastro público de professor e master é proibido. Professor nasce por convite administrativo. Cadastro de estudante só será liberado após fluxo de menores/LGPD aprovado.
9. Geração não dependerá de `ThreadPoolExecutor`, memória de processo ou filesystem. Cada job e tentativa será persistido antes de chamar provedores.
10. Preview, staging e produção usarão projetos/ambientes separados; nenhuma migration será testada pela primeira vez em produção.

## Modelo de segurança

### Identidade e perfis

- `profiles`: nome, papel, estado, ano escolar e timestamps;
- `class_memberships`: associação entre estudante e turma;
- `teacher_class_access`: propriedade/participação docente quando necessário;
- papéis: `student`, `teacher`, `master`;
- estados: `invited`, `active`, `locked`, `disabled`.

O cliente nunca pode promover seu próprio papel ou estado. Funções `security definer` terão `search_path` fixo, entradas validadas e grants mínimos.

### Sessões e MFA

Supabase Auth controla access token, refresh token, rotação e sessões. O aplicativo implementará encerramento local/global, recuperação e tela de dispositivos conforme capacidades verificadas do plano. Policies e Edge Functions sensíveis verificarão o nível de garantia do autenticador. Master sem `aal2` não executa operação privilegiada.

### RLS

- estudante lê e altera somente seus dados permitidos;
- professor lê estudantes de suas turmas e administra apenas seus tópicos/turmas;
- tema livre pertence exclusivamente ao estudante e nunca vira oficial;
- master acessa administração somente em sessão `aal2`, com auditoria;
- jobs só são visíveis ao solicitante ou ao responsável autorizado;
- tabelas internas, filas e auditoria não são concedidas diretamente a `anon`.

### Auditoria

Eventos: login relevante, convite, alteração de papel/estado, MFA, publicação, acesso negado crítico, revogação e operação administrativa. Não armazenar senha, token, chave, texto livre do aluno ou payload integral de provedor.

## Processamento de IA

1. Edge Function autenticada valida usuário, autorização e payload.
2. Transação cria `generation_job` com chave idempotente e coloca mensagem durável na fila.
3. Consumidor faz claim com visibility timeout e registra tentativa.
4. Chamadas Gemini e YouTube são separadas em etapas reiniciáveis.
5. Resultado passa por validação estrutural e regras pedagógicas antes da persistência.
6. Sucesso arquiva a mensagem; falha transitória retorna à fila com backoff; falha definitiva vai para estado terminal consultável.
7. Cron recupera jobs abandonados sem duplicar tópico, quiz ou vídeo.

## Ambientes e segredos

### Frontend Vercel

- `REACT_APP_SUPABASE_URL`;
- `REACT_APP_SUPABASE_PUBLISHABLE_KEY`;
- `REACT_APP_APP_ENV`.

São valores públicos por natureza. Nenhum segredo server-side pode usar prefixo exposto pelo build.

### Supabase secrets

- `GEMINI_API_KEY`;
- `YOUTUBE_API_KEY`;
- credencial do provedor de e-mail, quando aprovado;
- chaves adicionais somente quando houver consumidor documentado.

Segredos são configurados separadamente por staging e produção. Arquivos `.env` locais permanecem ignorados.

## Repositório definitivo

```text
frontend/                 aplicação publicada na Vercel
supabase/config.toml      configuração local versionada
supabase/migrations/      schema, constraints, funções, grants e RLS
supabase/functions/       operações privilegiadas e workers
supabase/tests/           testes SQL/RLS e contratos
.github/workflows/        CI, staging e promoção
docs/                     operação, segurança, ADRs e runbooks
```

SQLite será mantido apenas como fonte de migração até a reconciliação dos dados. Depois será removido dos artefatos e não poderá ser usado como fallback silencioso.

## Pipeline de entrega

Pull request: instalar dependências com lockfile, validar UTF-8, executar testes frontend, testes de funções, subir Supabase local, recriar banco exclusivamente pelas migrations, executar testes RLS e produzir build Vercel.

Merge em `main`: aplicar migrations em staging, publicar funções, publicar preview/staging e executar smoke/E2E autenticado.

Produção: promoção manual após backup, verificação de migration, aprovação e plano de rollback. Mudanças destrutivas usam expansão/contração em releases separadas.

## Gate obrigatório antes do GitHub público/deploy

- histórico Git verificado sem segredos;
- `.env`, banco SQLite, tokens e artefatos locais ignorados e não rastreados;
- schema recriado do zero por migrations;
- RLS negativa testada para estudante, professor, outro professor, anônimo e master sem MFA;
- master nominal criado fora do código, senha rotacionada e TOTP confirmado;
- recuperação de senha com e-mail real em staging;
- geração idempotente testada com timeout, retry e retomada;
- backup e restauração demonstrados;
- domínio, redirects e e-mails configurados para produção;
- logs e alertas sem dados sensíveis;
- checklist LGPD para menores aprovado;
- build Vercel e smoke test de produção aprovados.

Nenhum item será marcado concluído por simulação ou dado inventado.

## Fontes técnicas normativas

- Supabase Auth: https://supabase.com/docs/guides/auth
- Sessões: https://supabase.com/docs/guides/auth/sessions
- MFA: https://supabase.com/docs/guides/auth/auth-mfa
- RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Migrations: https://supabase.com/docs/guides/local-development/overview
- Queues: https://supabase.com/docs/guides/queues
- Background tasks: https://supabase.com/docs/guides/functions/background-tasks
- Variáveis Vercel: https://vercel.com/docs/environment-variables

