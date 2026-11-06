export function parseAmount(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  let value = String(raw).trim();
  if (!value) return null;

  let negative = false;
  if (/^\(.*\)$/.test(value)) {
    negative = true;
    value = value.slice(1, -1);
  }
  if (/\bdr\b/i.test(value)) negative = true;
  if (/\bcr\b/i.test(value)) negative = false;
  value = value.replace(/\b(?:dr|cr)\b/gi, "").replace(/[₹$,\s]/g, "");
  if (value.startsWith("-")) {
    negative = true;
    value = value.slice(1);
  } else if (value.startsWith("+")) {
    value = value.slice(1);
  }
  if (!/^\d+(?:\.\d+)?$/.test(value)) return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? (negative ? -amount : amount) : null;
}

export function parseSignedAmount(raw: string): {
  value: number | null;
  sign: "cr" | "dr" | null;
} {
  const sign = /\bcr\b/i.test(raw) ? "cr" : /\bdr\b/i.test(raw) ? "dr" : null;
  return { value: parseAmount(raw), sign };
}
