import json
from datetime import datetime, timedelta

import pytest
import app as app_module


def _insert_topic(db, topic_id="topic-1", status="generated"):
    db.execute(
        """INSERT INTO topics
           (id, title, origin, target_grade, status, created_at)
           VALUES (?, ?, 'teacher', 'any', ?, ?)""",
        (topic_id, "Funções", status, datetime.now().isoformat()),
    )
    db.commit()


def _insert_question(db, question_id, skill, correct_option="A", topic_id="topic-1"):
    db.execute(
        """INSERT INTO quiz_questions
           (id, topic_id, question, options, correct_option, explanation,
            skill, difficulty, target_grade, order_index, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'medio', 'any', 0, ?)""",
        (
            question_id,
            topic_id,
            f"Questão {question_id}",
            json.dumps(["A", "B", "C", "D"]),
            correct_option,
            "Explicação",
            skill,
            datetime.now().isoformat(),
        ),
    )
    db.commit()


def test_student_registration_accepts_missing_or_empty_class_code(client, db):
    for suffix, class_code in (("missing", None), ("empty", "")):
        payload = {
            "type": "student",
            "name": f"Aluno {suffix}",
            "user": f"aluno-{suffix}",
            "pass": "senha",
        }
        if class_code is not None:
            payload["classCode"] = class_code

        response = client.post("/api/register", json=payload)

        assert response.status_code == 201
        assert response.get_json()["class_id"] is None


def test_init_db_does_not_create_default_master_without_environment(db):
    master = db.execute("SELECT id FROM users WHERE type = 'master'").fetchone()
    assert master is None


def test_access_endpoints_reject_invalid_json_and_missing_fields(client):
    invalid_json = client.post("/api/login", data="not-json", content_type="text/plain")
    missing_login = client.post("/api/login", json={"user": "aluno"})
    invalid_user_type = client.post("/api/register", json={"type": "master", "name": "Pessoa"})
    missing_class_code = client.post("/api/join-class", json={"code": ""})

    assert invalid_json.status_code == 400
    assert invalid_json.get_json()["error"] == "Corpo JSON inválido"
    assert missing_login.status_code == 400
    assert missing_login.get_json()["fields"] == ["pass"]
    assert invalid_user_type.status_code == 400
    assert missing_class_code.status_code == 400


def test_init_db_provisions_master_only_from_environment(tmp_path, monkeypatch):
    monkeypatch.setattr(app_module, "DB_NAME", str(tmp_path / "admin.db"))
    monkeypatch.setenv("ADMIN_USERNAME", "admin-teste")
    monkeypatch.setenv("ADMIN_PASSWORD", "senha-forte-de-teste")

    app_module.init_db()
    connection = app_module.get_db_connection()
    try:
        master = connection.execute("SELECT username, password FROM users WHERE type = 'master'").fetchone()
        assert master["username"] == "admin-teste"
        assert master["password"] != "senha-forte-de-teste"
    finally:
        connection.close()


def test_init_db_disables_legacy_master_without_environment(tmp_path, monkeypatch):
    monkeypatch.setattr(app_module, "DB_NAME", str(tmp_path / "legacy.db"))
    monkeypatch.delenv("ADMIN_USERNAME", raising=False)
    monkeypatch.delenv("ADMIN_PASSWORD", raising=False)
    app_module.init_db()
    connection = app_module.get_db_connection()
    try:
        connection.execute(
            "INSERT INTO users (id, type, name, username, password) VALUES (?, 'master', ?, 'Master', ?)",
            ("legacy-master", "Administrador Master", "hash-legado"),
        )
        connection.commit()
    finally:
        connection.close()

    app_module.init_db()
    connection = app_module.get_db_connection()
    try:
        master = connection.execute("SELECT username, password FROM users WHERE id = 'legacy-master'").fetchone()
        assert master["username"] is None
        assert master["password"] != "hash-legado"
    finally:
        connection.close()


