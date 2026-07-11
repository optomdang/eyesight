'use client';

import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';

export function AdminLoginModal() {
  const router = useRouter();
  const {
    loginModalOpen,
    closeLoginModal,
    login,
    redirectAfterLogin,
    clearRedirectAfterLogin,
  } = useAdminAuth();

  if (!loginModalOpen) return null;

  const handleSubmit = (email: string, password: string) => {
    const error = login(email, password);
    if (error) return error;

    closeLoginModal();
    if (redirectAfterLogin) {
      router.push(redirectAfterLogin);
      clearRedirectAfterLogin();
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={closeLoginModal}
        aria-label="Đóng"
      />
      <div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={closeLoginModal}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
          aria-label="Đóng"
        >
          ✕
        </button>
        <AdminLoginForm onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
