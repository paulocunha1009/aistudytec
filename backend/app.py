import sqlite3
import uuid
import os
import json
import secrets
import hashlib
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv

from gemini_client import generate_topic_content
from youtube_client import search_videos_for_level
from audit import init_audit_table, record_audit
from security import (
    actor as _actor,
    can_edit_topic as _can_edit_topic,
    can_manage_class as _can_manage_class,
    can_read_topic as _can_read_topic,
    owned_topic_or_error as _owned_topic_or_error,
    public_user as _public_user,
    require_roles as _require_roles,
    validate_unsafe_origin,
)

load_dotenv()


def _validate_runtime_config():
    if os.environ.get('APP_ENV', 'development').lower() != 'production':
        return
    problems = []
    session_secret = os.environ.get('SESSION_SECRET', '')
    if len(session_secret) < 32 or session_secret == 'troque-por-um-segredo-aleatorio-longo':
        problems.append('SESSION_SECRET deve ter pelo menos 32 caracteres aleatórios')
    if not os.environ.get('ADMIN_USERNAME', '').strip() or not os.environ.get('ADMIN_PASSWORD', ''):
        problems.append('ADMIN_USERNAME e ADMIN_PASSWORD são obrigatórios')
    origins = os.environ.get('ALLOWED_ORIGINS', '')
    if not origins or 'localhost' in origins or '127.0.0.1' in origins:
        problems.append('ALLOWED_ORIGINS deve conter somente o domínio HTTPS publicado')
    if os.environ.get('SESSION_COOKIE_SECURE', '').lower() != 'true':
        problems.append('SESSION_COOKIE_SECURE deve ser true')
    if os.environ.get('RATELIMIT_STORAGE_URI', 'memory://') == 'memory://':
        problems.append('RATELIMIT_STORAGE_URI deve usar armazenamento compartilhado')
    if problems:
        raise RuntimeError('Configuração de produção inválida: ' + '; '.join(problems))


_validate_runtime_config()

generation_executor = ThreadPoolExecutor(max_workers=int(os.environ.get('GENERATION_WORKERS', '2')))

app = Flask(__name__)
app.config.update(
    SECRET_KEY=os.environ.get('SESSION_SECRET') or secrets.token_hex(32),
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE=os.environ.get('SESSION_COOKIE_SAMESITE', 'Lax'),
    SESSION_COOKIE_SECURE=os.environ.get('SESSION_COOKIE_SECURE', 'false').lower() == 'true',
    PERMANENT_SESSION_LIFETIME=timedelta(hours=int(os.environ.get('SESSION_HOURS', '8'))),
)
allowed_origins = [origin.strip() for origin in os.environ.get(
    'ALLOWED_ORIGINS', 'http://localhost:3000'
).split(',') if origin.strip()]
CORS(app, resources={r"/api/*": {"origins": allowed_origins}}, supports_credentials=True)
limiter = Limiter(
    get_remote_address,
    app=app,
    storage_uri=os.environ.get('RATELIMIT_STORAGE_URI', 'memory://'),
    headers_enabled=True,
)

@app.before_request
def reject_untrusted_unsafe_origin():
    return validate_unsafe_origin(allowed_origins)

DB_NAME = "aistudytec.db"

MASTERY_THRESHOLD_PCT = 70
REVIEW_INTERVAL_DAYS = 3
PUBLISH_MIN_QUESTIONS = 5
EXPLANATION_LEVELS = ('simple', 'technical', 'advanced')
GRADE_YEARS = ('1', '2', '3', 'any')
DIFFICULTIES = ('facil', 'medio', 'dificil')

@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
    return response

@app.errorhandler(429)
def rate_limit_exceeded(_error):
    return jsonify({"error": "Muitas tentativas. Aguarde e tente novamente."}), 429

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def _ensure_column(cursor, table, column, coltype):
    existing_cols = [row[1] for row in cursor.execute(f"PRAGMA table_info({table})").fetchall()]
    if column not in existing_cols:
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {coltype}")

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Tabela Usuários
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            dob TEXT,
            username TEXT,
            password TEXT,
            class_id TEXT
        )
    ''')

    # Tabela Turmas
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS classes (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            code TEXT UNIQUE NOT NULL,
            theme TEXT,
            teacher_id TEXT NOT NULL,
            created_at TEXT
        )
    ''')

    # Tabela Histórico
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS history (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            user_id TEXT,
            student_name_snapshot TEXT,
            theme TEXT,
            score INTEGER,
            total INTEGER,
            percentage INTEGER,
            date TEXT,
            details TEXT
        )
    ''')

    # Colunas novas em tabelas existentes
    _ensure_column(cursor, 'users', 'grade_year', 'TEXT')
    _ensure_column(cursor, 'classes', 'grade_year', 'TEXT')
    _ensure_column(cursor, 'history', 'topic_id', 'TEXT')
    _ensure_column(cursor, 'history', 'class_id', 'TEXT')

    # Tópicos de estudo (curados pelo professor ou gerados livremente pelo aluno)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS topics (
            id TEXT PRIMARY KEY,
            class_id TEXT,
            teacher_id TEXT,
            student_id TEXT,
            title TEXT NOT NULL,
            origin TEXT NOT NULL DEFAULT 'teacher',
            target_grade TEXT NOT NULL DEFAULT 'any',
            status TEXT NOT NULL DEFAULT 'draft',
            created_at TEXT NOT NULL,
            published_at TEXT
        )
    ''')

    # Explicações (uma por nível: simple/technical/advanced), editável pelo professor
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS topic_explanations (
            id TEXT PRIMARY KEY,
            topic_id TEXT NOT NULL,
            level TEXT NOT NULL,
            content TEXT NOT NULL,
            ai_generated INTEGER NOT NULL DEFAULT 1,
            UNIQUE(topic_id, level)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS topic_learning_paths (
            id TEXT PRIMARY KEY,
            topic_id TEXT NOT NULL,
            level TEXT NOT NULL,
            content TEXT NOT NULL,
            UNIQUE(topic_id, level)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS generation_jobs (
            id TEXT PRIMARY KEY,
            owner_key TEXT NOT NULL,
            operation TEXT NOT NULL,
            idempotency_key TEXT NOT NULL,
            request_hash TEXT NOT NULL,
            payload TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'queued',
            topic_id TEXT,
            error_code TEXT,
            error_message TEXT,
            created_at TEXT NOT NULL,
            started_at TEXT,
            completed_at TEXT,
            UNIQUE(owner_key, operation, idempotency_key)
        )
    ''')

    # Questões do quiz, com habilidade e dificuldade
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS quiz_questions (
            id TEXT PRIMARY KEY,
            topic_id TEXT NOT NULL,
            question TEXT NOT NULL,
            options TEXT NOT NULL,
            correct_option TEXT NOT NULL,
            explanation TEXT,
            skill TEXT NOT NULL,
            difficulty TEXT NOT NULL DEFAULT 'medio',
            target_grade TEXT NOT NULL DEFAULT 'any',
            order_index INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        )
    ''')

    # Vídeos curados do YouTube, por tópico e por nível
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS topic_videos (
            id TEXT PRIMARY KEY,
            topic_id TEXT NOT NULL,
            level TEXT NOT NULL,
            youtube_video_id TEXT NOT NULL,
            title TEXT,
            channel_title TEXT,
            duration_seconds INTEGER,
            view_count INTEGER,
            thumbnail_url TEXT,
            rank_score REAL,
            approved INTEGER NOT NULL DEFAULT 0,
            order_index INTEGER NOT NULL DEFAULT 0
        )
    ''')

    # Resposta de cada pergunta em cada tentativa de quiz
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS quiz_attempt_answers (
            id TEXT PRIMARY KEY,
            history_id TEXT NOT NULL,
            question_id TEXT,
            skill TEXT NOT NULL,
            selected_option TEXT,
            correct_option TEXT,
            is_correct INTEGER NOT NULL,
            answered_at TEXT
        )
    ''')

    # Domínio agregado por aluno + habilidade
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS skill_mastery (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            skill TEXT NOT NULL,
            topic_id TEXT,
            correct_count INTEGER NOT NULL DEFAULT 0,
            total_count INTEGER NOT NULL DEFAULT 0,
            mastery_pct INTEGER NOT NULL DEFAULT 0,
            last_practiced_at TEXT,
            UNIQUE(user_id, skill)
        )
    ''')

    # Fila de revisão espaçada
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS review_queue (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            topic_id TEXT,
            skill TEXT,
            due_date TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL,
            resolved_at TEXT
        )
    ''')
    init_audit_table(cursor)

    # Usuário master opcional, provisionado apenas por variáveis de ambiente.
    admin_username = os.environ.get('ADMIN_USERNAME', '').strip()
    admin_password = os.environ.get('ADMIN_PASSWORD', '')
    master = cursor.execute("SELECT * FROM users WHERE type = 'master'").fetchone()
    if admin_username and admin_password:
        hashed_pw = generate_password_hash(admin_password)
        if master:
            cursor.execute(
                "UPDATE users SET username = ?, password = ? WHERE id = ?",
                (admin_username, hashed_pw, master['id'])
            )
        else:
            cursor.execute(
                "INSERT INTO users (id, type, name, username, password) VALUES (?, ?, ?, ?, ?)",
                (str(uuid.uuid4()), 'master', 'Administrador Master', admin_username, hashed_pw)
            )
        print("Usuário master provisionado pelas variáveis de ambiente")
    elif master and master['username'] == 'Master':
        cursor.execute(
            "UPDATE users SET username = NULL, password = ? WHERE id = ?",
            (generate_password_hash(uuid.uuid4().hex), master['id'])
        )
        print("Conta master legada desabilitada; configure ADMIN_USERNAME e ADMIN_PASSWORD")

    conn.commit()
    conn.close()

