"""Generate downloadable reports from the request's financial snapshot."""
import base64
import csv
import html
import re
from datetime import datetime
from io import BytesIO, StringIO
from pathlib import Path


def _collect_data(context: dict) -> dict:
    transactions = _rows(context)
    income = [transaction for transaction in transactions if transaction.get("type") == "income"]
    expenses = [transaction for transaction in transactions if transaction.get("type") == "expense"]
    total_income = sum(float(transaction.get("amount", 0)) for transaction in income)
    total_expenses = sum(float(transaction.get("amount", 0)) for transaction in expenses)
    categories: dict[str, float] = {}
    for transaction in expenses:
        category = str(transaction.get("category") or "Other")
        categories[category] = categories.get(category, 0) + float(transaction.get("amount", 0))
    return {
        "total_income": total_income,
        "total_expenses": total_expenses,
        "net": total_income - total_expenses,
        "savings_rate": total_income and (total_income - total_expenses) / total_income * 100 or 0,
        "transaction_count": len(transactions),
        "by_category": sorted(categories.items(), key=lambda item: item[1], reverse=True),
        "all_txs": sorted(transactions, key=lambda row: str(row.get("date", "")), reverse=True),
    }


def _inr(amount: float) -> str:
    rounded = round(amount)
    digits = str(abs(rounded))
    if len(digits) <= 3:
        grouped = digits
    else:
        last_three, rest = digits[-3:], digits[:-3]
        groups = []
        while rest:
            groups.insert(0, rest[-2:])
            rest = rest[:-2]
        grouped = ",".join(groups + [last_three])
    return f"₹{'-' if rounded < 0 else ''}{grouped}"


def _register_pdf_fonts() -> tuple[str, str]:
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont

    candidates = (
        (Path("C:/Windows/Fonts/segoeui.ttf"), Path("C:/Windows/Fonts/segoeuib.ttf")),
        (Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"), Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")),
    )
    for regular_path, bold_path in candidates:
        if regular_path.exists() and bold_path.exists():
            regular_name, bold_name = "FinSightSans", "FinSightSans-Bold"
            if regular_name not in pdfmetrics.getRegisteredFontNames():
                pdfmetrics.registerFont(TTFont(regular_name, str(regular_path)))
                pdfmetrics.registerFont(TTFont(bold_name, str(bold_path)))
            return regular_name, bold_name
    return "Helvetica", "Helvetica-Bold"


def _clean_markdown(text: str) -> str:
    escaped = html.escape(text or "")
    escaped = re.sub(r"\*\*(.*?)\*\*", r"<b>\1</b>", escaped)
    return escaped.replace("\n", "<br/>")


def _pie_chart(data: list[tuple[str, float]]):
    from reportlab.graphics.charts.piecharts import Pie
    from reportlab.graphics.shapes import Drawing
    from reportlab.lib import colors

    drawing = Drawing(400, 200)
    pie = Pie()
    pie.x, pie.y, pie.width, pie.height = 145, 10, 180, 180
    pie.data = [value for _, value in data]
    pie.labels = [name for name, _ in data]
    pie.slices.strokeWidth = 0.5
    pie.slices.strokeColor = colors.white
    palette = [colors.HexColor("#0A192F"), colors.HexColor("#6B46C1"), colors.HexColor("#3B82F6"), colors.HexColor("#A855F7"), colors.HexColor("#64748B")]
    for index in range(len(data)):
        pie.slices[index].fillColor = palette[index % len(palette)]
    drawing.add(pie)
    return drawing


def _bar_chart(data: list[tuple[str, float]]):
    from reportlab.graphics.charts.barcharts import VerticalBarChart
    from reportlab.graphics.shapes import Drawing
    from reportlab.lib import colors

    drawing = Drawing(400, 200)
    chart = VerticalBarChart()
    chart.x, chart.y, chart.width, chart.height = 50, 40, 350, 125
    chart.data = [[value for _, value in data]]
    chart.categoryAxis.categoryNames = [name for name, _ in data]
    chart.bars[0].fillColor = colors.HexColor("#6B46C1")
    chart.valueAxis.valueMin = 0
    drawing.add(chart)
    return drawing


