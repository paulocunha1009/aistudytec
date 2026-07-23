# Sprint 8 — Supabase staging e RLS por persona

Atualizado em 23 de julho de 2026. Status: concluída.

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

## Backup e restauração verificados

O backup lógico foi gerado pelo Session Pooler IPv4 oficial do Supabase e restaurado em um cluster PostgreSQL 18 local, temporário e isolado. A validação confirmou:

- migration remota `20260722000100_initial_production_schema`;
- 15 tabelas restauradas;
- RLS habilitado nas 15 tabelas;
- 28 policies e 24 chaves estrangeiras;
- zero linhas de dados no staging neste momento;
- SHA-256 do schema: `3E247B12EEE3C51E3978C6EEBD700221A70330EA8135CF7A3F7AD6BFF07CF82D`;
- SHA-256 dos dados: `3AE5AD378DED32174AC05F5E86405D351FE352BD0098482D6143B5EB2B0EC33A`.

O cluster descartável e os arquivos locais de credenciais foram removidos depois da verificação. Os dumps permanecem somente na pasta local ignorada `.backups/`, fora do Git.

## Encerramento

Todos os critérios executáveis no plano Free foram atendidos: ambiente reproduzível, implantação por migration, testes RLS positivos e negativos, MFA `aal2` para master, ausência de segredos no Git e restauração lógica demonstrada. Backups automáticos permanecem indisponíveis no plano Free e deverão ser ativados por upgrade antes do piloto externo.
