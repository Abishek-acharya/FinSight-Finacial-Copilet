import * as XLSX from "xlsx";
import type { ExtractedRow } from "@/types/statement";
import { parseAmount } from "./amountParser";
import { parseIndianDate } from "./dateParser";

export interface RawExcelResult {
  rows: ExtractedRow[];
  warnings: string[];
}

const DATE_HEADERS = ["transaction date", "txn date", "value date", "posting date", "date"];
const DESC_HEADERS = ["description", "narration", "particulars", "details", "remarks"];
const DEBIT_HEADERS = ["withdrawal amount", "withdrawal amt", "debit", "withdrawal", "dr"];
const CREDIT_HEADERS = ["deposit amount", "deposit amt", "credit", "deposit", "cr"];
const AMOUNT_HEADERS = ["transaction amount", "txn amount", "amount", "amt"];
const BALANCE_HEADERS = ["closing balance", "running balance", "balance"];
const TYPE_HEADERS = ["transaction type", "type", "dr/cr", "cr/dr"];

function findColumn(headers: string[], candidates: string[]): number {
  for (const candidate of candidates) {
    const exact = headers.findIndex((header) => header === candidate);
    if (exact >= 0) return exact;
  }
  for (const candidate of candidates) {
    const partial = headers.findIndex((header) => header.includes(candidate));
    if (partial >= 0) return partial;
  }
  return -1;
}

function findHeaderRow(rows: unknown[][]): number {
  for (let index = 0; index < Math.min(rows.length, 20); index += 1) {
    const headers = (rows[index] ?? []).map((cell) => String(cell ?? "").trim().toLowerCase());
    if (
      findColumn(headers, DATE_HEADERS) >= 0 &&
      findColumn(headers, DESC_HEADERS) >= 0 &&
      (findColumn(headers, DEBIT_HEADERS) >= 0 ||
        findColumn(headers, CREDIT_HEADERS) >= 0 ||
        findColumn(headers, AMOUNT_HEADERS) >= 0)
    ) {
      return index;
    }
  }
  return -1;
}

export function processExcel(buffer: ArrayBuffer): RawExcelResult {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  if (!workbook.SheetNames.length) return { rows: [], warnings: ["The workbook contains no sheets."] };

  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    raw: false,
    defval: "",
    dateNF: "dd/mm/yyyy",
  });
  const headerRowIndex = findHeaderRow(data);
  if (headerRowIndex < 0) {
    return {
      rows: [],
      warnings: ["Could not find a header row with date, description, and amount columns."],
    };
  }

  const headers = (data[headerRowIndex] ?? []).map((cell) => String(cell ?? "").trim().toLowerCase());
  const dateColumn = findColumn(headers, DATE_HEADERS);
  const descriptionColumn = findColumn(headers, DESC_HEADERS);
  const debitColumn = findColumn(headers, DEBIT_HEADERS);
  const creditColumn = findColumn(headers, CREDIT_HEADERS);
  const amountColumn = findColumn(headers, AMOUNT_HEADERS);
  const balanceColumn = findColumn(headers, BALANCE_HEADERS);
  const typeColumn = findColumn(headers, TYPE_HEADERS);
  const rows: ExtractedRow[] = [];

  for (let index = headerRowIndex + 1; index < data.length; index += 1) {
    const record = data[index] ?? [];
    const rawDate = record[dateColumn];
    const rawDescription = String(record[descriptionColumn] ?? "").trim();
    const dateText =
      rawDate instanceof Date
        ? `${String(rawDate.getUTCDate()).padStart(2, "0")}/${String(rawDate.getUTCMonth() + 1).padStart(2, "0")}/${rawDate.getUTCFullYear()}`
        : String(rawDate ?? "").trim();
    if (!dateText && !rawDescription) continue;

    const debitValue = debitColumn >= 0 ? parseAmount(String(record[debitColumn] ?? "")) : null;
    const creditValue = creditColumn >= 0 ? parseAmount(String(record[creditColumn] ?? "")) : null;
    const signedAmount = amountColumn >= 0 ? parseAmount(String(record[amountColumn] ?? "")) : null;
    const debit = debitValue !== null && debitValue !== 0 ? Math.abs(debitValue) : null;
    const credit = creditValue !== null && creditValue !== 0 ? Math.abs(creditValue) : null;
    const hint = typeColumn >= 0 ? String(record[typeColumn] ?? "").toLowerCase() : "";
    const date = parseIndianDate(dateText);

    let type: ExtractedRow["type"] = null;
    let amount: number | null = null;
    if (credit !== null) {
      type = "income";
      amount = credit;
    } else if (debit !== null) {
      type = "expense";
      amount = debit;
    } else if (signedAmount !== null) {
      type = signedAmount < 0 || /\b(?:dr|debit|withdrawal)\b/.test(hint) ? "expense" : "income";
      amount = Math.abs(signedAmount);
    }

    const validationErrors: string[] = [];
    if (!date) validationErrors.push("Invalid or missing date");
    if (amount === null || amount === 0) validationErrors.push("Missing or zero amount");
    if (!rawDescription) validationErrors.push("Missing description");
    rows.push({
      localId: `xlsx-${Date.now()}-${index}`,
      date,
      description: rawDescription,
      merchant: rawDescription || "Unknown",
      debit,
      credit,
      amount,
      balance: balanceColumn >= 0 ? parseAmount(String(record[balanceColumn] ?? "")) : null,
      type,
      category: "Other",
      sourceRow: index + 1,
      validationErrors,
      isDuplicate: false,
      selected: validationErrors.length === 0,
    });
  }

  return {
    rows,
    warnings: rows.length ? [] : ["No transaction-like rows were found in the first sheet."],
  };
}
