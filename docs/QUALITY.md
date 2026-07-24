# Qualidade e Definition of Done

Um incremento está concluído quando:

- Critérios de aceitação foram demonstrados.
- Regras protegidas permanecem intactas ou têm decisão registrada.
- Testes relevantes passam.
- Frontend compila quando afetado.
- Migrações preservam dados e são idempotentes.
- Erros estão em pt-BR e não vazam segredos.
- Arquivos textuais passam pela validação UTF-8 estrita e não contêm marcadores conhecidos de mojibake.
- Documentação/backlog refletem mudanças.
- Riscos residuais e passos manuais estão explícitos.

## Matriz mínima

| Área | Evidência |
|---|---|
| Cadastro/turma | código válido, vazio e inválido |
| Publicação | rejeição incompleta e sucesso completo |
| Quiz | gabarito no servidor, agregação e percentual |
| Revisão | limiar, vencimento e deduplicação |
| Gemini | schema válido e respostas malformadas |
| Gemini imersivo | três trilhas, campos pedagógicos mínimos, nove questões e repetição limitada |
| YouTube | duração 3–20 min, correspondência do tema no título, vazio, cota/erro |
| Frontend | build e jornada crítica no navegador |

## Baseline consolidada

Em 23 de julho de 2026: 45 testes frontend em Vitest, três smoke tests Playwright, build Vite e homologação autenticada aprovados. O Supabase possui migrations versionadas, testes pgTAP e lint remoto. Esses resultados verificam o contrato técnico, não eficácia educacional.

Executar:

```powershell
cd frontend
npm ci
npm audit --audit-level=low
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Para a arquitetura Supabase, executar adicionalmente `npx supabase db reset` e `npx supabase test db` em ambiente descartável. O código SQL ou a presença das migrations não substituem a recriação real do banco e os testes RLS.

## Dependências frontend

Em 23 de julho de 2026, o Create React App foi removido e substituído por Vite 6/Vitest 3. `npm audit --audit-level=low` retornou zero vulnerabilidades. Atualizações futuras continuam exigindo regressão completa; não usar `audit fix --force` sem análise.
