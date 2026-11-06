const MERCHANTS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /\bswiggy\b/i, name: "Swiggy" },
  { pattern: /\bzomato\b/i, name: "Zomato" },
  { pattern: /\bbig\s?basket\b/i, name: "BigBasket" },
  { pattern: /\bd\s?mart\b/i, name: "DMart" },
  { pattern: /\bamazon(?:\s+pay)?\b/i, name: "Amazon" },
  { pattern: /\bflipkart\b/i, name: "Flipkart" },
  { pattern: /\bmyntra\b/i, name: "Myntra" },
  { pattern: /\buber\b/i, name: "Uber" },
  { pattern: /\bola\b/i, name: "Ola" },
  { pattern: /\brapido\b/i, name: "Rapido" },
  { pattern: /\bnetflix\b/i, name: "Netflix" },
  { pattern: /\bspotify\b/i, name: "Spotify" },
  { pattern: /\bbookmyshow\b/i, name: "BookMyShow" },
  { pattern: /\bairtel\b/i, name: "Airtel" },
  { pattern: /\bjio\b/i, name: "Jio" },
  { pattern: /\bapollo(?: pharmacy)?\b/i, name: "Apollo Pharmacy" },
  { pattern: /\bnetmeds\b/i, name: "Netmeds" },
  { pattern: /\bpracto\b/i, name: "Practo" },
  { pattern: /\bmakemytrip\b/i, name: "MakeMyTrip" },
  { pattern: /\bindian oil\b|\biocl\b/i, name: "Indian Oil" },
  { pattern: /\bair india\b/i, name: "Air India" },
  { pattern: /\bindigo\b/i, name: "IndiGo" },
  { pattern: /\bcult(?:fit)?\b/i, name: "Cult.fit" },
  { pattern: /\bzerodha\b/i, name: "Zerodha" },
  { pattern: /\bgroww\b/i, name: "Groww" },
];

export function normalizeDescription(description: string): string {
  return description
    .normalize("NFKC")
    .replace(/^(?:UPI|IMPS|NEFT|RTGS|ACH|POS|ECS|NACH)[\s/*:-]*/i, "")
    .replace(/^(?:PAYMENT|TRANSFER|DEBIT|CREDIT)[\s/*:-]*/i, "")
    .replace(/\b(?:UPI|IMPS|NEFT|RTGS|ACH|POS|ECS|NACH)\b/gi, " ")
    .replace(/\b(?:REF|RRN|UTR|TXN|TRANSACTION)[\s:#-]*[A-Z0-9-]{6,}\b/gi, " ")
    .replace(/\*[^ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function recognizeMerchant(description: string): string {
  const normalized = normalizeDescription(description);
  const merchant = MERCHANTS.find((item) => item.pattern.test(normalized));
  if (merchant) return merchant.name;
  return normalized.split(/\s+/).slice(0, 3).join(" ").slice(0, 60) || "Unknown";
}
