'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, TextInput } from '@/components/registration/FormFields';
import { isAdminConfigured } from '@/lib/adminAuth';

interface AdminLoginFormProps {
  onSubmit: (email: string, password: string) => string | null;
  title?: string;
  description?: string;
  submitLabel?: string;
}

export function AdminLoginForm({
  onSubmit,
  title = 'Đăng nhập quản trị',
  description = 'Chỉ tài khoản admin mới truy cập được trang quản lý.',
  submitLabel = 'Đăng nhập',
}: AdminLoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const result = onSubmit(email, password);
    if (result) {
      setError(result);
      return;
    }
    setError('');
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      <p className="mt-2 text-sm text-gray-600">{description}</p>

      <div className="mt-6 space-y-4">
        {!isAdminConfigured() && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Chưa cấu hình tài khoản admin. Đặt{' '}
            <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_ADMIN_EMAIL</code> và{' '}
            <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_ADMIN_PASSWORD</code> trong
            file .env.local.
          </p>
        )}

        <Field label="Email admin">
          <TextInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="admin@example.com"
            autoComplete="username"
          />
        </Field>

        <Field label="Mật khẩu">
          <TextInput
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="button" onClick={handleSubmit} className="w-full" disabled={!isAdminConfigured()}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
