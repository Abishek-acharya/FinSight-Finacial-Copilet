export interface DemoUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface AuthSession {
  user: DemoUser;
  accessToken: string;
  expiresAt: number;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  session?: AuthSession;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
}
