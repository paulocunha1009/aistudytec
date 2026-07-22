# Sprint 8 — Supabase staging e RLS por persona

Atualizado em 22 de julho de 2026.

## Estado atual

- ambiente `aistudytec-staging` criado na região de São Paulo;
- referência pública do projeto: `wwvocglvwkkypdclinnb`;
- repositório `paulocunha1009/aistudytec` conectado pela integração oficial do Supabase;
- diretório de trabalho configurado como raiz (`.`), onde está `supabase/`;
- branch de implantação configurada como `main`;
- implantação automática habilitada para migrations versionadas;
- Data API habilitada sem exposição automática de novas tabelas;
- RLS automático habilitado para novas tabelas.

## Decisões de segurança

Credenciais de banco, chaves `service_role`, Gemini e YouTube não são registradas no repositório. O frontend receberá somente a URL pública e a chave publishable do ambiente por variáveis da plataforma. Usuários privilegiados serão criados pelo fluxo administrativo do Supabase Auth, nunca por seed ou migration.

## Próximo gate

O primeiro commit posterior à ativação da integração deve aplicar `supabase/migrations/20260722000100_initial_production_schema.sql`. Depois do deploy, o histórico de migrations e as tabelas serão conferidos no painel. A Sprint 8 somente será encerrada após testes positivos e negativos de RLS para todas as personas, verificação de não exposição de dados sensíveis e ensaio documentado de backup e restauração.
