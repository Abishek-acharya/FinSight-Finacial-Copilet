import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { resetPasswordForEmail, signIn, signOut as signOutService, signUp } from "@/lib/auth/authService";
import { getStoredSession } from "@/lib/auth/authService";
import type { AuthResult, AuthSession, DemoUser } from "@/lib/auth/types";

export type AuthStatus = "checking" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: DemoUser | null;
  status: AuthStatus;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (name: string, email: string, password: string) => Promise<AuthResult>;
  signOut: () => void;
  resetPassword: (email: string) => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<AuthStatus>("checking");

  useEffect(() => {
    const savedSession = getStoredSession();
    setSession(savedSession);
    setStatus(savedSession ? "authenticated" : "unauthenticated");
  }, []);

  const handleSignIn = async (email: string, password: string) => {
    const result = await signIn({ email, password });

    if (result.success && result.session) {
      setSession(result.session);
      setStatus("authenticated");
    } else {
      setStatus("unauthenticated");
    }

    return result;
  };

  const handleSignUp = async (name: string, email: string, password: string) => {
    const result = await signUp({ name, email, password });

    if (result.success && result.session) {
      setSession(result.session);
      setStatus("authenticated");
    } else {
      setStatus("unauthenticated");
    }

    return result;
  };

  const handleSignOut = () => {
    signOutService();
    setSession(null);
    setStatus("unauthenticated");
  };

  const handleResetPassword = async (email: string) => {
    return resetPasswordForEmail(email);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      status,
      signIn: handleSignIn,
      signUp: handleSignUp,
      signOut: handleSignOut,
      resetPassword: handleResetPassword,
    }),
    [session, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider.");
  }

  return context;
}

export default AuthContext;
