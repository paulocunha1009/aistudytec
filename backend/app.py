import sqlite3
import uuid
import os
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app) # Permite conexão com o React

DB_NAME = "aistudytec.db"

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

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

    # Master User
    cursor.execute("SELECT * FROM users WHERE type = 'master'")
    if not cursor.fetchone():
        master_id = str(uuid.uuid4())
        hashed_pw = generate_password_hash("AGzzcso1$")
        cursor.execute(
            "INSERT INTO users (id, type, name, username, password) VALUES (?, ?, ?, ?, ?)",
            (master_id, 'master', 'Administrador Master', 'Master', hashed_pw)
        )
        print("✅ Usuário Master criado (Senha: AGzzcso1$)")

    conn.commit()
    conn.close()

# --- ROTAS ---

@app.route('/')
def home():
    return "Backend AISTUDYTEC Online 🚀", 200

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE username = ?", (data.get('user'),)).fetchone()
    conn.close()
    
    if user and check_password_hash(user['password'], data.get('pass')):
        return jsonify({"message": "Sucesso", "user": dict(user)}), 200
    return jsonify({"error": "Credenciais inválidas"}), 401

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    conn = get_db_connection()
    
    # Verifica duplicidade
    if 'username' in data and conn.execute("SELECT * FROM users WHERE username = ?", (data['username'],)).fetchone():
        conn.close()
        return jsonify({"error": "Usuário já existe"}), 409

    # Verifica turma se for aluno
    class_id = None
    if data['type'] == 'student' and 'classCode' in data:
        target_class = conn.execute("SELECT id FROM classes WHERE code = ?", (data['classCode'],)).fetchone()
        if not target_class:
            conn.close()
            return jsonify({"error": "Código da turma inválido"}), 404
        class_id = target_class['id']

    user_id = str(uuid.uuid4())
    hashed = generate_password_hash(data.get('pass', '')) if data.get('pass') else None
    
    try:
        conn.execute(
            "INSERT INTO users (id, type, name, email, phone, dob, username, password, class_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (user_id, data['type'], data['name'], data.get('email'), data.get('phone'), data.get('dob'), data.get('user'), hashed, class_id)
        )
        conn.commit()
        new_user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        conn.close()
        return jsonify(dict(new_user)), 201
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 500

@app.route('/api/classes', methods=['POST', 'GET'])
def handle_classes():
    conn = get_db_connection()
    if request.method == 'POST':
        data = request.json
        cid = str(uuid.uuid4())
        code = str(uuid.uuid4())[:6].upper()
        conn.execute("INSERT INTO classes (id, name, code, theme, teacher_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                     (cid, data['name'], code, data.get('theme'), data['teacherId'], datetime.now().isoformat()))
        conn.commit()
        conn.close()
        return jsonify({"id": cid, "code": code}), 201
    else:
        tid = request.args.get('teacherId')
        res = conn.execute("SELECT * FROM classes WHERE teacher_id = ?", (tid,)).fetchall() if tid else conn.execute("SELECT * FROM classes").fetchall()
        conn.close()
        return jsonify([dict(r) for r in res])

@app.route('/api/join-class', methods=['POST'])
def join_class():
    code = request.json.get('code')
    conn = get_db_connection()
    cls = conn.execute("SELECT * FROM classes WHERE code = ?", (code,)).fetchone()
    conn.close()
    if cls: return jsonify(dict(cls)), 200
    return jsonify({"error": "Turma não encontrada"}), 404

@app.route('/api/history', methods=['POST', 'GET'])
def handle_history():
    conn = get_db_connection()
    if request.method == 'POST':
        d = request.json
        conn.execute("INSERT INTO history (id, type, user_id, student_name_snapshot, theme, score, total, percentage, date, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                     (str(uuid.uuid4()), d['type'], d.get('userId'), d.get('studentName'), d.get('theme'), d.get('score'), d.get('total'), d.get('percentage'), datetime.now().strftime("%d/%m/%Y %H:%M"), d.get('details')))
        conn.commit()
        conn.close()
        return jsonify({"msg": "Salvo"}), 201
    else:
        uid = request.args.get('userId')
        res = conn.execute("SELECT * FROM history WHERE user_id = ? ORDER BY date DESC", (uid,)).fetchall() if uid else conn.execute("SELECT * FROM history ORDER BY date DESC").fetchall()
        conn.close()
        return jsonify([dict(r) for r in res])

if __name__ == '__main__':
    init_db()
    # Porta 5000 é padrão Flask
    app.run(host='0.0.0.0', port=5000)