# --- HELPERS ---

def _json_body():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return None, (jsonify({"error": "Corpo JSON inválido"}), 400)
    return data, None

def _missing_fields(data, required):
    return [field for field in required if not isinstance(data.get(field), str) or not data[field].strip()]


def _job_owner_key():
    current = _actor()
    if current:
        return f"user:{current['id']}"
    if 'anonymous_job_owner' not in session:
        session['anonymous_job_owner'] = secrets.token_urlsafe(24)
    return f"anonymous:{session['anonymous_job_owner']}"


def _public_job(row, reused=False):
    return {
        'id': row['id'], 'operation': row['operation'], 'status': row['status'],
        'topicId': row['topic_id'], 'error': ({'code': row['error_code'], 'message': row['error_message']} if row['error_code'] else None),
        'createdAt': row['created_at'], 'startedAt': row['started_at'], 'completedAt': row['completed_at'],
        'reused': reused,
    }


def _run_generation_job(job_id):
    conn = get_db_connection()
    claimed = conn.execute(
        "UPDATE generation_jobs SET status = 'running', started_at = ? WHERE id = ? AND status = 'queued'",
        (datetime.now().isoformat(), job_id)
    ).rowcount
    conn.commit()
    job = conn.execute("SELECT * FROM generation_jobs WHERE id = ?", (job_id,)).fetchone()
    if not claimed or not job:
        conn.close()
        return
    payload = json.loads(job['payload'])
    owner_key = job['owner_key']
    user = None
    if owner_key.startswith('user:'):
        user = conn.execute("SELECT * FROM users WHERE id = ?", (owner_key[5:],)).fetchone()
    conn.close()

    try:
        with app.test_client() as internal_client:
            if user:
                with internal_client.session_transaction() as worker_session:
                    worker_session['user_id'] = user['id']
                    worker_session['user_type'] = user['type']
                    worker_session['user_name'] = user['name']
                    worker_session['class_id'] = user['class_id']
            if job['operation'] == 'freetext':
                response = internal_client.post('/api/topics/freetext', json={'title': payload['title']})
            elif job['operation'] == 'generate':
                response = internal_client.post(f"/api/topics/{payload['topicId']}/generate")
            else:
                response = internal_client.post(f"/api/topics/{payload['topicId']}/regenerate?part={payload['part']}")
            result = response.get_json(silent=True) or {}
            if response.status_code not in (200, 201):
                message = result.get('error', 'Falha ao processar geração')
                raise RuntimeError(message if isinstance(message, str) else message.get('message', 'Falha ao processar geração'))
            topic_id = result.get('id') or payload.get('topicId')
        conn = get_db_connection()
        conn.execute(
            "UPDATE generation_jobs SET status = 'completed', topic_id = ?, completed_at = ?, error_code = NULL, error_message = NULL WHERE id = ?",
            (topic_id, datetime.now().isoformat(), job_id)
        )
        conn.commit(); conn.close()
    except Exception as exc:
        conn = get_db_connection()
        conn.execute(
            "UPDATE generation_jobs SET status = 'failed', error_code = 'GENERATION_FAILED', error_message = ?, completed_at = ? WHERE id = ?",
            (str(exc)[:500], datetime.now().isoformat(), job_id)
        )
        conn.commit(); conn.close()


def _dispatch_generation_job(job_id):
    if not app.config.get('TESTING'):
        generation_executor.submit(_run_generation_job, job_id)


def recover_generation_jobs():
    conn = get_db_connection()
    conn.execute("UPDATE generation_jobs SET status = 'queued', started_at = NULL WHERE status = 'running'")
    queued = [row['id'] for row in conn.execute("SELECT id FROM generation_jobs WHERE status = 'queued'").fetchall()]
    conn.commit(); conn.close()
    for job_id in queued:
        _dispatch_generation_job(job_id)

def _topic_detail(conn, topic_id):
    topic = conn.execute("SELECT * FROM topics WHERE id = ?", (topic_id,)).fetchone()
    if not topic:
        return None
    explanations = conn.execute("SELECT level, content FROM topic_explanations WHERE topic_id = ?", (topic_id,)).fetchall()
    learning_paths = conn.execute("SELECT level, content FROM topic_learning_paths WHERE topic_id = ?", (topic_id,)).fetchall()
    questions = conn.execute("SELECT * FROM quiz_questions WHERE topic_id = ? ORDER BY order_index", (topic_id,)).fetchall()
    videos = conn.execute("SELECT * FROM topic_videos WHERE topic_id = ? ORDER BY level, order_index", (topic_id,)).fetchall()

    exp_map = {e['level']: e['content'] for e in explanations}

    videos_by_level = {level: [] for level in EXPLANATION_LEVELS}
    for v in videos:
        vd = dict(v)
        vd['approved'] = bool(vd['approved'])
        videos_by_level.setdefault(v['level'], []).append(vd)

    q_list = []
    for q in questions:
        qd = dict(q)
        qd['options'] = json.loads(qd['options'])
        q_list.append(qd)

    result = dict(topic)
    result['explanations'] = exp_map
    result['learningPaths'] = {row['level']: json.loads(row['content']) for row in learning_paths}
    result['questions'] = q_list
    result['videos'] = videos_by_level
    return result

