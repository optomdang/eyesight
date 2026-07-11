'use client';

import { AdminAuthProvider } from '@/contexts/AdminAuthContext';
import { DoctorsProvider } from '@/contexts/DoctorsContext';
import { RegistrationProvider } from '@/contexts/RegistrationContext';
import { AdminLoginModal } from '@/components/admin/AdminLoginModal';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <DoctorsProvider>
        <RegistrationProvider>
          {children}
          <AdminLoginModal />
        </RegistrationProvider>
      </DoctorsProvider>
    </AdminAuthProvider>
  );
}
