import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { Button } from "@/components/ui/Button";
import { EmailInput, PasswordInput } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const { signIn } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("demo@finsight.ai");
  const [password, setPassword] = useState("demo1234");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const result = await signIn(email, password);
    setLoading(false);

    if (result.success) {
      const destination = (location.state as { from?: string } | null)?.from ?? "/app/overview";
      navigate(destination, { replace: true });
      return;
    }

    showToast({
      kind: "error",
      title: "Unable to sign in",
      description: result.error ?? "Please try again.",
    });
  }

  return (
    <AuthSplitLayout
      eyebrow="Welcome back"
      title="Log in to your account"
      description="Use the demo credentials to preview the authenticated flow."
      asideTitle="A clearer view is just around the corner."
      asideBody="Sign in to explore the app shell, notifications, and the protected workspace experience for FinSight AI."
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <EmailInput
          label="Email address"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="demo@finsight.ai"
          autoComplete="email"
          required
        />
        <PasswordInput
          label="Password"
          name="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your password"
          autoComplete="current-password"
          required
        />

        <div className="flex items-center justify-between gap-3 text-sm">
          <Link to="/forgot-password" className="font-medium text-accent-secondary hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full" loading={loading}>
          Continue
        </Button>
      </form>

      <div className="mt-6 rounded-xl border border-dashed border-border bg-surface-secondary p-4 text-sm text-ink-muted">
        Demo credentials: <span className="font-semibold text-ink">demo@finsight.ai</span> / <span className="font-semibold text-ink">demo1234</span>
      </div>

      <p className="mt-6 text-center text-sm text-ink-muted">
        New to FinSight? <Link to="/register" className="font-semibold text-accent-secondary hover:underline">Create an account</Link>
      </p>
    </AuthSplitLayout>
  );
}