def _save_generated_content(conn, topic_id, content, target_grade, default_title, video_auto_approve=False):
    for level, text in content.get('explanations', {}).items():
        conn.execute(
            "INSERT INTO topic_explanations (id, topic_id, level, content, ai_generated) VALUES (?, ?, ?, ?, 1)",
            (str(uuid.uuid4()), topic_id, level, text)
        )

    for level, path in content.get('learningPaths', {}).items():
        conn.execute(
            "INSERT INTO topic_learning_paths (id, topic_id, level, content) VALUES (?, ?, ?, ?)",
            (str(uuid.uuid4()), topic_id, level, json.dumps(path, ensure_ascii=False))
        )

    for i, q in enumerate(content.get('questions', [])):
        conn.execute(
            "INSERT INTO quiz_questions (id, topic_id, question, options, correct_option, explanation, skill, difficulty, target_grade, order_index, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (str(uuid.uuid4()), topic_id, q['question'], json.dumps(q['options']), q['correctOption'],
             q.get('explanation'), q.get('skill', default_title), q.get('difficulty', 'medio'),
             target_grade, i, datetime.now().isoformat())
        )

    for level in EXPLANATION_LEVELS:
        try:
            candidates = search_videos_for_level(default_title, level)
        except Exception:
            candidates = []
        candidates_to_save = candidates[:1] if video_auto_approve else candidates
        for i, c in enumerate(candidates_to_save):
            conn.execute(
                "INSERT INTO topic_videos (id, topic_id, level, youtube_video_id, title, channel_title, duration_seconds, view_count, thumbnail_url, rank_score, approved, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (str(uuid.uuid4()), topic_id, level, c['youtube_video_id'], c['title'], c['channel_title'],
                 c['duration_seconds'], c['view_count'], c['thumbnail_url'], c['rank_score'],
                 1 if video_auto_approve else 0, i)
            )

# --- ROTAS ---

@app.route('/')
def home():
    return "Backend AISTUDYTEC Online 🚀", 200

@app.route('/api/login', methods=['POST'])
@limiter.limit("10 per minute")
def login():
    data, error = _json_body()
    if error:
        return error
    missing = _missing_fields(data, ('user', 'pass'))
    if missing:
        return jsonify({"error": "Usuário e senha são obrigatórios", "fields": missing}), 400
    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE username = ?", (data.get('user'),)).fetchone()

    if user and check_password_hash(user['password'], data.get('pass')):
        logged_actor = {'id': user['id'], 'type': user['type']}
        record_audit(conn, logged_actor, 'session.login', 'session', user['id'])
        conn.commit()
        conn.close()
        session.clear()
        session.permanent = True
        session['user_id'] = user['id']
        session['user_type'] = user['type']
        session['class_id'] = user['class_id']
        session['user_name'] = user['name']
        return jsonify({"message": "Sucesso", "user": _public_user(user)}), 200
    record_audit(conn, None, 'session.login', 'session', outcome='denied')
    conn.commit()
    conn.close()
    return jsonify({"error": "Credenciais inválidas"}), 401

@app.route('/api/session', methods=['GET'])
def get_session():
    actor = _actor()
    if not actor:
        return jsonify({"user": None}), 200
    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE id = ?", (actor['id'],)).fetchone()
    conn.close()
    if not user:
        session.clear()
        return jsonify({"user": None}), 200
    return jsonify({"user": _public_user(user)}), 200

@app.route('/api/logout', methods=['POST'])
def logout():
    current = _actor()
    if current:
        conn = get_db_connection()
        record_audit(conn, current, 'session.logout', 'session', current['id'])
        conn.commit()
        conn.close()
    session.clear()
    return jsonify({"message": "Sessão encerrada"}), 200

@app.route('/api/audit-events', methods=['GET'])
@_require_roles('master')
def list_audit_events():
    try:
        limit = min(max(int(request.args.get('limit', '50')), 1), 100)
    except ValueError:
        return jsonify({"error": "Limite inválido"}), 400
    action = request.args.get('action')
    resource_id = request.args.get('resourceId')
    query = "SELECT * FROM audit_events WHERE 1=1"
    params = []
    if action:
        query += " AND action = ?"
        params.append(action)
    if resource_id:
        query += " AND resource_id = ?"
        params.append(resource_id)
    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)
    conn = get_db_connection()
    rows = conn.execute(query, params).fetchall()
    conn.close()
    result = []
    for row in rows:
        item = dict(row)
        item['metadata'] = json.loads(item['metadata'] or '{}')
        result.append(item)
    return jsonify(result)

@app.route('/api/register', methods=['POST'])
def register():
    registering_actor = _actor()
    data, error = _json_body()
    if error:
        return error
    missing = _missing_fields(data, ('type', 'name'))
    if missing:
        return jsonify({"error": "Campos obrigatórios ausentes", "fields": missing}), 400
    if data['type'] not in ('student', 'teacher'):
        return jsonify({"error": "Tipo de usuário inválido"}), 400
    if data['type'] == 'teacher' and (_actor() or {}).get('type') != 'master':
        return jsonify({"error": "Somente o administrador pode cadastrar professores"}), 403
    if data.get('user') and not data.get('pass'):
        return jsonify({"error": "Senha obrigatória para usuário com login", "fields": ["pass"]}), 400
    conn = get_db_connection()

    # Verifica duplicidade
    if 'username' in data and conn.execute("SELECT * FROM users WHERE username = ?", (data['username'],)).fetchone():
        conn.close()
        return jsonify({"error": "Usuário já existe"}), 409

    # Verifica turma se for aluno
    class_id = None
    if data.get('type') == 'student' and data.get('classCode'):
        target_class = conn.execute("SELECT id FROM classes WHERE code = ?", (data['classCode'],)).fetchone()
        if not target_class:
            conn.close()
            return jsonify({"error": "Código da turma inválido"}), 404
        class_id = target_class['id']

    user_id = str(uuid.uuid4())
    hashed = generate_password_hash(data.get('pass', '')) if data.get('pass') else None

    try:
        conn.execute(
            "INSERT INTO users (id, type, name, email, phone, dob, username, password, class_id, grade_year) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (user_id, data['type'], data['name'], data.get('email'), data.get('phone'), data.get('dob'),
             data.get('user'), hashed, class_id, data.get('gradeYear'))
        )
        conn.commit()
        new_user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        audit_actor = registering_actor or {'id': new_user['id'], 'type': new_user['type']}
        record_audit(conn, audit_actor, 'user.create', 'user', user_id, metadata={'createdType': data['type']})
        conn.commit()
        conn.close()
        if data['type'] == 'student':
            session.clear()
            session.permanent = True
            session['user_id'] = new_user['id']
            session['user_type'] = new_user['type']
            session['class_id'] = new_user['class_id']
            session['user_name'] = new_user['name']
        return jsonify(_public_user(new_user)), 201
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 500

