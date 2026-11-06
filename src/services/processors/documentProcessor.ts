import type { ExtractionResult } from "@/types/statement";
import { normalizeRows } from "./transactionNormalizer";
import { processCsv } from "./csvProcessor";

export const MAX_FILE_SIZE = 15 * 1024 * 1024;
export const ALLOWED_EXTENSIONS = [".pdf", ".csv", ".xlsx", ".xls"] as const;
export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

export function getExtension(name: string): string {
  const index = name.lastIndexOf(".");
  return index < 0 ? "" : name.slice(index).toLowerCase();
}

export function validateFile(file: File): string | null {
  if (file.size === 0) return "File is empty.";
  if (file.size > MAX_FILE_SIZE) return `File exceeds ${MAX_FILE_SIZE / 1024 / 1024} MB limit.`;
  const extension = getExtension(file.name);
  if (!ALLOWED_EXTENSIONS.includes(extension as AllowedExtension)) {
    return `Unsupported file type "${extension || "unknown"}". Use PDF, CSV, XLSX, or XLS.`;
  }
  return null;
}

export async function extractFromFile(file: File): Promise<ExtractionResult> {
  const extension = getExtension(file.name);
  let result: { rows: import("@/types/statement").ExtractedRow[]; warnings: string[] };
  let format: ExtractionResult["format"];

  if (extension === ".csv") {
    result = processCsv(await file.text());
    format = "csv";
  } else if (extension === ".xlsx" || extension === ".xls") {
    const { processExcel } = await import("./excelProcessor");
    result = processExcel(await file.arrayBuffer());
    format = "xlsx";
  } else if (extension === ".pdf") {
    const { processPdf } = await import("./pdfProcessor");
    result = await processPdf(await file.arrayBuffer());
    format = "pdf";
  } else {
    return {
      rows: [],
      warnings: [`Unsupported file type: ${extension || "unknown"}`],
      format: "unsupported",
      sourceName: file.name,
    };
  }

  return {
    rows: normalizeRows(result.rows),
    warnings: result.warnings,
    format,
    sourceName: file.name,
  };
}
