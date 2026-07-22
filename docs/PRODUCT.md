# Produto AISTUDYTEC

## Visão

Oferecer estudo independente e complementar para alunos do Ensino Médio, com conteúdo diferenciado, curadoria docente e acompanhamento por habilidade.

## Personas

- Professor: transforma necessidades observadas em tópicos, revisa IA, publica e acompanha lacunas.
- Aluno: estuda no nível adequado, recebe feedback imediato e revisa habilidades frágeis.
- Administrador: mantém acesso operacional do protótipo.

## Jornada principal

1. Professor cria turma e tópico.
2. Gemini gera três explicações e quiz; YouTube fornece candidatos por nível.
3. Professor revisa, aprova vídeos e publica após o gate.
4. Aluno estuda, responde ao quiz e recebe feedback por questão.
5. Backend recalcula nota, agrega domínio e agenda revisão.
6. Professor acompanha a turma por habilidade.

## Jornada imersiva do aluno

1. **Descobrir:** curiosidade, linguagem acessível e construção da base.
2. **Aprofundar:** terminologia em contexto e investigação orientada.
3. **Conectar:** aplicações, limites, trade-offs e relações interdisciplinares.
4. Em cada etapa, o aluno lê, compara ao menos duas fontes, assiste com uma missão, produz uma evidência, registra reflexão e testa o entendimento.
5. O diário é salvo localmente; não é enviado ao professor nem usado como dado de avaliação nesta versão.

Princípio de produto: o sistema não entrega somente uma resposta. Ele estrutura autonomia com perguntas, pesquisa, evidências, produção e metacognição.

## Métricas propostas

- Tópicos gerados que chegam à publicação.
- Tempo mediano entre criação e publicação.
- Conclusão de tópicos publicados.
- Evolução do domínio após revisão.
- Revisões vencidas concluídas.
- Falhas de geração por provedor e motivo.

## Decisões protegidas

Consultar `skills/aistudytec-engineering/references/domain-rules.md`. Alterações exigem decisão explícita do responsável pelo produto.