@app.route('/api/classes', methods=['POST', 'GET'])
@_require_roles('teacher', 'master')
def handle_classes():
    actor = _actor()
    conn = get_db_connection()
    if request.method == 'POST':
        data, error = _json_body()
        if error:
            conn.close()
            return error
        missing = _missing_fields(data, ('name',))
        if missing:
            conn.close()
            return jsonify({"error": "Campos obrigatórios ausentes", "fields": missing}), 400
        cid = str(uuid.uuid4())
        code = str(uuid.uuid4())[:6].upper()
        conn.execute("INSERT INTO classes (id, name, code, theme, teacher_id, created_at, grade_year) VALUES (?, ?, ?, ?, ?, ?, ?)",
                     (cid, data['name'], code, data.get('theme'), actor['id'], datetime.now().isoformat(), data.get('gradeYear', 'any')))
        record_audit(conn, actor, 'class.create', 'class', cid)
        conn.commit()
        conn.close()
        return jsonify({"id": cid, "code": code}), 201
    else:
        tid = request.args.get('teacherId') if actor['type'] == 'master' else actor['id']
        res = conn.execute("SELECT * FROM classes WHERE teacher_id = ?", (tid,)).fetchall() if tid else conn.execute("SELECT * FROM classes").fetchall()
        conn.close()
        return jsonify([dict(r) for r in res])

@app.route('/api/classes/<class_id>/students', methods=['GET'])
@_require_roles('teacher', 'master')
def class_students(class_id):
    conn = get_db_connection()
    if not _can_manage_class(conn, _actor(), class_id):
        conn.close()
        return jsonify({"error": "Acesso não autorizado"}), 403
    rows = conn.execute(
        "SELECT id, name, email, grade_year FROM users WHERE class_id = ? AND type = 'student'", (class_id,)
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route('/api/join-class', methods=['POST'])
def join_class():
    data, error = _json_body()
    if error:
        return error
    code = data.get('code', '').strip().upper()
    if not code:
        return jsonify({"error": "Código da turma obrigatório", "fields": ["code"]}), 400
    conn = get_db_connection()
    cls = conn.execute("SELECT * FROM classes WHERE code = ?", (code,)).fetchone()
    conn.close()
    if cls: return jsonify(dict(cls)), 200
    return jsonify({"error": "Turma não encontrada"}), 404

@app.route('/api/history', methods=['POST', 'GET'])
def handle_history():
    conn = get_db_connection()
    if request.method == 'POST':
        d, error = _json_body()
        if error:
            conn.close()
            return error
        missing = _missing_fields(d, ('type',))
        if missing:
            conn.close()
            return jsonify({"error": "Tipo de histórico obrigatório", "fields": missing}), 400
        actor = _actor()
        if not actor:
            conn.close()
            return jsonify({"error": "Autenticação obrigatória"}), 401
        if d.get('userId') and d.get('userId') != actor['id'] and actor['type'] != 'master':
            conn.close()
            return jsonify({"error": "Acesso não autorizado"}), 403
        conn.execute(
            "INSERT INTO history (id, type, user_id, student_name_snapshot, theme, score, total, percentage, date, details, topic_id, class_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (str(uuid.uuid4()), d['type'], d.get('userId'), d.get('studentName'), d.get('theme'), d.get('score'),
             d.get('total'), d.get('percentage'), datetime.now().strftime("%d/%m/%Y %H:%M"), d.get('details'),
             d.get('topicId'), d.get('classId'))
        )
        conn.commit()
        conn.close()
        return jsonify({"msg": "Salvo"}), 201
    else:
        uid = request.args.get('userId')
        class_id = request.args.get('classId')
        actor = _actor()
        if not actor:
            conn.close()
            return jsonify({"error": "Autenticação obrigatória"}), 401
        if uid and actor['type'] != 'master' and uid != actor['id']:
            conn.close()
            return jsonify({"error": "Acesso não autorizado"}), 403
        if class_id and actor['type'] != 'master' and not (
            actor['type'] == 'teacher' and _can_manage_class(conn, actor, class_id)
        ):
            conn.close()
            return jsonify({"error": "Acesso não autorizado"}), 403
        if not uid and not class_id and actor['type'] != 'master':
            conn.close()
            return jsonify({"error": "Filtro de histórico obrigatório"}), 400
        query = "SELECT * FROM history WHERE 1=1"
        params = []
        if uid:
            query += " AND user_id = ?"
            params.append(uid)
        if class_id:
            query += " AND class_id = ?"
            params.append(class_id)
        query += " ORDER BY date DESC"
        res = conn.execute(query, params).fetchall()
        conn.close()
        return jsonify([dict(r) for r in res])

# --- TÓPICOS (professor cura, IA gera, professor revisa e publica) ---

@app.route('/api/topics', methods=['POST', 'GET'])
def handle_topics():
    conn = get_db_connection()
    if request.method == 'POST':
        actor = _actor()
        if not actor:
            conn.close()
            return jsonify({"error": "Autenticação obrigatória"}), 401
        if actor['type'] not in ('teacher', 'master'):
            conn.close()
            return jsonify({"error": "Acesso não autorizado"}), 403
        d, error = _json_body()
        if error:
            conn.close()
            return error
        missing = _missing_fields(d, ('title', 'classId'))
        if missing:
            conn.close()
            return jsonify({"error": "Campos obrigatórios ausentes", "fields": missing}), 400
        target_grade = d.get('targetGrade', 'any')
        if target_grade not in GRADE_YEARS:
            conn.close()
            return jsonify({"error": "Ano escolar inválido", "fields": ["targetGrade"]}), 400
        if not _can_manage_class(conn, actor, d['classId']):
            conn.close()
            return jsonify({"error": "Acesso não autorizado"}), 403
        tid = str(uuid.uuid4())
        conn.execute(
            "INSERT INTO topics (id, class_id, teacher_id, student_id, title, origin, target_grade, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (tid, d['classId'], actor['id'], None, d['title'].strip(), 'teacher',
             target_grade, 'draft', datetime.now().isoformat())
        )
        record_audit(conn, actor, 'topic.create', 'topic', tid, metadata={'classId': d['classId']})
        conn.commit()
        conn.close()
        return jsonify({"id": tid, "status": "draft"}), 201
    else:
        actor = _actor()
        class_id = request.args.get('classId')
        status = request.args.get('status')
        student_id = actor['id'] if actor and actor['type'] == 'student' else None

        query = "SELECT * FROM topics WHERE 1=1"
        params = []
        if not actor:
            query += " AND origin = 'teacher' AND status = 'published'"
        elif actor['type'] == 'student':
            query += " AND ((origin = 'teacher' AND status = 'published' AND class_id = ?) OR (origin = 'student' AND student_id = ?))"
            params.extend([actor['class_id'], actor['id']])
        elif actor['type'] == 'teacher':
            query += " AND teacher_id = ?"
            params.append(actor['id'])
        if class_id:
            if actor and actor['type'] == 'teacher' and not _can_manage_class(conn, actor, class_id):
                conn.close()
                return jsonify({"error": "Acesso não autorizado"}), 403
            query += " AND class_id = ?"
            params.append(class_id)
        if status:
            query += " AND status = ?"
            params.append(status)
        query += " ORDER BY created_at DESC"
        rows = conn.execute(query, params).fetchall()
        results = [dict(r) for r in rows]

        if student_id:
            existing_ids = {r['id'] for r in results}
            own = conn.execute(
                "SELECT * FROM topics WHERE origin = 'student' AND student_id = ? ORDER BY created_at DESC", (student_id,)
            ).fetchall()
            for r in own:
                if r['id'] not in existing_ids:
                    results.append(dict(r))

        conn.close()
        return jsonify(results)

