import json

from test_app import _insert_question, _insert_topic


def test_security_headers_and_cors_allowlist(client):
    allowed = client.get("/api/topics", headers={"Origin": "http://localhost:3000"})
    denied = client.get("/api/topics", headers={"Origin": "https://origem-nao-permitida.example"})

    assert allowed.headers["X-Content-Type-Options"] == "nosniff"
    assert allowed.headers["X-Frame-Options"] == "DENY"
    assert allowed.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
    assert allowed.headers["Access-Control-Allow-Origin"] == "http://localhost:3000"
    assert "Access-Control-Allow-Origin" not in denied.headers


def test_login_rate_limit_returns_portuguese_error(client):
    responses = [client.post("/api/login", json={"user": "x", "pass": "y"}) for _ in range(11)]

    assert responses[-1].status_code == 429
    assert responses[-1].get_json()["error"] == "Muitas tentativas. Aguarde e tente novamente."


def test_topic_creation_and_patch_validate_payloads(client, db):
    missing = client.post("/api/topics", json={"title": "Funções"})
    assert missing.status_code == 400
    assert set(missing.get_json()["fields"]) == {"classId"}

    _insert_topic(db)
    invalid_grade = client.patch("/api/topics/topic-1", json={"targetGrade": "4"})
    empty_patch = client.patch("/api/topics/topic-1", json={"unknown": True})

    assert invalid_grade.status_code == 400
    assert empty_patch.status_code == 400


def test_content_edit_endpoints_validate_enums_and_types(client, db):
    _insert_topic(db)
    _insert_question(db, "q-1", "interpretar gráfico")
    db.execute(
        """INSERT INTO topic_videos
           (id, topic_id, level, youtube_video_id, approved)
           VALUES ('video-1', 'topic-1', 'simple', 'youtube-1', 0)"""
    )
    db.commit()

    invalid_part = client.post("/api/topics/topic-1/regenerate?part=desconhecida")
    invalid_level = client.patch(
        "/api/topics/topic-1/explanations/desconhecido", json={"content": "Texto"}
    )
    invalid_options = client.patch(
        "/api/topics/topic-1/questions/q-1", json={"options": ["A"]}
    )
    invalid_difficulty = client.patch(
        "/api/topics/topic-1/questions/q-1", json={"difficulty": "impossivel"}
    )
    invalid_approval = client.patch(
        "/api/topics/topic-1/videos/video-1", json={"approved": "sim"}
    )

    for response in (invalid_part, invalid_level, invalid_options, invalid_difficulty, invalid_approval):
        assert response.status_code == 400


def test_quiz_attempt_rejects_empty_duplicate_unknown_and_missing_topic(client, db):
    _insert_topic(db)
    _insert_question(db, "q-1", "interpretar gráfico")

    empty = client.post("/api/quiz-attempts", json={"topicId": "topic-1", "answers": []})
    duplicate = client.post(
        "/api/quiz-attempts",
        json={"topicId": "topic-1", "answers": [
            {"questionId": "q-1", "selectedOption": "A"},
            {"questionId": "q-1", "selectedOption": "A"},
        ]},
    )
    unknown = client.post(
        "/api/quiz-attempts",
        json={"topicId": "topic-1", "answers": [
            {"questionId": "q-outro", "selectedOption": "A"}
        ]},
    )
    missing_topic = client.post(
        "/api/quiz-attempts",
        json={"topicId": "nao-existe", "answers": [
            {"questionId": "q-1", "selectedOption": "A"}
        ]},
    )

    assert empty.status_code == 400
    assert duplicate.status_code == 400
    assert unknown.status_code == 400
    assert missing_topic.status_code == 404
    assert db.execute("SELECT COUNT(*) FROM history").fetchone()[0] == 0


def test_progress_endpoints_require_user(client):
    assert client.get("/api/skill-mastery").status_code == 400
    assert client.get("/api/review-queue").status_code == 400
