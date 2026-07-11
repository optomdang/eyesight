'use client';

import { useEffect, type ReactNode } from 'react';
import { registrationSteps } from '@/content/registrationOptions';

interface RegistrationModalProps {
  open: boolean;
  currentStep: number;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
}

export function RegistrationModal({
  open,
  currentStep,
  onClose,
  children,
  footer,
}: RegistrationModalProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="Đóng"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="registration-title"
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="registration-title" className="text-lg font-bold text-gray-900">
                Đăng ký gói điều trị
              </h2>
              <p className="mt-0.5 text-sm text-gray-500">
                Bước {currentStep}/5 — {registrationSteps[currentStep - 1]?.label}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              aria-label="Đóng"
            >
              ✕
            </button>
          </div>

          <div className="mt-4 flex gap-1">
            {registrationSteps.map((step) => (
              <div
                key={step.id}
                className={`h-1.5 flex-1 rounded-full ${
                  step.id <= currentStep ? 'bg-brand-teal' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>

        <div className="border-t border-gray-100 px-5 py-4 sm:px-6">{footer}</div>
      </div>
    </div>
  );
}
