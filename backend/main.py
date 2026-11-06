"""FinSight AI streaming agent. Financial calculations stay in deterministic tools."""
import json
import logging
import math
import os
import re
from datetime import date, datetime, timedelta
from typing import Optional

from dotenv import load_dotenv
load_dotenv()

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from groq import AsyncGroq

import database
from knowledge import search_knowledge
from reports import generate_report

logger = logging.getLogger(__name__)
MODEL = "llama-3.3-70b-versatile"
app = FastAPI(title="FinSight AI Agent")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], allow_methods=["GET", "POST", "PUT", "DELETE"], allow_headers=["Content-Type", "Authorization"])
bearer_scheme = HTTPBearer(auto_error=False)
database.initialize_database()


class SignInRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=128)


class SignUpRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=8, max_length=128)


class FinanceSnapshotRequest(BaseModel):
    snapshot: dict


def current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, str]:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sign in to access your financial data.")
    user = database.get_session_user(credentials.credentials)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Your session expired. Please sign in again.")
    return user


def create_session_response(user: dict[str, str]) -> dict:
    token, expires_at = database.create_session(user["id"])
    return {
        "user": user,
        "access_token": token,
        "expires_at": expires_at * 1000,
    }


def validate_finance_snapshot(snapshot: dict) -> None:
    required_arrays = (
        "transactions",
        "accounts",
        "budgets",
        "statements",
        "categories",
        "userRules",
        "budgetPlans",
        "savingsGoals",
        "dismissedAlerts",
    )
    if any(not isinstance(snapshot.get(key), list) for key in required_arrays):
        raise HTTPException(status_code=422, detail="Finance snapshot has an invalid shape.")
    if any(len(snapshot[key]) > 20_000 for key in required_arrays):
        raise HTTPException(status_code=413, detail="A finance snapshot contains too many items.")
    try:
        serialized = json.dumps(snapshot, allow_nan=False, separators=(",", ":"))
    except (TypeError, ValueError):
        raise HTTPException(status_code=422, detail="Finance snapshot contains unsupported values.") from None
    if len(serialized.encode("utf-8")) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="A finance snapshot cannot exceed 10 MB.")
    transaction_ids: set[str] = set()
    for transaction in snapshot["transactions"]:
        if not isinstance(transaction, dict) or not isinstance(transaction.get("id"), str) or not transaction["id"]:
            raise HTTPException(status_code=422, detail="Finance snapshot contains an invalid transaction.")
        if transaction["id"] in transaction_ids:
            raise HTTPException(status_code=422, detail="Finance snapshot contains duplicate transaction IDs.")
        transaction_ids.add(transaction["id"])
        if transaction.get("type") not in {"income", "expense"}:
            raise HTTPException(status_code=422, detail="Finance snapshot contains an invalid transaction type.")
        if isinstance(transaction.get("amount"), bool):
            raise HTTPException(status_code=422, detail="Finance snapshot contains an invalid transaction amount.")
        try:
            amount = float(transaction.get("amount"))
        except (TypeError, ValueError):
            raise HTTPException(status_code=422, detail="Finance snapshot contains an invalid transaction amount.") from None
        if not math.isfinite(amount) or amount < 0:
            raise HTTPException(status_code=422, detail="Finance snapshot contains an invalid transaction amount.")
    for statement in snapshot["statements"]:
        if not isinstance(statement, dict) or not isinstance(statement.get("id"), str):
            raise HTTPException(status_code=422, detail="Finance snapshot contains an invalid statement.")


def is_configured() -> bool:
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    return bool(api_key and not api_key.startswith("gsk_your"))


