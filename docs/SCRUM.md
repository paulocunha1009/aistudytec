# Operação Scrum

## Papéis

- Product Owner: prioridades e decisões pedagógicas.
- Developers: incremento completo, testes e documentação.
- Scrum Master: impedimentos, foco e melhoria contínua.

Uma pessoa pode acumular papéis no protótipo, mantendo responsabilidades claras.

## Registro de incrementos

- Sprint 1: baseline, hardening e configuração segura.
- Sprint 2: design system, responsividade e estados de interface.
- Sprint 3: plano diário, progresso, habilidades e intervenção docente.
- Sprint 4: sessão, autorização por recurso e auditoria minimizada.
- Sprint 5: validação real dos provedores e experiência de aprendizagem imersiva.
- Sprint 6: confiabilidade operacional e jobs idempotentes, com migração incremental em andamento.
- Sprint 7: credenciais e identidade; fundação, sessões revogáveis, recuperação, MFA e operação master segura em incrementos verticais.
- Sprint 8: Supabase staging e RLS por persona.
- Sprint 9: Supabase Auth, recuperação, sessões e MFA master.
- Sprint 10: jornada docente no PostgreSQL definitivo.
- Sprint 11: jornada do estudante, quiz e progresso no PostgreSQL.
- Sprint 12: IA assíncrona, Edge Functions e filas duráveis.
- Sprint 13: migração de dados e corte do Flask/SQLite de produção.
- Sprint 14: migração CRA→Vite e Vercel staging.
- Sprint 15: E2E, operação, LGPD e liberação do piloto.

O detalhamento priorizado das Sprints 8–15 está em `docs/ROADMAP_SPRINTS_8_15.md`.

O padrão aprovado para próximos incrementos é vertical: experiência rica, regra explícita, persistência, integração real, testes, documentação e evidência visual no mesmo ciclo.

## Artefatos

- Product Goal: tornar o AISTUDYTEC confiável para uma turma real.
- Product Backlog: `docs/BACKLOG.md`, ordenado por valor, risco e dependência.
- Sprint Backlog: itens selecionados com objetivo único.
- Incremento: comportamento utilizável que cumpre `docs/QUALITY.md`.

## Cadência sugerida

- Sprint semanal enquanto o time for pequeno.
- Planning: objetivo, capacidade e itens prontos.
- Daily: progresso, próximas 24 horas e impedimentos.
- Review: demonstrar fluxo real e registrar feedback.
- Retrospective: escolher uma melhoria mensurável.

## Refinamento

Um item está pronto quando contém persona, valor, critérios observáveis, dependências, risco e estimativa relativa. Dividir itens que não possam ser demonstrados na sprint.

## Métricas de fluxo

- Throughput, cycle time, trabalho em andamento e defeitos escapados.
- Não usar velocidade para comparar pessoas.
