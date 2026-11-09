import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import { loadOfflineFinanceData } from "@/services/offlineFinanceCache";
import { financeStore } from "@/store/financeStore";

export type AuthStatus = "checking" | "authenticated" | "offline" | "unauthenticated";
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;

function isNetworkUnavailable(error: unknown): boolean {
  return error instanceof TypeError;
}

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
  const lastActivityRef = useRef(Date.now());

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  const signOutSilent = useCallback(async () => {
    setSession(null);
    setStatus("unauthenticated");
    clearStoredSession();
    financeStore.deactivateSession();
    try {
      await signOutService();
    } catch {
      // Ignore session cleanup failures after expiry; the UI must still end the current session.
    }
  }, []);

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
        await financeStore.loadFromDatabase(user.id, savedSession.accessToken, user);
        if (active) {
          setSession({ ...savedSession, user });
          setStatus("authenticated");
        }
      } catch (error) {
        if (isNetworkUnavailable(error)) {
          try {
            const cached = await loadOfflineFinanceData(savedSession.user.id);
            if (cached && cached.user.id === savedSession.user.id && active) {
              financeStore.loadOfflineSnapshot(cached.user.id, cached.snapshot, cached.user);
              setSession({ ...savedSession, user: cached.user });
              setStatus("offline");
              return;
            }
          } catch (cacheError) {
            console.error("Could not restore the offline finance session:", cacheError);
            financeStore.notifyOfflineCacheError(cacheError);
          }
        }
        console.error("Could not restore the saved authentication session:", error);
        clearStoredSession();
        financeStore.deactivateSession();
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

  useEffect(() => {
    if (!session || (status !== "authenticated" && status !== "offline")) return;

    const handleActivity = () => resetActivity();
    const handleSessionExpired = () => {
      void signOutSilent();
    };

    const events = ["click", "keydown", "mousemove", "touchstart", "scroll", "pointerdown"] as const;
    for (const eventName of events) {
      window.addEventListener(eventName, handleActivity);
    }
    window.addEventListener("finsight-session-expired", handleSessionExpired);

    const timer = window.setInterval(() => {
      if (session.expiresAt <= Date.now()) {
        void signOutSilent();
        return;
      }
      if (Date.now() - lastActivityRef.current >= INACTIVITY_TIMEOUT_MS) {
        void signOutSilent();
      }
    }, 30_000);

    return () => {
      for (const eventName of events) {
        window.removeEventListener(eventName, handleActivity);
      }
      window.removeEventListener("finsight-session-expired", handleSessionExpired);
      window.clearInterval(timer);
    };
  }, [resetActivity, session, signOutSilent, status]);

  useEffect(() => {
    if (status !== "offline" || !session) return;
    let active = true;
    const handleOnline = async () => {
      try {
        const user = await getCurrentUser(session.accessToken);
        await financeStore.loadFromDatabase(user.id, session.accessToken, user);
        if (active) {
          setSession({ ...session, user });
          setStatus("authenticated");
        }
      } catch (error) {
        if (!isNetworkUnavailable(error)) {
          console.error("The saved session was rejected after reconnecting:", error);
          await signOutSilent();
        }
      }
    };
    window.addEventListener("online", handleOnline);
    return () => {
      active = false;
      window.removeEventListener("online", handleOnline);
    };
  }, [session, signOutSilent, status]);

  useEffect(() => {
    if (status !== "authenticated" || !session) return;
    const handleOffline = () => {
      if (session.expiresAt <= Date.now()) {
        void signOutSilent();
        return;
      }
      financeStore.enterOfflineMode(session.user.id);
      setStatus("offline");
      void loadOfflineFinanceData(session.user.id).then((cached) => {
        if (cached?.user.id === session.user.id) {
          financeStore.loadOfflineSnapshot(cached.user.id, cached.snapshot, cached.user);
        } else {
          financeStore.notifyOfflineCacheError(new Error("No saved finance snapshot is available for offline use."));
        }
      }).catch((error: unknown) => {
        financeStore.notifyOfflineCacheError(error);
      });
    };
    window.addEventListener("offline", handleOffline);
    return () => window.removeEventListener("offline", handleOffline);
  }, [session, signOutSilent, status]);

  const activateSession = async (result: AuthResult): Promise<AuthResult> => {
    if (!result.success || !result.session) {
      setStatus("unauthenticated");
      return result;
    }
    try {
      await financeStore.loadFromDatabase(result.session.user.id, result.session.accessToken, result.session.user);
      resetActivity();
      setSession(result.session);
      setStatus("authenticated");
      return result;
    } catch (error) {
      if (isNetworkUnavailable(error)) {
        try {
          const cached = await loadOfflineFinanceData(result.session.user.id);
          if (cached && cached.user.id === result.session.user.id) {
            financeStore.loadOfflineSnapshot(cached.user.id, cached.snapshot, cached.user);
            setSession({ ...result.session, user: cached.user });
            setStatus("offline");
            return result;
          }
        } catch (cacheError) {
          console.error("Could not load the offline finance snapshot:", cacheError);
          financeStore.notifyOfflineCacheError(cacheError);
        }
      }
      clearStoredSession();
      financeStore.deactivateSession();
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

  const handleSignOut = useCallback(async () => {
    setSession(null);
    setStatus("unauthenticated");
    financeStore.deactivateSession();
    await signOutService();
  }, []);

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
    [session, status, handleSignOut],
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
