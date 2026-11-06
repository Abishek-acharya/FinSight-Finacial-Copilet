"""Small deterministic financial knowledge base with source labels."""

KNOWLEDGE_BASE = [
    {"id": "budget-50-30-20", "source": "FinSight Budgeting Primer §2", "keywords": {"budget", "budgeting", "50/30/20", "allocation", "rule"}, "text": "The 50/30/20 rule is a starting heuristic: 50% of income for needs, 30% for wants, and 20% for savings and debt repayment. Adjust it to your circumstances."},
    {"id": "emergency-fund", "source": "FinSight Savings Guide §3", "keywords": {"emergency", "fund", "savings", "liquid", "months"}, "text": "An emergency fund commonly targets 3–6 months of essential expenses and should be kept accessible. The right amount depends on personal circumstances."},
    {"id": "compound-interest", "source": "FinSight Interest Concepts §4", "keywords": {"compound", "interest", "compounding", "growth", "formula"}, "text": "Compound interest is earned on principal and accumulated interest. A = P(1 + r/n)^(nt), where P is principal, r annual rate, n compounding frequency, and t years."},
    {"id": "emi", "source": "FinSight Loan & EMI Guide §5", "keywords": {"emi", "loan", "interest", "repayment", "principal", "installment"}, "text": "For a fixed-rate loan, EMI = [P × r × (1+r)^n] / [(1+r)^n − 1], with P principal, r monthly interest rate, and n number of instalments."},
    {"id": "upi", "source": "FinSight Digital Banking §6", "keywords": {"upi", "digital", "payment", "transfer", "neft", "imps"}, "text": "UPI is an instant bank-to-bank payment system. Transfers between a person's own accounts should not be counted as consumption spending."},
    {"id": "inflation", "source": "FinSight Inflation Primer §7", "keywords": {"inflation", "purchasing", "power", "cost", "rbi"}, "text": "Inflation reduces purchasing power over time. Real return is approximately the nominal return minus inflation, before taxes and fees."},
    {"id": "credit-score", "source": "FinSight Credit Guide §8", "keywords": {"credit", "score", "cibil", "report", "rating"}, "text": "CIBIL scores range from 300–900. Payment history, credit utilisation, credit age, credit mix, and recent enquiries can affect a score."},
    {"id": "sip", "source": "FinSight Investment Basics §9", "keywords": {"sip", "mutual", "fund", "investment", "systematic"}, "text": "A Systematic Investment Plan invests a fixed amount at regular intervals. Returns are not guaranteed and mutual fund investments are subject to market risk."},
]


def search_knowledge(query: str, k: int = 2) -> list[dict]:
    terms = set(query.lower().replace("?", "").replace(",", "").split())
    scored = []
    for item in KNOWLEDGE_BASE:
        score = len(terms & item["keywords"]) + sum(2 for word in item["keywords"] if word in query.lower())
        if score:
            scored.append((score, item))
    scored.sort(key=lambda row: row[0], reverse=True)
    return [{**{key: value for key, value in item.items() if key != "keywords"}, "relevance": score} for score, item in scored[:k]]
