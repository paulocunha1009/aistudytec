import json
import uuid
from datetime import datetime


def init_audit_table(cursor):
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS audit_events (
            id TEXT PRIMARY KEY,
            actor_id TEXT,
            actor_type TEXT,
            action TEXT NOT NULL,
            resource_type TEXT NOT NULL,
            resource_id TEXT,
            outcome TEXT NOT NULL,
            metadata TEXT,
            created_at TEXT NOT NULL
        )
    ''')


def record_audit(conn, actor, action, resource_type, resource_id=None, outcome='success', metadata=None):
    safe_metadata = metadata or {}
    conn.execute(
        "INSERT INTO audit_events (id, actor_id, actor_type, action, resource_type, resource_id, outcome, metadata, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (
            str(uuid.uuid4()), actor.get('id') if actor else None, actor.get('type') if actor else None,
            action, resource_type, resource_id, outcome,
            json.dumps(safe_metadata, ensure_ascii=False, sort_keys=True), datetime.now().isoformat(),
        )
    )