@app.route('/api/topics/<topic_id>', methods=['GET', 'PATCH'])
def topic_detail(topic_id):
    conn = get_db_connection()
    if request.method == 'PATCH':
        _topic, access_error = _owned_topic_or_error(conn, topic_id)
        if access_error:
            conn.close()
            return access_error
        d, error = _json_body()
        if error:
            conn.close()
            return error
        fields, params = [], []
        if 'title' in d:
            if not isinstance(d['title'], str) or not d['title'].strip():
                conn.close()
                return jsonify({"error": "Título obrigatório", "fields": ["title"]}), 400
            fields.append("title = ?"); params.append(d['title'].strip())
        if 'targetGrade' in d:
            if d['targetGrade'] not in GRADE_YEARS:
                conn.close()
                return jsonify({"error": "Ano escolar inválido", "fields": ["targetGrade"]}), 400
            fields.append("target_grade = ?"); params.append(d['targetGrade'])
        if not fields:
            conn.close()
            return jsonify({"error": "Nenhum campo válido para atualizar"}), 400
        if fields:
            params.append(topic_id)
            conn.execute(f"UPDATE topics SET {', '.join(fields)} WHERE id = ?", params)
            record_audit(conn, _actor(), 'topic.update', 'topic', topic_id, metadata={'fields': sorted(d.keys())})
            conn.commit()

    topic = conn.execute("SELECT * FROM topics WHERE id = ?", (topic_id,)).fetchone()
    if topic and not _can_read_topic(conn, _actor(), topic):
        conn.close()
        return jsonify({"error": "Acesso não autorizado"}), 403
    detail = _topic_detail(conn, topic_id)
    conn.close()
    if not detail:
        return jsonify({"error": "Tópico não encontrado"}), 404
    return jsonify(detail)

@app.route('/api/generation-jobs', methods=['POST'])
@limiter.limit("10 per minute")
def create_generation_job():
    data, error = _json_body()
    if error:
        return error
    operation = data.get('operation')
    if operation not in ('freetext', 'generate', 'regenerate'):
        return jsonify({'error': 'Operação de geração inválida'}), 400
    if operation == 'freetext' and (not isinstance(data.get('title'), str) or not data['title'].strip()):
        return jsonify({'error': 'Tema obrigatório'}), 400
    if operation in ('generate', 'regenerate') and (not isinstance(data.get('topicId'), str) or not data['topicId'].strip()):
        return jsonify({'error': 'Tópico obrigatório'}), 400
    if operation == 'regenerate' and data.get('part', 'all') not in ('all', 'explanations', 'questions', 'videos'):
        return jsonify({'error': 'Parte inválida para regeneração'}), 400

    idempotency_key = request.headers.get('Idempotency-Key', '').strip()
    if not idempotency_key or len(idempotency_key) > 128:
        return jsonify({'error': 'Idempotency-Key obrigatório e limitado a 128 caracteres'}), 400
    normalized = {
        'operation': operation,
        'title': data.get('title', '').strip(),
        'topicId': data.get('topicId', '').strip(),
        'part': data.get('part', 'all'),
    }
    request_hash = hashlib.sha256(json.dumps(normalized, sort_keys=True, ensure_ascii=False).encode('utf-8')).hexdigest()
    owner_key = _job_owner_key()
    conn = get_db_connection()
    existing = conn.execute(
        "SELECT * FROM generation_jobs WHERE owner_key = ? AND operation = ? AND idempotency_key = ?",
        (owner_key, operation, idempotency_key)
    ).fetchone()
    if existing:
        conn.close()
        if existing['request_hash'] != request_hash:
            return jsonify({'error': 'Idempotency-Key já utilizada com outra solicitação'}), 409
        return jsonify(_public_job(existing, reused=True)), 202

    job_id = str(uuid.uuid4())
    now = datetime.now().isoformat()
    conn.execute(
        "INSERT INTO generation_jobs (id, owner_key, operation, idempotency_key, request_hash, payload, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'queued', ?)",
        (job_id, owner_key, operation, idempotency_key, request_hash, json.dumps(normalized, ensure_ascii=False), now)
    )
    conn.commit()
    row = conn.execute("SELECT * FROM generation_jobs WHERE id = ?", (job_id,)).fetchone()
    conn.close()
    _dispatch_generation_job(job_id)
    return jsonify(_public_job(row)), 202


@app.route('/api/generation-jobs/<job_id>', methods=['GET'])
def get_generation_job(job_id):
    conn = get_db_connection()
    row = conn.execute("SELECT * FROM generation_jobs WHERE id = ?", (job_id,)).fetchone()
    conn.close()
    if not row:
        return jsonify({'error': 'Job de geração não encontrado'}), 404
    current = _actor()
    if row['owner_key'] != _job_owner_key() and not (current and current['type'] == 'master'):
        return jsonify({'error': 'Acesso não autorizado'}), 403
    return jsonify(_public_job(row)), 200


@app.route('/api/topics/<topic_id>/generate', methods=['POST'])
@limiter.limit("5 per minute")
def generate_topic(topic_id):
    conn = get_db_connection()
    topic, access_error = _owned_topic_or_error(conn, topic_id)
    if access_error:
        conn.close()
        return access_error

    try:
        content = generate_topic_content(topic['title'], topic['target_grade'])
    except Exception as e:
        conn.close()
        return jsonify({"error": f"Falha ao gerar conteúdo com IA: {e}"}), 502

    conn.execute("DELETE FROM topic_explanations WHERE topic_id = ?", (topic_id,))
    conn.execute("DELETE FROM topic_learning_paths WHERE topic_id = ?", (topic_id,))
    conn.execute("DELETE FROM quiz_questions WHERE topic_id = ?", (topic_id,))
    conn.execute("DELETE FROM topic_videos WHERE topic_id = ?", (topic_id,))

    _save_generated_content(conn, topic_id, content, topic['target_grade'], topic['title'], video_auto_approve=False)

    conn.execute("UPDATE topics SET status = 'generated' WHERE id = ?", (topic_id,))
    conn.commit()
    detail = _topic_detail(conn, topic_id)
    conn.close()
    return jsonify(detail), 200

