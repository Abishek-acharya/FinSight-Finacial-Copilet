import type { ExtractedRow } from "@/types/statement";

export function revalidateRow(row: ExtractedRow): ExtractedRow {
  const errors: string[] = [];
  if (!row.date || Number.isNaN(new Date(row.date).getTime())) errors.push("Invalid or missing date");
  if (row.amount === null || !Number.isFinite(row.amount) || row.amount <= 0) errors.push("Missing or zero amount");
  if (!row.description.trim()) errors.push("Missing description");
  if (!row.type) errors.push("Cannot determine income / expense");
  return {
    ...row,
    validationErrors: errors,
    selected: errors.length > 0 ? false : row.selected,
  };
}

export function validateAll(rows: ExtractedRow[]) {
  const validatedRows = rows.map(revalidateRow);
  return {
    rows: validatedRows,
    summary: {
      valid: validatedRows.filter((row) => row.validationErrors.length === 0).length,
      invalid: validatedRows.filter((row) => row.validationErrors.length > 0).length,
    },
  };
}
