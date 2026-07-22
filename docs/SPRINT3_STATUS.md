# AISTUDYTEC — Sprint 3

Início: 22 de julho de 2026  
Status: concluída em 22 de julho de 2026  
Objetivo: transformar evidências existentes em próximos passos compreensíveis para o aluno.

## Incremento 1 — progresso que orienta

Entregue:

- plano diário priorizando revisões vencidas reais;
- continuidade baseada no último quiz quando não existe revisão vencida;
- mapa de habilidades com percentual, acertos, respostas e última prática;
- estados “Começando”, “Em prática”, “Consistente” e “Revisar”;
- linha do tempo ordenada de quizzes concluídos;
- navegação do plano para o tópico persistido;
- explicação transparente das regras na própria interface;
- três testes do modelo de derivação.

## Regras de derivação

- `Revisar`: existe item vencido na fila de revisão para a habilidade.
- `Consistente`: domínio acumulado maior ou igual a 70%, conforme regra de negócio vigente.
- `Começando`: domínio abaixo de 70% com apenas uma resposta registrada.
- `Em prática`: domínio abaixo de 70% com mais de uma resposta.
- Nenhuma habilidade, porcentagem, tentativa ou recomendação numérica é simulada.

## Evidência

- 28 testes backend e 12 frontend aprovados.
- Build aprovado: JS 64,69 kB e CSS 7,35 kB comprimidos.
- Estado real sem sessão validado em 320 × 700 px, sem overflow horizontal e sem controles visíveis sem nome na heurística DOM.

## Próximo incremento

## Incremento 2 — fechar o ciclo de revisão

Entregue:

- resultado final do quiz agregado por habilidade;
- evidência da tentativa separada do domínio acumulado;
- conclusão automática de revisão somente após nova tentativa na habilidade;
- reagendamento em três dias quando o domínio permanece abaixo de 70%;
- tela de resultado com habilidades consistentes, habilidades em prática e revisões concluídas;
- ação direta para abrir o plano atualizado ou voltar à exploração;
- dois testes backend cobrindo conclusão e reagendamento.

Evidência acumulada: 30 testes backend, 12 frontend, skill válida e build aprovado. Bundle comprimido: JS 65,39 kB; CSS 7,43 kB.

## Próximo incremento

## Incremento 3 — intervenções docentes acionáveis

Entregue:

- contrato do dashboard ampliado com revisões vencidas, última prática e quantidade de evidências;
- fila priorizada por revisão vencida, ausência de tentativa, reforço e pouca evidência;
- “Origem” e “Ação possível” explícitas em cada intervenção;
- acesso direto ao tópico relacionado quando existe vínculo;
- visão completa por estudante com percentuais e `n` de respostas;
- limites interpretativos visíveis, sem diagnóstico de capacidade, esforço ou causa;
- três testes do modelo e um teste de integração da API.

## Encerramento

Sprint 3 concluída com 31 testes backend, 15 frontend, skill válida e build aprovado. Bundle comprimido: JS 66,88 kB e CSS 7,46 kB.

O dashboard preenchido não foi demonstrado no navegador local porque não existem credenciais e tentativas reais autorizadas para uma turma neste ambiente; nenhuma massa fictícia foi inserida. Contrato, derivação e estados estão cobertos por testes automatizados. A demonstração autenticada permanece como smoke test do piloto.

Próxima etapa: Sprint 4 — identidade, autorização, arquitetura modular e segurança para piloto.
