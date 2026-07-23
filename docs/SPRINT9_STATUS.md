# Sprint 9 — identidade completa e master com MFA

Atualizado em 23 de julho de 2026. Status: em andamento.

## História do incremento atual

Como usuário convidado, quero entrar, recuperar minha senha e controlar minhas sessões pelo Supabase Auth; como master, quero que a administração permaneça bloqueada até confirmar TOTP, para que a identidade não dependa da senha ou sessão Flask.

## Entregue

- cliente Supabase com PKCE, refresh automático e sessão persistente;
- login por e-mail/senha diretamente no Supabase Auth;
- perfil e estado carregados sob RLS;
- bloqueio de contas não ativas;
- recuperação e atualização de senha;
- logout local e global;
- detecção do evento `PASSWORD_RECOVERY`;
- matrícula e desafio TOTP;
- gate obrigatório `aal2` para master;
- tela acessível de conta e segurança;
- seis testes unitários do contrato de identidade;
- 50 testes backend, 21 frontend, skill válida e build aprovados.

## Evidência de decisão

`docs/ADR-001_SUPABASE_AUTH_SESSIONS_MFA.md` registra a remoção do login Flask da fronteira de identidade e a substituição de códigos de recuperação inexistentes no Supabase por segundo fator adicional e recuperação administrativa auditada.

## Pendente para encerrar a sprint

- Edge Function de convite controlado e administração de papel/estado;
- auditoria server-side de convite e ações master;
- configurar Site URL, Redirect URLs e remetente de e-mail em staging;
- criar identidade master nominal fora de migration/seed;
- matricular TOTP real e confirmar `aal2`;
- teste real de confirmação e recuperação por e-mail;
- testes de sessão expirada, revogação e escalada de papel no ambiente integrado.