def normalize_transactions(context: dict) -> list[dict]:
    raw_transactions = context.get("transactions", [])
    if not isinstance(raw_transactions, list):
        raise ValueError("Transactions must be a list.")

    income_types = {"income", "credit", "cr", "deposit", "received", "in"}
    expense_types = {"expense", "debit", "dr", "withdrawal", "spent", "out"}
    date_formats = ("%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y", "%d/%m/%y", "%d-%m-%y", "%d %b %Y", "%d-%b-%Y", "%d %b %y", "%d-%b-%y")
    transactions = []
    for index, transaction in enumerate(raw_transactions, start=1):
        if not isinstance(transaction, dict):
            raise ValueError(f"Transaction {index} is not a valid object.")
        raw_type = str(transaction.get("type", "")).strip().lower()
        if raw_type in income_types:
            transaction_type = "income"
        elif raw_type in expense_types:
            transaction_type = "expense"
        else:
            raise ValueError(f"Transaction {index} has an unsupported type.")

        raw_amount = transaction.get("amount")
        if isinstance(raw_amount, bool) or raw_amount is None:
            raise ValueError(f"Transaction {index} has an invalid amount.")
        if isinstance(raw_amount, (int, float)):
            amount = float(raw_amount)
        else:
            amount_text = str(raw_amount).strip()
            negative = amount_text.startswith("(") and amount_text.endswith(")")
            amount_text = re.sub(r"\b(?:cr|dr)\b", "", amount_text, flags=re.IGNORECASE)
            amount_text = re.sub(r"[₹$,\s()]", "", amount_text)
            try:
                amount = float(amount_text)
            except ValueError as exc:
                raise ValueError(f"Transaction {index} has an invalid amount.") from exc
            if negative:
                amount = -amount
        if not math.isfinite(amount):
            raise ValueError(f"Transaction {index} has a non-finite amount.")

        raw_date = str(transaction.get("date", "")).strip()
        parsed_date: Optional[date] = None
        try:
            parsed_date = datetime.fromisoformat(raw_date.replace("Z", "+00:00")).date()
        except ValueError:
            for date_format in date_formats:
                try:
                    parsed_date = datetime.strptime(raw_date, date_format).date()
                    break
                except ValueError:
                    continue
        if parsed_date is None:
            raise ValueError(f"Transaction {index} has an unsupported date.")

        normalized = {
            **transaction,
            "type": transaction_type,
            "amount": abs(amount),
            "date": parsed_date.isoformat(),
        }
        transactions.append(normalized)
    return transactions


def transactions_for_period(transactions: list[dict], period: str) -> list[dict]:
    if period == "all_time":
        return transactions
    now = datetime.now()
    current_month = now.strftime("%Y-%m")
    if period == "this_month":
        month = current_month
    elif period == "last_month":
        month = (now.replace(day=1) - timedelta(days=1)).strftime("%Y-%m")
    else:
        raise ValueError("Unsupported transaction period.")
    return [transaction for transaction in transactions if transaction["date"].startswith(month)]


def requested_period(message: str) -> Optional[str]:
    text = message.lower()
    if re.search(r"\b(last|previous|prior)\s+month\b", text):
        return "last_month"
    if re.search(r"\b(this|current)\s+month\b|\bmonth[- ]to[- ]date\b", text):
        return "this_month"
    return None


def spending(ctx: dict, period: str = "all_time") -> dict:
    txs = ctx.get("transactions", [])
    if not txs:
        return {"available": False, "reason": "No transactions are available."}
    txs = transactions_for_period(txs, period)
    if not txs:
        return {"available": False, "period": period, "reason": "No transactions are available for this period."}
    income = sum(float(t.get("amount", 0)) for t in txs if t.get("type") == "income")
    expenses = sum(float(t.get("amount", 0)) for t in txs if t.get("type") == "expense")
    cats: dict[str, float] = {}
    for t in txs:
        if t.get("type") == "expense":
            cat = str(t.get("category") or "Other")
            cats[cat] = cats.get(cat, 0) + float(t.get("amount", 0))
    top = sorted(cats.items(), key=lambda row: row[1], reverse=True)[:6]
    return {"available": True, "period": period, "total_income": round(income, 2), "total_expenses": round(expenses, 2), "net_cash_flow": round(income-expenses, 2), "transaction_count": len(txs), "top_categories": [{"category": k, "amount": round(v, 2)} for k, v in top], "chart": {"type": "bar", "title": "Spending by category", "data": [{"name": k, "value": round(v, 2)} for k, v in top], "xKey": "name", "yKey": "value"}}


