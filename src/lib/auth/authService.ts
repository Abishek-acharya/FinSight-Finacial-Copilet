import type { AuthResult, AuthSession, DemoUser, SignInInput, SignUpInput } from "./types";

const SESSION_STORAGE_KEY = "finsight_demo_session";

export const DEMO_EMAIL = "demo@finsight.ai";
export const DEMO_PASSWORD = "demo1234";

interface ApiSession {
  user: DemoUser;
  access_token: string;
  expires_at: number;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function toAuthSession(value: ApiSession): AuthSession {
  return {
    user: value.user,
    accessToken: value.access_token,
    expiresAt: value.expires_at,
  };
}

async function requestSession(path: string, payload: object): Promise<AuthResult> {
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json() as ApiSession | { detail?: unknown };
    if (!response.ok) {
      const error = "detail" in body && typeof body.detail === "string"
        ? body.detail
        : `Authentication failed with status ${response.status}.`;
      return { success: false, error };
    }

    const session = toAuthSession(body as ApiSession);
    if (isBrowser()) window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    return { success: true, session };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "The authentication service is unavailable.",
    };
  }
}

export function getStoredSession(): AuthSession | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Partial<AuthSession>;
    if (
      typeof session.accessToken !== "string" ||
      typeof session.expiresAt !== "number" ||
      session.expiresAt <= Date.now() ||
      !session.user ||
      typeof session.user.id !== "string"
    ) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return session as AuthSession;
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

export function setStoredSession(session: AuthSession) {
  if (!isBrowser()) return;
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

export async function getCurrentUser(accessToken: string): Promise<DemoUser> {
  const response = await fetch("/api/auth/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = await response.json() as { user?: DemoUser; detail?: unknown };
  if (!response.ok || !body.user) {
    const error = typeof body.detail === "string" ? body.detail : "Your session could not be verified.";
    throw new Error(error);
  }
  return body.user;
}

export async function signIn(input: SignInInput): Promise<AuthResult> {
  return requestSession("/api/auth/sign-in", input);
}

export async function signUp(input: SignUpInput): Promise<AuthResult> {
  return requestSession("/api/auth/sign-up", input);
}

export async function resetPasswordForEmail(_email: string): Promise<AuthResult> {
  return {
    success: false,
    error: "Password reset is not configured for this local demo.",
  };
}

export async function signOut(): Promise<void> {
  const session = getStoredSession();
  try {
    if (session) {
      const response = await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (!response.ok && response.status !== 401) {
        throw new Error(`Could not revoke the session (HTTP ${response.status}).`);
      }
    }
  } finally {
    clearStoredSession();
  }
}
