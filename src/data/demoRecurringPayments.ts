import type { RecurringPayment } from "@/types/finance";

export const demoRecurringPayments: RecurringPayment[] = [
  {
    id: "rent",
    merchant: "Home rent",
    category: "Housing",
    amount: 29000,
    frequency: "Monthly",
    nextDate: "2026-11-05",
  },
  {
    id: "nettflix",
    merchant: "Netflix",
    category: "Entertainment",
    amount: 649,
    frequency: "Monthly",
    nextDate: "2026-11-12",
  },
  {
    id: "airtel",
    merchant: "Airtel Broadband",
    category: "Utilities",
    amount: 799,
    frequency: "Monthly",
    nextDate: "2026-11-18",
  },
  {
    id: "gym",
    merchant: "Prime Gym",
    category: "Health & Fitness",
    amount: 1800,
    frequency: "Monthly",
    nextDate: "2026-11-21",
  },
  {
    id: "insurance",
    merchant: "Health policy",
    category: "Insurance",
    amount: 4800,
    frequency: "Quarterly",
    nextDate: "2026-12-02",
  },
];