@app.route('/api/topics/<topic_id>/regenerate', methods=['POST'])
@limiter.limit("5 per minute")
def regenerate_topic(topic_id):
    part = request.args.get('part', 'all')
    if part not in ('all', 'explanations', 'questions', 'videos'):
        return jsonify({"error": "Parte inválida para regeneração"}), 400
    conn = get_db_connection()
    topic, access_error = _owned_topic_or_error(conn, topic_id)
    if access_error:
        conn.close()
        return access_error

    if part in ('all', 'explanations', 'questions'):
        try:
            content = generate_topic_content(topic['title'], topic['target_grade'])
        except Exception as e:
            conn.close()
            return jsonify({"error": f"Falha ao gerar conteúdo com IA: {e}"}), 502

        if part in ('all', 'explanations'):
            conn.execute("DELETE FROM topic_explanations WHERE topic_id = ?", (topic_id,))
            conn.execute("DELETE FROM topic_learning_paths WHERE topic_id = ?", (topic_id,))
            for level, text in content.get('explanations', {}).items():
                conn.execute(
                    "INSERT INTO topic_explanations (id, topic_id, level, content, ai_generated) VALUES (?, ?, ?, ?, 1)",
                    (str(uuid.uuid4()), topic_id, level, text)
                )
            for level, path in content.get('learningPaths', {}).items():
                conn.execute(
                    "INSERT INTO topic_learning_paths (id, topic_id, level, content) VALUES (?, ?, ?, ?)",
                    (str(uuid.uuid4()), topic_id, level, json.dumps(path, ensure_ascii=False))
                )

        if part in ('all', 'questions'):
            conn.execute("DELETE FROM quiz_questions WHERE topic_id = ?", (topic_id,))
            for i, q in enumerate(content.get('questions', [])):
                conn.execute(
                    "INSERT INTO quiz_questions (id, topic_id, question, options, correct_option, explanation, skill, difficulty, target_grade, order_index, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (str(uuid.uuid4()), topic_id, q['question'], json.dumps(q['options']), q['correctOption'],
                     q.get('explanation'), q.get('skill', topic['title']), q.get('difficulty', 'medio'),
                     topic['target_grade'], i, datetime.now().isoformat())
                )

    if part in ('all', 'videos'):
        conn.execute("DELETE FROM topic_videos WHERE topic_id = ?", (topic_id,))
        for level in EXPLANATION_LEVELS:
            try:
                candidates = search_videos_for_level(topic['title'], level)
            except Exception:
                candidates = []
            for i, c in enumerate(candidates):
                conn.execute(
                    "INSERT INTO topic_videos (id, topic_id, level, youtube_video_id, title, channel_title, duration_seconds, view_count, thumbnail_url, rank_score, approved, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)",
                    (str(uuid.uuid4()), topic_id, level, c['youtube_video_id'], c['title'], c['channel_title'],
                     c['duration_seconds'], c['view_count'], c['thumbnail_url'], c['rank_score'], i)
                )

    conn.commit()
    detail = _topic_detail(conn, topic_id)
    conn.close()
    return jsonify(detail), 200

@app.route('/api/topics/<topic_id>/explanations/<level>', methods=['PATCH'])
def update_explanation(topic_id, level):
    if level not in EXPLANATION_LEVELS:
        return jsonify({"error": "Nível de explicação inválido"}), 400
    data, error = _json_body()
    if error:
        return error
    content = data.get('content')
    if not isinstance(content, str):
        return jsonify({"error": "Conteúdo deve ser texto", "fields": ["content"]}), 400
    conn = get_db_connection()
    _topic, access_error = _owned_topic_or_error(conn, topic_id)
    if access_error:
        conn.close()
        return access_error
    existing = conn.execute(
        "SELECT id FROM topic_explanations WHERE topic_id = ? AND level = ?", (topic_id, level)
    ).fetchone()
    if existing:
        conn.execute("UPDATE topic_explanations SET content = ?, ai_generated = 0 WHERE id = ?", (content, existing['id']))
    else:
        conn.execute(
            "INSERT INTO topic_explanations (id, topic_id, level, content, ai_generated) VALUES (?, ?, ?, ?, 0)",
            (str(uuid.uuid4()), topic_id, level, content)
        )
    conn.commit()
    conn.close()
    return jsonify({"msg": "Atualizado"}), 200

@app.route('/api/topics/<topic_id>/questions/<question_id>', methods=['PATCH', 'DELETE'])
def modify_question(topic_id, question_id):
    conn = get_db_connection()
    _topic, access_error = _owned_topic_or_error(conn, topic_id)
    if access_error:
        conn.close()
        return access_error
    if request.method == 'DELETE':
        conn.execute("DELETE FROM quiz_questions WHERE id = ? AND topic_id = ?", (question_id, topic_id))
        record_audit(conn, _actor(), 'question.delete', 'question', question_id, metadata={'topicId': topic_id})
        conn.commit()
        conn.close()
        return jsonify({"msg": "Removida"}), 200

    d, error = _json_body()
    if error:
        conn.close()
        return error
    question = conn.execute(
        "SELECT * FROM quiz_questions WHERE id = ? AND topic_id = ?", (question_id, topic_id)
    ).fetchone()
    if not question:
        conn.close()
        return jsonify({"error": "Questão não encontrada"}), 404
    if 'difficulty' in d and d['difficulty'] not in DIFFICULTIES:
        conn.close()
        return jsonify({"error": "Dificuldade inválida", "fields": ["difficulty"]}), 400
    if 'options' in d and (not isinstance(d['options'], list) or len(d['options']) < 2 or
                           not all(isinstance(option, str) and option.strip() for option in d['options'])):
        conn.close()
        return jsonify({"error": "Opções inválidas", "fields": ["options"]}), 400
    fields, params = [], []
    mapping = {'question': 'question', 'correctOption': 'correct_option', 'explanation': 'explanation',
               'skill': 'skill', 'difficulty': 'difficulty'}
    for key, col in mapping.items():
        if key in d:
            fields.append(f"{col} = ?"); params.append(d[key])
    if 'options' in d:
        fields.append("options = ?"); params.append(json.dumps(d['options']))
    if not fields:
        conn.close()
        return jsonify({"error": "Nenhum campo válido para atualizar"}), 400
    params.extend([question_id, topic_id])
    conn.execute(f"UPDATE quiz_questions SET {', '.join(fields)} WHERE id = ? AND topic_id = ?", params)
    conn.commit()
    conn.close()
    return jsonify({"msg": "Atualizada"}), 200

@app.route('/api/topics/<topic_id>/videos/<video_id>', methods=['PATCH'])
def approve_video(topic_id, video_id):
    d, error = _json_body()
    if error:
        return error
    if not isinstance(d.get('approved'), bool):
        return jsonify({"error": "O campo approved deve ser booleano", "fields": ["approved"]}), 400
    conn = get_db_connection()
    _topic, access_error = _owned_topic_or_error(conn, topic_id)
    if access_error:
        conn.close()
        return access_error
    video = conn.execute("SELECT * FROM topic_videos WHERE id = ? AND topic_id = ?", (video_id, topic_id)).fetchone()
    if not video:
        conn.close()
        return jsonify({"error": "Vídeo não encontrado"}), 404

    if d.get('approved'):
        conn.execute("UPDATE topic_videos SET approved = 0 WHERE topic_id = ? AND level = ?", (topic_id, video['level']))
        conn.execute("UPDATE topic_videos SET approved = 1 WHERE id = ?", (video_id,))
    else:
        conn.execute("UPDATE topic_videos SET approved = 0 WHERE id = ?", (video_id,))
    conn.commit()
    conn.close()
    return jsonify({"msg": "Atualizado"}), 200