def test_production_config_rejects_insecure_defaults(monkeypatch):
    monkeypatch.setenv('APP_ENV', 'production')
    monkeypatch.setenv('SESSION_SECRET', 'curto')
    monkeypatch.setenv('ADMIN_USERNAME', '')
    monkeypatch.setenv('ADMIN_PASSWORD', '')
    monkeypatch.setenv('ALLOWED_ORIGINS', 'http://localhost:3000')
    monkeypatch.setenv('SESSION_COOKIE_SECURE', 'false')
    monkeypatch.setenv('RATELIMIT_STORAGE_URI', 'memory://')
    with pytest.raises(RuntimeError, match='Configuração de produção inválida'):
        app_module._validate_runtime_config()


def test_production_config_accepts_secure_environment(monkeypatch):
    monkeypatch.setenv('APP_ENV', 'production')
    monkeypatch.setenv('SESSION_SECRET', 's' * 48)
    monkeypatch.setenv('ADMIN_USERNAME', 'master')
    monkeypatch.setenv('ADMIN_PASSWORD', 'senha-forte-fornecida-por-secret-manager')
    monkeypatch.setenv('ALLOWED_ORIGINS', 'https://app.exemplo.com.br')
    monkeypatch.setenv('SESSION_COOKIE_SECURE', 'true')
    monkeypatch.setenv('RATELIMIT_STORAGE_URI', 'redis://redis:6379/0')
    app_module._validate_runtime_config()


def test_student_registration_links_a_valid_class_code(client, db):
    db.execute(
        """INSERT INTO classes
           (id, name, code, teacher_id, created_at, grade_year)
           VALUES ('class-1', 'Turma A', 'ABC123', 'teacher-1', ?, '1')""",
        (datetime.now().isoformat(),),
    )
    db.commit()

    response = client.post(
        "/api/register",
        json={
            "type": "student",
            "name": "Aluno",
            "user": "aluno",
            "pass": "senha",
            "classCode": "ABC123",
        },
    )

    assert response.status_code == 201
    assert response.get_json()["class_id"] == "class-1"


def test_publish_gate_rejects_incomplete_and_accepts_complete_topic(client, db):
    _insert_topic(db)

    incomplete = client.post("/api/topics/topic-1/publish")
    assert incomplete.status_code == 400
    assert len(incomplete.get_json()["missing"]) == 7

    for level in ("simple", "technical", "advanced"):
        db.execute(
            """INSERT INTO topic_explanations
               (id, topic_id, level, content) VALUES (?, 'topic-1', ?, ?)""",
            (f"exp-{level}", level, f"Conteúdo {level}"),
        )
        db.execute(
            """INSERT INTO topic_videos
               (id, topic_id, level, youtube_video_id, approved)
               VALUES (?, 'topic-1', ?, ?, 1)""",
            (f"video-{level}", level, f"youtube-{level}"),
        )
    for index in range(5):
        _insert_question(db, f"q-{index}", f"habilidade-{index}")
    db.commit()

    complete = client.post("/api/topics/topic-1/publish")
    assert complete.status_code == 200
    topic = db.execute("SELECT status, published_at FROM topics WHERE id = 'topic-1'").fetchone()
    assert topic["status"] == "published"
    assert topic["published_at"]


def test_skill_mastery_upsert_accumulates_and_recalculates_percentage(client, db):
    _insert_topic(db)
    _insert_question(db, "q-1", "interpretar gráfico")

    first = client.post(
        "/api/quiz-attempts",
        json={"topicId": "topic-1", "userId": "student-1", "answers": [
            {"questionId": "q-1", "selectedOption": "A"}
        ]},
    )
    second = client.post(
        "/api/quiz-attempts",
        json={"topicId": "topic-1", "userId": "student-1", "answers": [
            {"questionId": "q-1", "selectedOption": "B"}
        ]},
    )

    assert first.status_code == second.status_code == 201
    mastery = db.execute(
        "SELECT correct_count, total_count, mastery_pct FROM skill_mastery "
        "WHERE user_id = 'student-1' AND skill = 'interpretar gráfico'"
    ).fetchone()
    assert dict(mastery) == {"correct_count": 1, "total_count": 2, "mastery_pct": 50}


