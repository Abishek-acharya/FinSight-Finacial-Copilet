import { cn } from "@/lib/utils";

export function PasswordStrength({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];

  const score = checks.filter(Boolean).length;
  const label =
    score <= 1 ? "Weak" : score === 2 ? "Fair" : score === 3 ? "Strong" : "Excellent";
  const tone =
    score <= 1 ? "bg-error" : score === 2 ? "bg-[#d7974b]" : score === 3 ? "bg-success" : "bg-[#2d7a5a]";

  if (!password) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-medium text-ink-muted">
        <span>Password strength</span>
        <span className="text-ink">{label}</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {checks.map((isValid, index) => (
          <span
            key={index}
            className={cn(
              "h-2 rounded-full",
              isValid ? tone : "bg-surface-secondary",
            )}
          />
        ))}
      </div>
    </div>
  );
}