def generate_ai_pdf(context: dict, ai_summary: str, ai_action_plan: str) -> dict:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import cm
    from reportlab.platypus import LongTable, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    data = _collect_data(context)
    navy = colors.HexColor("#0A192F")
    purple = colors.HexColor("#6B46C1")
    light_purple = colors.HexColor("#F3E8FF")
    gray = colors.HexColor("#64748B")
    light_gray = colors.HexColor("#F8FAFC")
    border = colors.HexColor("#E2E8F0")
    regular_font, bold_font = _register_pdf_fonts()
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("AiTitle", parent=styles["Heading1"], fontName=bold_font, fontSize=28, textColor=navy, spaceAfter=10, alignment=1)
    subtitle_style = ParagraphStyle("AiSubtitle", parent=styles["Normal"], fontName=regular_font, fontSize=14, textColor=gray, alignment=1)
    heading_style = ParagraphStyle("AiHeading", parent=styles["Heading2"], fontName=bold_font, fontSize=18, textColor=navy, spaceBefore=18, spaceAfter=12)
    body_style = ParagraphStyle("AiBody", parent=styles["Normal"], fontName=regular_font, fontSize=10, leading=15, textColor=gray)

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=2 * cm, bottomMargin=2 * cm, leftMargin=2 * cm, rightMargin=2 * cm)

    def header_footer(canvas, document) -> None:
        canvas.saveState()
        canvas.setStrokeColor(border)
        canvas.line(2 * cm, 28 * cm, 19 * cm, 28 * cm)
        canvas.setFont(bold_font, 8)
        canvas.setFillColor(gray)
        canvas.drawString(2 * cm, 28.2 * cm, "FinSight AI - Premium Financial Intelligence Report")
        canvas.setFont(regular_font, 8)
        canvas.drawString(2 * cm, 1.4 * cm, "Confidential - Generated by FinSight AI")
        canvas.drawRightString(19 * cm, 1.4 * cm, f"Page {document.page}")
        canvas.restoreState()

    cover = [
        [Paragraph("<b>Report Generated</b>", body_style), datetime.now().strftime("%d %B %Y, %I:%M %p")],
        [Paragraph("<b>Total Transactions Analyzed</b>", body_style), str(data["transaction_count"])],
        [Paragraph("<b>Currency</b>", body_style), "INR (₹)"],
    ]
    cover_table = Table(cover, colWidths=[6 * cm, 8 * cm])
    cover_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), light_gray),
        ("TEXTCOLOR", (0, 0), (-1, -1), navy),
        ("FONTNAME", (0, 0), (-1, -1), regular_font),
        ("PADDING", (0, 0), (-1, -1), 12),
        ("LINEBELOW", (0, 0), (-1, -1), 1, colors.white),
    ]))
    story = [Spacer(1, 3 * cm), Paragraph("FinSight AI", title_style), Paragraph("Premium Financial Intelligence Report", subtitle_style), Spacer(1, 1.5 * cm), cover_table, PageBreak()]
    story.extend([Paragraph("Executive Summary", heading_style), Paragraph(_clean_markdown(ai_summary), body_style), Spacer(1, 0.8 * cm), Paragraph("Financial KPIs", heading_style)])
    kpi_data = [
        [Paragraph("<b>Total Income</b>", body_style), Paragraph("<b>Total Expenses</b>", body_style), Paragraph("<b>Net Savings</b>", body_style)],
        [Paragraph(f"<font color='#10B981'><b>{_inr(data['total_income'])}</b></font>", body_style), Paragraph(f"<font color='#EF4444'><b>{_inr(data['total_expenses'])}</b></font>", body_style), Paragraph(f"<font color='#0A192F'><b>{_inr(data['net'])}</b></font>", body_style)],
    ]
    kpi_table = Table(kpi_data, colWidths=[5 * cm] * 3)
    kpi_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), light_gray),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOX", (0, 0), (-1, -1), 1, navy),
        ("INNERGRID", (0, 0), (-1, -1), 1, colors.white),
        ("TOPPADDING", (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
    ]))
    story.extend([kpi_table, Spacer(1, 0.8 * cm), Paragraph("Financial Breakdown", heading_style)])
    if data["by_category"]:
        story.extend([Paragraph("<b>Top Spending Categories</b>", body_style), _pie_chart(data["by_category"][:5]), Spacer(1, 0.5 * cm)])
    story.extend([Paragraph("<b>Income vs Expense</b>", body_style), _bar_chart([("Income", data["total_income"]), ("Expense", data["total_expenses"])]), PageBreak(), Paragraph("Personalized Action Plan", heading_style), Paragraph(_clean_markdown(ai_action_plan), body_style), Spacer(1, 1.2 * cm), Paragraph("Transaction Appendix", heading_style)])
    transaction_data = [["Date", "Merchant", "Category", "Type", "Amount"]]
    transaction_data.extend([
        [str(row.get("date", ""))[:10], str(row.get("merchant", ""))[:24], str(row.get("category", ""))[:18], str(row.get("type", "")).capitalize(), _inr(float(row.get("amount", 0)))]
        for row in data["all_txs"][:500]
    ])
    transaction_table = LongTable(transaction_data, colWidths=[2.5 * cm, 5.5 * cm, 4 * cm, 2.5 * cm, 3 * cm], repeatRows=1)
    transaction_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), navy),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), bold_font),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, light_gray]),
        ("ALIGN", (4, 1), (4, -1), "RIGHT"),
        ("PADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, border),
    ]))
    story.append(transaction_table)
    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    stamp = datetime.now().strftime("%Y%m%d")
    return {"type": "download", "format": "pdf", "filename": f"FinSight_Report_{stamp}.pdf", "mime": "application/pdf", "content_base64": base64.b64encode(buf.getvalue()).decode("ascii"), "summary": "Premium AI PDF Report"}


