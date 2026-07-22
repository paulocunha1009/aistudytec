from functools import wraps

from flask import jsonify, request, session


def public_user(user):
    allowed = ('id', 'type', 'name', 'email', 'class_id', 'grade_year')
    return {field: user[field] for field in allowed if field in user.keys()}


def actor():
    if not session.get('user_id'):
        return None
    return {
        'id': session['user_id'],
        'type': session.get('user_type'),
        'class_id': session.get('class_id'),
        'name': session.get('user_name'),
    }


def require_roles(*roles):
    def decorator(handler):
        @wraps(handler)
        def wrapped(*args, **kwargs):
            current = actor()
            if not current:
                return jsonify({"error": "Autenticação obrigatória"}), 401
            if current['type'] not in roles:
                return jsonify({"error": "Acesso não autorizado"}), 403
            return handler(*args, **kwargs)
        return wrapped
    return decorator


def validate_unsafe_origin(allowed_origins):
    if request.method not in ('POST', 'PUT', 'PATCH', 'DELETE'):
        return None
    origin = request.headers.get('Origin')
    if origin and origin not in allowed_origins:
        return jsonify({"error": "Origem não autorizada"}), 403
    if request.headers.get('Sec-Fetch-Site') == 'cross-site':
        return jsonify({"error": "Requisição entre sites bloqueada"}), 403
    return None


def can_manage_class(conn, current, class_id):
    if current['type'] == 'master':
        return True
    return conn.execute(
        "SELECT 1 FROM classes WHERE id = ? AND teacher_id = ?", (class_id, current['id'])
    ).fetchone() is not None


def can_edit_topic(conn, current, topic):
    if not current or not topic:
        return False
    if current['type'] == 'master':
        return True
    return (
        current['type'] == 'teacher' and topic['origin'] == 'teacher' and
        topic['teacher_id'] == current['id'] and can_manage_class(conn, current, topic['class_id'])
    )


def can_read_topic(conn, current, topic):
    if not topic:
        return False
    if topic['origin'] == 'teacher' and topic['status'] == 'published':
        if not current or current['type'] in ('teacher', 'master'):
            return True
        return current['type'] == 'student' and current['class_id'] == topic['class_id']
    if topic['origin'] == 'student' and topic['student_id'] is None:
        return True
    if not current:
        return False
    if current['type'] == 'master':
        return True
    if current['type'] == 'teacher':
        return can_edit_topic(conn, current, topic)
    return topic['origin'] == 'student' and topic['student_id'] == current['id']


def owned_topic_or_error(conn, topic_id):
    topic = conn.execute("SELECT * FROM topics WHERE id = ?", (topic_id,)).fetchone()
    if not topic:
        return None, (jsonify({"error": "Tópico não encontrado"}), 404)
    if not can_edit_topic(conn, actor(), topic):
        return None, (jsonify({"error": "Acesso não autorizado"}), 403)
    return topic, None
