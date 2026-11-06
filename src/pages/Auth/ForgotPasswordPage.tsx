import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { Button } from "@/components/ui/Button";
import { EmailInput } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState("demo@finsight.ai");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const result = await resetPassword(email);
    setLoading(false);

    if (result.success) {
      showToast({
        kind: "success",
        title: "Reset link prepared",
        description: "A recovery email has been queued for the demo account.",
      });
      return;
    }

    showToast({
      kind: "error",
      title: "We couldn't continue",
      description: result.error ?? "Please try a different email.",
    });
  }

  return (
    <AuthSplitLayout
      eyebrow="Reset password"
      title="Need a hand getting back in?"
      description="Use the demo account email or a registered account to simulate a password reset flow."
      asideTitle="Keep your finances moving forward."
      asideBody="This is a demo-only reset flow designed to show the experience before the backend auth service is connected."
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <EmailInput
          label="Email address"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
        />
        <Button type="submit" className="w-full" loading={loading}>
          Send reset link
        </Button>
      </form>

      <div className="mt-6 flex items-center justify-between text-sm">
        <Link to="/login" className="font-semibold text-accent-secondary hover:underline">
          Back to login
        </Link>
        <Link to="/register" className="text-ink-muted hover:text-ink">
          Create an account
        </Link>
      </div>
    </AuthSplitLayout>
  );
}
