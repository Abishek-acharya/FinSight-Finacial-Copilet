"""FinSight AI streaming agent. Financial calculations stay in deterministic tools."""
import json
import logging
import os
from datetime import datetime, timedelta
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from groq import AsyncGroq

from knowledge import search_knowledge
from reports import generate_report

logger = logging.getLogger(__name__)
load_dotenv()
MODEL = "llama-3.3-70b-versatile"
app = FastAPI(title="FinSight AI Agent")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], allow_methods=["GET", "POST"], allow_headers=["Content-Type"])


def is_configured() -> bool:
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    return bool(api_key and not api_key.startswith("gsk_your"))


def spending(ctx: dict) -> dict:
    txs = ctx.get("transactions", [])
    if not txs:
        return {"available": False, "reason": "No transactions are available."}
    income = sum(float(t.get("amount", 0)) for t in txs if t.get("type") == "income")
    expenses = sum(float(t.get("amount", 0)) for t in txs if t.get("type") == "expense")
    cats: dict[str, float] = {}
    for t in txs:
        if t.get("type") == "expense":
            cat = str(t.get("category") or "Other")
            cats[cat] = cats.get(cat, 0) + float(t.get("amount", 0))
    top = sorted(cats.items(), key=lambda row: row[1], reverse=True)[:6]
    return {"available": True, "total_income": round(income, 2), "total_expenses": round(expenses, 2), "net_cash_flow": round(income-expenses, 2), "transaction_count": len(txs), "top_categories": [{"category": k, "amount": round(v, 2)} for k, v in top], "chart": {"type": "bar", "title": "Spending by category", "data": [{"name": k, "value": round(v, 2)} for k, v in top], "xKey": "name", "yKey": "value"}}


def search_transactions(ctx: dict, category: Optional[str] = None, merchant: Optional[str] = None, min_amount: Optional[float] = None, max_amount: Optional[float] = None, tx_type: Optional[str] = None) -> dict:
    rows = ctx.get("transactions", [])
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
    return {"count": len(rows), "total": round(sum(float(t.get("amount", 0)) for t in rows), 2), "transactions": rows[:20], "truncated": len(rows) > 20}


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
    {"type": "function", "function": {"name": "get_spending_summary", "description": "Summarize uploaded income, expenses, net cash flow and categories.", "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {"name": "search_transactions", "description": "Search uploaded transactions by category, merchant, amount, or type.", "parameters": {"type": "object", "properties": {"category": {"type": "string"}, "merchant": {"type": "string"}, "min_amount": {"type": "number"}, "max_amount": {"type": "number"}, "tx_type": {"type": "string", "enum": ["income", "expense"]}}, "required": []}}},
    {"type": "function", "function": {"name": "get_budget_status", "description": "Compare current month category budgets with uploaded expenses.", "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {"name": "get_savings_goals", "description": "Show uploaded savings goals and progress.", "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {"name": "forecast_spending", "description": "Estimate next month spending from monthly history using a weighted moving average.", "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {"name": "compare_months", "description": "Compare this month's transactions with last month.", "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {"name": "search_knowledge", "description": "Retrieve cited financial education sources for a finance concept.", "parameters": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}}},
    {"type": "function", "function": {"name": "generate_report", "description": "Create a downloadable PDF, Excel, or CSV report from uploaded transactions.", "parameters": {"type": "object", "properties": {"format": {"type": "string", "enum": ["pdf", "excel", "csv"]}}, "required": ["format"]}}},
]
SYSTEM_PROMPT = """You are FinSight AI, a financial co-pilot. Use tools for every user-data or financial-education question. Never invent numbers: state only values in tool results, and explain when data is missing. Format INR as ₹1,23,456. Keep answers concise. For knowledge results, cite the exact source at the end. For forecasts, say they are a statistical baseline, not ML. For reports, say the download is ready. Do not provide personalized investment, tax, or legal advice."""


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    financial_context: Optional[dict] = None


def event(name: str, payload: dict) -> str:
    return f"event: {name}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"


async def run_agent(user_message: str, context: dict):
    api_key = os.getenv("GROQ_API_KEY", "")
    if not is_configured():
        yield event("error", {"message": "Backend is not configured. Add GROQ_API_KEY to backend/.env and restart the server."})
        return
    client = AsyncGroq(api_key=api_key)
    messages = [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": user_message}]
    for _ in range(5):
        try:
            stream = await client.chat.completions.create(model=MODEL, messages=messages, tools=TOOLS, tool_choice="auto", temperature=0.2, max_tokens=1024, stream=True)
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
                    yield event("token", {"content": delta.content})
            if not calls:
                yield event("done", {})
                return
            messages.append({"role": "assistant", "content": content or None, "tool_calls": [{"id": c["id"], "type": "function", "function": {"name": c["name"], "arguments": c["arguments"]}} for c in calls.values()]})
            for call in calls.values():
                name = call["name"]
                yield event("tool", {"name": name})
                try:
                    args = json.loads(call["arguments"] or "{}")
                    if not isinstance(args, dict):
                        raise ValueError("Tool arguments must be a JSON object.")
                    if name not in TOOL_MAP:
                        raise ValueError("The model requested an unknown tool.")
                    result = TOOL_MAP[name](context, **args)
                except (TypeError, ValueError, KeyError) as exc:
                    logger.warning("Tool %r rejected its arguments: %s", name, exc)
                    yield event("error", {"message": f"The {name.replace('_', ' ')} tool could not complete. Please try rephrasing your request."})
                    return
                except Exception:
                    logger.exception("Tool %r failed", name)
                    yield event("error", {"message": f"The {name.replace('_', ' ')} tool failed. Please try again."})
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


@app.post("/api/chat/stream")
async def chat_stream(req: ChatRequest):
    context = req.financial_context or {"transactions": [], "budgets": [], "goals": []}
    return StreamingResponse(run_agent(req.message.strip(), context), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"})