def test_review_queue_deduplicates_pending_items(client, db):
    _insert_topic(db)
    _insert_question(db, "q-1", "resolver equação")
    payload = {
        "topicId": "topic-1",
        "userId": "student-1",
        "answers": [{"questionId": "q-1", "selectedOption": "B"}],
    }

    assert client.post("/api/quiz-attempts", json=payload).status_code == 201
    assert client.post("/api/quiz-attempts", json=payload).status_code == 201

    rows = db.execute(
        "SELECT due_date FROM review_queue "
        "WHERE user_id = 'student-1' AND skill = 'resolver equação' AND status = 'pending'"
    ).fetchall()
    assert len(rows) == 1
    assert rows[0]["due_date"] == (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d")


def test_quiz_returns_skill_evidence_and_completes_review_with_new_attempt(client, db):
    _insert_topic(db)
    _insert_question(db, "q-1", "resolver equação")
    db.execute(
        "INSERT INTO review_queue (id, user_id, topic_id, skill, due_date, status, created_at) "
        "VALUES ('review-1', 'student-1', 'topic-1', 'resolver equação', '2026-01-01', 'pending', '2026-01-01T00:00:00')"
    )
    db.commit()

    response = client.post('/api/quiz-attempts', json={
        "topicId": "topic-1", "userId": "student-1",
        "answers": [{"questionId": "q-1", "selectedOption": "A"}],
    })

    assert response.status_code == 201
    body = response.get_json()
    assert body["completedReviews"] == ["resolver equação"]
    assert body["skillResults"] == [{
        "skill": "resolver equação", "correct": 1, "total": 1,
        "percentage": 100, "masteryPct": 100, "status": "mastered",
    }]
    review = db.execute("SELECT status, resolved_at FROM review_queue WHERE id = 'review-1'").fetchone()
    assert review["status"] == "completed"
    assert review["resolved_at"]


def test_weak_skill_is_requeued_after_review_attempt(client, db):
    _insert_topic(db)
    _insert_question(db, "q-1", "interpretar gráfico")
    db.execute(
        "INSERT INTO review_queue (id, user_id, topic_id, skill, due_date, status, created_at) "
        "VALUES ('review-old', 'student-1', 'topic-1', 'interpretar gráfico', '2026-01-01', 'pending', '2026-01-01T00:00:00')"
    )
    db.commit()

    response = client.post('/api/quiz-attempts', json={
        "topicId": "topic-1", "userId": "student-1",
        "answers": [{"questionId": "q-1", "selectedOption": "B"}],
    })

    assert response.status_code == 201
    rows = db.execute(
        "SELECT status, due_date FROM review_queue WHERE user_id = 'student-1' "
        "AND skill = 'interpretar gráfico' ORDER BY created_at"
    ).fetchall()
    assert [row["status"] for row in rows] == ["completed", "pending"]
    assert rows[1]["due_date"] == (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d")


def test_class_dashboard_exposes_actionable_evidence(client, db):
    db.execute(
        "INSERT INTO classes (id, name, code, teacher_id, created_at) "
        "VALUES ('class-1', 'Turma A', 'ABC123', 'teacher-1', ?) ",
        (datetime.now().isoformat(),)
    )
    db.execute(
        "INSERT INTO users (id, type, name, class_id) "
        "VALUES ('student-dashboard', 'student', 'Ana', 'class-1')"
    )
    _insert_topic(db)
    db.execute(
        "INSERT INTO skill_mastery (id, user_id, skill, topic_id, correct_count, total_count, mastery_pct, last_practiced_at) "
        "VALUES ('mastery-dashboard', 'student-dashboard', 'frações', 'topic-1', 1, 2, 50, '2026-07-20T10:00:00')"
    )
    db.execute(
        "INSERT INTO review_queue (id, user_id, topic_id, skill, due_date, status, created_at) "
        "VALUES ('review-dashboard', 'student-dashboard', 'topic-1', 'frações', '2026-01-01', 'pending', '2026-01-01T00:00:00')"
    )
    db.commit()

    response = client.get('/api/dashboard/class/class-1')

    assert response.status_code == 200
    body = response.get_json()
    assert body['summary'] == {"students": 1, "withoutAttempts": 1, "dueReviews": 1, "skillsToReinforce": 1}
    student = body['students'][0]
    assert student['lastPracticedAt'] == '2026-07-20T10:00:00'
    assert student['dueReviews'][0]['skill'] == 'frações'
    assert student['skills'][0] == {
        "skill": "frações", "masteryPct": 50, "totalCount": 2,
        "lastPracticedAt": "2026-07-20T10:00:00", "status": "reforcar",
    }
