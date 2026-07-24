# Checklist de release — Vercel

## Release homologada

- URL oficial: https://aistudytec.vercel.app
- projeto Vercel: `SIDEP-CE/aistudytec`
- repositório: `paulocunha1009/aistudytec`
- branch de produção: `main`
- commit implantado: `02ef064`
- status Vercel: `Ready`
- Site URL do Supabase: `https://aistudytec.vercel.app`
- autenticação Google e retorno OAuth homologados;
- conta master homologada com MFA `aal2`;
- telas protegidas `Gestão` e `Acessos` homologadas com dados reais.

O primeiro deploy foi criado diretamente do repositório original. A instalação
GitHub App da Vercel recebeu acesso somente aos repositórios explicitamente
selecionados; nenhuma cópia paralela do código foi criada.

## Configuração do projeto

- Root Directory: `frontend`
- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm ci`

## Variáveis

Cadastrar em Preview e Production:

```text
VITE_SUPABASE_URL=https://wwvocglvwkkypdclinnb.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<chave pública do projeto>
VITE_APP_ENV=production
```

A chave publicável pode estar no bundle; a segurança depende de RLS e dos contratos server-side. Nunca substituir pela `service_role`.

## URLs após o primeiro deploy

Copiar a URL HTTPS final e configurar:

1. Supabase → Authentication → URL Configuration → Site URL;
2. Supabase → Authentication → Redirect URLs;
3. Google Cloud → OAuth client → Authorized redirect URIs, mantendo o callback oficial do Supabase;
4. Google Cloud → Authorized JavaScript origins, quando exigido pela configuração do cliente.

## Gate obrigatório

```powershell
cd frontend
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

No banco:

```powershell
npx supabase db push --linked
npx supabase db lint --linked --level warning
```

## Smoke de produção

- portal privado abre em desktop e mobile;
- usuário não autorizado não entra;
- aluno autorizado vê somente materiais publicados de suas turmas;
- professor vê somente turmas próprias;
- master exige MFA para administração;
- quiz conclui sem expor gabarito;
- plano e painel refletem a nova tentativa;
- links de fontes e YouTube abrem corretamente;
- console não apresenta segredos nem erros críticos.

## Rollback

Frontend: promover novamente a última implantação saudável da Vercel.  
Banco: migrations seguem expansão/contração; não executar rollback destrutivo direto. Criar migration corretiva, preservar dados e usar o runbook de backup/restauração quando necessário.
