# AISTUDYTEC — Sprint 5

Data de consolidação: 22 de julho de 2026.

## Objetivo

Validar provedores reais e transformar o estudo de uma leitura passiva em experiência imersiva que estimule pesquisa, produção, reflexão e autonomia.

## Incremento entregue

- Chaves Gemini e YouTube configuradas apenas no backend e protegidas pelo `.gitignore`.
- Smoke tests reais com HTTP 200 nas duas APIs.
- Modelo expirado substituído por `gemini-2.5-flash` estável.
- Schema Gemini expandido com `learningPaths` para três níveis.
- Tabela `topic_learning_paths` e compatibilidade com temas antigos.
- Interface Descobrir, Aprofundar e Conectar.
- Objetivos, leitura guiada, ideias essenciais, mundo real, investigação, termos de busca, missão de vídeo, desafio, reflexão, discussão, diário local e checklist.
- Timeout de geração ampliado de 30 para 180 s, com estado informativo de 30–90 s.
- Ranking do YouTube corrigido: relevância e correspondência no título antes de popularidade; faixa de 3–20 minutos.

## Evidências

| Verificação | Resultado |
|---|---|
| Backend | 40 testes aprovados |
| Frontend | 15 testes aprovados |
| Build | Produção compilada |
| Gemini real | Autenticação e geração HTTP 200 |
| YouTube real | Consulta HTTP 200 |
| Trilha real | 3 níveis, 9 questões, investigação e vídeos persistidos |

## Incidentes e aprendizado

Um servidor Flask antigo compartilhou a porta 5000 no Windows e recebeu rotas desatualizadas. A instância foi identificada por PID e encerrada. A ampliação do conteúdo também expôs timeout inadequado no cliente: o backend concluía após o navegador desistir. O prazo específico de IA resolveu o erro visível, mas a solução definitiva para escala é processamento assíncrono com idempotência.

O ranking antigo supervalorizava visualizações e recomendou vídeo fora do tema. O filtro atual prefere nenhum resultado a um resultado semanticamente inadequado.

## Limites

Não houve participantes humanos, dados de aprendizagem, avaliação docente sistemática ou demonstração de eficácia. A Sprint comprova funcionamento técnico, não impacto educacional.
