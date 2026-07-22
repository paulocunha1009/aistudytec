---
name: aistudytec-engineering
description: Evoluir, revisar, testar e documentar o AISTUDYTEC com práticas Scrum, regras pedagógicas protegidas e integração MCP orientada a casos de uso. Usar em mudanças no backend Flask/SQLite, frontend React, geração Gemini, vídeos YouTube, quizzes, domínio por habilidade, revisão espaçada, documentação técnica, backlog, planejamento de sprint ou desenho/implementação de ferramentas MCP deste repositório.
---

# AISTUDYTEC Engineering

Trabalhar no AISTUDYTEC preservando decisões pedagógicas, contratos existentes e simplicidade arquitetural. Tratar documentação, testes e código como partes do mesmo incremento.

## Começar pelo contexto

1. Ler `docs/PRODUCT.md` para objetivo, personas e regras protegidas.
2. Ler `docs/ARCHITECTURE.md` para limites técnicos e fluxo de dados.
3. Ler `docs/SCRUM.md` ao planejar ou priorizar trabalho.
4. Ler `docs/MCP.md` somente para tarefas de integração MCP.
5. Ler `docs/master/01_PRODUCT_VISION_PRD.md` para requisitos, auditoria e roadmap do redesenho.
6. Ler `docs/master/02_SYSTEM_DESIGN_ARCHITECTURE.md` para decisões e migração arquitetural.
7. Ler `docs/master/03_UX_BIBLE_DESIGN_SYSTEM.md` para telas, componentes e acessibilidade.
8. Ler `references/domain-rules.md` antes de alterar regras de negócio.
9. Ler `references/code-map.md` antes de editar código.

Tratar o código executável como autoridade quando houver divergência factual. Corrigir a documentação no mesmo incremento, salvo proibição explícita.

## Executar um incremento

1. Formular o resultado como história: `Como <persona>, quero <capacidade>, para <benefício>`.
2. Definir critérios de aceitação observáveis antes de editar.
3. Identificar riscos pedagógicos, dados afetados e contratos de API.
4. Fazer a menor mudança vertical que entregue valor verificável.
5. Adicionar ou atualizar testes no nível adequado.
6. Rodar `powershell -NoProfile -ExecutionPolicy Bypass -File skills/aistudytec-engineering/scripts/verify.ps1` a partir da raiz.
7. Atualizar backlog e documentação quando comportamento ou decisão mudar.
8. Entregar resumo, evidências, riscos residuais e próximo passo.

## Guardrails obrigatórios

- Manter Flask, `sqlite3` puro, React sem TypeScript, sem router e sem estado externo até decisão explícita.
- Manter strings de usuário e erros de API em pt-BR.
- Nunca expor chaves Gemini/YouTube nem imprimir conteúdo de `.env`.
- Não alterar silenciosamente: domínio de 70%, revisão em 3 dias, 8–10 questões, ou gate com três explicações, cinco questões válidas e um vídeo aprovado por nível.
- Não adicionar autenticação robusta sem decisão do responsável pelo produto.
- Não tornar conteúdo livre do aluno oficial da turma.
- Preservar dados existentes em migrações SQLite; manter `init_db()` idempotente.
- Preferir componentes pequenos em `components/teacher` e `components/student`.

## Scrum

Usar `docs/BACKLOG.md` como backlog ordenado. Cada item pronto para sprint deve conter valor, critérios de aceitação, dependências e estimativa relativa. Limitar trabalho em andamento e considerar concluído somente o que satisfaz a Definition of Done de `docs/QUALITY.md`.

## MCP

Projetar ferramentas a partir de jornadas reais. Expor operações estreitas, schemas de entrada/saída, erros em pt-BR e ações de escrita com confirmação. Não criar servidor MCP sem consumidor e caso de uso aprovados. Seguir `docs/MCP.md` e `references/mcp-tool-contracts.md`.

## Recursos

- `references/domain-rules.md`: invariantes pedagógicos.
- `references/code-map.md`: módulos, rotas e validações.
- `references/mcp-tool-contracts.md`: convenções MCP.
- `scripts/verify.ps1`: testes, validação da skill e build.
