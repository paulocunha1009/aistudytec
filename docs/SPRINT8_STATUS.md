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

## Implantação verificada

O commit `7c95cd5` disparou a integração e aplicou `supabase/migrations/20260722000100_initial_production_schema.sql` sem edição manual. O painel confirmou a versão `20260722000100` no histórico e as 15 tabelas públicas esperadas.

## RLS verificado por persona

O commit `ab5ea8c` adicionou 25 asserções pgTAP para anônimo, estudante matriculado, professor proprietário, outro professor, master `aal1` e master `aal2`. Os cenários cobrem perfis, turmas, temas publicados e rascunhos, gabaritos, jobs e auditoria. O GitHub Actions run `29956672187` concluiu os jobs de aplicação e PostgreSQL/migrations/RLS com sucesso.

## Próximo gate

A Sprint 8 somente será encerrada após o ensaio documentado de backup e restauração do staging.
