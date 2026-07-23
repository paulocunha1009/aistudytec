# Sprint 9 — endurecimento do acesso privado

Atualizado em 23 de julho de 2026. Status: incremento complementar concluído e homologado pelo master.

## Objetivo

Fechar o AISTUDYTEC para uso exclusivo de pessoas credenciadas durante a fase de desenvolvimento e entregar ao master uma interface segura para autorizar alunos e professores.

## Critérios de aceite implementados

- visitante não autenticado não acessa pesquisa, conteúdo, jornada, gestão ou configurações;
- visitante visualiza somente o portal privado e a ação de autenticação;
- o cadastro continua bloqueado pelo `Before User Created Hook` quando não existe autorização pendente e válida;
- somente master autenticado em `aal2` visualiza a área `Acessos`;
- o master autoriza um e-mail como aluno ou professor, com validade de 1 a 30 dias;
- e-mails são normalizados antes da gravação;
- autorizações pendentes podem ser revogadas;
- a tela apresenta autorizações pendentes, consumidas, revogadas e expiradas;
- cada autorização registra o próprio master autenticado como concedente;
- RLS exige papel master e MFA para leitura e mutação;
- contas com perfil inativo têm a sessão local encerrada.

## Componentes entregues

- `frontend/src/components/PrivateAccessPortal.js`;
- `frontend/src/components/master/AccessManagement.js`;
- `frontend/src/features/access/accessGrantService.js`;
- opção `Acessos` no menu, exclusiva do master;
- migração `20260723000500_bind_grant_creator_to_master.sql`.

## Evidências

- 50 testes backend aprovados;
- 22 testes frontend aprovados;
- build de produção concluído;
- migrações `20260723000300`, `20260723000400` e `20260723000500` aplicadas ao Supabase staging;
- TOTP matriculado e confirmado pelo master;
- sessão real confirmada em `aal2`;
- área `Acessos` carregada sob RLS com o histórico real de autorizações.
- `atendimentophcinfor@gmail.com` autorizado pelo master como aluno e cadastrado por Google OAuth;
- perfil de aluno confirmado em `aal1`, sem menus de gestão docente ou administração;
- defeito no escopo do botão de logout encontrado no teste integrado e corrigido.
- autorização de `paulo.cunha1@prof.ce.gov.br` criada, revogada e mantida no histórico auditável;
- tentativa Google após a revogação bloqueada pelo hook antes da criação da conta;
- retorno OAuth `access_denied` traduzido para uma mensagem visível e a URL de erro removida;
- 23 testes frontend e build de produção aprovados após o ajuste.

## Próximas validações integradas

- remover a identidade master incorreta anterior depois da validação completa.
