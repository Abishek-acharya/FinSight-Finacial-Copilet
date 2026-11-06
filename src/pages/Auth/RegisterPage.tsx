import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { EmailInput, Input, PasswordInput } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";

export default function RegisterPage() {
  const { signUp } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState("Jordan Lee");
  const [email, setEmail] = useState("you@example.com");
  const [password, setPassword] = useState("DemoPass123!");
  const [agreed, setAgreed] = useState(true);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!agreed) {
      showToast({ kind: "error", title: "Please accept the terms", description: "We need your agreement before creating the account." });
      return;
    }

    setLoading(true);
    const result = await signUp(name, email, password);
    setLoading(false);

    if (result.success) {
      navigate("/app/overview", { replace: true });
      return;
    }

    showToast({ kind: "error", title: "Account creation failed", description: result.error ?? "Please check your details and try again." });
  }

  return (
    <AuthSplitLayout
      eyebrow="Create account"
      title="Build a smarter money routine"
      description="Create an account to save your financial data in your own protected workspace."
      asideTitle="Build a more thoughtful relationship with money."
      asideBody="Your account and financial data are stored separately from other users in the local FinSight database."
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <Input
          label="Your name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Jordan Lee"
          autoComplete="name"
          required
        />
        <EmailInput
          label="Email address"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
        <PasswordInput
          label="Create a password"
          name="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          minLength={8}
          required
        />

        <PasswordStrength password={password} />

        <label className="flex items-start gap-2.5 text-sm leading-5 text-ink-muted">
          <Checkbox checked={agreed} onChange={(event) => setAgreed(event.target.checked)} required className="mt-0.5" />
          <span>I understand this app stores account and finance data in its local database.</span>
        </label>

        <Button type="submit" className="w-full" loading={loading}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-muted">
        Already have an account? <Link to="/login" className="font-semibold text-accent-secondary hover:underline">Log in</Link>
      </p>
    </AuthSplitLayout>
  );
}
