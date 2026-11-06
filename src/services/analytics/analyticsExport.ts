import type { AnalyticsData, AnalyticsFilters } from "@/types/analytics";
import { formatINR } from "@/utils/financeCalculations";

function csvCell(value: string | number): string {
  let text = String(value);
  if (/^[\t\r ]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function analyticsToCsv(data: AnalyticsData, filters: AnalyticsFilters): string {
  const rows: Array<Array<string | number>> = [
    ["FinSight AI — Analytics report"],
    ["Generated", new Date().toLocaleString("en-IN")],
    ["Period", filters.period],
    ["Account", filters.accountId],
    ["Transactions included", data.totalTransactions],
    [],
    ["Monthly breakdown"],
    ["Month", "Income", "Expenses (excluding transfers)", "Net savings"],
    ...data.months.map((month) => [
      month.label,
      month.income.toFixed(2),
      month.expenses.toFixed(2),
      month.savings.toFixed(2),
    ]),
    [],
    ["Current month categories"],
    ["Category", "Amount", "Share", "Transactions"],
    ...data.categories.map((category) => [
      category.category,
      category.amount.toFixed(2),
      `${category.percentage.toFixed(1)}%`,
      category.count,
    ]),
    [],
    ["Recurring candidates (rule-based estimates)"],
    ["Merchant", "Frequency", "Average amount", "Occurrences", "Confidence", "Last transaction"],
    ...data.recurring.map((item) => [
      item.merchant,
      item.frequency,
      item.averageAmount.toFixed(2),
      item.occurrences,
      `${Math.round(item.confidence * 100)}%`,
      item.lastDate.slice(0, 10),
    ]),
    [],
    ["Methodology", "Amounts are calculated from transactions saved in this browser. Transfers are excluded from spending totals. Recurring payments are estimates based on merchant, amount, and intervals."],
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

export function downloadAnalyticsCsv(data: AnalyticsData, filters: AnalyticsFilters): void {
  const blob = new Blob([analyticsToCsv(data, filters)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `finsight-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

export function openAnalyticsPrintReport(data: AnalyticsData, filters: AnalyticsFilters): boolean {
  const report = window.open("", "_blank");
  if (!report) return false;
  report.opener = null;
  const monthRows = data.months.map((month) => `
    <tr><td>${escapeHtml(month.label)}</td><td>${escapeHtml(formatINR(month.income))}</td>
    <td>${escapeHtml(formatINR(month.expenses))}</td><td>${escapeHtml(formatINR(month.savings))}</td></tr>`).join("");
  const categoryRows = data.categories.map((item) => `
    <tr><td>${escapeHtml(item.category)}</td><td>${escapeHtml(formatINR(item.amount))}</td>
    <td>${item.percentage.toFixed(1)}%</td></tr>`).join("");
  const insightItems = data.insights.map((item) =>
    `<li><strong>${escapeHtml(item.title)}</strong> — ${escapeHtml(item.description)}</li>`,
  ).join("");

  report.document.write(`<!doctype html>
    <html lang="en"><head><meta charset="utf-8"><title>FinSight Analytics report</title>
    <style>
      body{font:14px/1.5 Arial,sans-serif;max-width:900px;margin:32px auto;color:#252522}
      h1,h2{color:#803d22}h1{border-bottom:2px solid #d97745;padding-bottom:8px}
      table{border-collapse:collapse;width:100%;margin:12px 0 24px}
      th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f8f5ef}
      .note{color:#666;font-size:12px}
      @media print{body{margin:0 auto}}
    </style></head><body>
    <h1>FinSight AI — Analytics report</h1>
    <p class="note">Generated ${escapeHtml(new Date().toLocaleString("en-IN"))} · Period: ${escapeHtml(filters.period)} · ${data.totalTransactions} transactions</p>
    <p>Calculated from transaction records stored in this browser. Transfers are excluded from expense totals. Recurring patterns are estimates, not predictions.</p>
    <h2>Monthly breakdown</h2><table><thead><tr><th>Month</th><th>Income</th><th>Expenses</th><th>Net savings</th></tr></thead><tbody>${monthRows}</tbody></table>
    <h2>Current-month categories</h2><table><thead><tr><th>Category</th><th>Amount</th><th>Share</th></tr></thead><tbody>${categoryRows}</tbody></table>
    <h2>Rule-based insights</h2><ul>${insightItems || "<li>No insights for this period.</li>"}</ul>
    <p class="note">Account balances are current snapshots and are not historical cash-flow balances.</p>
    <script>window.addEventListener("load",()=>window.print())</script></body></html>`);
  report.document.close();
  return true;
}
