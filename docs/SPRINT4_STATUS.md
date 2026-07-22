# AISTUDYTEC — Sprint 4

Início: 22 de julho de 2026  
Objetivo: criar identidade, autorização e arquitetura segura para piloto controlado.

## Incremento 1 — sessão e fronteiras críticas

Entregue:

- sessão assinada em cookie HTTP-only;
- restauração de sessão e logout no servidor;
- respostas de identidade sem senha/hash;
- CORS preparado para credenciais e allowlist;
- turmas vinculadas ao professor da sessão, ignorando `teacherId` forjado;
- proteção de estudantes e dashboard por propriedade da turma;
- progresso e histórico restritos ao próprio estudante ou master;
- bloqueio de tentativa identificada em nome de outro usuário;
- quatro testes específicos da matriz de autorização.

Evidência: 35 testes backend, 15 frontend, skill válida e build aprovado. Bundle comprimido: JS 66,98 kB; CSS 7,46 kB.

## Próximo incremento

## Incremento 2 — propriedade editorial e origem confiável

Entregue:

- leitura pública limitada a tópicos docentes publicados;
- rascunhos e conteúdo gerado restritos ao proprietário ou master;
- criação de tópico vinculada ao professor e à turma da sessão;
- geração, regeneração, edição, aprovação, exclusão e publicação protegidas por propriedade;
- conteúdo livre autenticado vinculado ao estudante da sessão;
- conteúdo livre anônimo tratado como recurso transitório de ID não adivinhável e reivindicado no primeiro quiz identificado;
- tentativa de quiz condicionada à permissão de leitura do tópico;
- defesa CSRF inicial por `SameSite`, allowlist de `Origin` e bloqueio de `Sec-Fetch-Site: cross-site`;
- três novos testes negativos de propriedade/origem.

Evidência acumulada: 38 testes backend, 15 frontend, skill válida e build aprovado.

## Próximo incremento

## Incremento 3 — modularização e auditoria

Entregue:

- política de sessão/autorização extraída para `backend/security.py`;
- trilha minimizada extraída para `backend/audit.py`;
- tabela idempotente `audit_events`;
- auditoria de login, logout, usuário, turma, tópico, publicação e exclusão de questão;
- consulta paginada/filtrável restrita ao master;
- fluxo autenticado completo de API: login → turma → tópico → edição → logout → bloqueio → segundo professor negado;
- teste garantindo ausência de usuário/senha no evento de auditoria.

Evidência acumulada: 40 testes backend, 15 frontend, skill válida e build aprovado.

## Próximo incremento

Versionar migrações, implementar e testar backup/restauração e executar E2E de interface autenticada. Esses itens ainda impedem o encerramento da Sprint 4.
