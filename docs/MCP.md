# Estratégia MCP

## Objetivo

Permitir que clientes compatíveis consultem e futuramente operem o AISTUDYTEC por ferramentas estreitas e auditáveis. MCP complementa a API Flask; não substitui regras nem acessa SQLite diretamente.

## Fases

1. Validar consumidores, identidade e jornadas.
2. Leitura local: turma, revisão de tópico e fila do aluno.
3. Escrita controlada: criar rascunho e gerar.
4. Publicação com autorização e confirmação explícitas.
5. Auditoria, métricas, limites e versões.

## Arquitetura proposta

O servidor MCP será adaptador sobre serviços do backend. Antes, extrair regras reutilizáveis das rotas sem mudar comportamento. Não duplicar SQL no adaptador.

## Segurança mínima

- Não expor externamente sem autorização robusta.
- Restringir dados ao ator autenticado.
- Nunca retornar senhas, hashes, chaves ou configuração secreta.
- Auditar ator, ferramenta, alvo, resultado e horário das mutações.
- Confirmar publicação, arquivamento e alterações em conteúdo aprovado.
- Limitar ferramentas que consomem APIs com cota.

## Versionamento

Usar schemas fechados e erros estruturados. Mudança incompatível cria nova versão; campos aditivos são opcionais. Contratos iniciais: `skills/aistudytec-engineering/references/mcp-tool-contracts.md`.

## Gate de implementação

Começar após aprovar consumidor, identidade, escopo, primeira jornada e ambiente. O primeiro incremento deve ser local e somente leitura.
