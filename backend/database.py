"""SQLite persistence for demo users, sessions, and per-user finance snapshots."""
import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import time
import uuid
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator


DATABASE_PATH = Path(os.getenv("FINSIGHT_DATABASE_PATH", Path(__file__).with_name("finsight.sqlite3")))
SESSION_TTL_SECONDS = 60 * 60 * 24 * 7
PBKDF2_ITERATIONS = 310_000
DEMO_EMAIL = "demo@finsight.ai"
DEMO_PASSWORD = "demo1234"


class DuplicateUserError(Exception):
    """Raised when an email address is already registered."""


class InvalidCredentialsError(Exception):
    """Raised when an email or password does not match."""


class SnapshotLockedError(Exception):
    """Raised when a new import is attempted before the current data is reset."""


@contextmanager
def _connect() -> Iterator[sqlite3.Connection]:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def _password_hash(password: str, salt: bytes) -> bytes:
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS)


def initialize_database() -> None:
    with _connect() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT NOT NULL UNIQUE COLLATE NOCASE,
                name TEXT NOT NULL,
                password_salt BLOB NOT NULL,
                password_hash BLOB NOT NULL,
                created_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sessions (
                token_hash TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                expires_at INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
            CREATE TABLE IF NOT EXISTS finance_snapshots (
                user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                snapshot_json TEXT NOT NULL,
                import_locked INTEGER NOT NULL DEFAULT 0,
                updated_at INTEGER NOT NULL
            );
            """
        )
        snapshot_columns = {
            row["name"] for row in connection.execute("PRAGMA table_info(finance_snapshots)").fetchall()
        }
        if "import_locked" not in snapshot_columns:
            connection.execute(
                "ALTER TABLE finance_snapshots ADD COLUMN import_locked INTEGER NOT NULL DEFAULT 0"
            )
            for row in connection.execute(
                "SELECT user_id, snapshot_json FROM finance_snapshots"
            ).fetchall():
                snapshot = json.loads(row["snapshot_json"])
                locked = bool(snapshot.get("transactions")) or any(
                    item.get("status") == "completed"
                    for item in snapshot.get("statements", [])
                    if isinstance(item, dict)
                )
                if locked:
                    connection.execute(
                        "UPDATE finance_snapshots SET import_locked = 1 WHERE user_id = ?",
                        (row["user_id"],),
                    )
        existing = connection.execute(
            "SELECT id FROM users WHERE email = ?",
            (DEMO_EMAIL,),
        ).fetchone()
        if existing is None:
            salt = secrets.token_bytes(16)
            connection.execute(
                "INSERT INTO users (id, email, name, password_salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                ("demo-user", DEMO_EMAIL, "Devon Brooks", salt, _password_hash(DEMO_PASSWORD, salt), int(time.time())),
            )
        connection.execute("DELETE FROM sessions WHERE expires_at <= ?", (int(time.time()),))


def create_user(name: str, email: str, password: str) -> dict[str, str]:
    user_id = str(uuid.uuid4())
    salt = secrets.token_bytes(16)
    password_hash = _password_hash(password, salt)
    try:
        with _connect() as connection:
            connection.execute(
                "INSERT INTO users (id, email, name, password_salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (user_id, email, name, salt, password_hash, int(time.time())),
            )
    except sqlite3.IntegrityError as exc:
        raise DuplicateUserError from exc
    return {"id": user_id, "email": email, "name": name}


def authenticate_user(email: str, password: str) -> dict[str, str]:
    with _connect() as connection:
        row = connection.execute(
            "SELECT id, email, name, password_salt, password_hash FROM users WHERE email = ?",
            (email,),
        ).fetchone()
    if row is None:
        raise InvalidCredentialsError
    candidate = _password_hash(password, row["password_salt"])
    if not hmac.compare_digest(candidate, row["password_hash"]):
        raise InvalidCredentialsError
    return {"id": row["id"], "email": row["email"], "name": row["name"]}


def create_session(user_id: str) -> tuple[str, int]:
    token = secrets.token_urlsafe(32)
    expires_at = int(time.time()) + SESSION_TTL_SECONDS
    token_hash = hashlib.sha256(token.encode("ascii")).hexdigest()
    with _connect() as connection:
        connection.execute(
            "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
            (token_hash, user_id, expires_at),
        )
    return token, expires_at


def get_session_user(token: str) -> dict[str, str] | None:
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    now = int(time.time())
    with _connect() as connection:
        row = connection.execute(
            """
            SELECT users.id, users.email, users.name
            FROM sessions JOIN users ON users.id = sessions.user_id
            WHERE sessions.token_hash = ? AND sessions.expires_at > ?
            """,
            (token_hash, now),
        ).fetchone()
        connection.execute("DELETE FROM sessions WHERE expires_at <= ?", (now,))
    if row is None:
        return None
    return {"id": row["id"], "email": row["email"], "name": row["name"]}


def delete_session(token: str) -> None:
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    with _connect() as connection:
        connection.execute("DELETE FROM sessions WHERE token_hash = ?", (token_hash,))


def get_finance_snapshot(user_id: str) -> dict[str, Any] | None:
    with _connect() as connection:
        row = connection.execute(
            "SELECT snapshot_json FROM finance_snapshots WHERE user_id = ?",
            (user_id,),
        ).fetchone()
    if row is None:
        return None
    return json.loads(row["snapshot_json"])


def save_finance_snapshot(user_id: str, snapshot: dict[str, Any]) -> None:
    encoded = json.dumps(snapshot, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
    incoming_transactions = snapshot["transactions"]
    incoming_ids = {str(item["id"]) for item in incoming_transactions}
    incoming_completed = {
        str(item["id"])
        for item in snapshot["statements"]
        if item.get("status") == "completed"
    }

    with _connect() as connection:
        connection.execute("BEGIN IMMEDIATE")
        row = connection.execute(
            "SELECT snapshot_json, import_locked FROM finance_snapshots WHERE user_id = ?",
            (user_id,),
        ).fetchone()
        import_locked = bool(incoming_completed or incoming_ids)
        if row is not None:
            current = json.loads(row["snapshot_json"])
            current_ids = {str(item["id"]) for item in current.get("transactions", [])}
            current_completed = {
                str(item["id"])
                for item in current.get("statements", [])
                if item.get("status") == "completed"
            }
            if row["import_locked"] and (
                incoming_ids - current_ids or incoming_completed - current_completed
            ):
                raise SnapshotLockedError
            import_locked = bool(row["import_locked"]) or import_locked or bool(current_ids)
        connection.execute(
            """
            INSERT INTO finance_snapshots (user_id, snapshot_json, import_locked, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                snapshot_json = excluded.snapshot_json,
                import_locked = excluded.import_locked,
                updated_at = excluded.updated_at
            """,
            (user_id, encoded, int(import_locked), int(time.time())),
        )


def delete_finance_snapshot(user_id: str) -> None:
    with _connect() as connection:
        connection.execute("DELETE FROM finance_snapshots WHERE user_id = ?", (user_id,))
