# AISTUDYTEC — baseline da Sprint 1

Data da medição: 22 de julho de 2026  
Ambiente: execução local de desenvolvimento, viewport controlada no navegador interno do Codex.

## Resultado verificável

| Verificação | Resultado |
|---|---|
| API | 28 testes `pytest` aprovados |
| Frontend | build de produção aprovado; UTF-8 estrito incorporado à verificação |
| Bundle comprimido | JavaScript ≈ 57,4 kB; CSS ≈ 4,47 kB |
| Mobile | 320 × 700 px, largura do documento 320 px, sem overflow horizontal |
| Desktop | 1280 × 800 px, largura do documento 1280 px, sem overflow horizontal |
| Navegação móvel | menu rotulado, drawer e backdrop verificados visualmente |
| Estilos | Tailwind compilado localmente; nenhuma dependência do CDN em runtime |

## Segurança entregue nesta fatia

- CORS restrito por `ALLOWED_ORIGINS`.
- Limites de requisição em login e rotas de geração de conteúdo.
- Headers `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` e `Permissions-Policy`.
- Validação inicial de payloads para tópicos, conteúdo, quiz e progresso.
- Respostas 429 explícitas e armazenamento do rate limit configurável por ambiente.

## Limites desta evidência

Esta medição não equivale a auditoria WCAG 2.2 AA, teste com tecnologia assistiva, Lighthouse ou aferição de Core Web Vitals em aparelho e rede reais. O armazenamento `memory://` do rate limit serve ao desenvolvimento local; produção deve usar um backend compartilhado. O projeto mantém 28 alertas transitivos apontados por `npm audit`, sem correção compatível no CRA atual; a migração está registrada como débito P1 e nenhuma atualização destrutiva foi aplicada.

## Próxima medição

Na Sprint 2: axe/Lighthouse em perfil documentado, navegação integral por teclado, contraste, foco, leitor de tela, teste de componentes e orçamento de performance por jornada.
