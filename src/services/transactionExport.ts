import type { Account, Transaction } from "@/types/finance";

function escapeCsv(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function transactionsToCsv(transactions: Transaction[], accounts: Account[]): string {
  const header = ["Date", "Merchant", "Description", "Category", "Type", "Amount", "Account", "Note"];
  const rows = transactions.map((transaction) => {
    const account = accounts.find((item) => item.id === transaction.accountId);
    return [
      transaction.date.slice(0, 10),
      transaction.merchant,
      transaction.description ?? "",
      transaction.category,
      transaction.type,
      transaction.amount.toFixed(2),
      account ? `${account.name} ••${account.last4}` : transaction.accountId,
      transaction.note ?? "",
    ];
  });
  return [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
}

export function downloadTransactionsCsv(transactions: Transaction[], accounts: Account[], filename = "transactions.csv") {
  const blob = new Blob(["\uFEFF", transactionsToCsv(transactions, accounts)], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
