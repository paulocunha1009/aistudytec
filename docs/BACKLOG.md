# Product Backlog

Ordem inicial por risco e valor. Reordenar com o Product Owner.

Roadmap aprovado para conclusão da plataforma: `docs/ROADMAP_SPRINTS_8_15.md`. Até a Sprint 15, identidade, dados, jornadas essenciais, IA durável, migração e operação de produção têm precedência sobre MCP e novas funcionalidades.

## P0 — Prontidão para piloto

### PB-001 Validar provedores reais — 5 pontos

Como professor, quero gerar conteúdo e vídeos reais para confiar no fluxo antes do piloto.

Critérios: schema Gemini válido; erros claros; vídeos relacionados entre 3–20 minutos; fluxo gerar–revisar–publicar completo; nenhuma chave no navegador ou logs. Dependência: credenciais Gemini e YouTube.

Status: concluído em 22 jul. 2026. Gemini e YouTube validados com chaves reais; modelo estável corrigido; trilha estruturada validada; ranking de vídeos passou a exigir relação do título com o tema. Faixa atual deliberada: 3–20 minutos.

### PB-002 Definir identidade e autorização — 5 pontos

Como responsável pelo produto, quero uma decisão de segurança antes da exposição externa.

Critérios: threat model leve; decisão registrada; dados/rotas classificados; plano incremental aprovado.

Status: decisão ampliada e aprovada em 22 jul. 2026. Sessão e matriz por usuário, turma e tópico são a baseline; a arquitetura-alvo de credenciais, sessões revogáveis, recuperação, MFA e auditoria está registrada em `docs/CREDENTIALS_IDENTITY.md`.

### PB-016 a PB-021 — Credenciais e identidade de ponta — 42 pontos

Como responsável pela plataforma, quero contas, credenciais e sessões administráveis e auditáveis para liberar o piloto sem uma senha master compartilhada ou sessões impossíveis de revogar.

Escopo incremental: fundação e migração de hashes (PB-016); sessão opaca e CSRF (PB-017); troca/recuperação de senha (PB-018); MFA TOTP e recuperação (PB-019); RBAC e console master (PB-020); E2E de abuso, backup e operação (PB-021).

Critérios: migração sem perda de contas; bootstrap de uso único; master com MFA; bloqueio temporário; sessões listáveis e revogáveis; tokens em hash e de uso único; autenticação recente para ações sensíveis; auditoria minimizada; testes negativos; nenhum segredo em resposta, log ou Git.

Dependências: definição de provedor de e-mail para recuperação externa; HTTPS estável para evolução WebAuthn; armazenamento compartilhado antes de escalar horizontalmente.

Status: fundação PostgreSQL/RLS e CI concluídos; Sprint 8 encerrada. Na Sprint 9, login Supabase/PKCE, recuperação, logout local/global e gate TOTP `aal2` do master foram implementados no frontend. Permanecem convite administrativo, auditoria server-side, configuração de e-mail e validação integrada real.

### PB-003 Decidir ano escolar do aluno — 3 pontos

Como aluno, quero conteúdo adequado ao meu ano sem conflito entre perfil, turma e tópico.

Critérios: fonte de verdade e conflitos definidos; interface/API ajustadas se necessário; testes. Dependência: Product Owner.

## P1 — Experiência e qualidade

### PB-012 a PB-015 — Sprint 6: confiabilidade operacional — 26 pontos

Status: selecionados. Escopo e critérios detalhados em `docs/SPRINT6_PLAN.md`: jobs idempotentes, retomada, migrações versionadas, backup/restauração e E2E.

### PB-004 Feedback visual de salvamento — 3 pontos

Critérios: estados salvando/salvo/erro; retry seguro; acessibilidade; build e teste do fluxo.

### PB-005 Estados de carregamento e erro — 5 pontos

Critérios: estados consistentes; prevenção de envio duplicado; mensagens pt-BR acionáveis.

Status: parcialmente concluído. Geração informa espera de 30–90 s e usa timeout de 180 s. Idempotência e job assíncrono permanecem pendentes.

### PB-011 Aprendizagem imersiva e autonomia — 13 pontos

Status: concluído em 22 jul. 2026. Entregues três etapas de profundidade, objetivos, leitura guiada, ideias essenciais, conexão real, investigação com comparação de fontes, missão de vídeo, desafio, reflexão, diário local e checklist de autonomia.

Débito: validar a experiência com professores; sincronização/moderação do diário só pode ser considerada após requisitos pedagógicos e LGPD.

### PB-006 Ampliar cobertura automatizada — 8 pontos

Critérios: geração mockada, tema livre, dashboard, edição e falhas externas cobertos.

### PB-009 Design system mobile-first — 8 pontos

Status: concluído na Sprint 2 com primitives, estados consistentes, confirmações, nove testes frontend e validação responsiva.

### PB-010 Progresso que orienta — 8 pontos

Status: concluído na Sprint 3 com plano diário, mapa de habilidades, resultado por habilidade, ciclo de revisão e intervenções docentes transparentes.

## P2 — MCP

### PB-007 Prototipar MCP somente leitura — 8 pontos

Critérios: caso aprovado; schemas; segredos excluídos; testes; execução local. Dependência: PB-002.

### PB-008 Ferramentas MCP de autoria — 13 pontos

Critérios: confirmação para mutações; auditoria; publicação separada; testes negativos. Dependências: PB-007 e identidade aprovada.
