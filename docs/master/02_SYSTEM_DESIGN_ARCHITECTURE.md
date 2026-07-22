# AISTUDYTEC — System Design e Arquitetura

Versão 1.0 — 21 de julho de 2026

## 1. Objetivo arquitetural

Evoluir o protótipo para uma plataforma testável, segura e modular sem interromper os fluxos existentes. Clean Architecture é aplicada como direção de dependências e separação de responsabilidades, não como multiplicação mecânica de pastas.

## 2. Estado observado

- Frontend: React 18, CRA, JavaScript, 13 componentes, navegação por estado e Tailwind compilado localmente.
- Backend: Flask, `sqlite3`, 23 rotas concentradas em `app.py`.
- Dados: 12 tabelas incluindo auditoria e trilhas imersivas; migrações aditivas em `init_db()`.
- Integrações: Gemini e YouTube via `requests`.
- Qualidade: 40 casos pytest, 15 testes frontend e fluxo autenticado completo de API; ainda sem E2E da interface autenticada.
- Segurança: sessão HTTP-only, autorização por usuário/turma/tópico, defesa CSRF inicial por origem/SameSite, hash de senha, master por ambiente, CORS por allowlist, rate limit e headers; token CSRF e E2E autenticado seguem pendentes.

## 3. Arquitetura-alvo

```text
Web/PWA
  └─ API client + query cache
       └─ Flask API /api/v1
            ├─ Identity & Access
            ├─ Classes
            ├─ Topics & Curation
            ├─ Learning & Attempts
            ├─ Mastery & Review
            └─ Integrations
                 ├─ Gemini adapter
                 └─ YouTube adapter
                      └─ SQLite → PostgreSQL quando justificado
```

Regra: rotas traduzem HTTP; casos de uso aplicam regras; repositórios persistem; adapters integram provedores.

## 4. Frontend feature-based

Estrutura proposta após migração incremental:

```text
src/
  app/              bootstrap, routes, providers
  features/
    auth/
    classes/
    topics/
    study/
    quiz/
    mastery/
    teacher-dashboard/
  shared/
    api/
    components/
    hooks/
    lib/
    styles/
    types/
  design-system/
    tokens/
    primitives/
    patterns/
```

Não criar simultaneamente `features`, `modules` e `pages` para o mesmo conceito. Cada feature expõe uma API pública pequena. Componentes exclusivos ficam dentro da feature; primitives reutilizáveis ficam no design system.

## 5. Estratégia TypeScript

1. Ativar TypeScript sem converter tudo.
2. Criar tipos de contratos e API.
3. Converter `api/client` e novas primitives.
4. Converter feature por feature.
5. Ativar `strict` quando fronteiras estiverem tipadas.

Evitar `any`, tipos duplicados e conversão de arquivos sem teste. Zod valida dados em runtime; TypeScript não substitui validação.

## 6. Estado e dados remotos

- TanStack Query: cache, loading, retry e invalidação de servidor.
- Estado local: interação efêmera de formulário/quiz.
- Context: sessão, tema e preferências estáveis.
- React Hook Form + Zod: formulários não triviais.
- Não adicionar store global até existir caso que não seja resolvido por essas camadas.

## 7. Backend modular

```text
backend/
  app/
    factory.py
    config.py
    api/v1/
    domain/
    services/
    repositories/
    integrations/
    security/
  migrations/
  tests/
```

Migração inicial mantém SQLite e SQL explícito. Repositórios recebem conexão e executam queries parametrizadas. Transações abrangem tentativa, respostas, domínio e revisão.

## 8. Contratos de API

### Convenções

- Prefixo `/api/v1` após período de compatibilidade.
- JSON camelCase no HTTP e snake_case internamente.
- IDs opacos.
- Datas ISO 8601 com timezone.
- Paginação em listas.
- `requestId` em erros.

```json
{
  "error": {
    "code": "TOPIC_INCOMPLETE",
    "message": "Tópico incompleto para publicação",
    "details": {"missing": []},
    "requestId": "...",
    "retryable": false
  }
}
```

### Idempotência

Criação de tentativa, geração e publicação recebem `Idempotency-Key`. Autosave usa versão/ETag para evitar sobrescrever edição concorrente.

## 9. Dados

### Curto prazo

- Migrações numeradas e reversíveis quando possível.
- Foreign keys habilitadas.
- Índices por `class_id`, `topic_id`, `user_id`, status e vencimento.
- Constraint única para revisão pendente por aluno/habilidade.
- Auditoria para publicação e mudanças críticas.

### Escala

SQLite permanece no piloto local. PostgreSQL será adotado quando concorrência, hospedagem, backup ou observabilidade justificarem. A migração não é requisito estético.

## 10. Segurança

### Identidade

- Senhas com hash robusto e política sem senha padrão.
- Sessão HTTP-only, Secure, SameSite ou token curto com refresh seguro, após decisão.
- Proteção contra enumeração e brute force.
- Recuperação com token de uso único.

### Autorização

Matriz: master, professor, aluno. Toda rota verifica ator, ação e recurso. IDs recebidos do cliente nunca concedem acesso por si.

### Web

