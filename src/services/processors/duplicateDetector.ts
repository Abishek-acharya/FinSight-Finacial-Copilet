import type { ExtractedRow } from "@/types/statement";
import type { Transaction } from "@/types/finance";

function fingerprint(date: string, amount: number, description: string, accountId: string): string {
  return [
    accountId,
    date.slice(0, 10),
    amount.toFixed(2),
    description.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 60),
  ].join("|");
}

export function detectDuplicates(
  rows: ExtractedRow[],
  existing: Transaction[],
  accountId: string,
): ExtractedRow[] {
  const existingSet = new Set(
    existing.map((transaction) =>
      fingerprint(
        transaction.date,
        transaction.amount,
        transaction.description ?? transaction.merchant,
        transaction.accountId,
      ),
    ),
  );
  const batchSet = new Map<string, string>();

  return rows.map((row) => {
    if (!row.date || row.amount === null || !row.type) return row;
    const key = fingerprint(row.date, row.amount, row.description, accountId);
    if (existingSet.has(key)) {
      return { ...row, isDuplicate: true, selected: false };
    }
    const duplicateOfId = batchSet.get(key);
    if (duplicateOfId) return { ...row, isDuplicate: true, duplicateOfId, selected: false };
    batchSet.set(key, row.localId);
    return { ...row, isDuplicate: false, duplicateOfId: undefined };
  });
}