def search_transactions(ctx: dict, category: Optional[str] = None, merchant: Optional[str] = None, min_amount: Optional[float] = None, max_amount: Optional[float] = None, tx_type: Optional[str] = None, period: str = "all_time") -> dict:
    rows = transactions_for_period(ctx.get("transactions", []), period)
    if category:
        rows = [t for t in rows if category.lower() in str(t.get("category", "")).lower()]
    if merchant:
        rows = [t for t in rows if merchant.lower() in (str(t.get("merchant", "")) + " " + str(t.get("description", ""))).lower()]
    if tx_type:
        rows = [t for t in rows if t.get("type") == tx_type]
    if min_amount is not None:
        rows = [t for t in rows if float(t.get("amount", 0)) >= min_amount]
    if max_amount is not None:
        rows = [t for t in rows if float(t.get("amount", 0)) <= max_amount]
    rows.sort(key=lambda t: str(t.get("date", "")), reverse=True)
    return {"period": period, "count": len(rows), "total": round(sum(float(t.get("amount", 0)) for t in rows), 2), "transactions": rows[:20], "truncated": len(rows) > 20}


def budget_status(ctx: dict) -> dict:
    budgets, txs = ctx.get("budgets", []), ctx.get("transactions", [])
    if not budgets:
        return {"available": False, "reason": "No budgets are configured."}
    month = datetime.now().strftime("%Y-%m")
    active = [b for b in budgets if not b.get("month") or b.get("month") == month]
    spent: dict[str, float] = {}
    for t in txs:
        if t.get("type") == "expense" and str(t.get("date", "")).startswith(month):
            cat = str(t.get("category", "Other"))
            spent[cat] = spent.get(cat, 0) + float(t.get("amount", 0))
    rows = []
    for b in active:
        cat, limit = str(b.get("category", "")), float(b.get("limit", 0))
        amount = spent.get(cat, 0)
        rows.append({"category": cat, "budget": limit, "spent": round(amount, 2), "remaining": round(limit-amount, 2), "utilization_pct": round(amount/limit*100, 1) if limit else 0, "status": "over" if limit and amount >= limit else "warning" if limit and amount >= limit*.85 else "ok"})
    return {"available": True, "month": month, "budgets": rows, "over_budget": [r["category"] for r in rows if r["status"] == "over"], "chart": {"type": "bar", "title": "Budget vs actual this month", "data": [{"name": r["category"], "budget": r["budget"], "spent": r["spent"]} for r in rows[:8]], "xKey": "name", "yKey": "spent"}}


def goals(ctx: dict) -> dict:
    items = ctx.get("goals", [])
    if not items:
        return {"available": False, "reason": "No savings goals are set."}
    rows = [{"name": g.get("name", ""), "target": g.get("targetAmount", 0), "saved": g.get("currentAmount", 0), "remaining": max(0, g.get("targetAmount", 0)-g.get("currentAmount", 0)), "progress_pct": round(g.get("currentAmount", 0)/g.get("targetAmount", 1)*100, 1) if g.get("targetAmount") else 0} for g in items]
    return {"available": True, "goals": rows, "chart": {"type": "bar", "title": "Savings goal progress", "data": [{"name": r["name"], "progress": r["progress_pct"]} for r in rows], "xKey": "name", "yKey": "progress"}}


def forecast(ctx: dict) -> dict:
    monthly: dict[str, float] = {}
    for t in ctx.get("transactions", []):
        key = str(t.get("date", ""))[:7]
        if len(key) == 7 and t.get("type") == "expense":
            monthly[key] = monthly.get(key, 0) + float(t.get("amount", 0))
    values = [v for _, v in sorted(monthly.items()) if v > 0]
    if len(values) < 2:
        return {"available": False, "reason": f"Only {len(values)} month(s) of expense data. At least two are needed."}
    weights = list(range(1, len(values)+1))
    estimate = sum(v*w for v, w in zip(values, weights))/sum(weights)
    mean = sum(values)/len(values)
    variance = sum((v-mean)**2 for v in values)/max(1, len(values)-1)
    margin = 1.5*(variance**.5)
    return {"available": True, "method": "Weighted moving average", "next_month_estimate": round(estimate, 2), "range_lower": round(max(0, estimate-margin), 2), "range_upper": round(estimate+margin, 2), "months_used": len(values), "note": "Statistical baseline, not machine learning. Range is estimate ± 1.5 sample standard deviations.", "chart": {"type": "line", "title": "Monthly expenses", "data": [{"name": k, "value": round(v, 2)} for k, v in sorted(monthly.items())], "xKey": "name", "yKey": "value"}}


