'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  clearAdminSession,
  loadAdminSession,
  saveAdminSession,
  validateAdminLogin,
  type AdminSession,
} from '@/lib/adminAuth';

interface AdminAuthContextValue {
  session: AdminSession | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => string | null;
  logout: () => void;
  loginModalOpen: boolean;
  openLoginModal: (redirectTo?: string) => void;
  closeLoginModal: () => void;
  redirectAfterLogin: string | null;
  clearRedirectAfterLogin: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [redirectAfterLogin, setRedirectAfterLogin] = useState<string | null>(null);

  useEffect(() => {
    setSession(loadAdminSession());
    setLoading(false);
  }, []);

  const login = useCallback((email: string, password: string): string | null => {
    const error = validateAdminLogin(email, password);
    if (error) return error;

    const normalizedEmail = email.trim().toLowerCase();
    saveAdminSession(normalizedEmail);
    setSession({ email: normalizedEmail, loggedInAt: Date.now() });
    return null;
  }, []);

  const logout = useCallback(() => {
    clearAdminSession();
    setSession(null);
    setLoginModalOpen(false);
    setRedirectAfterLogin(null);
  }, []);

  const openLoginModal = useCallback((redirectTo?: string) => {
    if (redirectTo) setRedirectAfterLogin(redirectTo);
    setLoginModalOpen(true);
  }, []);

  const closeLoginModal = useCallback(() => {
    setLoginModalOpen(false);
    setRedirectAfterLogin(null);
  }, []);

  const clearRedirectAfterLogin = useCallback(() => {
    setRedirectAfterLogin(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      isAuthenticated: Boolean(session),
      loading,
      login,
      logout,
      loginModalOpen,
      openLoginModal,
      closeLoginModal,
      redirectAfterLogin,
      clearRedirectAfterLogin,
    }),
    [
      session,
      loading,
      login,
      logout,
      loginModalOpen,
      openLoginModal,
      closeLoginModal,
      redirectAfterLogin,
      clearRedirectAfterLogin,
    ],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return ctx;
}
