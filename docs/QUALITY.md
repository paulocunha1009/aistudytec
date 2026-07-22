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

Em 22 de julho de 2026: 40 testes backend e 15 testes frontend aprovados; build de produção aprovado. Smoke tests reais confirmaram autenticação Gemini, geração com `gemini-2.5-flash` e consulta à YouTube Data API v3. O teste real de trilha retornou três níveis, três objetivos, três ideias essenciais, três passos de investigação, nove questões e três vídeos. Esses números verificam o contrato técnico, não eficácia educacional.

Executar `powershell -NoProfile -ExecutionPolicy Bypass -File skills/aistudytec-engineering/scripts/verify.ps1`. Credenciais reais exigem smoke test separado.

Para a arquitetura Supabase, executar adicionalmente `npx supabase db reset` e `npx supabase test db`. O código SQL ou a presença das migrations não substituem a recriação real do banco e os testes RLS.

## Dependências frontend

Em 22 de julho de 2026, `npm audit` registrou 28 alertas transitivos (9 baixos, 6 moderados e 13 altos; zero críticos), concentrados no `react-scripts@5.0.1` e em suas ferramentas de build/desenvolvimento. `npm audit fix` sem `--force` não encontrou outra atualização compatível. Não executar `npm audit fix --force`: a sugestão substitui `react-scripts` por `0.0.0` e quebra o projeto. A correção estrutural é migrar do Create React App em uma sprint própria, com build e regressão verificados.
