# Roadmap priorizado — Sprints 8 a 15

Atualizado em 22 de julho de 2026. Cadência proposta: uma semana por sprint, revista conforme capacidade real. Pontos representam complexidade relativa, não prazo contratual.

## Critério de priorização

Ordem: segurança e dados → identidade → jornadas essenciais → IA confiável → migração → cadeia de entrega → produção. Nenhuma sprint de prioridade inferior começa com item P0 bloqueador aberto na anterior.

As regras pedagógicas permanecem invariáveis: domínio em 70%, revisão em três dias, 8–10 questões, três explicações, cinco questões válidas, vídeo aprovado por nível e tema livre privado/não oficial.

## Sprint 8 — Supabase staging e RLS por persona — P0 — 13 pontos

Status: concluída em 23 de julho de 2026. Evidências em `docs/SPRINT8_STATUS.md`.

Objetivo: como responsável pela plataforma, quero um ambiente Supabase de staging reproduzível e isolado, para validar segurança antes de integrar usuários reais.

Escopo:

- criar projeto Supabase de staging e vinculá-lo ao repositório;
- aplicar migrations exclusivamente pelo CLI/pipeline;
- testes RLS para anônimo, estudante, professor proprietário, outro professor, master `aal1` e master `aal2`;
- confirmar que gabarito, auditoria e filas não vazam pelo Data API;
- separar secrets de staging e produção;
- registrar runbook de criação, backup e restauração.

Critérios de aceite:

- migrations aplicadas em banco vazio sem edição manual;
- todos os testes positivos e negativos aprovados;
- master sem `aal2` recebe negação em operação administrativa;
- nenhuma chave secreta aparece no GitHub ou no frontend;
- backup de staging criado e restauração demonstrada.

Dependências: acesso ao Supabase e criação do projeto de staging.

## Sprint 9 — Identidade completa e master com MFA — P0 — 18 pontos

Objetivo: como usuário, quero autenticação, recuperação e sessões seguras; como master, quero MFA obrigatório e administração auditada.

Escopo:

- integrar React ao Supabase Auth com PKCE;
- login por e-mail, logout local/global, sessão renovada e estados de erro;
- convite controlado de professor e estudante;
- confirmação e recuperação de senha por e-mail real em staging;
- matrícula TOTP, desafio `aal2` e códigos de recuperação;
- criar master nominal fora de seed/migration;
- telas de conta, sessão e segurança acessíveis;
- auditoria de convite, alteração de papel/estado e ações master.

Critérios de aceite:

- nenhum login depende de Flask ou senha master em variável;
- professor/master não possuem cadastro público;
- recuperação é de uso único e expira;
- master não acessa administração sem TOTP;
- testes cobrem sessão expirada, revogação e tentativa de escalada de papel.

Dependências: Sprint 8; domínio/remetente de e-mail de staging.

## Sprint 10 — Jornada docente em PostgreSQL — P0 — 21 pontos

Objetivo: como professor, quero administrar turmas e conteúdos no banco definitivo sem depender de SQLite.

Escopo:

- turmas, códigos e matrículas;
- criação e gestão de tópicos;
- explicações, trilhas, questões e vídeos;
- edição, autosave e gate de publicação;
- preview do aluno;
- auditoria e autorização por propriedade;
- adapter de dados definitivo no frontend.

Critérios de aceite:

- professor opera apenas suas turmas/tópicos;
- outro professor recebe negação nos testes E2E;
- gate preserva três níveis, cinco questões válidas e vídeo aprovado por nível;
- nenhuma operação docente crítica usa SQLite ou sessão Flask.

Dependências: Sprint 9.

## Sprint 11 — Jornada do estudante e progresso — P0 — 21 pontos

Objetivo: como estudante, quero estudar, responder, receber feedback e revisar habilidades com dados seguros no PostgreSQL.

Escopo:

- catálogo da turma e tópico publicado;
- tema livre privado;
- estudo imersivo Descobrir/Aprofundar/Conectar;
- submissão de quiz corrigida server-side sem expor gabarito;
- domínio por habilidade, plano diário e revisão em três dias;
- dashboard docente somente para estudantes da turma;
- preservação do diário exclusivamente local.

