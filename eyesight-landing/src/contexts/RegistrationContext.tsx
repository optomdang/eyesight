'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { RegistrationWizard } from '@/components/registration/RegistrationWizard';

interface RegistrationContextValue {
  openRegistration: (planCode?: string) => void;
}

const RegistrationContext = createContext<RegistrationContextValue | null>(null);

export function RegistrationProvider({ children }: { children: ReactNode }) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [preselectedPlanCode, setPreselectedPlanCode] = useState<string>();

  const openRegistration = useCallback((planCode?: string) => {
    setPreselectedPlanCode(planCode);
    setWizardOpen(true);
  }, []);

  return (
    <RegistrationContext.Provider value={{ openRegistration }}>
      {children}
      <RegistrationWizard
        open={wizardOpen}
        preselectedPlanCode={preselectedPlanCode}
        onClose={() => setWizardOpen(false)}
      />
    </RegistrationContext.Provider>
  );
}

export function useRegistration() {
  const ctx = useContext(RegistrationContext);
  if (!ctx) {
    throw new Error('useRegistration must be used within RegistrationProvider');
  }
  return ctx;
}
