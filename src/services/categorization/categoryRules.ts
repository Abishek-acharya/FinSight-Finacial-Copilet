export type RuleStrength = "strong" | "medium" | "weak";

export interface CategoryRule {
  keywords: string[];
  category: string;
  strength: RuleStrength;
  appliesTo: "income" | "expense" | "both";
}

export const SYSTEM_RULES: CategoryRule[] = [
  { keywords: ["salary", "payroll", "monthly credit", "employer credit"], category: "Salary", strength: "strong", appliesTo: "income" },
  { keywords: ["freelance", "client payment", "upwork", "fiverr", "toptal"], category: "Freelance", strength: "strong", appliesTo: "income" },
  { keywords: ["business income", "invoice received", "gst received"], category: "Business Income", strength: "medium", appliesTo: "income" },
  { keywords: ["interest credit", "interest earned", "fd interest", "savings interest"], category: "Interest", strength: "strong", appliesTo: "income" },
  { keywords: ["cashback", "rewards credit", "cash back"], category: "Cashback", strength: "strong", appliesTo: "income" },
  { keywords: ["refund", "reversal", "returned"], category: "Refund", strength: "strong", appliesTo: "income" },
  { keywords: ["swiggy", "zomato", "restaurant", "cafe", "dominos", "pizza hut", "mcdonald", "kfc", "burger king"], category: "Food & Dining", strength: "strong", appliesTo: "expense" },
  { keywords: ["bigbasket", "dmart", "big bazaar", "more supermarket", "reliance fresh", "kirana", "grocery", "vegetables"], category: "Groceries", strength: "strong", appliesTo: "expense" },
  { keywords: ["amazon", "flipkart", "myntra", "ajio", "meesho", "snapdeal", "nykaa"], category: "Shopping", strength: "medium", appliesTo: "expense" },
  { keywords: ["uber", "ola", "rapido", "yulu", "metro card", "irctc", "railway"], category: "Transportation", strength: "strong", appliesTo: "expense" },
  { keywords: ["indian oil", "iocl", "hpcl", "bpcl", "shell", "petrol pump", "diesel", "fuel"], category: "Fuel", strength: "strong", appliesTo: "expense" },
  { keywords: ["rent", "landlord", "society maintenance", "maintenance society", "apartment"], category: "Housing & Rent", strength: "strong", appliesTo: "expense" },
  { keywords: ["electricity", "bescom", "bses", "tata power", "airtel", "jio", "broadband", "water bill", "gas bill"], category: "Utilities", strength: "strong", appliesTo: "expense" },
  { keywords: ["apollo", "pharmacy", "practo", "1mg", "netmeds", "hospital", "clinic", "medical"], category: "Healthcare", strength: "strong", appliesTo: "expense" },
  { keywords: ["udemy", "coursera", "byju", "unacademy", "school", "college", "tuition", "edx"], category: "Education", strength: "strong", appliesTo: "expense" },
  { keywords: ["netflix", "prime video", "hotstar", "bookmyshow", "pvr", "inox", "cinema"], category: "Entertainment", strength: "strong", appliesTo: "expense" },
  { keywords: ["makemytrip", "goibibo", "cleartrip", "ixigo", "airbnb", "oyo", "indigo", "spicejet", "air india"], category: "Travel", strength: "strong", appliesTo: "expense" },
  { keywords: ["insurance", "lic", "hdfc life", "icici pru", "max life", "policy premium"], category: "Insurance", strength: "strong", appliesTo: "expense" },
  { keywords: ["zerodha", "groww", "kuvera", "upstox", "mutual fund", "sip", "nps", "ppf"], category: "Investments", strength: "strong", appliesTo: "expense" },
  { keywords: ["emi", "loan repayment", "credit card payment", "bajaj finance"], category: "EMI & Loans", strength: "strong", appliesTo: "expense" },
  { keywords: ["spotify", "apple music", "gaana", "wynk", "linkedin premium", "icloud", "google one"], category: "Subscriptions", strength: "medium", appliesTo: "expense" },
  { keywords: ["salon", "spa", "beauty", "haircut", "barber", "cosmetics"], category: "Personal Care", strength: "medium", appliesTo: "expense" },
  { keywords: ["self transfer", "transfer to", "transfer from", "upi to self"], category: "Transfers", strength: "weak", appliesTo: "both" },
];
