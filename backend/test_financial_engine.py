import asyncio
import base64
import hashlib
import io
import json
import tempfile
import unittest
from datetime import date, timedelta
from pathlib import Path
from unittest.mock import patch

import main
from fastapi.testclient import TestClient


class CommandEngineTests(unittest.TestCase):
    def test_income_and_expense_questions_use_summary_commands(self) -> None:
        self.assertEqual(
            main.command_for_message("Show my income this month"),
            ("get_spending_summary", {"period": "this_month", "focus": "income"}),
        )
        self.assertEqual(
            main.command_for_message("What are my expenses?"),
            ("get_spending_summary", {"period": "all_time", "focus": "expenses"}),
        )

    def test_transaction_search_keeps_income_filter(self) -> None:
        self.assertEqual(
            main.command_for_message("Show my income transactions"),
            ("search_transactions", {"period": "all_time", "tx_type": "income"}),
        )

    def test_summary_response_reports_requested_metric(self) -> None:
        result = main.spending(
            {"transactions": [
                {"type": "income", "amount": 500, "date": "2025-02-01"},
                {"type": "expense", "amount": 125, "date": "2025-02-02"},
            ]},
            focus="income",
        )
        self.assertEqual(main.command_response("get_spending_summary", result), "Your total income is ₹500.00.")

    def test_chat_command_runs_without_an_llm_api_key(self) -> None:
        async def collect_events() -> list[str]:
            return [
                event async for event in main.run_agent(
                    "Predict next month's spending",
                    {"transactions": [
                        {"type": "expense", "amount": 100, "date": "2025-01-15"},
                        {"type": "expense", "amount": 200, "date": "2025-02-15"},
                    ]},
                )
            ]

        with patch.dict("os.environ", {"GROQ_API_KEY": ""}):
            events = asyncio.run(collect_events())
        self.assertTrue(any("linear-regression model predicts" in item for item in events))


