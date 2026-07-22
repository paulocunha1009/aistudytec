# Mapa do código

## Backend

- `backend/app.py`: schema SQLite, casos de uso ainda concentrados e rotas Flask.
- `backend/security.py`: sessão, papéis, propriedade de turma/tópico e defesa de origem.
- `backend/audit.py`: schema e gravação minimizada da trilha de auditoria.
- `backend/gemini_client.py`: prompt, três trilhas imersivas, chamada Gemini, retry limitado e validação estrutural.
- `backend/youtube_client.py`: busca YouTube, duração de 3–20 min, filtro de correspondência no título e ranking orientado a relevância.
- `backend/tests/`: integração Flask e clientes externos.
- `generation_jobs` em `backend/app.py`: contrato assíncrono, propriedade, idempotência, executor local e recuperação após reinício.

Ao mudar banco, manter `init_db()` idempotente. Ao mudar payload, revisar `frontend/src/api/client.js` e consumidores.

## Frontend

- `frontend/src/App.js`: shell, usuário, navegação e toasts.
- `frontend/src/api/client.js`: acesso HTTP centralizado.
- `frontend/src/components/teacher/`: turma, tópicos, revisão e dashboard.
- `frontend/src/components/student/`: catálogo, estudo, quiz e progresso.
- `frontend/src/components/student/StudyView.js`: jornada Descobrir/Aprofundar/Conectar, investigação, missão de vídeo, desafio, reflexão, diário local e progresso autodeclarado.
- `frontend/src/api/client.js`: timeouts comuns de 30 s e operações de IA de 180 s.
- `frontend/src/components/student/TopicBrowser.js`: criação, polling e retomada local de job de tema livre.

## Verificação

- Backend: `python -m pytest backend/tests -q` na raiz.
- Frontend: `npm.cmd test` e `npm.cmd run build` em `frontend`.
- Skill: executar `quick_validate.py skills/aistudytec-engineering`.
