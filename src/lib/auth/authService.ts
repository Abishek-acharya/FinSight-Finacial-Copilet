import type { AuthResult, AuthSession, DemoUser, SignInInput, SignUpInput } from "./types";

const SESSION_STORAGE_KEY = "finsight_demo_session";
const USERS_STORAGE_KEY = "finsight_demo_users";
const DEMO_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export const DEMO_EMAIL = "demo@finsight.ai";
export const DEMO_PASSWORD = "demo1234";

interface StoredUser extends DemoUser {
  passwordHash: string;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readStorage<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;

  try {
    const rawValue = window.localStorage.getItem(key);
    if (!rawValue) return fallback;
    return JSON.parse(rawValue) as T;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);

  if (typeof crypto !== "undefined" && crypto.subtle) {
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  return Array.from(data)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export function getStoredSession(): AuthSession | null {
  const session = readStorage<AuthSession | null>(SESSION_STORAGE_KEY, null);
  if (!session) return null;

  if (session.expiresAt <= Date.now()) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }

  return session;
}

export function setStoredSession(session: AuthSession) {
  writeStorage(SESSION_STORAGE_KEY, session);
}

export function clearStoredSession() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

function buildDemoUser(): DemoUser {
  return {
    id: "demo-user",
    name: "Devon Brooks",
    email: DEMO_EMAIL,
    avatarUrl: undefined,
  };
}

function createSession(user: DemoUser): AuthSession {
  return {
    user,
    expiresAt: Date.now() + DEMO_SESSION_TTL_MS,
  };
}

function seedUsers(): StoredUser[] {
  const demoUser: StoredUser = {
    ...buildDemoUser(),
    passwordHash: "demo-only",
  };

  const users = [demoUser];
  writeStorage(USERS_STORAGE_KEY, users);
  return users;
}

function getUsers(): StoredUser[] {
  const users = readStorage<StoredUser[] | null>(USERS_STORAGE_KEY, null);
  if (!users || users.length === 0) {
    return seedUsers();
  }

  return users;
}

function saveUsers(users: StoredUser[]) {
  writeStorage(USERS_STORAGE_KEY, users);
}

export async function signIn({ email, password }: SignInInput): Promise<AuthResult> {
  const cleanEmail = normalizeEmail(email);

  if (cleanEmail === DEMO_EMAIL && password === DEMO_PASSWORD) {
    const session = createSession(buildDemoUser());
    setStoredSession(session);
    return { success: true, session };
  }

  const users = getUsers();
  const userRecord = users.find((user) => normalizeEmail(user.email) === cleanEmail);

  if (!userRecord) {
    return { success: false, error: "We couldn't find an account with that email address." };
  }

  const expectedHash = await hashPassword(password);
  if (userRecord.passwordHash !== expectedHash) {
    return { success: false, error: "The password you entered is incorrect." };
  }

  const session = createSession({
    id: userRecord.id,
    name: userRecord.name,
    email: userRecord.email,
    avatarUrl: userRecord.avatarUrl,
  });

  setStoredSession(session);
  return { success: true, session };
}

export async function signUp({ name, email, password }: SignUpInput): Promise<AuthResult> {
  const safeName = name.trim();
  const cleanEmail = normalizeEmail(email);

  if (safeName.length < 2) {
    return { success: false, error: "Please enter a name with at least 2 characters." };
  }

  if (password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters long." };
  }

  const users = getUsers();
  const existingUser = users.find((user) => normalizeEmail(user.email) === cleanEmail);

  if (existingUser) {
    return { success: false, error: "An account with that email already exists." };
  }

  const userRecord: StoredUser = {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`,
    name: safeName,
    email: cleanEmail,
    avatarUrl: undefined,
    passwordHash: await hashPassword(password),
  };

  const updatedUsers = [...users, userRecord];
  saveUsers(updatedUsers);

  const session = createSession({
    id: userRecord.id,
    name: userRecord.name,
    email: userRecord.email,
    avatarUrl: userRecord.avatarUrl,
  });

  setStoredSession(session);
  return { success: true, session };
}

export async function resetPasswordForEmail(email: string): Promise<AuthResult> {
  const cleanEmail = normalizeEmail(email);
  const users = getUsers();

  if (cleanEmail === DEMO_EMAIL || users.some((user) => normalizeEmail(user.email) === cleanEmail)) {
    return {
      success: true,
      error: undefined,
      session: undefined,
    };
  }

  return { success: false, error: "We couldn't find an account with that email address." };
}

export function signOut() {
  clearStoredSession();
}