class AccountDataApiTests(unittest.TestCase):
    def test_activity_history_and_json_export_are_authenticated_and_scoped(self) -> None:
        previous_path = main.database.DATABASE_PATH
        with tempfile.TemporaryDirectory() as folder:
            main.database.DATABASE_PATH = Path(folder) / "account-export.sqlite3"
            main.database.initialize_database()
            user = main.database.create_user("Export Test", "export@example.com", "password123")
            token, _ = main.database.create_session(user["id"])
            snapshot = {
                "transactions": [{"id": "tx-1", "type": "expense", "amount": 42, "date": "2026-01-02"}],
                "accounts": [],
                "budgets": [],
                "statements": [],
                "categories": [],
                "userRules": [],
                "budgetPlans": [],
                "savingsGoals": [],
                "dismissedAlerts": [],
            }
            main.database.save_finance_snapshot(user["id"], snapshot)
            main.database.record_activity_log(user["id"], "test_event", "Account test event")
            headers = {"Authorization": f"Bearer {token}"}
            try:
                with TestClient(main.app) as client:
                    self.assertEqual(client.get("/api/finance/activity").status_code, 401)
                    self.assertEqual(client.get("/api/finance/export").status_code, 401)

                    activity_response = client.get("/api/finance/activity", headers=headers)
                    self.assertEqual(activity_response.status_code, 200)
                    self.assertEqual(activity_response.json()["logs"][0]["description"], "Account test event")

                    export_response = client.get("/api/finance/export", headers=headers)
                    self.assertEqual(export_response.status_code, 200)
                    self.assertIn("attachment; filename=", export_response.headers["content-disposition"])
                    exported = export_response.json()
                    self.assertEqual(exported["finance_snapshot"], snapshot)
                    self.assertEqual(exported["account"]["email"], user["email"])
                    self.assertNotIn("password_hash", export_response.text)
                    self.assertNotIn("access_token", export_response.text)
                    self.assertEqual(exported["activity_history"][0]["event_type"], "data_export")
                    self.assertEqual(main.database.get_finance_snapshot(user["id"]), snapshot)
            finally:
                main.database.DATABASE_PATH = previous_path

    def test_market_ticker_requires_auth_and_caches_provider_quotes(self) -> None:
        previous_path = main.database.DATABASE_PATH
        previous_cache = dict(main.market_ticker_cache)
        main.market_ticker_cache.clear()
        main.market_ticker_cache.update({"fetched_at": 0.0, "symbols": "", "quotes": []})
        payload = {
            "Global Quote": {
                "01. symbol": "IBM",
                "05. price": "250.5000",
                "07. latest trading day": "2026-11-06",
                "09. change": "1.5000",
                "10. change percent": "0.6024%",
            }
        }
        with tempfile.TemporaryDirectory() as folder:
            main.database.DATABASE_PATH = Path(folder) / "market-api.sqlite3"
            main.database.initialize_database()
            user = main.database.create_user("Market Test", "market@example.com", "password123")
            token, _ = main.database.create_session(user["id"])
            headers = {"Authorization": f"Bearer {token}"}
            try:
                with patch.dict("os.environ", {
                    "ALPHA_VANTAGE_API_KEY": "test-provider-key",
                    "FINSIGHT_MARKET_SYMBOLS": "IBM",
                }), patch("main.urlopen", return_value=io.BytesIO(json.dumps(payload).encode("utf-8"))) as mocked_urlopen:
                    with TestClient(main.app) as client:
                        self.assertEqual(client.get("/api/market/ticker").status_code, 401)
                        response = client.get("/api/market/ticker", headers=headers)
                        self.assertEqual(response.status_code, 200)
                        self.assertTrue(response.json()["available"])
                        self.assertEqual(response.json()["quotes"][0]["symbol"], "IBM")
                        self.assertEqual(response.json()["quotes"][0]["change_percent"], 0.6024)
                        self.assertNotIn("test-provider-key", response.text)

                        cached_response = client.get("/api/market/ticker", headers=headers)
                        self.assertEqual(cached_response.json()["quotes"], response.json()["quotes"])
                        self.assertEqual(mocked_urlopen.call_count, 1)
            finally:
                main.database.DATABASE_PATH = previous_path
                main.market_ticker_cache.clear()
                main.market_ticker_cache.update(previous_cache)


