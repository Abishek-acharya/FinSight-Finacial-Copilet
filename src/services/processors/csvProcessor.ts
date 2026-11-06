import Papa from "papaparse";
import type { ExtractedRow } from "@/types/statement";
import { parseAmount } from "./amountParser";
import { parseIndianDate } from "./dateParser";

export interface RawCsvResult {
  rows: ExtractedRow[];
  warnings: string[];
}

type CsvRow = Record<string, string>;

const DATE_KEYS = ["transaction date", "txn date", "value date", "posting date", "date"];
const DESC_KEYS = ["description", "narration", "particulars", "details", "remarks", "transaction"];
const DEBIT_KEYS = ["withdrawal amount", "withdrawal amt", "debit", "withdrawal", "dr"];
const CREDIT_KEYS = ["deposit amount", "deposit amt", "credit", "deposit", "cr"];
const AMOUNT_KEYS = ["transaction amount", "txn amount", "amount", "amt"];
const BALANCE_KEYS = ["closing balance", "running balance", "balance", "bal"];
const REF_KEYS = ["reference number", "ref no", "reference", "ref", "cheque no", "cheque", "chq"];
const TYPE_KEYS = ["transaction type", "type", "dr/cr", "cr/dr"];

function findKey(headers: string[], candidates: string[]): string | null {
  for (const candidate of candidates) {
    const header = headers.find((value) => value.toLowerCase().trim() === candidate);
    if (header) return header;
  }
  for (const candidate of candidates) {
    const header = headers.find((value) => value.toLowerCase().trim().includes(candidate));
    if (header) return header;
  }
  return null;
}

function newId(index: number) {
  return `csv-${Date.now()}-${index}`;
}

export function processCsv(text: string): RawCsvResult {
  const parsed = Papa.parse<CsvRow>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
    dynamicTyping: false,
  });
  const warnings: string[] = [];
  if (parsed.errors.length) {
    warnings.push(`${parsed.errors.length} CSV parse warning(s); some rows may be malformed.`);
  }
  const headers = parsed.meta.fields ?? [];
  if (!headers.length) {
    return { rows: [], warnings: [...warnings, "The file has no header row."] };
  }

  const dateKey = findKey(headers, DATE_KEYS);
  const descriptionKey = findKey(headers, DESC_KEYS);
  const debitKey = findKey(headers, DEBIT_KEYS);
  const creditKey = findKey(headers, CREDIT_KEYS);
  const amountKey = findKey(headers, AMOUNT_KEYS);
  const balanceKey = findKey(headers, BALANCE_KEYS);
  const referenceKey = findKey(headers, REF_KEYS);
  const typeKey = findKey(headers, TYPE_KEYS);

  if (!dateKey || !descriptionKey) {
    return {
      rows: [],
      warnings: [...warnings, "Required columns not found. Include a date and description/narration column."],
    };
  }
  if (!debitKey && !creditKey && !amountKey) {
    return {
      rows: [],
      warnings: [...warnings, "No debit, credit, or amount column was found."],
    };
  }

  const rows: ExtractedRow[] = [];
  parsed.data.forEach((record, index) => {
    const rawDate = (record[dateKey] ?? "").trim();
    const description = (record[descriptionKey] ?? "").trim();
    if (!rawDate && !description) return;

    const date = parseIndianDate(rawDate);
    const rawDebit = debitKey ? parseAmount(record[debitKey]) : null;
    const rawCredit = creditKey ? parseAmount(record[creditKey]) : null;
    const signedAmount = amountKey ? parseAmount(record[amountKey]) : null;
    const debit = rawDebit !== null && rawDebit !== 0 ? Math.abs(rawDebit) : null;
    const credit = rawCredit !== null && rawCredit !== 0 ? Math.abs(rawCredit) : null;
    const hint = typeKey ? (record[typeKey] ?? "").toLowerCase() : "";
    let type: ExtractedRow["type"] = null;
    let amount: number | null = null;

    if (credit !== null) {
      type = "income";
      amount = credit;
    } else if (debit !== null) {
      type = "expense";
      amount = debit;
    } else if (signedAmount !== null) {
      const isExpense = signedAmount < 0 || /\b(?:dr|debit|withdrawal)\b/.test(hint);
      type = isExpense ? "expense" : "income";
      amount = Math.abs(signedAmount);
    }

    const validationErrors: string[] = [];
    if (!date) validationErrors.push("Invalid or missing date");
    if (amount === null || amount === 0) validationErrors.push("Missing or zero amount");
    if (!description) validationErrors.push("Missing description");

    rows.push({
      localId: newId(index),
      date,
      description,
      merchant: description || "Unknown",
      referenceNumber: referenceKey ? (record[referenceKey] ?? "").trim() || undefined : undefined,
      debit,
      credit,
      amount,
      balance: balanceKey ? parseAmount(record[balanceKey]) : null,
      type,
      category: "Other",
      sourceRow: index + 2,
      validationErrors,
      isDuplicate: false,
      selected: validationErrors.length === 0,
    });
  });

  if (!rows.length) warnings.push("No transaction-like rows were found.");
  return { rows, warnings };
}
