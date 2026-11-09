"""SQLite persistence for demo users, sessions, and per-user finance snapshots."""
import hashlib
import hmac
import json
import math
import os
import secrets
import sqlite3
import time
import uuid
from contextlib import contextmanager
from datetime import date
from pathlib import Path
from typing import Any, Iterator


DATABASE_PATH = Path(os.getenv("FINSIGHT_DATABASE_PATH", Path(__file__).with_name("finsight.sqlite3")))
SESSION_TTL_SECONDS = 60 * 60
PBKDF2_ITERATIONS = 310_000
DEMO_EMAIL = "demo@finsight.ai"
DEMO_PASSWORD = "demo1234"


class DuplicateStatementError(Exception):
    """Raised when a statement with the same file hash has already been imported."""


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
            CREATE TABLE IF NOT EXISTS statement_uploads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                file_hash TEXT NOT NULL,
                file_name TEXT NOT NULL,
                bank TEXT,
                account_mask TEXT,
                uploaded_at INTEGER NOT NULL,
                UNIQUE(user_id, file_hash)
            );
            CREATE TABLE IF NOT EXISTS activity_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                event_type TEXT NOT NULL,
                description TEXT NOT NULL,
                metadata_json TEXT,
                created_at INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS activity_logs_user_created_at ON activity_logs(user_id, created_at DESC);
            CREATE TABLE IF NOT EXISTS alerts (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                alert_key TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                is_read INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL,
                UNIQUE(user_id, alert_key)
            );
            CREATE INDEX IF NOT EXISTS alerts_user_created_at ON alerts(user_id, created_at DESC);
            CREATE TABLE IF NOT EXISTS report_verifications (
                token_hash TEXT PRIMARY KEY,
                pdf_sha256 TEXT,
                created_at INTEGER NOT NULL
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
    incoming_hashes = {
        str(item.get("fileHash"))
        for item in snapshot.get("statements", [])
        if item.get("fileHash")
    }

    with _connect() as connection:
        connection.execute("BEGIN IMMEDIATE")
        row = connection.execute(
            "SELECT snapshot_json, import_locked FROM finance_snapshots WHERE user_id = ?",
            (user_id,),
        ).fetchone()
        current_hashes = set()
        if row is not None:
            current = json.loads(row["snapshot_json"])
            current_ids = {str(item["id"]) for item in current.get("transactions", [])}
            current_completed = {
                str(item["id"])
                for item in current.get("statements", [])
                if item.get("status") == "completed"
            }
            current_hashes = {
                str(item.get("fileHash"))
                for item in current.get("statements", [])
                if item.get("fileHash")
            }
            if row["import_locked"] and (
                incoming_ids - current_ids or incoming_completed - current_completed
            ):
                raise SnapshotLockedError
            import_locked = bool(row["import_locked"]) or bool(incoming_completed or incoming_ids) or bool(current_ids)
        else:
            import_locked = bool(incoming_completed or incoming_ids)
        seen_hashes = set()
        if incoming_hashes:
            placeholders = ", ".join("?" for _ in incoming_hashes)
            seen_hashes = {
                record["file_hash"]
                for record in connection.execute(
                    f"SELECT file_hash FROM statement_uploads WHERE user_id = ? AND file_hash IN ({placeholders})",
                    (user_id, *sorted(incoming_hashes)),
                ).fetchall()
            }
        conflicting_hashes = seen_hashes - current_hashes
        if conflicting_hashes:
            raise DuplicateStatementError

        for statement in snapshot.get("statements", []):
            file_hash = str(statement.get("fileHash") or "").strip()
            if not file_hash or file_hash in current_hashes:
                continue
            maybe_record_uploaded_statement(
                user_id,
                file_hash,
                str(statement.get("fileName") or "statement"),
                statement.get("bank"),
                statement.get("maskedAccount"),
            )
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


def add_manual_expense(user_id: str, transaction: dict[str, Any]) -> dict[str, Any]:
    with _connect() as connection:
        connection.execute("BEGIN IMMEDIATE")
        row = connection.execute(
            "SELECT snapshot_json, import_locked FROM finance_snapshots WHERE user_id = ?",
            (user_id,),
        ).fetchone()
        snapshot = json.loads(row["snapshot_json"]) if row else {
            "transactions": [],
            "accounts": [],
            "budgets": [],
            "statements": [],
            "categories": [],
            "userRules": [],
            "budgetPlans": [],
            "savingsGoals": [],
            "dismissedAlerts": [],
        }
        if len(snapshot.get("transactions", [])) >= 20_000:
            raise ValueError("This account has reached the transaction limit.")

        accounts = snapshot.setdefault("accounts", [])
        account = next(
            (item for item in accounts if item.get("id") == transaction["accountId"]),
            None,
        )
        if account is None:
            if transaction["accountId"] != "manual-cash":
                raise ValueError("Select an account that belongs to this user.")
            account = {
                "id": "manual-cash",
                "name": "Cash",
                "type": "savings",
                "last4": "",
                "balance": 0,
            }
            accounts.append(account)
        amount = float(transaction["amount"])
        if (
            isinstance(account.get("balance"), (int, float))
            and not isinstance(account["balance"], bool)
            and math.isfinite(account["balance"])
        ):
            account["balance"] -= amount
        snapshot["transactions"].insert(0, transaction)
        connection.execute(
            """
            INSERT INTO finance_snapshots (user_id, snapshot_json, import_locked, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                snapshot_json = excluded.snapshot_json,
                import_locked = excluded.import_locked,
                updated_at = excluded.updated_at
            """,
            (
                user_id,
                json.dumps(snapshot, ensure_ascii=False, separators=(",", ":"), allow_nan=False),
                int(bool(row["import_locked"]) if row else True),
                int(time.time()),
            ),
        )
        return {"transaction": transaction, "account": account, "snapshot": snapshot}


def delete_finance_snapshot(user_id: str) -> None:
    with _connect() as connection:
        connection.execute("DELETE FROM finance_snapshots WHERE user_id = ?", (user_id,))
        connection.execute("DELETE FROM statement_uploads WHERE user_id = ?", (user_id,))
        connection.execute("DELETE FROM alerts WHERE user_id = ?", (user_id,))


def create_budget_alerts(user_id: str, snapshot: dict[str, Any]) -> list[dict[str, str]]:
    transactions_by_month_category: dict[tuple[str, str], float] = {}
    for transaction in snapshot.get("transactions", []):
        if not isinstance(transaction, dict) or transaction.get("type") != "expense":
            continue
        category = transaction.get("category")
        raw_date = transaction.get("date")
        try:
            amount = float(transaction.get("amount"))
            transaction_date = str(raw_date)[:10]
            year, month, day = (int(part) for part in transaction_date.split("-"))
            date(year, month, day)
        except (TypeError, ValueError):
            continue
        if not math.isfinite(amount) or amount < 0 or not isinstance(category, str):
            continue
        key = (transaction_date[:7], category.strip().casefold())
        transactions_by_month_category[key] = transactions_by_month_category.get(key, 0.0) + amount

    alerts: dict[str, tuple[str, str]] = {}
    for plan in snapshot.get("budgetPlans", []):
        if not isinstance(plan, dict) or not isinstance(plan.get("month"), str):
            continue
        allocations = plan.get("categoryAllocations", [])
        if not isinstance(allocations, list):
            continue
        month = plan["month"]
        for allocation in allocations:
            if not isinstance(allocation, dict) or not isinstance(allocation.get("category"), str):
                continue
            try:
                limit = float(allocation.get("amount"))
            except (TypeError, ValueError):
                continue
            if not math.isfinite(limit) or limit < 0:
                continue
            category = allocation["category"].strip()
            spent = transactions_by_month_category.get((month, category.casefold()), 0.0)
            if spent <= limit:
                continue
            alert_key = f"budget:{month}:{category.casefold()}"
            alerts[alert_key] = (
                "Budget exceeded",
                f"You exceeded your {category} budget by ₹{spent - limit:,.2f}.",
            )

    now = int(time.time())
    changed_alerts: list[dict[str, str]] = []
    with _connect() as connection:
        for alert_key, (title, message) in alerts.items():
            existing = connection.execute(
                "SELECT message FROM alerts WHERE user_id = ? AND alert_key = ?",
                (user_id, alert_key),
            ).fetchone()
            connection.execute(
                """
                INSERT INTO alerts (id, user_id, alert_key, title, message, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(user_id, alert_key) DO UPDATE SET
                    title = excluded.title,
                    is_read = CASE WHEN alerts.message != excluded.message THEN 0 ELSE alerts.is_read END,
                    message = excluded.message
                """,
                (str(uuid.uuid4()), user_id, alert_key, title, message, now),
            )
            if existing is None or existing["message"] != message:
                changed_alerts.append({"title": title, "message": message})
    return changed_alerts


def create_transaction_anomaly_alert(user_id: str, anomaly: dict[str, Any]) -> dict[str, Any] | None:
    transaction_id = str(anomaly.get("transaction_id", "")).strip()
    title = str(anomaly.get("title", "")).strip()
    message = str(anomaly.get("message", "")).strip()
    if not transaction_id or not title or not message:
        raise ValueError("Anomaly alerts require a transaction ID, title, and message.")

    alert_key = f"anomaly:{transaction_id}"
    alert_id = str(uuid.uuid4())
    created_at = int(time.time())
    with _connect() as connection:
        cursor = connection.execute(
            """
            INSERT OR IGNORE INTO alerts (id, user_id, alert_key, title, message, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (alert_id, user_id, alert_key, title, message, created_at),
        )
        if cursor.rowcount == 0:
            return None

    return {
        "id": alert_id,
        "title": title,
        "message": message,
        "is_read": False,
        "created_at": created_at,
    }


def get_alerts(user_id: str, limit: int = 50) -> list[dict[str, Any]]:
    with _connect() as connection:
        rows = connection.execute(
            """
            SELECT id, title, message, is_read, created_at
            FROM alerts
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (user_id, limit),
        ).fetchall()
    return [
        {
            "id": row["id"],
            "title": row["title"],
            "message": row["message"],
            "is_read": bool(row["is_read"]),
            "created_at": row["created_at"],
        }
        for row in rows
    ]


def mark_alerts_read(user_id: str) -> None:
    with _connect() as connection:
        connection.execute(
            "UPDATE alerts SET is_read = 1 WHERE user_id = ? AND is_read = 0",
            (user_id,),
        )


def record_activity_log(user_id: str, event_type: str, description: str, metadata: dict[str, Any] | None = None) -> None:
    with _connect() as connection:
        connection.execute(
            "INSERT INTO activity_logs (user_id, event_type, description, metadata_json, created_at) VALUES (?, ?, ?, ?, ?)",
            (user_id, event_type, description, json.dumps(metadata or {}, ensure_ascii=False, separators=(",", ":")), int(time.time())),
        )


def get_activity_logs(user_id: str, limit: int = 20) -> list[dict[str, Any]]:
    with _connect() as connection:
        rows = connection.execute(
            "SELECT event_type, description, metadata_json, created_at FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?",
            (user_id, limit),
        ).fetchall()
    return [
        {
            "event_type": row["event_type"],
            "description": row["description"],
            "metadata": json.loads(row["metadata_json"] or "{}"),
            "created_at": row["created_at"],
        }
        for row in rows
    ]


def create_report_verification() -> str:
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode("ascii")).hexdigest()
    with _connect() as connection:
        connection.execute(
            "INSERT INTO report_verifications (token_hash, pdf_sha256, created_at) VALUES (?, NULL, ?)",
            (token_hash, int(time.time())),
        )
    return token