@app.route('/api/topics/<topic_id>/publish', methods=['POST'])
def publish_topic(topic_id):
    conn = get_db_connection()
    _topic, access_error = _owned_topic_or_error(conn, topic_id)
    if access_error:
        conn.close()
        return access_error
    detail = _topic_detail(conn, topic_id)
    if not detail:
        conn.close()
        return jsonify({"error": "Tópico não encontrado"}), 404

    missing = []
    for level in EXPLANATION_LEVELS:
        if not detail['explanations'].get(level):
            missing.append(f"explicação nível '{level}'")

    valid_questions = [q for q in detail['questions'] if q.get('skill') and q.get('correct_option')]
    if len(valid_questions) < PUBLISH_MIN_QUESTIONS:
        missing.append(f"pelo menos {PUBLISH_MIN_QUESTIONS} questões com habilidade e resposta certa definidas")

    for level in EXPLANATION_LEVELS:
        if not any(v['approved'] for v in detail['videos'].get(level, [])):
            missing.append(f"vídeo aprovado no nível '{level}'")

    if missing:
        conn.close()
        return jsonify({"error": "Tópico incompleto para publicação", "missing": missing}), 400

    conn.execute("UPDATE topics SET status = 'published', published_at = ? WHERE id = ?",
                 (datetime.now().isoformat(), topic_id))
    record_audit(conn, _actor(), 'topic.publish', 'topic', topic_id)
    conn.commit()
    conn.close()
    return jsonify({"msg": "Publicado"}), 200

@app.route('/api/topics/freetext', methods=['POST'])
@limiter.limit("5 per minute")
def freetext_topic():
    d, error = _json_body()
    if error:
        return error
    title = d.get('title')
    actor = _actor()
    student_id = actor['id'] if actor and actor['type'] == 'student' else None
    class_id = actor['class_id'] if actor and actor['type'] == 'student' else None
    if not isinstance(title, str) or not title.strip():
        return jsonify({"error": "Tema obrigatório"}), 400
    title = title.strip()

    conn = get_db_connection()
    grade = 'any'
    if student_id:
        student = conn.execute("SELECT grade_year FROM users WHERE id = ?", (student_id,)).fetchone()
        if student and student['grade_year']:
            grade = student['grade_year']

    tid = str(uuid.uuid4())
    conn.execute(
        "INSERT INTO topics (id, class_id, teacher_id, student_id, title, origin, target_grade, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (tid, class_id, None, student_id, title, 'student', grade, 'draft', datetime.now().isoformat())
    )
    conn.commit()

    try:
        content = generate_topic_content(title, grade)
    except Exception as e:
        conn.close()
        return jsonify({"error": f"Falha ao gerar conteúdo com IA: {e}"}), 502

    # Sem gate de professor para tema livre: aprova automaticamente o melhor vídeo por nível
    _save_generated_content(conn, tid, content, grade, title, video_auto_approve=True)

    conn.execute("UPDATE topics SET status = 'generated' WHERE id = ?", (tid,))
    conn.commit()
    detail = _topic_detail(conn, tid)
    conn.close()
    return jsonify(detail), 201

# --- QUIZ: submissão com feedback por pergunta, habilidades e revisão espaçada ---

@app.route('/api/quiz-attempts', methods=['POST'])
def submit_quiz_attempt():
    d, error = _json_body()
    if error:
        return error
    topic_id = d.get('topicId')
    answers = d.get('answers', [])
    user_id = d.get('userId')
    student_name = d.get('studentName')
    class_id = d.get('classId')

    actor = _actor()
    if user_id and (not actor or (actor['id'] != user_id and actor['type'] != 'master')):
        return jsonify({"error": "Não é permitido registrar tentativa para outro usuário"}), 403

    if not isinstance(topic_id, str) or not topic_id.strip():
        return jsonify({"error": "Tópico obrigatório", "fields": ["topicId"]}), 400
    if not isinstance(answers, list) or not answers:
        return jsonify({"error": "Envie ao menos uma resposta", "fields": ["answers"]}), 400
    if not all(isinstance(answer, dict) and isinstance(answer.get('questionId'), str) and
               isinstance(answer.get('selectedOption'), str) for answer in answers):
        return jsonify({"error": "Formato de respostas inválido", "fields": ["answers"]}), 400
    question_ids = [answer['questionId'] for answer in answers]
    if len(question_ids) != len(set(question_ids)):
        return jsonify({"error": "Cada questão pode ser respondida apenas uma vez", "fields": ["answers"]}), 400

    conn = get_db_connection()
    topic = conn.execute("SELECT * FROM topics WHERE id = ?", (topic_id,)).fetchone()
    if not topic:
        conn.close()
        return jsonify({"error": "Tópico não encontrado"}), 404
    if topic['origin'] == 'student' and topic['student_id'] is None and actor and actor['type'] == 'student':
        conn.execute(
            "UPDATE topics SET student_id = ?, class_id = ? WHERE id = ? AND student_id IS NULL",
            (actor['id'], actor['class_id'], topic_id)
        )
        topic = conn.execute("SELECT * FROM topics WHERE id = ?", (topic_id,)).fetchone()
    if not _can_read_topic(conn, actor, topic):
        conn.close()
        return jsonify({"error": "Acesso não autorizado"}), 403
    questions = conn.execute("SELECT * FROM quiz_questions WHERE topic_id = ?", (topic_id,)).fetchall()
    q_by_id = {q['id']: q for q in questions}
    unknown_question_ids = [question_id for question_id in question_ids if question_id not in q_by_id]
    if unknown_question_ids:
        conn.close()
        return jsonify({"error": "Uma ou mais questões não pertencem ao tópico", "fields": ["answers"]}), 400

    score = 0
    total = 0
    graded = []
    for a in answers:
        q = q_by_id.get(a.get('questionId'))
        if not q:
            continue
        total += 1
        is_correct = 1 if a.get('selectedOption') == q['correct_option'] else 0
        score += is_correct
        graded.append({
            'question_id': q['id'], 'skill': q['skill'],
            'selected_option': a.get('selectedOption'), 'correct_option': q['correct_option'],
            'is_correct': is_correct,
        })

    percentage = round((score / total) * 100) if total else 0
    history_id = str(uuid.uuid4())
    now = datetime.now()

    conn.execute(
        "INSERT INTO history (id, type, user_id, student_name_snapshot, theme, score, total, percentage, date, details, topic_id, class_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (history_id, 'quiz', user_id, student_name, topic['title'] if topic else None, score, total,
         percentage, now.strftime("%d/%m/%Y %H:%M"), None, topic_id, class_id)
    )

    for g in graded:
        conn.execute(
            "INSERT INTO quiz_attempt_answers (id, history_id, question_id, skill, selected_option, correct_option, is_correct, answered_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (str(uuid.uuid4()), history_id, g['question_id'], g['skill'], g['selected_option'],
             g['correct_option'], g['is_correct'], now.isoformat())
        )
        if user_id:
            conn.execute("""
                INSERT INTO skill_mastery (id, user_id, skill, topic_id, correct_count, total_count, mastery_pct, last_practiced_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(user_id, skill) DO UPDATE SET
                    correct_count = correct_count + excluded.correct_count,
                    total_count = total_count + excluded.total_count,
                    mastery_pct = CAST(ROUND(100.0 * (correct_count + excluded.correct_count) / (total_count + excluded.total_count)) AS INTEGER),
                    topic_id = excluded.topic_id,
                    last_practiced_at = excluded.last_practiced_at
            """, (str(uuid.uuid4()), user_id, g['skill'], topic_id, g['is_correct'], 1,
                  g['is_correct'] * 100, now.isoformat()))

    weak_skills = []
    completed_reviews = []
    skill_results = []
    if user_id:
        mastery_rows = conn.execute(
            "SELECT skill, mastery_pct FROM skill_mastery WHERE user_id = ?", (user_id,)
        ).fetchall()
        mastery_by_skill = {r['skill']: r['mastery_pct'] for r in mastery_rows}
        for skill in {g['skill'] for g in graded}:
            attempt_correct = sum(g['is_correct'] for g in graded if g['skill'] == skill)
            attempt_total = sum(1 for g in graded if g['skill'] == skill)
            skill_results.append({
                "skill": skill,
                "correct": attempt_correct,
                "total": attempt_total,
                "percentage": round(100 * attempt_correct / attempt_total) if attempt_total else 0,
                "masteryPct": mastery_by_skill.get(skill, 0),
                "status": "mastered" if mastery_by_skill.get(skill, 0) >= MASTERY_THRESHOLD_PCT else "reforcar",
            })

            pending_reviews = conn.execute(
                "SELECT id FROM review_queue WHERE user_id = ? AND skill = ? AND status = 'pending'",
                (user_id, skill)
            ).fetchall()
            if pending_reviews:
                conn.execute(
                    "UPDATE review_queue SET status = 'completed', resolved_at = ? "
                    "WHERE user_id = ? AND skill = ? AND status = 'pending'",
                    (now.isoformat(), user_id, skill)
                )
                completed_reviews.append(skill)

            if mastery_by_skill.get(skill, 100) < MASTERY_THRESHOLD_PCT:
                existing = conn.execute(
                    "SELECT id FROM review_queue WHERE user_id = ? AND skill = ? AND status = 'pending'",
                    (user_id, skill)
                ).fetchone()
                if not existing:
                    due = (now + timedelta(days=REVIEW_INTERVAL_DAYS)).strftime('%Y-%m-%d')
                    conn.execute(
                        "INSERT INTO review_queue (id, user_id, topic_id, skill, due_date, status, created_at) VALUES (?, ?, ?, ?, ?, 'pending', ?)",
                        (str(uuid.uuid4()), user_id, topic_id, skill, due, now.isoformat())
                    )
                weak_skills.append(skill)

    conn.commit()
    conn.close()
    return jsonify({"historyId": history_id, "score": score, "total": total,
                     "percentage": percentage, "weakSkills": weak_skills,
                     "skillResults": sorted(skill_results, key=lambda item: item['skill']),
                     "completedReviews": sorted(completed_reviews)}), 201