def compare(ctx: dict) -> dict:
    txs = ctx.get("transactions", [])
    now = datetime.now()
    current = now.strftime("%Y-%m")
    previous = (now.replace(day=1) - timedelta(days=1)).strftime("%Y-%m")
    def stat(month: str) -> dict:
        subset = [t for t in txs if str(t.get("date", "")).startswith(month)]
        income = sum(float(t.get("amount", 0)) for t in subset if t.get("type") == "income")
        expenses = sum(float(t.get("amount", 0)) for t in subset if t.get("type") == "expense")
        return {"month": month, "income": round(income, 2), "expenses": round(expenses, 2), "net": round(income-expenses, 2), "count": len(subset)}
    a, b = stat(current), stat(previous)
    return {"current": a, "previous": b, "expense_change": round(a["expenses"]-b["expenses"], 2), "expense_change_pct": round((a["expenses"]-b["expenses"])/b["expenses"]*100, 1) if b["expenses"] else None, "chart": {"type": "bar", "title": "This month vs last month", "data": [{"name": "Previous", "expenses": b["expenses"]}, {"name": "Current", "expenses": a["expenses"]}], "xKey": "name", "yKey": "expenses"}}


def knowledge(ctx: dict, query: str) -> dict:
    hits = search_knowledge(query)
    return {"available": bool(hits), "results": hits, "citations": [{"source": h["source"], "text": h["text"]} for h in hits], "reason": "No matching knowledge source found." if not hits else None}


def report(ctx: dict, format: str = "pdf") -> dict:
    return generate_report(ctx, format)


