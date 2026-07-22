def _create(client, key='job-key', **overrides):
    payload = {'operation': 'freetext', 'title': 'Hardware'}
    payload.update(overrides)
    return client.post('/api/generation-jobs', json=payload, headers={'Idempotency-Key': key})


def test_generation_job_requires_valid_contract(client):
    assert client.post('/api/generation-jobs', json={'operation': 'freetext', 'title': 'Hardware'}).status_code == 400
    assert _create(client, operation='unknown').status_code == 400
    assert _create(client, title='').status_code == 400
    assert _create(client, operation='generate', title=None).status_code == 400


def test_generation_job_is_persisted_and_readable(client):
    created = _create(client)
    assert created.status_code == 202
    body = created.get_json()
    assert body['status'] == 'queued'
    assert body['operation'] == 'freetext'
    assert body['reused'] is False
    assert 'payload' not in body

    fetched = client.get(f"/api/generation-jobs/{body['id']}")
    assert fetched.status_code == 200
    assert fetched.get_json()['id'] == body['id']


def test_generation_job_reuses_same_idempotent_request(client):
    first = _create(client, key='same-key').get_json()
    second_response = _create(client, key='same-key')
    second = second_response.get_json()
    assert second_response.status_code == 202
    assert second['id'] == first['id']
    assert second['reused'] is True


def test_generation_job_rejects_key_reused_for_different_input(client):
    _create(client, key='conflict-key', title='Hardware')
    conflict = _create(client, key='conflict-key', title='Software')
    assert conflict.status_code == 409


def test_anonymous_job_is_private_between_sessions(flask_app):
    first_client = flask_app.test_client()
    second_client = flask_app.test_client()
    created = _create(first_client, key='anonymous-key').get_json()
    assert first_client.get(f"/api/generation-jobs/{created['id']}").status_code == 200
    assert second_client.get(f"/api/generation-jobs/{created['id']}").status_code == 403


def test_worker_completes_freetext_job(client, monkeypatch):
    import app as app_module

    path = {
        'hook': 'Pergunta', 'objectives': ['Objetivo 1', 'Objetivo 2'],
        'keyIdeas': ['Ideia 1', 'Ideia 2', 'Ideia 3'], 'realWorldConnection': 'Conexão',
        'guidedInvestigation': {'question': 'Investigue', 'steps': ['Passo 1', 'Passo 2'], 'searchTerms': ['Termo 1', 'Termo 2']},
        'watchMission': {'before': 'Antes', 'during': 'Durante', 'after': 'Depois'},
        'handsOnChallenge': {'title': 'Desafio', 'instructions': 'Faça', 'deliverable': 'Registro'},
        'reflectionQuestions': ['Reflexão 1', 'Reflexão 2'], 'discussionPrompt': 'Discuta',
    }
    generated = {
        'explanations': {'simple': 'S', 'technical': 'T', 'advanced': 'A'},
        'learningPaths': {level: path for level in ('simple', 'technical', 'advanced')},
        'questions': [
            {'question': f'Q{i}', 'options': ['A', 'B'], 'correctOption': 'A', 'explanation': 'E', 'skill': f'H{i}', 'difficulty': 'medio'}
            for i in range(9)
        ],
    }
    monkeypatch.setattr(app_module, 'generate_topic_content', lambda *_: generated)
    monkeypatch.setattr(app_module, 'search_videos_for_level', lambda *_: [])
    created = _create(client, key='worker-key', title='Tema do worker').get_json()
    app_module._run_generation_job(created['id'])
    completed = client.get(f"/api/generation-jobs/{created['id']}").get_json()
    assert completed['status'] == 'completed'
    assert completed['topicId']
    assert completed['completedAt']


def test_worker_records_safe_failure(client, monkeypatch):
    import app as app_module

    monkeypatch.setattr(app_module, 'generate_topic_content', lambda *_: (_ for _ in ()).throw(RuntimeError('provedor indisponível')))
    created = _create(client, key='failed-worker-key').get_json()
    app_module._run_generation_job(created['id'])
    failed = client.get(f"/api/generation-jobs/{created['id']}").get_json()
    assert failed['status'] == 'failed'
    assert failed['error']['code'] == 'GENERATION_FAILED'
    assert 'provedor indisponível' in failed['error']['message']


def test_recovery_requeues_interrupted_job(client, db):
    import app as app_module

    created = _create(client, key='recovery-key').get_json()
    db.execute("UPDATE generation_jobs SET status = 'running', started_at = '2026-01-01' WHERE id = ?", (created['id'],))
    db.commit()
    app_module.recover_generation_jobs()
    recovered = client.get(f"/api/generation-jobs/{created['id']}").get_json()
    assert recovered['status'] == 'queued'
    assert recovered['startedAt'] is None