# --- PROGRESSO DO ALUNO ---

@app.route('/api/skill-mastery', methods=['GET'])
@_require_roles('student', 'master')
def get_skill_mastery():
    uid = request.args.get('userId')
    if not uid:
        return jsonify({"error": "Usuário obrigatório"}), 400
    actor = _actor()
    if actor['type'] != 'master' and uid != actor['id']:
        return jsonify({"error": "Acesso não autorizado"}), 403
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM skill_mastery WHERE user_id = ? ORDER BY mastery_pct ASC", (uid,)).fetchall()
    conn.close()
    result = []
    for r in rows:
        rd = dict(r)
        rd['status'] = 'mastered' if rd['mastery_pct'] >= MASTERY_THRESHOLD_PCT else 'reforcar'
        result.append(rd)
    return jsonify(result)

@app.route('/api/review-queue', methods=['GET'])
@_require_roles('student', 'master')
def get_review_queue():
    uid = request.args.get('userId')
    if not uid:
        return jsonify({"error": "Usuário obrigatório"}), 400
    actor = _actor()
    if actor['type'] != 'master' and uid != actor['id']:
        return jsonify({"error": "Acesso não autorizado"}), 403
    due_only = request.args.get('due') == 'today'
    conn = get_db_connection()
    query = ("SELECT rq.*, t.title as topic_title FROM review_queue rq "
             "LEFT JOIN topics t ON t.id = rq.topic_id WHERE rq.user_id = ? AND rq.status = 'pending'")
    params = [uid]
    if due_only:
        query += " AND rq.due_date <= ?"
        params.append(datetime.now().strftime('%Y-%m-%d'))
    query += " ORDER BY rq.due_date ASC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

# --- DASHBOARD DO PROFESSOR ---

@app.route('/api/dashboard/class/<class_id>', methods=['GET'])
@_require_roles('teacher', 'master')
def class_dashboard(class_id):
    conn = get_db_connection()
    if not _can_manage_class(conn, _actor(), class_id):
        conn.close()
        return jsonify({"error": "Acesso não autorizado"}), 403
    students = conn.execute(
        "SELECT id, name FROM users WHERE class_id = ? AND type = 'student'", (class_id,)
    ).fetchall()

    result = []
    today = datetime.now().strftime('%Y-%m-%d')
    for s in students:
        attempts = conn.execute(
            "SELECT * FROM history WHERE user_id = ? AND class_id = ?", (s['id'], class_id)
        ).fetchall()
        avg_pct = round(sum((a['percentage'] or 0) for a in attempts) / len(attempts)) if attempts else 0
        skills = conn.execute(
            "SELECT skill, mastery_pct, total_count, last_practiced_at FROM skill_mastery WHERE user_id = ? ORDER BY mastery_pct ASC",
            (s['id'],)
        ).fetchall()
        skill_list = [
            {"skill": sk['skill'], "masteryPct": sk['mastery_pct'],
             "totalCount": sk['total_count'], "lastPracticedAt": sk['last_practiced_at'],
             "status": "mastered" if sk['mastery_pct'] >= MASTERY_THRESHOLD_PCT else "reforcar"}
            for sk in skills
        ]
        due_reviews = conn.execute(
            "SELECT rq.id, rq.skill, rq.topic_id, rq.due_date, t.title AS topic_title "
            "FROM review_queue rq LEFT JOIN topics t ON t.id = rq.topic_id "
            "WHERE rq.user_id = ? AND rq.status = 'pending' AND rq.due_date <= ? ORDER BY rq.due_date",
            (s['id'], today)
        ).fetchall()
        last_practiced_at = max(
            (sk['last_practiced_at'] for sk in skills if sk['last_practiced_at']),
            default=None
        )
        result.append({"userId": s['id'], "name": s['name'], "attempts": len(attempts),
                        "avgPercentage": avg_pct, "lastPracticedAt": last_practiced_at,
                        "dueReviews": [dict(review) for review in due_reviews], "skills": skill_list})

    conn.close()
    return jsonify({
        "students": result,
        "summary": {
            "students": len(result),
            "withoutAttempts": sum(1 for student in result if student['attempts'] == 0),
            "dueReviews": sum(len(student['dueReviews']) for student in result),
            "skillsToReinforce": sum(
                1 for student in result for skill in student['skills'] if skill['status'] == 'reforcar'
            ),
        }
    })

if __name__ == '__main__':
    init_db()
    recover_generation_jobs()
    # Porta 5000 é padrão Flask
    app.run(host='0.0.0.0', port=5000)