Critérios de aceite:

- estudante não lê gabarito, rascunho ou dados de outro estudante;
- cálculo de resultado ocorre em função privilegiada e é testado;
- limiar de 70% e deduplicação da revisão são demonstrados;
- tema livre não pode ser publicado nem lido por terceiros.

Dependências: Sprint 10.

## Sprint 12 — IA assíncrona e filas duráveis — P0 — 21 pontos

Objetivo: como usuário, quero gerar conteúdo sem perder trabalho em timeout, reload ou reinício.

Escopo:

- Edge Functions autenticadas para criar e consultar jobs;
- Supabase Queues com idempotência e visibility timeout;
- worker em etapas para Gemini, validação e YouTube;
- retry com backoff, falha terminal e retomada;
- secrets Gemini/YouTube apenas no Supabase;
- observabilidade com correlation ID e logs minimizados;
- regeneração docente separada e auditada.

Critérios de aceite:

- repetição da mesma chave não duplica conteúdo;
- reload retoma acompanhamento;
- timeout e falha externa não corrompem tópico;
- nenhuma chave ou payload sensível chega ao navegador/log;
- regras pedagógicas e filtro de vídeos permanecem cobertos.

Dependências: Sprints 10 e 11.

## Sprint 13 — Migração e corte do legado — P0 — 13 pontos

Objetivo: como responsável pela operação, quero migrar e reconciliar dados existentes sem perda e remover o legado da produção.

Escopo:

- inventário e mapeamento SQLite → PostgreSQL/Auth;
- script idempotente de importação, dry-run e relatório de divergências;
- estratégia de usuários sem transportar senhas incompatíveis;
- reconciliação de contagens e amostragem de relações;
- janela de corte, rollback e backup;
- remoção de Flask/SQLite do caminho de produção.

Critérios de aceite:

- dry-run não altera destino;
- importação repetida não duplica dados;
- totais, chaves e amostras reconciliados;
- rollback demonstrado;
- aplicação de staging funciona sem processo Flask e sem arquivo SQLite.

Dependências: Sprints 9–12.

## Sprint 14 — Frontend sustentável e Vercel staging — P1 bloqueador — 13 pontos

Objetivo: como equipe, quero build moderno, previsível e publicado na Vercel sem dependências críticas do Create React App.

Escopo:

- migrar CRA para Vite mantendo React e design system;
- corrigir imports, variáveis e testes;
- configurar Vercel preview/staging, headers e redirects;
- configurar variáveis públicas por ambiente;
- orçamento de bundle e auditoria de dependências;
- smoke responsivo e acessível.

Critérios de aceite:

- testes e build aprovados pelo lockfile;
- preview Vercel usa somente staging;
- nenhum segredo aparece no bundle;
- jornada crítica funciona em 320 px, teclado e recarregamento de URL;
- alertas herdados do `react-scripts` deixam de existir.

Dependências: Sprint 13.

## Sprint 15 — Operação, LGPD e liberação do piloto — P0 release — 21 pontos

Objetivo: como responsável pelo produto, quero evidências técnicas, legais e operacionais para liberar uma turma real com segurança.

Escopo:

- E2E completo professor → publicação → estudante → quiz → revisão;
- matriz de abuso, rate limit, MFA, recuperação e revogação;
- backup/restauração e runbooks de incidente/rotação;
- domínio, redirects, e-mail transacional e políticas de retenção;
- checklist LGPD para menores, responsáveis e minimização;
- observabilidade, alertas, health checks e rollback;
- deploy Vercel/Supabase de produção e smoke controlado.

Critérios de aceite:

- todos os gates de `docs/PRODUCTION_ARCHITECTURE_SUPABASE_VERCEL.md` atendidos;
- nenhum P0 aberto;
- master nominal com MFA e credencial rotacionada;
- restauração e rollback demonstrados;
- aprovação explícita do Product Owner para liberar o piloto.

Dependências: Sprints 8–14.

## Fora deste ciclo

- MCP de leitura ou autoria;
- ranking público ou gamificação competitiva;
- sincronização/leitura docente do diário do estudante;
- WebAuthn/passkeys além de pesquisa técnica;
- novas features que não removam risco do piloto.
