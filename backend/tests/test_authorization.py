from datetime import datetime

from werkzeug.security import generate_password_hash


def set_actor(client, user_id, user_type, class_id=None, name='Pessoa'):
    with client.session_transaction() as auth_session:
        auth_session.clear()
        auth_session['user_id'] = user_id
        auth_session['user_type'] = user_type
        auth_session['user_name'] = name
        auth_session['class_id'] = class_id


def insert_user(db, user_id, user_type, name, username=None, password=None, class_id=None):
    db.execute(
        "INSERT INTO users (id, type, name, username, password, class_id) VALUES (?, ?, ?, ?, ?, ?)",
        (user_id, user_type, name, username, generate_password_hash(password) if password else None, class_id),
    )
    db.commit()


def insert_class(db, class_id, teacher_id):
    db.execute(
        "INSERT INTO classes (id, name, code, teacher_id, created_at) VALUES (?, 'Turma', ?, ?, ?)",
        (class_id, class_id[-6:].upper(), teacher_id, datetime.now().isoformat()),
    )
    db.commit()


def test_login_creates_restorable_session_without_password(anonymous_client, db):
    insert_user(db, 'teacher-1', 'teacher', 'Professora Ana', 'ana', 'senha-segura')

    login = anonymous_client.post('/api/login', json={'user': 'ana', 'pass': 'senha-segura'})
    restored = anonymous_client.get('/api/session')

    assert login.status_code == 200
    assert 'password' not in login.get_json()['user']
    assert restored.get_json()['user']['id'] == 'teacher-1'
    assert anonymous_client.post('/api/logout').status_code == 200
    assert anonymous_client.get('/api/session').get_json() == {'user': None}


def test_classes_require_session_and_ignore_spoofed_teacher_id(anonymous_client, db):
    assert anonymous_client.get('/api/classes').status_code == 401
    insert_user(db, 'teacher-1', 'teacher', 'Professora')
    set_actor(anonymous_client, 'teacher-1', 'teacher')

    response = anonymous_client.post('/api/classes', json={'name': '1º A', 'teacherId': 'attacker'})

    assert response.status_code == 201
    owner = db.execute('SELECT teacher_id FROM classes WHERE id = ?', (response.get_json()['id'],)).fetchone()
    assert owner['teacher_id'] == 'teacher-1'


def test_teacher_cannot_read_another_teachers_dashboard(anonymous_client, db):
    insert_user(db, 'teacher-1', 'teacher', 'Professor 1')
    insert_user(db, 'teacher-2', 'teacher', 'Professor 2')
    insert_class(db, 'class-owner-2', 'teacher-2')
    set_actor(anonymous_client, 'teacher-1', 'teacher')

    assert anonymous_client.get('/api/dashboard/class/class-owner-2').status_code == 403


def test_student_cannot_read_or_write_another_students_progress(anonymous_client, db):
    insert_user(db, 'student-1', 'student', 'Aluno 1')
    insert_user(db, 'student-2', 'student', 'Aluno 2')
    set_actor(anonymous_client, 'student-1', 'student')

    assert anonymous_client.get('/api/skill-mastery?userId=student-2').status_code == 403
    response = anonymous_client.post('/api/quiz-attempts', json={
        'topicId': 'topic-inexistente', 'userId': 'student-2',
        'answers': [{'questionId': 'q-1', 'selectedOption': 'A'}],
    })
    assert response.status_code == 403


