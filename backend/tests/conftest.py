import sys
from pathlib import Path

import pytest


BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

import app as app_module


@pytest.fixture
def flask_app(tmp_path, monkeypatch):
    monkeypatch.delenv("ADMIN_USERNAME", raising=False)
    monkeypatch.delenv("ADMIN_PASSWORD", raising=False)
    monkeypatch.setattr(app_module, "DB_NAME", str(tmp_path / "test.db"))
    app_module.app.config.update(TESTING=True)
    app_module.limiter.reset()
    app_module.init_db()
    return app_module.app


@pytest.fixture
def client(flask_app):
    test_client = flask_app.test_client()
    with test_client.session_transaction() as auth_session:
        auth_session['user_id'] = 'master-test'
        auth_session['user_type'] = 'master'
        auth_session['user_name'] = 'Master Teste'
        auth_session['class_id'] = None
    return test_client


@pytest.fixture
def anonymous_client(flask_app):
    return flask_app.test_client()


@pytest.fixture
def db(flask_app):
    connection = app_module.get_db_connection()
    try:
        yield connection
    finally:
        connection.close()
