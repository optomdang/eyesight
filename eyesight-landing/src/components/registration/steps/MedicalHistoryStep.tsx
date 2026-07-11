'use client';

import type { MedicalHistory } from '@/types/registration';
import {
  currentAgeOptions,
  eyeConditionFields,
  glassesStartAgeOptions,
  refractiveErrorOptions,
  treatmentDurationOptions,
  visualAcuityOptions,
  yesNoOptions,
} from '@/content/registrationOptions';
import { Field, RadioGroup, SelectInput, TextInput } from '@/components/registration/FormFields';
import type { StepErrors } from '@/lib/validateRegistration';

interface MedicalHistoryStepProps {
  data: MedicalHistory;
  errors: StepErrors;
  onChange: (data: MedicalHistory) => void;
}

export function MedicalHistoryStep({ data, errors, onChange }: MedicalHistoryStepProps) {
  return (
    <div className="space-y-5">
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
        Thông tin bệnh sử giúp chọn gói điều trị phù hợp, tránh lãng phí hoặc tập không hiệu quả. Bạn nên có Bác sĩ hướng dẫn để điền các thông tin này chính xác!
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tuổi hiện tại" error={errors.currentAge}>
          <SelectInput
            value={data.currentAge}
            onChange={(e) => onChange({ ...data, currentAge: e.target.value })}
          >
            <option value="">-- Chọn --</option>
            {currentAgeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label="Tuổi bắt đầu đeo kính" error={errors.glassesStartAge}>
          <SelectInput
            value={data.glassesStartAge}
            onChange={(e) => onChange({ ...data, glassesStartAge: e.target.value })}
          >
            <option value="">-- Chọn --</option>
            {glassesStartAgeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SelectInput>
        </Field>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700">Vấn đề đang gặp phải</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {eyeConditionFields.map(({ key, label }) => (
            <Field key={key} label={label}>
              <RadioGroup
                name={key}
                value={data[key]}
                options={yesNoOptions}
                onChange={(value) => onChange({ ...data, [key]: value as MedicalHistory[typeof key] })}
              />
            </Field>
          ))}
        </div>
      </div>

      <Field label="Bệnh lý mắt khác (nếu có)">
        <TextInput
          value={data.otherEyeCondition}
          onChange={(e) => onChange({ ...data, otherEyeCondition: e.target.value })}
          placeholder="Ghi rõ bệnh lý khác"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Mức độ tật khúc xạ (mắt nặng hơn)" error={errors.refractiveError}>
          <SelectInput
            value={data.refractiveError}
            onChange={(e) => onChange({ ...data, refractiveError: e.target.value })}
          >
            <option value="">-- Chọn --</option>
            {refractiveErrorOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label="Thị lực với kính hiện tại (mắt nặng hơn)" error={errors.visualAcuityWithGlasses}>
          <SelectInput
            value={data.visualAcuityWithGlasses}
            onChange={(e) => onChange({ ...data, visualAcuityWithGlasses: e.target.value })}
          >
            <option value="">-- Chọn --</option>
            {visualAcuityOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SelectInput>
        </Field>
      </div>

      <Field label="Đã điều trị bao lâu" error={errors.treatmentDuration}>
        <SelectInput
          value={data.treatmentDuration}
          onChange={(e) => onChange({ ...data, treatmentDuration: e.target.value })}
        >
          <option value="">-- Chọn --</option>
          {treatmentDurationOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </SelectInput>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Đã tập máy">
          <RadioGroup
            name="machineTraining"
            value={data.machineTraining}
            options={yesNoOptions}
            onChange={(value) =>
              onChange({ ...data, machineTraining: value as MedicalHistory['machineTraining'] })
            }
          />
        </Field>

        <Field label="Đã tập phần mềm">
          <RadioGroup
            name="softwareTraining"
            value={data.softwareTraining}
            options={yesNoOptions}
            onChange={(value) =>
              onChange({ ...data, softwareTraining: value as MedicalHistory['softwareTraining'] })
            }
          />
        </Field>
      </div>

      <Field label="Số buổi tập đã tập" error={errors.sessionsCompleted}>
        <TextInput
          type="number"
          min={0}
          value={data.sessionsCompleted}
          onChange={(e) =>
            onChange({ ...data, sessionsCompleted: Number.parseInt(e.target.value, 10) || 0 })
          }
        />
      </Field>
    </div>
  );
}
