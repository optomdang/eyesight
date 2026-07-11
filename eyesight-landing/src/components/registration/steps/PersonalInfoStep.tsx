'use client';

import type { PersonalInfo } from '@/types/registration';
import { Field, TextInput } from '@/components/registration/FormFields';
import type { StepErrors } from '@/lib/validateRegistration';

interface PersonalInfoStepProps {
  data: PersonalInfo;
  errors: StepErrors;
  onChange: (data: PersonalInfo) => void;
}

export function PersonalInfoStep({ data, errors, onChange }: PersonalInfoStepProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Nhập thông tin người tập để chúng tôi hỗ trợ kích hoạt tài khoản sau thanh toán.
      </p>

      <Field label="Họ tên (Người tập)" error={errors.fullName}>
        <TextInput
          value={data.fullName}
          onChange={(e) => onChange({ ...data, fullName: e.target.value })}
          placeholder="Nguyễn Văn A"
        />
      </Field>

      <Field label="Ngày sinh" error={errors.dateOfBirth}>
        <TextInput
          type="date"
          value={data.dateOfBirth}
          onChange={(e) => onChange({ ...data, dateOfBirth: e.target.value })}
        />
      </Field>

      <Field label="Số điện thoại" error={errors.phone}>
        <TextInput
          type="tel"
          value={data.phone}
          onChange={(e) => onChange({ ...data, phone: e.target.value })}
          placeholder="0912345678"
        />
      </Field>

      <Field label="Địa chỉ" error={errors.address}>
        <TextInput
          value={data.address}
          onChange={(e) => onChange({ ...data, address: e.target.value })}
          placeholder="Số nhà, phường/xã, quận/huyện, tỉnh/thành"
        />
      </Field>
    </div>
  );
}
