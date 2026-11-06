import type { Account } from "@/types/finance";

export const demoAccounts: Account[] = [
  { id: "hdfc-savings", name: "HDFC Savings", type: "savings", last4: "2456", balance: 486250 },
  { id: "icici-current", name: "ICICI Current", type: "current", last4: "7263", balance: 182400 },
  { id: "sbi-credit", name: "SBI Credit Card", type: "credit", last4: "3312", balance: -36250 },
];