def generate_ai_2page_pdf(
    context: dict,
    executive_summary: str,
    insights: str,
    recommendations: str,
    methodology: str,
) -> dict:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import cm
    from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    data = _collect_data(context)
    navy = colors.HexColor("#0A192F")
    purple = colors.HexColor("#6B46C1")
    gray = colors.HexColor("#64748B")
    light_gray = colors.HexColor("#F8FAFC")
    border = colors.HexColor("#E2E8F0")
    regular_font, bold_font = _register_pdf_fonts()
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("TwoPageTitle", parent=styles["Heading1"], fontName=bold_font, fontSize=24, leading=28, textColor=navy, alignment=1, spaceAfter=5)
    subtitle_style = ParagraphStyle("TwoPageSubtitle", parent=styles["Normal"], fontName=regular_font, fontSize=9, textColor=gray, alignment=1)
    heading_style = ParagraphStyle("TwoPageHeading", parent=styles["Heading2"], fontName=bold_font, fontSize=14, leading=17, textColor=navy, spaceBefore=7, spaceAfter=5)
    body_style = ParagraphStyle("TwoPageBody", parent=styles["Normal"], fontName=regular_font, fontSize=8.5, leading=11, textColor=colors.black)
    small_style = ParagraphStyle("TwoPageSmall", parent=body_style, fontSize=7.5, leading=9, textColor=gray)

    monthly: dict[str, dict[str, float]] = {}
    for transaction in data["all_txs"]:
        month = str(transaction.get("date", ""))[:7]
        if len(month) != 7:
            continue
        row = monthly.setdefault(month, {"income": 0, "expense": 0})
        transaction_type = transaction.get("type")
        if transaction_type in row:
            row[transaction_type] += float(transaction.get("amount", 0))
    trend_rows = sorted(monthly.items())[-6:]
    period_label = f"{trend_rows[0][0]} to {trend_rows[-1][0]}" if trend_rows else "All uploaded data"

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=1.5 * cm, bottomMargin=1.5 * cm, leftMargin=1.5 * cm, rightMargin=1.5 * cm)

    def decorations(canvas, document) -> None:
        canvas.saveState()
        canvas.setFont(bold_font, 8)
        canvas.setFillColor(gray)
        canvas.drawString(1.5 * cm, 28.5 * cm, "FinSight AI - Financial Intelligence Report")
        canvas.setStrokeColor(border)
        canvas.line(1.5 * cm, 28.3 * cm, 19.5 * cm, 28.3 * cm)
        canvas.setFont(regular_font, 8)
        canvas.drawString(1.5 * cm, 1 * cm, "Confidential. Generated securely via FinSight AI.")
        canvas.drawRightString(19.5 * cm, 1 * cm, f"Page {document.page:02d} / 02")
        canvas.restoreState()

    kpi_data = [
        ["Total Income", "Total Expenses", "Net Cash Flow", "Savings Rate"],
        [Paragraph(f"<font color='#10B981'><b>{_inr(data['total_income'])}</b></font>", body_style), Paragraph(f"<font color='#EF4444'><b>{_inr(data['total_expenses'])}</b></font>", body_style), Paragraph(f"<font color='#0A192F'><b>{_inr(data['net'])}</b></font>", body_style), Paragraph(f"<font color='#6B46C1'><b>{data['savings_rate']:.1f}%</b></font>", body_style)],
    ]
    kpi_table = Table(kpi_data, colWidths=[4.5 * cm] * 4)
    kpi_table.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), light_gray), ("ALIGN", (0, 0), (-1, -1), "CENTER"), ("PADDING", (0, 0), (-1, -1), 7), ("BOX", (0, 0), (-1, -1), 1, border)]))
    chart_table = Table([[Paragraph("<b>Expense Distribution</b>", body_style), Paragraph("<b>Income vs Expense</b>", body_style)], [_pie_chart(data["by_category"][:4]) if data["by_category"] else Paragraph("No expense categories", small_style), _bar_chart([("Income", data["total_income"]), ("Expense", data["total_expenses"])])]], colWidths=[9 * cm, 9 * cm])
    chart_table.setStyle(TableStyle([("ALIGN", (0, 0), (-1, -1), "CENTER"), ("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
    trend_table_data = [["Month", "Income", "Expense", "Net"]] + [[month, _inr(values["income"]), _inr(values["expense"]), _inr(values["income"] - values["expense"])] for month, values in trend_rows]
    trend_table = Table(trend_table_data, colWidths=[4 * cm, 4.5 * cm, 4.5 * cm, 4.5 * cm])
    trend_table.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), navy), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white), ("ALIGN", (1, 1), (-1, -1), "RIGHT"), ("GRID", (0, 0), (-1, -1), 0.5, border), ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, light_gray]), ("PADDING", (0, 0), (-1, -1), 5)]))

    story = [Spacer(1, 0.5 * cm), Paragraph("Financial Overview", title_style), Paragraph(f"Reporting Period: {period_label}", subtitle_style), Spacer(1, 0.4 * cm), kpi_table, Spacer(1, 0.3 * cm), Paragraph("Executive Summary", heading_style), Paragraph(_clean_markdown(executive_summary)[:900], body_style), Spacer(1, 0.25 * cm), chart_table, Spacer(1, 0.2 * cm), Paragraph("Monthly Trends", heading_style), trend_table, PageBreak(), Spacer(1, 0.5 * cm), Paragraph("AI Financial Intelligence", title_style), Spacer(1, 0.2 * cm), Paragraph("Spending Behaviour & Insights", heading_style), Paragraph(_clean_markdown(insights)[:1100], body_style), Paragraph("Personalized Recommendations", heading_style), Paragraph(_clean_markdown(recommendations)[:1100], body_style), Paragraph("Overall Financial Assessment", heading_style)]
    health = "Healthy" if data["savings_rate"] > 20 else "Needs Attention" if data["savings_rate"] > 0 else "Critical"
    story.extend([Paragraph(f"<b>Current Status: {health}</b>. Your savings rate is <b>{data['savings_rate']:.1f}%</b>, based on verified uploaded transactions.", body_style), Paragraph("Data Methodology & Limitations", heading_style), Paragraph(_clean_markdown(methodology)[:500] + "<br/><br/>All totals were calculated by the backend from the authenticated finance snapshot. Transfers are not treated as income or expenses.", small_style)])
    doc.build(story, onFirstPage=decorations, onLaterPages=decorations)
    stamp = datetime.now().strftime("%Y%m%d")
    return {"type": "download", "format": "pdf", "filename": f"FinSight_Report_{stamp}.pdf", "mime": "application/pdf", "content_base64": base64.b64encode(buf.getvalue()).decode("ascii"), "summary": "2-Page AI Financial Report"}


