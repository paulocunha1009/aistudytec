# AISTUDYTEC

Ferramenta de estudo independente para alunos do Ensino Médio, pensada para complementar — não substituir — o que é visto em sala de aula. Qualquer professor, de qualquer disciplina, cadastra temas de reforço para sua turma; a IA gera explicações em 3 níveis, um quiz com feedback imediato e sugestões de vídeo do YouTube; o professor revisa e aprova antes de publicar; o aluno estuda e o sistema acompanha, por habilidade, o que cada aluno já domina e o que precisa revisar.

## Conceito pedagógico

- **Complementar, não substituto**: o professor decide os temas de reforço (por exemplo, a partir do que observa em uma avaliação diagnóstica externa — não integrada a este sistema).
- **Multi-nível**: cada tema tem explicação simples, técnica e avançada, cada uma pareada com um vídeo do YouTube adequado a esse nível.
- **Feedback imediato**: o quiz mostra certo/errado e a explicação logo após cada resposta, não só a nota final.
- **Granularidade por habilidade**: cada questão avalia uma habilidade específica (estilo BNCC), não apenas o tema genérico — o que torna o diagnóstico de erros acionável.
- **Revisão espaçada**: habilidades com desempenho abaixo do limiar voltam a ser sugeridas alguns dias depois.
- **Curadoria antes de publicar**: conteúdo gerado por IA para uma turma passa por revisão do professor antes de ficar visível aos alunos. Temas digitados livremente pelo aluno são exceção: aparecem na hora, só para quem pediu, com aviso de "não revisado".
- **Progresso sem gamificação infantilizada**: painel do aluno mostra "domino" vs. "preciso reforçar", adequado a adolescentes perto do ENEM/vestibular.

## Arquitetura

```
backend/            Flask + SQLite
  app.py             rotas + esquema do banco (init_db)
  gemini_client.py   geração de explicação + quiz via Gemini
  youtube_client.py  busca e ranking de vídeos via YouTube Data API v3
  .env.example       modelo de variáveis de ambiente (chaves de API)

frontend/           React (Create React App, sem TypeScript)
  src/api/client.js                  chamadas HTTP centralizadas
  src/components/                    Sidebar, Toast, modais de login/cadastro
  src/components/teacher/            gestão de turmas, tópicos, revisão, dashboard
  src/components/student/            navegação de tópicos, estudo, quiz, progresso
```

Sem TypeScript, sem gerenciador de estado externo, sem roteador — o app é pequeno o suficiente para não precisar disso. Tailwind é carregado via CDN em tempo de execução (não é build-time), como no protótipo original.

## Como rodar

**Backend**
```
cd backend
cp .env.example .env   # preencher GEMINI_API_KEY e YOUTUBE_API_KEY
pip install -r requirements.txt
python app.py          # http://localhost:5000
```

**Frontend**
```
cd frontend
npm install
npm start               # http://localhost:3000
```

A `GEMINI_API_KEY` já existente pode ser reaproveitada. A `YOUTUBE_API_KEY` precisa ser gerada no Google Cloud Console (YouTube Data API v3) — é uma conta/ação do usuário, gratuita, com cota diária.

Sem as chaves configuradas, os endpoints de geração de conteúdo (`/api/topics/<id>/generate`, `/api/topics/freetext`) respondem com erro `502` controlado, sem derrubar o servidor.

Para implantação, não copie o `.env` local. Configure as variáveis no gerenciador de segredos da hospedagem e siga `docs/DEPLOYMENT_SECURITY.md`. Com `APP_ENV=production`, o backend bloqueia inicialização insegura.

## Modelo de dados

Além das tabelas originais (`users`, `classes`, `history`, agora com colunas extras `grade_year`/`topic_id`/`class_id`):

| Tabela | Papel |
|---|---|
| `topics` | Tema de estudo — curado pelo professor (`origin='teacher'`) ou gerado livremente pelo aluno (`origin='student'`); tem `status`: draft → generated → published |
| `topic_explanations` | Uma linha por nível (simple/technical/advanced), editável pelo professor |
| `topic_learning_paths` | Trilha imersiva por nível: objetivos, ideias-chave, investigação, missão de vídeo, desafio e reflexão |
| `quiz_questions` | Pergunta, opções, resposta certa, explicação de feedback, habilidade (`skill`), dificuldade |
| `topic_videos` | Candidatos de vídeo do YouTube por tópico e nível, com `approved` como gate do professor |
| `quiz_attempt_answers` | Resposta de cada pergunta em cada tentativa (liga a `history`) |
| `skill_mastery` | Domínio agregado por aluno + habilidade (alimenta progresso do aluno e dashboard do professor) |
| `review_queue` | Fila de revisão espaçada (aluno, habilidade, data de vencimento) |

## Parâmetros pedagógicos (decisões de produto, não valores arbitrários)

- Domínio de habilidade: **≥ 70%** de acerto
- Revisão espaçada: reaparece **3 dias** depois se abaixo do limiar
- **8–10 questões** geradas por tópico
- Gate de publicação: 3 níveis de explicação preenchidos, ≥ 5 questões com habilidade e resposta certa definidas, ≥ 1 vídeo aprovado por nível
- Tema livre do aluno: sem gate de revisão do professor, nunca vira conteúdo oficial da turma

## Estado verificado em 22 de julho de 2026

- Sessão HTTP-only, papéis, autorização por recurso, defesa de origem, rate limit, headers e auditoria minimizada implementados.
- Gemini e YouTube Data API v3 validados com chaves reais sem exposição de segredos; geração e consulta retornaram HTTP 200.
- Modelo estável `gemini-2.5-flash`, JSON estruturado, validação de três trilhas e nove questões, limite ampliado e uma repetição controlada diante de resposta inválida.
- Experiência imersiva: Descobrir, Aprofundar e Conectar; objetivos, leitura guiada, mundo real, investigação, missão de vídeo, desafio, reflexão, diário local e checklist de autonomia.
- Vídeos exigem correspondência entre termos relevantes do tema e o título; relevância precede popularidade. A faixa de duração é de 3–20 minutos.
- Chamadas comuns mantêm timeout de 30 s; geração/regeneração usa 180 s e informa espera de 30–90 s.
- Evidência automatizada: 40 testes backend, 15 testes frontend e build de produção aprovado.

## Limitações conhecidas

- Não há evidência própria de eficácia educacional, usabilidade com participantes ou impacto sobre aprendizagem.
- SQLite, servidor Flask de desenvolvimento e fluxo síncrono de geração não foram validados para escala pública.
- Migrações não são versionadas; backup/restauração e E2E autenticado de interface permanecem pendentes.
- `grade_year` do aluno ainda depende da decisão de produto e do vínculo com turma/tópico.
- O diário imersivo usa armazenamento local do dispositivo e ainda não possui sincronização ou moderação docente.