def complete_report_verification(token: str, pdf_sha256: str) -> None:
    token_hash = hashlib.sha256(token.encode("ascii")).hexdigest()
    with _connect() as connection:
        cursor = connection.execute(
            "UPDATE report_verifications SET pdf_sha256 = ? WHERE token_hash = ? AND pdf_sha256 IS NULL",
            (pdf_sha256, token_hash),
        )
        if cursor.rowcount != 1:
            raise ValueError("The report verification record could not be completed.")


def discard_report_verification(token: str) -> None:
    token_hash = hashlib.sha256(token.encode("ascii")).hexdigest()
    with _connect() as connection:
        connection.execute("DELETE FROM report_verifications WHERE token_hash = ?", (token_hash,))


def verify_report(token: str, pdf_sha256: str) -> dict[str, Any] | None:
    token_hash = hashlib.sha256(token.encode("ascii")).hexdigest()
    with _connect() as connection:
        row = connection.execute(
            "SELECT pdf_sha256, created_at FROM report_verifications WHERE token_hash = ?",
            (token_hash,),
        ).fetchone()
    if row is None or row["pdf_sha256"] is None:
        return None
    return {
        "valid": hmac.compare_digest(str(row["pdf_sha256"]), pdf_sha256.lower()),
        "created_at": row["created_at"],
    }


def has_uploaded_statement(user_id: str, file_hash: str) -> bool:
    if not file_hash:
        return False
    with _connect() as connection:
        row = connection.execute(
            "SELECT 1 FROM statement_uploads WHERE user_id = ? AND file_hash = ?",
            (user_id, file_hash),
        ).fetchone()
    return row is not None


def maybe_record_uploaded_statement(user_id: str, file_hash: str, file_name: str, bank: str | None, account_mask: str | None) -> None:
    if not file_hash:
        return
    with _connect() as connection:
        connection.execute(
            "INSERT OR IGNORE INTO statement_uploads (user_id, file_hash, file_name, bank, account_mask, uploaded_at) VALUES (?, ?, ?, ?, ?, ?)",
            (user_id, file_hash, file_name, bank or "", account_mask or "", int(time.time())),
        )
