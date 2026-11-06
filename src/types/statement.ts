import type { Transaction, TransactionType } from "@/types/finance";

export interface ExtractedRow {
  localId: string;
  date: string | null;
  description: string;
  merchant: string;
  referenceNumber?: string;
  debit: number | null;
  credit: number | null;
  amount: number | null;
  balance: number | null;
  type: TransactionType | null;
  category: string;
  sourcePage?: number;
  sourceRow?: number;
  validationErrors: string[];
  isDuplicate: boolean;
  duplicateOfId?: string;
  selected: boolean;
}

export interface ExtractionResult {
  rows: ExtractedRow[];
  warnings: string[];
  format: "pdf" | "csv" | "xlsx" | "unsupported";
  sourceName: string;
}

export type ProcessingStep =
  | "idle"
  | "validating"
  | "reading"
  | "extracting"
  | "normalizing"
  | "validating-rows"
  | "duplicate-check"
  | "review"
  | "error"
  | "done";

export interface ProcessingState {
  step: ProcessingStep;
  progress: number;
  message: string;
  error?: string;
}

export interface StatementFormData {
  bank: string;
  accountNickname: string;
  accountType: "savings" | "current" | "credit" | "other";
  accountNumberMasked: string;
  periodFrom: string;
  periodTo: string;
  currency: string;
}

export interface ConfirmPayload {
  statement: StatementFormData;
  rows: ExtractedRow[];
  fileName: string;
  fileType: string;
  fileSize: number;
}

export type ExtractedTransaction = Omit<Transaction, "id">;
