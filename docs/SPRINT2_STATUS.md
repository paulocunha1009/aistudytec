# AISTUDYTEC — Sprint 2

Início: 22 de julho de 2026  
Status: concluída em 22 de julho de 2026  
Objetivo: consolidar uma experiência mobile-first, acessível e visualmente consistente.

## Incremento 1 — fundação do design system

Entregue:

- tokens de cor, raio e alvo de interação;
- primitives `Button`, `Input`, `Card`, `Badge` e `Progress`;
- estados `disabled`, `loading`, erro, ajuda e foco visível;
- semântica de progresso e associação automática entre rótulo e campo;
- login, identificação do quiz, busca livre e entrada em turma migrados;
- modais identificados como diálogo e formulários submetidos por teclado;
- quatro testes frontend adicionados à verificação oficial da skill.

## Evidência

| Verificação | Resultado |
|---|---|
| Backend | 28 testes aprovados |
| Frontend | 4 testes de primitives aprovados |
| Build | aprovado; JS 58,43 kB e CSS 4,95 kB comprimidos |
| Mobile | 320 × 700 px sem overflow horizontal |
| Campo principal | rótulo programático e altura de 46 px |
| Login | diálogo, campos rotulados e botões identificados no navegador |

## Próximo incremento

## Incremento 2 — interação e feedback

Entregue:

- `Dialog` com foco inicial, ciclo de `Tab`, fechamento por `Escape` e restauração do foco;
- `ToastRegion` responsivo com `status` educado e `alert` assertivo conforme severidade;
- `Skeleton` com estado de carregamento anunciado;
- preferência `prefers-reduced-motion` respeitada globalmente;
- login, identificação do quiz e modais de turma/tópico migrados para `Dialog`;
- quiz com `Progress`, opções com estado pressionado, alvos mínimos e fechamento rotulado;
- busca livre com skeleton durante geração.

Evidência acumulada: 28 testes backend, 7 testes frontend e build aprovado. Em 320 × 700 px, o diálogo mediu 288 px, não houve overflow horizontal, o foco inicial caiu em “Usuário”, `Escape` fechou o modal e devolveu foco ao botão “Professor”. Bundle comprimido: JS 59,54 kB; CSS 5,25 kB.

## Próximo incremento

## Incremento 3 — estados e ações seguras

Entregue:

- `EmptyState`, `ErrorState` e `ConfirmDialog` reutilizáveis;
- loading, vazio, erro e retry nas turmas, tópicos, dashboard e revisão;
- confirmação explícita para publicação e exclusão de questão;
- campos da revisão docente com nomes acessíveis;
- StudyView responsiva, tabs semânticas, fallback de conteúdo, imagem lazy e botão padronizado;
- nove testes frontend incorporados à verificação oficial.

## Encerramento

Definition of Done atendida para o escopo da Sprint 2: 28 testes backend e 9 frontend aprovados, skill válida, build de produção aprovado e UTF-8 verificado. Bundle comprimido: JS 60,91 kB e CSS 5,34 kB. Em 320 × 700 px: documento com 320 px, zero overflow horizontal, diálogo com 288 px, foco inicial correto e zero controles visíveis sem nome na heurística DOM.

Risco residual: a auditoria WCAG 2.2 AA completa, contraste automatizado, leitor de tela real e E2E de jornadas autenticadas continuam no backlog. A próxima Sprint é a Sprint 3 — progresso que orienta.
