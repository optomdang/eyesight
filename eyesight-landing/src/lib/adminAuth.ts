export const ADMIN_SESSION_KEY = 'd-visup-admin-session';

export interface AdminSession {
  email: string;
  loggedInAt: number;
}

export function getAdminCredentials() {
  return {
    email: (process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? '').trim().toLowerCase(),
    password: process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? '',
  };
}

export function isAdminConfigured(): boolean {
  const { email, password } = getAdminCredentials();
  return Boolean(email && password);
}

export function validateAdminLogin(email: string, password: string): string | null {
  if (!isAdminConfigured()) {
    return 'Chưa cấu hình tài khoản admin.';
  }

  const expected = getAdminCredentials();
  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedEmail !== expected.email || password !== expected.password) {
    return 'Email hoặc mật khẩu không đúng.';
  }

  return null;
}

export function loadAdminSession(): AdminSession | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(ADMIN_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminSession;
  } catch {
    return null;
  }
}

export function saveAdminSession(email: string): void {
  const session: AdminSession = {
    email,
    loggedInAt: Date.now(),
  };
  sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
}

export function clearAdminSession(): void {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
}