def test_topic_editor_requires_ownership_and_public_only_reads_published(anonymous_client, db):
    insert_user(db, 'teacher-1', 'teacher', 'Professor 1')
    insert_user(db, 'teacher-2', 'teacher', 'Professor 2')
    insert_class(db, 'class-topic-1', 'teacher-1')
    db.execute(
        "INSERT INTO topics (id, class_id, teacher_id, title, origin, target_grade, status, created_at) "
        "VALUES ('topic-private', 'class-topic-1', 'teacher-1', 'Privado', 'teacher', 'any', 'draft', ?)",
        (datetime.now().isoformat(),)
    )
    db.commit()

    assert anonymous_client.get('/api/topics/topic-private').status_code == 403
    set_actor(anonymous_client, 'teacher-2', 'teacher')
    assert anonymous_client.patch('/api/topics/topic-private', json={'title': 'Ataque'}).status_code == 403
    set_actor(anonymous_client, 'teacher-1', 'teacher')
    assert anonymous_client.patch('/api/topics/topic-private', json={'title': 'Legítimo'}).status_code == 200
    db.execute("UPDATE topics SET status = 'published' WHERE id = 'topic-private'")
    db.commit()
    with anonymous_client.session_transaction() as auth_session:
        auth_session.clear()
    assert anonymous_client.get('/api/topics/topic-private').status_code == 200


def test_topic_creation_uses_session_owner(anonymous_client, db):
    insert_user(db, 'teacher-owner', 'teacher', 'Professor')
    insert_class(db, 'class-owned', 'teacher-owner')
    set_actor(anonymous_client, 'teacher-owner', 'teacher')

    response = anonymous_client.post('/api/topics', json={
        'title': 'Funções', 'classId': 'class-owned', 'teacherId': 'attacker'
    })

    assert response.status_code == 201
    topic = db.execute('SELECT teacher_id FROM topics WHERE id = ?', (response.get_json()['id'],)).fetchone()
    assert topic['teacher_id'] == 'teacher-owner'


def test_unsafe_cross_site_origin_is_rejected(anonymous_client):
    rejected = anonymous_client.post('/api/logout', headers={'Origin': 'https://evil.example'})
    allowed = anonymous_client.post('/api/logout', headers={'Origin': 'http://localhost:3000'})

    assert rejected.status_code == 403
    assert rejected.get_json()['error'] == 'Origem não autorizada'
    assert allowed.status_code == 200


def test_authenticated_authoring_flow_enforces_boundary_after_logout(anonymous_client, db):
    insert_user(db, 'teacher-flow-1', 'teacher', 'Professor 1', 'prof1', 'senha-1')
    insert_user(db, 'teacher-flow-2', 'teacher', 'Professor 2', 'prof2', 'senha-2')

    assert anonymous_client.post('/api/login', json={'user': 'prof1', 'pass': 'senha-1'}).status_code == 200
    created_class = anonymous_client.post('/api/classes', json={'name': 'Turma Fluxo'})
    assert created_class.status_code == 201
    created_topic = anonymous_client.post('/api/topics', json={
        'title': 'Funções', 'classId': created_class.get_json()['id']
    })
    assert created_topic.status_code == 201
    topic_id = created_topic.get_json()['id']
    assert anonymous_client.patch(f'/api/topics/{topic_id}', json={'title': 'Funções afins'}).status_code == 200
    assert anonymous_client.post('/api/logout').status_code == 200
    assert anonymous_client.get('/api/classes').status_code == 401

    assert anonymous_client.post('/api/login', json={'user': 'prof2', 'pass': 'senha-2'}).status_code == 200
    assert anonymous_client.patch(f'/api/topics/{topic_id}', json={'title': 'Acesso indevido'}).status_code == 403


def test_audit_trail_is_master_only_and_contains_minimized_events(client, anonymous_client, db):
    insert_user(db, 'teacher-audit', 'teacher', 'Professor', 'audit-user', 'audit-password')
    assert anonymous_client.post('/api/login', json={'user': 'audit-user', 'pass': 'audit-password'}).status_code == 200
    assert anonymous_client.get('/api/audit-events').status_code == 403

    events_response = client.get('/api/audit-events?action=session.login')

    assert events_response.status_code == 200
    events = events_response.get_json()
    assert events
    assert events[0]['actor_id'] == 'teacher-audit'
    serialized = str(events).lower()
    assert 'audit-password' not in serialized
    assert 'audit-user' not in serialized
