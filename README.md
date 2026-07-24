# AISTUDYTEC

Plataforma privada de aprendizagem complementar para o Ensino Médio e cursos técnicos. O professor seleciona componentes, competências e descritores curriculares; a IA propõe um material fundamentado; o professor revisa e publica; o aluno estuda, responde ao quiz e recebe um plano baseado em evidências reais.

## Princípios do produto

- curadoria docente obrigatória antes da publicação;
- somente usuários previamente autorizados entram no sistema;
- professor administra apenas suas turmas e alunos;
- master possui autoridade global protegida por MFA;
- gabaritos nunca são enviados ao navegador do aluno;
- percentuais são evidências descritivas, não diagnósticos de capacidade;
- nenhuma alegação de eficácia é feita sem pesquisa apropriada.

## Arquitetura atual

```text
frontend/                 React e design system
supabase/migrations/      PostgreSQL, RLS, RPCs e auditoria versionados
supabase/functions/       Gemini e YouTube executados no servidor
supabase/tests/           testes pgTAP transacionais
docs/                     produto, segurança, sprints e evidências
.github/workflows/        quality gate isolado
```

Produção utiliza:

- Vercel para o frontend estático;
- Supabase Auth para identidade e sessões;
- PostgreSQL com Row Level Security;
- Edge Functions para geração e validação de vídeos;
- Gemini com grounding e YouTube Data API;
- MFA `aal2` para operações do master.

O diretório `backend/` é legado de desenvolvimento e não faz parte do caminho de produção.

Aplicação homologada: [https://aistudytec.vercel.app](https://aistudytec.vercel.app)

## Desenvolvimento local

```powershell
cd frontend
Copy-Item .env.example .env.local
npm install
npm start
```

Variáveis públicas necessárias:

```text
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_SUBSTITUA
VITE_APP_ENV=development
```

Nunca coloque `service_role`, Gemini ou YouTube no frontend. Esses segredos pertencem ao Supabase.

## Quality gate

```powershell
cd frontend
npm test
npm run build
npm run test:e2e
```

O GitHub Actions também inicia um Supabase descartável e executa os testes pgTAP dentro de transações revertidas. Nenhum teste automatizado escreve na turma real.

## Regras pedagógicas vigentes

- domínio descritivo: pelo menos 70% das respostas acumuladas;
- abaixo de 70%: revisão programada para três dias;
- uma revisão pendente por aluno e habilidade;
- três níveis de profundidade;
- pelo menos oito questões com descritor e feedback;
- um vídeo aprovado por nível;
- painel sinaliza pouca evidência quando existe apenas uma resposta.

## Evidências e documentação

- [Arquitetura de produção](docs/PRODUCTION_ARCHITECTURE_SUPABASE_VERCEL.md)
- [Segurança e autorização](docs/SECURITY_AUTHORIZATION.md)
- [Status da Sprint 10](docs/SPRINT10_STATUS.md)
- [Homologação E2E real](docs/E2E_PILOT_2026-07-23.md)
- [Checklist de release Vercel](docs/VERCEL_RELEASE.md)

## Estado verificado

Em 23 de julho de 2026:

- jornada professor → publicação → aluno → quiz → painel homologada;
- primeira release Vercel publicada a partir da branch `main`;
- OAuth Google e conta master com MFA homologados no domínio oficial;
- telas protegidas de gestão e acessos validadas online;
- Supabase remoto com migrations e lint aprovados;
- 45 testes frontend aprovados;
- smoke E2E aprovado em desktop e mobile;
- build Vite de produção aprovado;
- nenhum segredo versionado.

Essa evidência confirma funcionamento técnico, não eficácia educacional.
