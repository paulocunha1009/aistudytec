# AISTUDYTEC — Sprint 6: confiabilidade operacional

Início: 22 de julho de 2026.

## Objetivo

Garantir que gerações longas possam ser acompanhadas, retomadas e repetidas com segurança, e que a evolução do banco tenha versão, backup e restauração verificáveis.

## Sprint Backlog — 26 pontos

### PB-012 Jobs de geração e idempotência — 8 pontos

Como aluno ou professor, quero iniciar uma geração uma única vez e acompanhar seu estado, para não perder o resultado nem criar tópicos duplicados quando a rede demora.

Aceite: POST retorna `202` com `jobId`; estados `queued`, `running`, `completed` e `failed`; polling autenticado; mesma chave idempotente não cria novo job; erro é seguro; conclusão referencia o tópico; testes de concorrência e repetição.

### PB-013 Migrações versionadas — 5 pontos

Como mantenedor, quero aplicar alterações de schema em ordem conhecida, para reproduzir e auditar a evolução do banco.

Aceite: tabela de versões; migrações numeradas e transacionais; execução repetida não altera resultado; banco existente é preservado; teste de banco vazio e legado.

### PB-014 Backup e restauração — 5 pontos

Como responsável pelo piloto, quero criar e validar backup antes de mudanças, para recuperar dados sem improviso.

Aceite: backup consistente via API SQLite; destino explícito fora do arquivo ativo; checksum; restauração apenas com confirmação operacional e validação; documentação; teste automatizado em banco temporário.

### PB-015 Recuperação de interface e E2E — 8 pontos

Como usuário, quero fechar/reabrir a tela e continuar acompanhando a geração, para que uma espera longa não pareça falha.

Aceite: progresso por estado; retomada do job pendente; retry sem duplicar; mensagem acionável; E2E gerar → acompanhar → abrir trilha; acessibilidade e mobile.

## Ordem dos incrementos

1. Contrato e persistência de jobs.
2. Worker local e idempotência.
3. Polling, retomada e estados de interface.
4. Migrações versionadas.
5. Backup/restauração, E2E e fechamento documental.

## Incremento 1 — contrato e persistência de jobs

Status: concluído em 22 de julho de 2026.

- Tabela `generation_jobs` com proprietário opaco, operação, chave idempotente, hash da entrada, payload interno, estado e timestamps.
- `POST /api/generation-jobs` retorna `202` e estado `queued`.
- `GET /api/generation-jobs/<id>` limita leitura ao proprietário ou master.
- Mesma chave + mesma entrada reutiliza o job; mesma chave + entrada diferente retorna `409`.
- Resposta pública não expõe payload, proprietário, hash ou chave.
- Cinco testes novos; baseline backend passou de 40 para 45 testes.

O worker ainda não foi conectado neste incremento. Jobs permanecem `queued` até o Incremento 2.

## Incremento 2 — worker local e recuperação

Status: concluído em 22 de julho de 2026.

- Executor local com quantidade configurável por `GENERATION_WORKERS` e padrão de dois workers.
- Claim atômico `queued → running`, impedindo execução duplicada do mesmo job.
- Reuso das rotas internas para preservar autorização, validação e regras pedagógicas.
- Conclusão persiste `topicId` e timestamps; falha persiste código e mensagem limitada.
- Reinício converte jobs `running` interrompidos novamente para `queued` e os redistribui.
- Execução automática é desativada em testes para comportamento determinístico.
- Baseline: 48 testes backend, 15 frontend, skill válida e build aprovado.

Risco residual: o executor vive no processo Flask e não substitui uma fila durável multi-instância. É adequado ao piloto local; implantação distribuída exigirá broker/worker externo e lease com heartbeat.

## Incremento 3 — retomada no frontend do aluno

Status: concluído em 22 de julho de 2026 para a jornada de tema livre.

- O frontend cria job com chave idempotente aleatória e recebe `202` imediatamente.
- Polling consulta estados sem manter a requisição Gemini aberta.
- O `jobId` pendente é salvo localmente e retomado após atualização da página.
- Em conclusão, o tópico é carregado pela API; em falha, o identificador é removido e a mensagem é exibida.
- O estado informa fila/processamento e explica que atualizar a página é seguro.
- Nenhum tema, resposta, chave ou payload pedagógico é salvo no marcador local.
- 15 testes frontend permanecem aprovados e o build de produção compila.

Pendente neste item: migrar geração/regeneração do painel docente e adicionar E2E real do navegador.

## Hardening de provisionamento master

- Master local passou a ser provisionado também por `ADMIN_USERNAME`/`ADMIN_PASSWORD`, garantindo criação em banco novo.
- `SESSION_SECRET` local aleatório e persistente foi configurado sem versionamento.
- Produção falha ao iniciar com segredo curto, administrador ausente, origem local, cookie inseguro ou rate limit em memória.
- Checklist de secret manager, primeiro deploy e rotação registrado em `docs/DEPLOYMENT_SECURITY.md`.
- Baseline elevada para 50 testes backend; 15 frontend e build permanecem aprovados.

## Riscos e controles

- Threads e SQLite: conexões abertas apenas dentro de cada job; transações curtas; sem compartilhar conexão.
- Reinício do processo: job interrompido volta a estado recuperável, nunca fica silenciosamente concluído.
- Duplicidade: chave idempotente vinculada ao ator, operação e entrada normalizada.
- Segredos: payload/status nunca contém chave, URL autenticada ou resposta bruta do provedor.
- Compatibilidade: rotas síncronas só serão removidas após frontend migrado e testes de paridade.

## Definition of Done

Critérios demonstrados; 40 testes backend e 15 frontend permanecem verdes ou aumentam; build aprovado; migração reversível por backup; nenhuma chave exposta; documentação, skill e TCC atualizados; riscos residuais explícitos.
