'use client';

import { useState } from 'react';
import { useDoctors } from '@/contexts/DoctorsContext';
import type { DoctorSelection } from '@/types/registration';
import { Field, TextInput } from '@/components/registration/FormFields';
import type { StepErrors } from '@/lib/validateRegistration';

interface DoctorStepProps {
  data: DoctorSelection;
  errors: StepErrors;
  onChange: (data: DoctorSelection) => void;
}

export function DoctorStep({ data, errors, onChange }: DoctorStepProps) {
  const { findVisibleByCode } = useDoctors();
  const [unknownCodeWarning, setUnknownCodeWarning] = useState(false);

  const handleCodeInput = (code: string) => {
    const doctor = findVisibleByCode(code);
    setUnknownCodeWarning(Boolean(code.trim()) && !doctor);
    onChange({
      doctorCode: code,
      doctorName: doctor?.fullName ?? data.doctorName,
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Nhập mã Bác sĩ hoặc Chuyên gia đồng hành mà Bác sĩ/Chuyên gia đã cung cấp cho bạn.
      </p>

      <Field label="Nhập mã Bác sĩ / Chuyên gia" error={errors.doctorCode}>
        <TextInput
          value={data.doctorCode}
          onChange={(e) => handleCodeInput(e.target.value.toUpperCase())}
          placeholder="VD: DT001, OP001"
        />
      </Field>

      {unknownCodeWarning && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Mã không có trong danh sách. Bạn vẫn có thể tiếp tục nếu mã do Bác sĩ/Chuyên gia cung cấp.
        </p>
      )}

      {data.doctorName && (
        <p className="text-sm text-gray-600">
          Đã chọn: <span className="font-medium text-gray-900">{data.doctorName}</span>
        </p>
      )}
    </div>
  );
}
