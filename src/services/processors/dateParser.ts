const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function makeISO(year: number, month: number, day: number): string | null {
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month, day, 12));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) {
    return null;
  }
  return date.toISOString();
}

export function parseIndianDate(raw: string): string | null {
  const cleaned = raw.trim().replace(/[,]+/g, " ").replace(/\s+/g, " ");
  if (!cleaned) return null;

  let match = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) return makeISO(Number(match[1]), Number(match[2]) - 1, Number(match[3]));

  match = cleaned.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (match) {
    const year = Number(match[3]) < 100 ? 2000 + Number(match[3]) : Number(match[3]);
    return makeISO(year, Number(match[2]) - 1, Number(match[1]));
  }

  match = cleaned.match(/^(\d{1,2})[\s\-]([A-Za-z]{3,})[\s\-](\d{2,4})$/);
  if (match) {
    const month = MONTHS[match[2].slice(0, 3).toLowerCase()];
    const year = Number(match[3]) < 100 ? 2000 + Number(match[3]) : Number(match[3]);
    return month === undefined ? null : makeISO(year, month, Number(match[1]));
  }

  return null;
}
