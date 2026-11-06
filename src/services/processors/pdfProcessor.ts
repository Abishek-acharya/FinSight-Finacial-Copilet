import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { ExtractedRow } from "@/types/statement";
import { parseAmount } from "./amountParser";
import { parseIndianDate } from "./dateParser";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export interface RawPdfResult {
  rows: ExtractedRow[];
  warnings: string[];
  pageCount: number;
}

const DATE_AT_START =
  /^(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}\s+[A-Za-z]{3,}\s+\d{2,4})\s+/;

export async function processPdf(buffer: ArrayBuffer): Promise<RawPdfResult> {
  const warnings: string[] = [];
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  const rows: ExtractedRow[] = [];
  let textLength = 0;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const linesByY = new Map<number, string[]>();
    for (const item of content.items) {
      if (!("str" in item) || !("transform" in item)) continue;
      const y = Math.round(item.transform[5]);
      linesByY.set(y, [...(linesByY.get(y) ?? []), item.str]);
    }
    const lines = [...linesByY.entries()]
      .sort(([first], [second]) => second - first)
      .map(([, parts]) => parts.join(" ").replace(/\s+/g, " ").trim());
    textLength += lines.join("").length;

    lines.forEach((line, lineIndex) => {
      const dateMatch = line.match(DATE_AT_START);
      if (!dateMatch) return;
      const date = parseIndianDate(dateMatch[1]);
      if (!date) return;
      const rest = line.slice(dateMatch[0].length);
      const numericTokens = rest.match(/-?\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?|-?\d+(?:\.\d{1,2})?/g) ?? [];
      const numbers = numericTokens.map(parseAmount).filter((value): value is number => value !== null);
      if (!numbers.length) return;

      const amountToken = numbers.length > 1 ? numbers[numbers.length - 2] : numbers[0];
      const balance = numbers.length > 1 ? numbers[numbers.length - 1] : null;
      const description = rest.slice(0, rest.search(/\d/)).trim().slice(0, 200) || "Unknown";
      const type = /\b(?:cr|credit)\b/i.test(rest) ? "income" : "expense";
      const amount = Math.abs(amountToken);
      const validationErrors = description === "Unknown" ? ["Missing description"] : [];
      rows.push({
        localId: `pdf-${pageNumber}-${lineIndex}`,
        date,
        description,
        merchant: description,
        debit: type === "expense" ? amount : null,
        credit: type === "income" ? amount : null,
        amount,
        balance: balance === null ? null : Math.abs(balance),
        type,
        category: "Other",
        sourcePage: pageNumber,
        validationErrors,
        isDuplicate: false,
        selected: validationErrors.length === 0,
      });
    });
  }

  if (textLength < 40) {
    warnings.push("This PDF has little extractable text and may be scanned. OCR is not supported.");
  }
  if (!rows.length) {
    warnings.push("No transactions were detected. PDF extraction is heuristic; CSV exports are more reliable.");
  }
  return { rows, warnings, pageCount: pdf.numPages };
}