TOOL_MAP = {"get_spending_summary": spending, "search_transactions": search_transactions, "get_budget_status": budget_status, "get_savings_goals": goals, "forecast_spending": forecast, "compare_months": compare, "search_knowledge": knowledge, "generate_report": report}
TOOLS = [
    {"type": "function", "function": {"name": "get_spending_summary", "description": "Summarize transactions for the requested period. Use this_month or last_month when the user asks about a month; all_time for overall totals.", "parameters": {"type": "object", "properties": {"period": {"type": "string", "enum": ["all_time", "this_month", "last_month"]}}, "required": []}}},
    {"type": "function", "function": {"name": "search_transactions", "description": "Search transactions by category, merchant, amount, type, and period. Use a month period when asked.", "parameters": {"type": "object", "properties": {"category": {"type": "string"}, "merchant": {"type": "string"}, "min_amount": {"type": "number"}, "max_amount": {"type": "number"}, "tx_type": {"type": "string", "enum": ["income", "expense"]}, "period": {"type": "string", "enum": ["all_time", "this_month", "last_month"]}}, "required": []}}},
    {"type": "function", "function": {"name": "get_budget_status", "description": "Compare current month category budgets with uploaded expenses.", "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {"name": "get_savings_goals", "description": "Show uploaded savings goals and progress.", "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {"name": "forecast_spending", "description": "Estimate next month spending from monthly history using a weighted moving average.", "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {"name": "compare_months", "description": "Compare this month's transactions with last month.", "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {"name": "search_knowledge", "description": "Retrieve cited financial education sources for a finance concept.", "parameters": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}}},
    {"type": "function", "function": {"name": "generate_report", "description": "Create a downloadable PDF, Excel, or CSV report from uploaded transactions.", "parameters": {"type": "object", "properties": {"format": {"type": "string", "enum": ["pdf", "excel", "csv"]}}, "required": ["format"]}}},
]
SYSTEM_PROMPT = """You are FinSight AI, a financial co-pilot. Never invent numbers; state only values returned by tools. If uploaded transactions are unavailable, do not answer questions about the user's finances. Use tools for user-data and financial-education questions. Format INR as ₹1,23,456. Keep answers concise. For knowledge results, cite the exact source at the end. For forecasts, say they are a statistical baseline, not ML. For reports, say the download is ready. Do not provide personalized investment, tax, or legal advice."""


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


def event(name: str, payload: dict) -> str:
    return f"event: {name}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"


async def run_agent(user_message: str, context: dict):
    try:
        normalized_context = {**context, "transactions": normalize_transactions(context)}
    except ValueError as exc:
        logger.warning("Rejected invalid financial context: %s", exc)
        yield event("error", {"message": "Some uploaded transaction data is invalid, so I can’t calculate an accurate answer. Please review or re-import the statement."})
        return

    transactions = normalized_context["transactions"]
    if not transactions:
        results = search_knowledge(user_message)
        if results:
            result = results[0]
            message = (
                "I don't have uploaded transactions to analyze, so this is general information, "
                "not an analysis of your finances.\n\n"
                f"{result['text']}\n\nSource: {result['source']}"
            )
        else:
            message = (
                "I don't have any transactions to analyze yet. Please upload a bank statement "
                "from Statements (CSV, PDF, or Excel), then ask me about your financial data."
            )
        yield event("token", {"content": message})
        yield event("done", {})
        return

    api_key = os.getenv("GROQ_API_KEY", "")
    if not is_configured():
        yield event("error", {"message": "Backend is not configured. Add GROQ_API_KEY to backend/.env and restart the server."})
        return
    client = AsyncGroq(api_key=api_key)
    messages = [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": user_message}]
    tool_calls_made = False
    for _ in range(5):
        try:
            stream = await client.chat.completions.create(model=MODEL, messages=messages, tools=TOOLS, tool_choice="required", temperature=0.2, max_tokens=1024, stream=True)
            content, calls = "", {}
            async for chunk in stream:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta
                for tc in (delta.tool_calls or []):
                    part = calls.setdefault(tc.index, {"id": "", "name": "", "arguments": ""})
                    if tc.id: part["id"] = tc.id
                    if tc.function and tc.function.name: part["name"] += tc.function.name
                    if tc.function and tc.function.arguments: part["arguments"] += tc.function.arguments
                if delta.content:
                    content += delta.content
            if not calls:
                if not tool_calls_made:
                    logger.error("Groq returned a chat response without the required tool call.")
                    yield event("error", {"message": "The assistant could not verify an answer from your financial data. Please try again."})
                    return
                if content:
                    yield event("token", {"content": content})
                yield event("done", {})
                return
            tool_calls_made = True
            messages.append({"role": "assistant", "content": None, "tool_calls": [{"id": c["id"], "type": "function", "function": {"name": c["name"], "arguments": c["arguments"]}} for c in calls.values()]})
            for call in calls.values():
                name = call["name"]
                yield event("tool", {"name": name})
                try:
                    args = json.loads(call["arguments"] or "{}")
                    if not isinstance(args, dict):
                        raise ValueError("Tool arguments must be a JSON object.")
                    if name not in TOOL_MAP:
                        raise ValueError("The model requested an unknown tool.")
                    period = requested_period(user_message)
                    if period and name in {"get_spending_summary", "search_transactions"}:
                        args["period"] = period
                    result = TOOL_MAP[name](normalized_context, **args)
                except (TypeError, ValueError, KeyError) as exc:
                    logger.warning("Tool %r rejected its arguments: %s", name, exc)
                    yield event("error", {"message": f"The {name.replace('_', ' ')} tool could not complete. Please try rephrasing your request."})
                    return
                except Exception:
                    logger.exception("Tool %r failed", name)
                    yield event("error", {"message": f"The {name.replace('_', ' ')} tool failed. Please try again."})
                    return
                if result.get("available") is False or (
                    name == "search_transactions" and result.get("count") == 0
                ):
                    yield event("token", {"content": "No data found for that request in your uploaded financial data."})
                    yield event("done", {})
                    return
                if result.get("chart"):
                    yield event("chart", result["chart"])
                if result.get("citations"):
                    yield event("citations", result["citations"])
                if result.get("type") == "download":
                    yield event("download", result)
                model_result = {key: value for key, value in result.items() if key != "content_base64"}
                messages.append({"role": "tool", "tool_call_id": call["id"], "content": json.dumps(model_result, ensure_ascii=False)})
        except Exception:
            logger.exception("Groq chat completion failed")
            yield event("error", {"message": "The assistant request failed. Check the backend key and provider availability, then try again."})
            return
    yield event("error", {"message": "The agent reached its tool-call limit. Please try a more specific question."})


@app.get("/health")
def health():
    return {"ok": True, "configured": is_configured(), "model": MODEL, "tools": list(TOOL_MAP)}


@app.post("/api/auth/sign-in")
def sign_in(req: SignInRequest):
    email = req.email.strip().lower()
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise HTTPException(status_code=422, detail="Enter a valid email address.")
    try:
        user = database.authenticate_user(email, req.password)
    except database.InvalidCredentialsError:
        raise HTTPException(status_code=401, detail="The email or password is incorrect.") from None
    return create_session_response(user)


@app.post("/api/auth/sign-up", status_code=201)
def sign_up(req: SignUpRequest):
    name = req.name.strip()
    email = req.email.strip().lower()
    if len(name) < 2:
        raise HTTPException(status_code=422, detail="Name must contain at least two characters.")
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise HTTPException(status_code=422, detail="Enter a valid email address.")
    try:
        user = database.create_user(name, email, req.password)
    except database.DuplicateUserError:
        raise HTTPException(status_code=409, detail="An account with that email already exists.") from None
    return create_session_response(user)


@app.get("/api/auth/me")
def get_current_user(user: dict[str, str] = Depends(current_user)):
    return {"user": user}


@app.post("/api/auth/sign-out", status_code=204)
def sign_out(user: dict[str, str] = Depends(current_user), credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    del user
    database.delete_session(credentials.credentials)
    return None


@app.get("/api/finance/snapshot")
def get_finance_snapshot(user: dict[str, str] = Depends(current_user)):
    return {"snapshot": database.get_finance_snapshot(user["id"])}


@app.put("/api/finance/snapshot")
def put_finance_snapshot(
    req: FinanceSnapshotRequest,
    user: dict[str, str] = Depends(current_user),
):
    validate_finance_snapshot(req.snapshot)
    try:
        database.save_finance_snapshot(user["id"], req.snapshot)
    except database.SnapshotLockedError:
        raise HTTPException(
            status_code=409,
            detail="A statement has already been imported. Reset your finance data before importing another file.",
        ) from None
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=f"Finance snapshot could not be saved: {exc}") from None
    return {"saved": True}


@app.delete("/api/finance/snapshot", status_code=204)
def clear_finance_snapshot(user: dict[str, str] = Depends(current_user)):
    database.delete_finance_snapshot(user["id"])
    return None


@app.post("/api/chat/stream")
async def chat_stream(req: ChatRequest, user: dict[str, str] = Depends(current_user)):
    snapshot = database.get_finance_snapshot(user["id"]) or {}
    context = {
        "transactions": snapshot.get("transactions", []),
        "budgets": [
            {
                "category": allocation.get("category"),
                "limit": allocation.get("amount"),
                "month": plan.get("month"),
            }
            for plan in snapshot.get("budgetPlans", [])
            for allocation in plan.get("categoryAllocations", [])
        ],
        "goals": [
            {
                "name": goal.get("name"),
                "targetAmount": goal.get("targetAmount"),
                "currentAmount": goal.get("currentAmount"),
            }
            for goal in snapshot.get("savingsGoals", [])
        ],
    }
    return StreamingResponse(run_agent(req.message.strip(), context), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"})
