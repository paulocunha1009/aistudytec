# ADR-001 — Supabase Auth, sessões e MFA

Data: 23 de julho de 2026. Status: aceita.

## Contexto

A baseline Flask mantém login e sessão próprios para preservar o protótipo durante a migração. A arquitetura aprovada para publicação usa Supabase Auth como autoridade de identidade, PostgreSQL/RLS para autorização e MFA obrigatório para master.

## Decisão

- o frontend usa `@supabase/supabase-js` com PKCE, persistência de sessão, refresh automático e detecção de retorno por URL;
- login definitivo usa e-mail e senha do Supabase Auth, sem chamar `/api/login`;
- o perfil público fornece papel e estado, mas nunca concede privilégios sem JWT válido e RLS;
- contas `invited`, `locked` ou `disabled` não entram na aplicação;
- recuperação usa `resetPasswordForEmail` e `updateUser`; mensagens não revelam se o e-mail existe;
- logout local encerra o dispositivo atual; logout global revoga as demais sessões suportadas pelo Supabase;
- master só visualiza a aplicação após sessão `aal2`;
- TOTP é matriculado e verificado pelos métodos MFA nativos;
- professor e estudante entram apenas por convite controlado; não há cadastro público;
- a sessão Flask permanece somente como compatibilidade das jornadas acadêmicas ainda não migradas e não é fallback de identidade para produção.

## Recuperação de MFA

O Supabase Auth não oferece códigos de recuperação TOTP. Portanto, o requisito anterior de códigos próprios foi rejeitado para evitar um subsistema criptográfico paralelo. A recuperação será feita por um segundo fator verificado, limitada a até dez fatores conforme o provedor, e por procedimento administrativo auditado para perda total dos dispositivos.

## Consequências

- a chave publishable pode estar no frontend; `service_role` permanece exclusivamente server-side;
- Sprints 10–13 devem migrar dados e operações legadas para que o token Supabase seja a única identidade em produção;
- convites, alteração de papel/estado e recuperação administrativa exigem Edge Function com validação master `aal2` e auditoria;
- links de recuperação dependem de Site URL/Redirect URLs corretas e de entrega de e-mail validada em staging.

## Rollback

Antes do corte de produção, o frontend pode reverter este incremento sem alterar hashes ou usuários Supabase. Depois do corte, não haverá retorno à senha Flask; rollback de interface preservará Supabase Auth e migrations.

## Referências

- https://supabase.com/docs/guides/auth
- https://supabase.com/docs/guides/auth/auth-mfa/totp
- https://supabase.com/docs/reference/javascript/auth-mfa

