import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  clearStoredSession,
  getCurrentUser,
  getStoredSession,
  resetPasswordForEmail,
  signIn,
  signOut as signOutService,
  signUp,
} from "@/lib/auth/authService";
import type { AuthResult, AuthSession, DemoUser } from "@/lib/auth/types";
import { financeStore } from "@/store/financeStore";

export type AuthStatus = "checking" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: DemoUser | null;
  status: AuthStatus;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (name: string, email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<AuthStatus>("checking");

  useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      const savedSession = getStoredSession();
      if (!savedSession) {
        if (active) setStatus("unauthenticated");
        return;
      }
      try {
        const user = await getCurrentUser(savedSession.accessToken);
        await financeStore.loadFromDatabase(user.id, savedSession.accessToken);
        if (active) {
          setSession({ ...savedSession, user });
          setStatus("authenticated");
        }
      } catch {
        clearStoredSession();
        if (active) {
          setSession(null);
          setStatus("unauthenticated");
        }
      }
    };
    void restoreSession();
    return () => {
      active = false;
    };
  }, []);

  const activateSession = async (result: AuthResult): Promise<AuthResult> => {
    if (!result.success || !result.session) {
      setStatus("unauthenticated");
      return result;
    }
    try {
      await financeStore.loadFromDatabase(result.session.user.id, result.session.accessToken);
      setSession(result.session);
      setStatus("authenticated");
      return result;
    } catch (error) {
      clearStoredSession();
      setSession(null);
      setStatus("unauthenticated");
      return {
        success: false,
        error: error instanceof Error ? error.message : "Could not load your financial data.",
      };
    }
  };

  const handleSignIn = async (email: string, password: string) => {
    setStatus("checking");
    return activateSession(await signIn({ email, password }));
  };

  const handleSignUp = async (name: string, email: string, password: string) => {
    setStatus("checking");
    return activateSession(await signUp({ name, email, password }));
  };

  const handleSignOut = async () => {
    setSession(null);
    setStatus("unauthenticated");
    await signOutService();
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
