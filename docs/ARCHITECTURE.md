# Arquitetura

## Contexto

O React acessa a API Flask. O backend persiste em SQLite e integra Gemini e YouTube apenas no servidor. Chaves ficam em `backend/.env`, ignorado pelo Git.

| Componente | Responsabilidade |
|---|---|
| React | Jornadas, feedback imediato e estado de tela |
| Flask | HTTP, regras, cálculo e orquestração |
| Security | Sessão, papéis e autorização por recurso |
| Audit | Eventos críticos minimizados e consultáveis pelo master |
| SQLite | Dados acadêmicos e operacionais |
| Gemini | Explicações e questões estruturadas |
| YouTube Data API | Vídeos filtrados e ranqueados |

## Fluxos críticos

### Publicação

`draft → generated → published`. A transição final exige três explicações, cinco questões válidas e um vídeo aprovado por nível.

### Quiz e domínio

O backend confere o gabarito armazenado, grava respostas, acumula acertos/tentativas e calcula percentual. Habilidades abaixo de 70% recebem uma única revisão pendente com vencimento em três dias.

## Dados

Tabelas: `users`, `classes`, `history`, `topics`, `topic_explanations`, `topic_learning_paths`, `generation_jobs`, `quiz_questions`, `topic_videos`, `quiz_attempt_answers`, `skill_mastery`, `review_queue` e `audit_events`.

### Jobs de geração

O contrato assíncrono começa em `POST /api/generation-jobs` e é consultado por `GET /api/generation-jobs/<id>`. A idempotência é delimitada por proprietário, operação e chave; um hash canônico impede reutilização da chave com entrada diferente. Dados internos do job não aparecem na resposta pública. Um executor local faz claim atômico, reutiliza as rotas de geração, registra conclusão/falha e recoloca em fila trabalhos interrompidos por reinício.

Na jornada de tema livre, o React persiste apenas o `jobId` em armazenamento local, faz polling e retoma o acompanhamento após reload. Ao concluir, busca o tópico pelo contrato normal. Geração e regeneração docentes ainda usam a rota síncrona durante a migração compatível.

### Geração imersiva

O Gemini retorna explicações e `learningPaths` por nível. Cada trilha contém gancho, objetivos, ideias essenciais, conexão real, investigação guiada, missão de vídeo, desafio prático, reflexão e discussão. O backend valida o contrato e persiste o JSON em `topic_learning_paths`. Conteúdos antigos sem trilha continuam legíveis e solicitam regeneração.

Chamadas de geração usam `gemini-2.5-flash`, saída de até 20.000 tokens, timeout de 90 s por tentativa e no máximo duas tentativas quando a resposta viola o schema. O cliente aguarda até 180 s para gerar/regenerar; demais chamadas usam 30 s.

### Recuperação de vídeo

A busca combina tema, profundidade e Ensino Médio. O ranking preserva relevância da API, exige interseção entre termos significativos do tema e o título, considera popularidade apenas como sinal secundário e aceita vídeos de 3–20 minutos. Resultado ausente é preferível a conteúdo fora do tema.

## Restrições atuais

- Sessão e autorização estão implementadas, mas falta E2E de interface autenticada, recuperação/revogação e decisão final de token CSRF.
- SQLite ainda não validado para concorrência de produção.
- Dependência de cota e disponibilidade externas.
- Migrações ainda não são versionadas e backup/restauração não foram demonstrados.

## Evolução

- Entregar mudanças verticais pequenas.
- Preservar dados e migrações idempotentes.
- Manter contratos explícitos e erros em pt-BR.
- Priorizar segurança antes de exposição pública/MCP.

## Arquitetura de produção aprovada

A arquitetura definitiva para publicação substitui SQLite, sessão Flask e executor em memória por Supabase Auth, PostgreSQL com RLS, Supabase Queues/Edge Functions e frontend na Vercel. O desenho, gate de release e estratégia de ambientes estão em `docs/PRODUCTION_ARCHITECTURE_SUPABASE_VERCEL.md`. A baseline Flask/SQLite permanece somente durante a migração controlada e não será publicada como fallback de produção.
