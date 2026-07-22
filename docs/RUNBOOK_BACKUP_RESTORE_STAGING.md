# Runbook — backup e restauração do Supabase staging

Atualizado em 22 de julho de 2026. Projeto: `aistudytec-staging` (`wwvocglvwkkypdclinnb`).

## Objetivo

Produzir backup lógico recuperável do banco de staging sem registrar credenciais no repositório e demonstrar a restauração em destino descartável. O plano Free não oferece backups agendados; a documentação oficial recomenda `supabase db dump` periódico para projetos gratuitos.

## Requisitos

- Supabase CLI na mesma versão do CI (`2.109.1`);
- Docker Desktop em execução, pois `db dump` usa `pg_dump` em contêiner;
- autenticação da CLI com a conta autorizada;
- senha do banco definida apenas no processo local como `SUPABASE_DB_PASSWORD`;
- pasta de saída fora do Git e com acesso restrito.

Nunca colocar senha, URL com senha, access token ou arquivos de backup contendo dados reais no GitHub.

## Backup

No PowerShell, criar uma pasta privada fora do repositório e definir a senha somente para a sessão atual:

```powershell
$env:SUPABASE_DB_PASSWORD = Read-Host "Senha do banco" -MaskInput
npx supabase@2.109.1 link --project-ref wwvocglvwkkypdclinnb
npx supabase@2.109.1 db dump --linked --role-only --file <PASTA_PRIVADA>\roles.sql
npx supabase@2.109.1 db dump --linked --file <PASTA_PRIVADA>\schema.sql
npx supabase@2.109.1 db dump --linked --data-only --use-copy --file <PASTA_PRIVADA>\data.sql
```

Registrar data/hora UTC, versão da CLI, referência do projeto, tamanhos e hashes SHA-256 dos três arquivos. Remover a variável ao terminar:

```powershell
Remove-Item Env:SUPABASE_DB_PASSWORD
```

## Restauração ensaiada

1. Criar um projeto Supabase temporário e vazio na mesma região, sem usuários reais.
2. Obter sua connection string de Session Pooler no botão **Connect**.
3. Aplicar, nessa ordem, `roles.sql`, `schema.sql` e `data.sql` com `psql`, usando senha somente por prompt ou variável temporária.
4. Executar consultas de integridade: versão da migration, presença das 15 tabelas, contagens por tabela e constraints críticas.
5. Executar os testes pgTAP da pasta `supabase/tests` contra o schema restaurado.
6. Registrar evidências sem dados pessoais nem segredos.
7. Excluir o projeto temporário somente depois da aprovação das evidências.

Nunca ensaiar restauração destrutiva sobre o próprio staging ou sobre produção.

## Critério de sucesso

- três dumps gerados sem segredos no histórico do terminal ou Git;
- hashes e tamanhos registrados;
- restauração concluída em destino descartável;
- 15 tabelas, migration e testes RLS confirmados;
- evidência revisada e arquivo temporário armazenado conforme política de retenção.

## Referências oficiais

- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/reference/cli/supabase-start#supabase-db-dump
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
