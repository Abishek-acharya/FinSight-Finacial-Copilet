import tempfile
import unittest
from pathlib import Path

import database


def empty_snapshot() -> dict:
    return {
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


class DatabaseTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.previous_database_path = database.DATABASE_PATH
        database.DATABASE_PATH = Path(self.temp_dir.name) / "test.sqlite3"
        database.initialize_database()

    def tearDown(self) -> None:
        database.DATABASE_PATH = self.previous_database_path
        self.temp_dir.cleanup()

    def test_password_authentication_and_session_revocation(self) -> None:
        user = database.create_user("Test User", "test@example.com", "password123")
        self.assertEqual(database.authenticate_user("test@example.com", "password123"), user)
        with self.assertRaises(database.InvalidCredentialsError):
            database.authenticate_user("test@example.com", "wrong-password")

        token, _ = database.create_session(user["id"])
        self.assertEqual(database.get_session_user(token), user)
        database.delete_session(token)
        self.assertIsNone(database.get_session_user(token))

    def test_snapshots_are_isolated_by_user(self) -> None:
        first_user = database.create_user("First User", "first@example.com", "password123")
        second_user = database.create_user("Second User", "second@example.com", "password123")
        first_snapshot = empty_snapshot()
        first_snapshot["transactions"] = [{
            "id": "transaction-1",
            "type": "expense",
            "amount": 12.5,
            "date": "2025-01-01",
        }]

        database.save_finance_snapshot(first_user["id"], first_snapshot)

        self.assertEqual(database.get_finance_snapshot(first_user["id"]), first_snapshot)
        self.assertIsNone(database.get_finance_snapshot(second_user["id"]))

    def test_import_lock_is_enforced_until_snapshot_reset(self) -> None:
        user = database.create_user("Test User", "test@example.com", "password123")
        initial = empty_snapshot()
        initial["transactions"] = [{
            "id": "transaction-1",
            "type": "expense",
            "amount": 12.5,
            "date": "2025-01-01",
        }]
        initial["statements"] = [{"id": "statement-1", "status": "completed"}]
        database.save_finance_snapshot(user["id"], initial)

        additional = {**initial, "transactions": [*initial["transactions"], {
            "id": "transaction-2",
            "type": "expense",
            "amount": 4,
            "date": "2025-01-02",
        }]}
        with self.assertRaises(database.SnapshotLockedError):
            database.save_finance_snapshot(user["id"], additional)

        emptied = {**initial, "transactions": [], "statements": []}
        database.save_finance_snapshot(user["id"], emptied)
        with self.assertRaises(database.SnapshotLockedError):
            database.save_finance_snapshot(user["id"], additional)

        database.delete_finance_snapshot(user["id"])
        database.save_finance_snapshot(user["id"], additional)
        self.assertEqual(database.get_finance_snapshot(user["id"]), additional)

    def test_budget_alerts_are_deduplicated_and_deleted_with_finance_data(self) -> None:
        user = database.create_user("Test User", "test@example.com", "password123")
        snapshot = empty_snapshot()
        snapshot["transactions"] = [
            {"id": "expense-1", "type": "expense", "category": "Food", "amount": 1250, "date": "2025-02-01"},
            {"id": "income-1", "type": "income", "category": "Salary", "amount": 5000, "date": "2025-02-02"},
        ]
        snapshot["budgetPlans"] = [{
            "id": "budget-1",
            "month": "2025-02",
            "categoryAllocations": [{"category": "Food", "amount": 1000}],
        }]

        database.create_budget_alerts(user["id"], snapshot)
        first_alerts = database.get_alerts(user["id"])
        self.assertEqual(len(first_alerts), 1)
        self.assertIn("₹250.00", first_alerts[0]["message"])
        database.mark_alerts_read(user["id"])
        database.create_budget_alerts(user["id"], snapshot)
        self.assertEqual(len(database.get_alerts(user["id"])), 1)
        self.assertTrue(database.get_alerts(user["id"])[0]["is_read"])
        database.maybe_record_uploaded_statement(user["id"], "statement-hash", "statement.csv", None, None)
        self.assertTrue(database.has_uploaded_statement(user["id"], "statement-hash"))

        database.delete_finance_snapshot(user["id"])
        self.assertEqual(database.get_alerts(user["id"]), [])
        self.assertFalse(database.has_uploaded_statement(user["id"], "statement-hash"))

    def test_manual_expense_persists_without_unlocking_statement_import(self) -> None:
        user = database.create_user("Test User", "test@example.com", "password123")
        snapshot = empty_snapshot()
        snapshot["accounts"] = [{
            "id": "bank-1",
            "name": "Primary account",
            "type": "savings",
            "last4": "1234",
            "balance": 5000,
        }]
        snapshot["transactions"] = [{
            "id": "statement-tx",
            "type": "expense",
            "amount": 100,
            "date": "2025-02-01",
        }]
        snapshot["statements"] = [{"id": "statement-1", "status": "completed"}]
        database.save_finance_snapshot(user["id"], snapshot)

        result = database.add_manual_expense(user["id"], {
            "id": "manual-expense-1",
            "merchant": "Tea",
            "description": "Tea",
            "note": "Tea",
            "category": "Food & Dining",
            "type": "expense",
            "accountId": "bank-1",
            "date": "2025-02-02",
            "amount": 50,
            "categorizationSource": "manual",
        })

        self.assertEqual(result["account"]["balance"], 4950)
        saved = database.get_finance_snapshot(user["id"])
        self.assertEqual(saved["transactions"][0]["id"], "manual-expense-1")
        with self.assertRaises(database.SnapshotLockedError):
            database.save_finance_snapshot(user["id"], {
                **saved,
                "transactions": [*saved["transactions"], {
                    "id": "additional-import",
                    "type": "expense",
                    "amount": 20,
                    "date": "2025-02-03",
                }],
            })


if __name__ == "__main__":
    unittest.main()