def _rows(context: dict) -> list[dict]:
    rows = context.get("transactions", [])
    return [row for row in rows if isinstance(row, dict) and isinstance(row.get("amount"), (int, float))]


def _spreadsheet_value(value: object) -> object:
    if isinstance(value, str) and value.lstrip(" \t\r\n").startswith(("=", "+", "-", "@")):
        return f"'{value}"
    return value


def _unusual_transactions(transactions: list[dict]) -> list[dict]:
    expenses = sorted(
        [float(row.get("amount", 0)) for row in transactions if row.get("type") == "expense" and str(row.get("category", "")).lower() != "transfers"],
    )
    if len(expenses) < 5:
        return []
    q1 = expenses[(len(expenses) - 1) // 4]
    q3 = expenses[((len(expenses) - 1) * 3) // 4]
    upper_bound = q3 + 1.5 * (q3 - q1)
    return [
        row for row in transactions
        if row.get("type") == "expense"
        and str(row.get("category", "")).lower() != "transfers"
        and float(row.get("amount", 0)) > upper_bound
    ]


def _verification_qr(url: str):
    from reportlab.graphics.barcode.qr import QrCodeWidget
    from reportlab.graphics.shapes import Drawing

    widget = QrCodeWidget(url)
    x1, y1, x2, y2 = widget.getBounds()
    drawing_size = 2.4 * 72 / 2.54
    drawing = Drawing(drawing_size, drawing_size)
    drawing.add(widget)
    drawing.scale(drawing_size / (x2 - x1), drawing_size / (y2 - y1))
    return drawing


def generate_report(context: dict, format: str = "pdf", verification_url: str | None = None) -> dict:
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
        summary = wb.create_sheet("Summary")
        income = sum(float(row.get("amount", 0)) for row in transactions if row.get("type") == "income")
        expenses_total = sum(float(row.get("amount", 0)) for row in transactions if row.get("type") == "expense")
        summary.append(["Metric", "Value"])
        summary.append(["Total income", income])
        summary.append(["Total expenses", expenses_total])
        summary.append(["Net savings", income - expenses_total])
        summary.append(["Transactions", len(transactions)])
        unusual = wb.create_sheet("Unusual review")
        unusual.append(["Date", "Merchant", "Category", "Amount", "Review note"])
        for row in _unusual_transactions(transactions):
            unusual.append([
                _spreadsheet_value(row.get("date", "")),
                _spreadsheet_value(row.get("merchant", "")),
                _spreadsheet_value(row.get("category", "")),
                row.get("amount", 0),
                "Unusual amount based on the IQR threshold; review required. Not fraud.",
            ])
        buf = BytesIO()
        wb.save(buf)
        content, filename, mime = buf.getvalue(), f"finsight-transactions-{stamp}.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    elif fmt == "pdf":
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.units import cm
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.platypus import LongTable, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

        report_data = _collect_data(context)
        buf = BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=1.8*cm, bottomMargin=1.8*cm, rightMargin=1.5*cm, leftMargin=1.5*cm)
        styles = getSampleStyleSheet()
        regular_font, bold_font = _register_pdf_fonts()
        title_style = ParagraphStyle("ReportTitle", parent=styles["Heading1"], fontName=bold_font, fontSize=24, leading=29, textColor=colors.HexColor("#D97745"), alignment=1, spaceAfter=6)
        subtitle_style = ParagraphStyle("ReportSubtitle", parent=styles["Normal"], fontName=regular_font, fontSize=11, textColor=colors.HexColor("#85847F"), alignment=1)
        heading_style = ParagraphStyle("ReportHeading", parent=styles["Heading2"], fontName=bold_font, fontSize=14, textColor=colors.HexColor("#252522"), spaceBefore=12, spaceAfter=8)
        body_style = ParagraphStyle("ReportBody", parent=styles["Normal"], fontName=regular_font, fontSize=9, leading=12, textColor=colors.HexColor("#252522"))
        muted_style = ParagraphStyle("ReportMuted", parent=body_style, textColor=colors.HexColor("#85847F"))
        brand_orange = colors.HexColor("#D97745")
        brand_dark = colors.HexColor("#252522")
        brand_muted = colors.HexColor("#85847F")
        background_light = colors.HexColor("#FAF8F3")
        border_color = colors.HexColor("#EAE5DC")

        def add_header_footer(canvas, document) -> None:
            canvas.saveState()
            canvas.setFont(bold_font, 8)
            canvas.setFillColor(brand_muted)
            canvas.drawString(1.5 * cm, 28 * cm, "FinSight AI - Financial Health Report")
            canvas.setStrokeColor(border_color)
            canvas.setLineWidth(0.5)
            canvas.line(1.5 * cm, 27.5 * cm, 19.5 * cm, 27.5 * cm)
            canvas.setFont(regular_font, 8)
            canvas.drawString(1.5 * cm, 1.5 * cm, "Confidential - Generated by FinSight AI")
            canvas.drawRightString(19.5 * cm, 1.5 * cm, f"Page {document.page}")
            canvas.line(1.5 * cm, 1.8 * cm, 19.5 * cm, 1.8 * cm)
            canvas.restoreState()

        def table_style(header_color: str, padding: int = 8) -> TableStyle:
            return TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(header_color)),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#FAF8F3")]),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#EAE5DC")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
                ("PADDING", (0, 0), (-1, -1), padding),
            ])

        story = [
            Spacer(1, 1.5 * cm),
            Paragraph("FinSight AI", title_style),
            Paragraph("Financial Health Report", subtitle_style),
            Spacer(1, 1 * cm),
        ]
        if verification_url:
            verification_note = Paragraph(
                "Scan to verify this PDF. Verification compares the selected file's SHA-256 digest; the file itself stays on your device.",
                muted_style,
            )
            verification_table = Table(
                [[_verification_qr(verification_url), verification_note]],
                colWidths=[3 * cm, 12 * cm],
                rowHeights=[3 * cm],
            )
            verification_table.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BOX", (0, 0), (-1, -1), 0.5, border_color),
                ("BACKGROUND", (0, 0), (-1, -1), background_light),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ]))
            story.extend([verification_table, Spacer(1, 0.6 * cm)])
        kpis = [
            [Paragraph("<b>Total Income</b>", body_style), Paragraph("<b>Total Expenses</b>", body_style), Paragraph("<b>Net Cash Flow</b>", body_style), Paragraph("<b>Savings Rate</b>", body_style)],
            [Paragraph(f"<font size=14 color='#2D7A4D'><b>{_inr(report_data['total_income'])}</b></font>", body_style), Paragraph(f"<font size=14 color='#D97745'><b>{_inr(report_data['total_expenses'])}</b></font>", body_style), Paragraph(f"<font size=14 color='#252522'><b>{_inr(report_data['net'])}</b></font>", body_style), Paragraph(f"<font size=14 color='#252522'><b>{report_data['savings_rate']:.1f}%</b></font>", body_style)],
        ]
        kpi_table = Table(kpis, colWidths=[4.2 * cm] * 4)
        kpi_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), background_light),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("INNERGRID", (0, 0), (-1, -1), 1, colors.white),
            ("BOX", (0, 0), (-1, -1), 1, border_color),
            ("TOPPADDING", (0, 0), (-1, -1), 12),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ]))
        story.extend([kpi_table, Spacer(1, 1.2 * cm)])

        story.append(Paragraph("Spending by Category", heading_style))
        if report_data["by_category"]:
            categories = [["Category", "Amount", "% of Total"]]
            for category, amount in report_data["by_category"]:
                percentage = amount / report_data["total_expenses"] * 100 if report_data["total_expenses"] else 0
                categories.append([category, _inr(amount), f"{percentage:.1f}%"])
            category_table = Table(categories, colWidths=[7 * cm, 5 * cm, 3 * cm])
            category_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), brand_dark),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), bold_font),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, background_light]),
                ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
                ("PADDING", (0, 0), (-1, -1), 8),
                ("LINEBELOW", (0, 0), (-1, -1), 0.5, border_color),
            ]))
            story.append(category_table)
        else:
            story.append(Paragraph("No expense categories are available.", muted_style))

        story.extend([PageBreak(), Paragraph("Transaction History", heading_style)])
        data = [["Date", "Merchant", "Category", "Type", "Amount"]]

        def amount_cell(row: dict) -> Paragraph:
            is_income = row.get("type") == "income"
            color = "#2D7A4D" if is_income else "#252522"
            sign = "+" if is_income else "-"
            amount = _inr(float(row.get("amount", 0)))
            return Paragraph(f"<font color='{color}'>{sign}{amount}</font>", body_style)

        data.extend([
            [str(row.get("date", ""))[:10], str(row.get("merchant", ""))[:25], str(row.get("category", ""))[:15], str(row.get("type", "")).capitalize(), amount_cell(row)]
            for row in report_data["all_txs"][:500]
        ])
        transaction_table = LongTable(data, colWidths=[2.5 * cm, 6.5 * cm, 3.5 * cm, 2.5 * cm, 3 * cm], repeatRows=1)
        transaction_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), brand_dark),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), bold_font),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, background_light]),
            ("ALIGN", (4, 1), (4, -1), "RIGHT"),
            ("PADDING", (0, 0), (-1, -1), 6),
            ("LINEBELOW", (0, 0), (-1, -1), 0.5, border_color),
        ]))
        story.append(transaction_table)
        doc.build(story, onFirstPage=add_header_footer, onLaterPages=add_header_footer)
        content, filename, mime = buf.getvalue(), f"FinSight_Report_{stamp}.pdf", "application/pdf"
    else:
        raise ValueError("Choose pdf, excel, or csv.")
    summary = "Professional multi-page PDF" if fmt == "pdf" else f"{len(transactions)} transactions"
    return {"type": "download", "format": "excel" if fmt in ("excel", "xlsx", "xls") else fmt, "filename": filename, "mime": mime, "content_base64": base64.b64encode(content).decode("ascii"), "summary": summary}
