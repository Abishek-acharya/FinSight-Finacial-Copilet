import type { Transaction } from "@/types/finance";
import type { ConfirmPayload, ExtractedRow } from "@/types/statement";
import { financeStore, type ImportedStatementRecord } from "@/store/financeStore";
import { categorizeTransaction } from "@/services/categorization/categorizationService";

function createId(prefix: string): string {
  const randomId = globalThis.crypto?.randomUUID?.();
  return `${prefix}-${randomId ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

function toTransaction(
  row: ExtractedRow,
  statementId: string,
  accountId: string,
): Transaction | null {
  if (!row.date || row.amount === null || !row.type) return null;
  const { userRules, categories } = financeStore.getSnapshot();
  const categorization = categorizeTransaction(row.description, row.type, userRules, categories);
  const manuallyCategorized = row.category !== categorization.category;
  return {
    id: `${statementId}-${row.localId}`,
    merchant: categorization.merchant,
    description: row.description,
    category: row.category,
    date: row.date,
    amount: row.amount,
    type: row.type,
    accountId,
    categorizationSource: manuallyCategorized ? "manual" : categorization.source,
    confidence: manuallyCategorized ? 1 : categorization.confidence,
    reviewStatus: manuallyCategorized || !categorization.reviewRequired ? "reviewed" : "pending",
    originalDescription: row.description,
  };
}

export function confirmImport(payload: ConfirmPayload): ImportedStatementRecord {
  const statementId = createId("stmt");
  const accountId = `imported-${payload.statement.accountNumberMasked.replace(/\D/g, "") || "x"}`;
  const confirmedRows = payload.rows.filter(
    (row) => row.selected && row.validationErrors.length === 0,
  );
  const transactions = confirmedRows
    .map((row) => toTransaction(row, statementId, accountId))
    .filter((transaction): transaction is Transaction => transaction !== null);
  const incomeTotal = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const expenseTotal = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const record: ImportedStatementRecord = {
    id: statementId,
    fileName: payload.fileName,
    fileType: payload.fileType,
    fileSize: payload.fileSize,
    bank: payload.statement.bank,
    accountNickname: payload.statement.accountNickname,
    accountType: payload.statement.accountType,
    maskedAccount: payload.statement.accountNumberMasked,
    periodFrom: payload.statement.periodFrom,
    periodTo: payload.statement.periodTo,
    currency: payload.statement.currency,
    uploadedAt: new Date().toISOString(),
    status: "completed",
    transactionCount: transactions.length,
    incomeTotal,
    expenseTotal,
  };
  financeStore.addStatement(record, transactions);
  return record;
}

export function recordFailedImport(
  fileName: string,
  fileType: string,
  fileSize: number,
  errorMessage: string,
): ImportedStatementRecord {
  const record: ImportedStatementRecord = {
    id: createId("stmt"),
    fileName,
    fileType,
    fileSize,
    bank: "—",
    accountNickname: "—",
    accountType: "other",
    maskedAccount: "—",
    periodFrom: "",
    periodTo: "",
    currency: "INR",
    uploadedAt: new Date().toISOString(),
    status: "failed",
    transactionCount: 0,
    incomeTotal: 0,
    expenseTotal: 0,
    errorMessage,
  };
  financeStore.markStatementFailed(record);
  return record;
}

export function deleteStatement(statementId: string) {
  financeStore.deleteStatement(statementId);
}