class ForecastTests(unittest.TestCase):
    def test_monte_carlo_savings_goal_simulation_is_seeded_and_uses_completed_months(self) -> None:
        today = date.today()
        transactions = []
        for offset in range(1, 7):
            month_end = today.replace(day=1) - timedelta(days=offset * 31)
            month = month_end.strftime("%Y-%m")
            transactions.extend([
                {"type": "income", "amount": 5000, "category": "Salary", "date": f"{month}-05"},
                {"type": "expense", "amount": 1000 + offset * 100, "category": "Food", "date": f"{month}-10"},
                {"type": "expense", "amount": 50000, "category": "Transfers", "date": f"{month}-12"},
            ])

        context = {
            "transactions": transactions,
            "goals": [{
                "id": "emergency",
                "name": "Emergency fund",
                "targetAmount": 50000,
                "currentAmount": 10000,
                "status": "active",
            }],
        }
        result = main.simulate_savings_goals(context)

        self.assertTrue(result["available"])
        self.assertEqual(result["simulations"], 10_000)
        self.assertEqual(result["months_analyzed"], 6)
        self.assertEqual(result["goals"][0]["horizon_months"], 12)
        self.assertEqual(result, main.simulate_savings_goals(context))
        self.assertEqual(
            result["goals"][0]["probability_pct"],
            main.simulate_savings_goals(context)["goals"][0]["probability_pct"],
        )
        self.assertIn("No investment returns", result["note"])

    def test_monte_carlo_requires_goal_and_three_history_months(self) -> None:
        result_without_goals = main.simulate_savings_goals({"transactions": [], "goals": []})
        self.assertFalse(result_without_goals["available"])
        self.assertIn("active savings goal", result_without_goals["reason"])

        today = date.today()
        transactions = []
        for offset in range(1, 3):
            month = (today.replace(day=1) - timedelta(days=offset * 31)).strftime("%Y-%m")
            transactions.extend([
                {"type": "income", "amount": 5000, "date": f"{month}-05"},
                {"type": "expense", "amount": 1000, "date": f"{month}-10"},
            ])
        result_with_short_history = main.simulate_savings_goals({
            "transactions": transactions,
            "goals": [{"id": "goal", "name": "Goal", "targetAmount": 10000, "currentAmount": 0}],
        })
        self.assertFalse(result_with_short_history["available"])
        self.assertIn("3 completed months", result_with_short_history["reason"])

    def test_goal_simulation_endpoint_requires_authentication(self) -> None:
        with TestClient(main.app) as client:
            response = client.get("/api/finance/goal-simulation")

        self.assertEqual(response.status_code, 401)

    def test_pdf_report_qr_verifies_exact_file_digest(self) -> None:
        previous_path = main.database.DATABASE_PATH
        with tempfile.TemporaryDirectory() as folder:
            main.database.DATABASE_PATH = Path(folder) / "report-verification.sqlite3"
            main.database.initialize_database()
            try:
                report = main.generate_report_sync(
                    {
                        "transactions": [
                            {"id": "income", "type": "income", "amount": 5000, "date": "2026-01-01"},
                            {"id": "expense", "type": "expense", "amount": 1250, "date": "2026-01-02", "category": "Food"},
                        ],
                        "report_verification_base_url": "https://finsight.example",
                    },
                    format="pdf",
                )
                pdf_bytes = base64.b64decode(report["content_base64"], validate=True)
                self.assertTrue(pdf_bytes.startswith(b"%PDF"))
                pdf_sha256 = hashlib.sha256(pdf_bytes).hexdigest()
                report_token = report["verification_url"].rsplit("/", 1)[-1]
                with TestClient(main.app) as client:
                    page = client.get(f"/api/reports/verify/{report_token}")
                    self.assertEqual(page.status_code, 200)
                    self.assertIn("Select the original report PDF", page.text)
                    verified = client.post(
                        f"/api/reports/verify/{report_token}",
                        json={"sha256": pdf_sha256},
                    )
                    self.assertEqual(verified.status_code, 200)
                    self.assertTrue(verified.json()["valid"])
                    tampered = client.post(
                        f"/api/reports/verify/{report_token}",
                        json={"sha256": "0" * 64},
                    )
                    self.assertEqual(tampered.status_code, 200)
                    self.assertFalse(tampered.json()["valid"])
            finally:
                main.database.DATABASE_PATH = previous_path

    def test_linear_regression_forecasts_next_month_from_monthly_expenses(self) -> None:
        result = main.forecast({"transactions": [
            {"type": "expense", "amount": 100, "date": "2025-01-15"},
            {"type": "expense", "amount": 200, "date": "2025-02-15"},
            {"type": "income", "amount": 500, "date": "2025-02-01"},
        ]})
        self.assertTrue(result["available"])
        self.assertEqual(result["method"], "Scikit-learn linear regression")
        self.assertEqual(result["months_used"], 2)
        self.assertAlmostEqual(result["predicted_expense"], 296.77, places=2)

    def test_forecast_handles_invalid_dates_without_crashing(self) -> None:
        result = main.forecast({"transactions": [
            {"type": "expense", "amount": 100, "date": ""},
            {"type": "expense", "amount": 200, "date": ""},
        ]})
        self.assertFalse(result["available"])

    def test_kmeans_persona_is_deterministic_with_monthly_history(self) -> None:
        transactions = []
        monthly_patterns = [(2000, "Groceries"), (4500, "Entertainment"), (8000, "Shopping")]
        for month in range(1, 7):
            expenses, category = monthly_patterns[(month - 1) % len(monthly_patterns)]
            transactions.extend([
                {"type": "income", "amount": 10000, "date": f"2025-{month:02d}-01"},
                {"type": "expense", "amount": expenses, "category": category, "date": f"2025-{month:02d}-10"},
            ])

        result = main.spending_persona({"transactions": transactions})

        self.assertTrue(result["available"])
        self.assertEqual(result["months_analyzed"], 6)
        self.assertEqual(result["months_in_pattern"], 2)
        self.assertEqual(result["persona"], "Higher-Spend Pattern")
        self.assertEqual(result, main.spending_persona({"transactions": transactions}))
        self.assertIn("K-Means", result["method"])

    def test_spending_persona_requires_income_and_multiple_months(self) -> None:
        result = main.spending_persona({"transactions": [
            {"type": "expense", "amount": 100, "category": "Food", "date": "2025-01-10"},
            {"type": "expense", "amount": 200, "category": "Food", "date": "2025-02-10"},
            {"type": "expense", "amount": 300, "category": "Food", "date": "2025-03-10"},
        ]})

        self.assertFalse(result["available"])
        self.assertIn("income", result["reason"])
        insufficient_months = main.spending_persona({"transactions": [
            transaction
            for month in range(1, 4)
            for transaction in (
                {"type": "income", "amount": 1000, "date": f"2025-0{month}-01"},
                {"type": "expense", "amount": month * 100, "category": "Food", "date": f"2025-0{month}-10"},
            )
        ]})
        self.assertFalse(insufficient_months["available"])
        self.assertIn("4 months", insufficient_months["reason"])

    def test_spending_persona_endpoint_requires_authentication(self) -> None:
        with TestClient(main.app) as client:
            response = client.get("/api/finance/spending-persona")

        self.assertEqual(response.status_code, 401)

    def test_isolation_forest_flags_only_with_sufficient_category_history(self) -> None:
        history = [
            {"id": f"history-{index}", "type": "expense", "category": "Food", "amount": 90 + index * 2}
            for index in range(12)
        ]
        anomaly = main.detect_transaction_anomaly(
            history,
            {"id": "outlier", "type": "expense", "category": "Food", "amount": 10000},
        )
        self.assertIsNotNone(anomaly)
        self.assertEqual(anomaly["baseline_count"], 12)
        self.assertIn("Isolation Forest", anomaly["method"])
        self.assertIsNone(main.detect_transaction_anomaly(
            history,
            {"id": "typical", "type": "expense", "category": "Food", "amount": 110},
        ))
        self.assertIsNone(main.detect_transaction_anomaly(
            history[:9],
            {"id": "insufficient-history", "type": "expense", "category": "Food", "amount": 10000},
        ))
        self.assertIsNone(main.detect_transaction_anomaly(
            history,
            {"id": "transfer", "type": "expense", "category": "Transfers", "amount": 10000},
        ))

    def test_manual_expense_persists_and_pushes_anomaly_alert(self) -> None:
        previous_path = main.database.DATABASE_PATH
        today = date.today()
        with tempfile.TemporaryDirectory() as folder:
            main.database.DATABASE_PATH = Path(folder) / "anomaly-api.sqlite3"
            main.database.initialize_database()
            user = main.database.create_user("Anomaly Test", "anomaly@example.com", "password123")
            token, _ = main.database.create_session(user["id"])
            snapshot = {
                "transactions": [
                    {
                        "id": f"history-{index}",
                        "type": "expense",
                        "amount": 90 + index * 2,
                        "category": "Food",
                        "date": f"2025-{(index % 12) + 1:02d}-10",
                    }
                    for index in range(12)
                ],
                "accounts": [],
                "budgets": [],
                "statements": [],
                "categories": [],
                "userRules": [],
                "budgetPlans": [],
                "savingsGoals": [],
                "dismissedAlerts": [],
            }
            main.database.save_finance_snapshot(user["id"], snapshot)
            headers = dict([("Authorization", " ".join(("Bearer", token)))])
            try:
                with TestClient(main.app) as client:
                    self.assertIsNotNone(main.database.get_session_user(token))
                    with client.websocket_connect(f"/ws/live-updates?token={token}") as websocket:
                        response = client.post(
                            "/api/finance/transactions",
                            json={
                                "amount": 10000,
                                "category": "Food",
                                "date": today.isoformat(),
                                "accountId": "manual-cash",
                                "note": "Unusually large purchase",
                            },
                            headers=headers,
                        )
                        self.assertEqual(response.status_code, 201, response.text)
                        events = [websocket.receive_json(), websocket.receive_json()]
                        self.assertEqual(events[0]["event"], "new_transaction")
                        self.assertEqual(events[1]["event"], "anomaly_alert")
                        self.assertIn("Unusual transaction detected", events[1]["title"])

                    alerts_response = client.get("/api/finance/alerts", headers=headers)
                    self.assertEqual(alerts_response.status_code, 200)
                    anomaly_alerts = [
                        alert for alert in alerts_response.json()["alerts"]
                        if alert["title"] == "Unusual transaction detected"
                    ]
                    self.assertEqual(len(anomaly_alerts), 1)
                    self.assertIsNone(main.database.create_transaction_anomaly_alert(
                        user["id"],
                        {
                            "transaction_id": response.json()["transaction"]["id"],
                            "title": "Unusual transaction detected",
                            "message": anomaly_alerts[0]["message"],
                        },
                    ))
            finally:
                main.database.DATABASE_PATH = previous_path

    def test_authenticated_live_forecast_and_budget_websocket_events(self) -> None:
        previous_path = main.database.DATABASE_PATH
        today = date.today()
        current_month = today.strftime("%Y-%m")
        previous_month = (today.replace(day=1) - timedelta(days=1)).strftime("%Y-%m")
        with tempfile.TemporaryDirectory() as folder:
            main.database.DATABASE_PATH = Path(folder) / "live-api.sqlite3"
            main.database.initialize_database()
            user = main.database.create_user("Live Test", "live@example.com", "password123")
            token, _ = main.database.create_session(user["id"])
            snapshot = {
                "transactions": [
                    {"id": "previous-month", "type": "expense", "amount": 1000, "category": "Food", "date": f"{previous_month}-10"},
                    {"id": "current-month", "type": "expense", "amount": 2000, "category": "Food", "date": f"{current_month}-10"},
                ],
                "accounts": [],
                "budgets": [],
                "statements": [],
                "categories": [],
                "userRules": [],
                "budgetPlans": [{
                    "id": "current-budget",
                    "name": "Monthly",
                    "month": current_month,
                    "categoryAllocations": [{"category": "Food", "amount": 1500}],
                }],
                "savingsGoals": [],
                "dismissedAlerts": [],
            }
            main.database.save_finance_snapshot(user["id"], snapshot)
            headers = {"Authorization": f"Bearer {token}"}
            try:
                with TestClient(main.app) as client:
                    headers["Authorization"] = " ".join(("Bearer", token))
                    forecast_response = client.get("/api/finance/live-forecast", headers=headers)
                    self.assertEqual(forecast_response.status_code, 200)
                    self.assertTrue(forecast_response.json()["available"])
                    self.assertEqual(forecast_response.json()["method"], "Scikit-learn linear regression")
                    persona_response = client.get("/api/finance/spending-persona", headers=headers)
                    self.assertEqual(persona_response.status_code, 200)
                    self.assertFalse(persona_response.json()["available"])
                    goal_response = client.get("/api/finance/goal-simulation", headers=headers)
                    self.assertEqual(goal_response.status_code, 200)
                    self.assertFalse(goal_response.json()["available"])

                    with client.websocket_connect(f"/ws/live-updates?token={token}") as websocket:
                        response = client.post(
                            "/api/finance/transactions",
                            json={
                                "amount": 500,
                                "category": "Food",
                                "date": f"{current_month}-11",
                                "accountId": "manual-cash",
                                "note": "Groceries",
                            },
                            headers=headers,
                        )
                        self.assertEqual(response.status_code, 201, response.text)
                        events = [websocket.receive_json(), websocket.receive_json()]
                        self.assertEqual(events[0]["event"], "new_transaction")
                        self.assertEqual(events[1]["event"], "budget_alert")
            finally:
                main.database.DATABASE_PATH = previous_path


if __name__ == "__main__":
    unittest.main()
