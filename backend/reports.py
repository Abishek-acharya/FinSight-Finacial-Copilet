"""Generate downloadable reports from the request's financial snapshot."""
import base64
import csv
from datetime import datetime
from io import BytesIO, StringIO


def _rows(context: dict) -> list[dict]:
    rows = context.get("transactions", [])
    return [row for row in rows if isinstance(row, dict) and isinstance(row.get("amount"), (int, float))]


def _spreadsheet_value(value: object) -> object:
    if isinstance(value, str) and value.lstrip(" \t\r\n").startswith(("=", "+", "-", "@")):
        return f"'{value}"
    return value


def generate_report(context: dict, format: str = "pdf") -> dict:
    fmt = format.lower()
    transactions = sorted(_rows(context), key=lambda row: str(row.get("date", "")), reverse=True)
    stamp = datetime.now().strftime("%Y%m%d")
    if fmt == "csv":
        out = StringIO()
        writer = csv.writer(out)
        writer.writerow(["Date", "Merchant", "Description", "Category", "Type", "Amount"])
        for row in transactions:
            writer.writerow([_spreadsheet_value(row.get(field, "")) for field in ("date", "merchant", "description", "category", "type")] + [row.get("amount", 0)])
        content, filename, mime = out.getvalue().encode("utf-8-sig"), f"finsight-transactions-{stamp}.csv", "text/csv"
    elif fmt in ("excel", "xlsx", "xls"):
        from openpyxl import Workbook
        wb = Workbook()
        ws = wb.active
        ws.title = "Transactions"
        ws.append(["Date", "Merchant", "Description", "Category", "Type", "Amount"])
        for row in transactions:
            ws.append([_spreadsheet_value(row.get(field, "")) for field in ("date", "merchant", "description", "category", "type")] + [row.get("amount", 0)])
        buf = BytesIO()
        wb.save(buf)
        content, filename, mime = buf.getvalue(), f"finsight-transactions-{stamp}.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    elif fmt == "pdf":
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import cm
        from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table
        from reportlab.lib.styles import getSampleStyleSheet
        buf = BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4, rightMargin=1.5*cm, leftMargin=1.5*cm)
        data = [["Date", "Merchant", "Category", "Type", "INR"]]
        data += [[str(r.get("date", ""))[:10], str(r.get("merchant", ""))[:28], str(r.get("category", ""))[:20], str(r.get("type", "")), f"₹{r.get('amount', 0):,.2f}"] for r in transactions[:500]]
        story = [Paragraph("FinSight AI — Transaction Report", getSampleStyleSheet()["Title"]), Spacer(1, 0.5*cm), Paragraph(f"Generated {datetime.now():%d %B %Y} · {len(transactions)} transactions", getSampleStyleSheet()["Normal"]), Spacer(1, 0.5*cm), Table(data, repeatRows=1)]
        doc.build(story)
        content, filename, mime = buf.getvalue(), f"finsight-report-{stamp}.pdf", "application/pdf"
    else:
        raise ValueError("Choose pdf, excel, or csv.")
    return {"type": "download", "format": "excel" if fmt in ("excel", "xlsx", "xls") else fmt, "filename": filename, "mime": mime, "content_base64": base64.b64encode(content).decode("ascii"), "summary": f"{len(transactions)} transactions"}