- CORS por allowlist.
- CSRF quando cookies autenticados forem usados.
- CSP e headers de segurança.
- Sanitização de URLs do YouTube.
- Validação de tamanho e tipo de entrada.
- Rate limit por identidade/IP e custo de provedor.

### Segredos

Chaves nunca em URL, navegador ou log. Preferir header oficial do provedor quando suportado, secret manager por ambiente e rotação documentada.

### LGPD

Inventário, finalidade, base legal, minimização, retenção, direitos, resposta a incidente e tratamento especial para menores.

## 11. IA e provedores

- Adapter com timeout, retry limitado e circuit breaker.
- Schema estruturado e validação semântica parcial.
- Registro de modelo, versão do prompt e timestamp sem armazenar segredo.
- Fila assíncrona quando geração ultrapassar experiência síncrona.
- Quota e custo por turma/professor.
- Conteúdo oficial sempre passa por curadoria.

## 12. Performance

### Medir antes

Definir aparelho e rede de referência. Registrar LCP, INP, CLS, TTFB, tamanho JS, chamadas e falhas.

### Técnicas condicionais

- Code splitting por rota/feature.
- Imagens responsivas e lazy.
- Cache HTTP e query cache.
- Prefetch apenas da próxima ação provável.
- Virtualização somente em listas grandes medidas.
- Compressão e CDN em produção.
- Skeleton sem layout shift.

Metas Lighthouse e <2 s não são declaradas atingidas até medição reproduzível.

## 13. Offline e rede instável

Fase 1: retry, timeout, mensagens e prevenção de duplicidade.  
Fase 2: cache de tópicos publicados e progresso de leitura.  
Fase 3: fila local de respostas com sincronização e resolução de conflitos.

Não armazenar dados sensíveis em cache persistente sem threat model.

## 14. Observabilidade

- Logs estruturados com requestId.
- Métricas RED: rate, errors, duration.
- Métricas de provedor: latência, quota, schema inválido.
- Traces em geração e submissão.
- Eventos de produto com catálogo, consentimento e minimização.
- Alertas baseados em impacto, não volume isolado.

## 15. Testes

- Unitários: domínio e parsers.
- Integração: API + SQLite temporário.
- Contrato: payloads frontend/backend e adapters.
- Componentes: estados e acessibilidade.
- E2E: criar turma, gerar mockado, revisar, publicar, estudar e quiz.
- Segurança: autorização, CSRF/CORS, rate limit e input malicioso.
- Performance: orçamento em CI após baseline.

## 16. CI/CD

Pipeline: lint → typecheck → testes → build → auditoria de dependências → E2E → artefato. Ambientes dev/staging/prod separados. Migração roda como etapa explícita com backup. Deploy possui health check, smoke test e rollback.

## 17. MCP

MCP é adapter sobre casos de uso, não acesso direto ao banco. Começar somente leitura e local após autorização robusta. Ferramentas mutáveis exigem confirmação e auditoria. Contratos estão em `skills/aistudytec-engineering/references/mcp-tool-contracts.md`.

## 18. Plano de migração

1. Caracterizar comportamento atual com testes.
2. Extrair configuração e corrigir encoding.
3. Introduzir design system e API tipada nas novas features.
4. Extrair serviços backend mantendo rotas.
5. Adicionar `/api/v1` e camada de compatibilidade.
6. Implementar identidade/autorização.
7. Migrar feature por feature.
8. Remover legado apenas após telemetria e paridade.

## 19. ADRs necessários

- ADR-001 identidade e sessão.
- ADR-002 TypeScript e toolchain.
- ADR-003 router.
- ADR-004 SQLite versus PostgreSQL.
- ADR-005 analytics e privacidade.
- ADR-006 fila de geração.
- ADR-007 PWA/offline.
- ADR-008 servidor MCP.

## 20. Definition of Done arquitetural

Contratos validados; autorização testada; migração segura; observabilidade; acessibilidade; performance medida; testes relevantes; documentação e ADR; rollback; nenhum segredo.

## 21. Implementação atual da aprendizagem imersiva

`gemini_client.py` solicita JSON com `explanations`, `learningPaths` e nove questões. Cada `learningPath` é validada quanto a gancho, objetivos, ideias essenciais, conexão real, investigação, termos de busca, missão antes/durante/depois do vídeo, desafio, reflexão e discussão. O conteúdo é persistido por nível em `topic_learning_paths`; `_topic_detail` recompõe o contrato da API.

O cliente reserva 180 s para geração e 30 s para chamadas comuns. O adapter Gemini usa `gemini-2.5-flash`, 20.000 tokens máximos, timeout de 90 s e no máximo duas tentativas diante de violação estrutural. A arquitetura síncrona é adequada apenas ao protótipo; produção deve adotar job idempotente, consulta de estado e retomada.

O adapter YouTube normaliza termos, remove palavras vazias, exige sobreposição entre termos relevantes do tema e o título do vídeo, preserva a posição de relevância, usa visualizações como sinal secundário e filtra duração entre 3 e 20 minutos.

Baseline: 23 rotas Flask, 12 tabelas incluindo auditoria, 13 componentes React, 40 testes backend, 15 testes frontend e build aprovado.
