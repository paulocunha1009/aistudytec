# Segurança de implantação — Supabase e Vercel

## Separação de credenciais

Na Vercel ficam somente valores públicos:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_APP_ENV=production
```

No cofre do Supabase ficam:

```text
GEMINI_API_KEY
YOUTUBE_API_KEY
```

`service_role`, tokens pessoais, senhas e fatores MFA nunca devem entrar no frontend, Git, logs, documentação ou variáveis expostas pelo React.

## Controles ativos

- cadastro fechado pelo hook de autorização;
- Row Level Security em dados acadêmicos;
- MFA `aal2` nas ações administrativas do master;
- RPCs server-side para correção de quiz e agregações;
- gabarito em tabela sem leitura estudantil;
- auditoria de operações sensíveis;
- Content Security Policy e headers defensivos na Vercel;
- testes pgTAP isolados por transação;
- quality gate obrigatório antes do deploy.

## Antes de publicar

1. Confirmar que todas as migrations foram aplicadas.
2. Executar `supabase db lint --linked`.
3. Executar testes frontend, build e Playwright.
4. Confirmar as URLs autorizadas no Supabase Auth.
5. Adicionar a URL final da Vercel ao Google OAuth.
6. Configurar variáveis públicas na Vercel.
7. Verificar que nenhum `.env.local`, relatório ou estado autenticado está rastreado.
8. Testar login Google, logout, master com MFA e acesso de aluno.
9. Validar headers na URL HTTPS final.
10. Registrar commit e evidência da versão implantada.

## Resposta a vazamento

Revogue o segredo no provedor, substitua-o no cofre correto e examine a auditoria. Remover o valor do repositório não invalida uma credencial já exposta. Para histórico Git contaminado, interrompa o deploy e execute procedimento específico de saneamento e rotação.

## Limites

O plano gratuito do Supabase não substitui uma política externa de backup. Antes de piloto ampliado, executar o runbook de backup/restauração, concluir a revisão LGPD e definir retenção, base legal, atendimento ao titular e resposta a incidentes.
