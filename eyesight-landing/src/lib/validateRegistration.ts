import type { DoctorSelection, MedicalHistory, PersonalInfo } from '@/types/registration';

export type StepErrors = Record<string, string>;

export function validatePersonalInfo(data: PersonalInfo): StepErrors {
  const errors: StepErrors = {};

  if (!data.fullName.trim()) {
    errors.fullName = 'Vui lòng nhập họ tên';
  }

  if (!data.dateOfBirth) {
    errors.dateOfBirth = 'Vui lòng chọn ngày sinh';
  }

  const phone = data.phone.replace(/\D/g, '');
  if (!phone) {
    errors.phone = 'Vui lòng nhập số điện thoại';
  } else if (phone.length < 10 || phone.length > 11) {
    errors.phone = 'Số điện thoại không hợp lệ';
  }

  if (!data.address.trim()) {
    errors.address = 'Vui lòng nhập địa chỉ';
  }

  return errors;
}

export function validateMedicalHistory(data: MedicalHistory): StepErrors {
  const errors: StepErrors = {};

  if (!data.currentAge) errors.currentAge = 'Vui lòng chọn tuổi hiện tại';
  if (!data.glassesStartAge) errors.glassesStartAge = 'Vui lòng chọn tuổi bắt đầu đeo kính';
  if (!data.refractiveError) errors.refractiveError = 'Vui lòng chọn mức độ tật khúc xạ';
  if (!data.visualAcuityWithGlasses) {
    errors.visualAcuityWithGlasses = 'Vui lòng chọn thị lực với kính';
  }
  if (!data.treatmentDuration) errors.treatmentDuration = 'Vui lòng chọn thời gian điều trị';

  if (data.sessionsCompleted < 0 || Number.isNaN(data.sessionsCompleted)) {
    errors.sessionsCompleted = 'Số buổi tập không hợp lệ';
  }

  return errors;
}

export function validatePlanSelection(planCode: string): StepErrors {
  if (!planCode) {
    return { selectedPlanCode: 'Vui lòng chọn gói điều trị' };
  }
  return {};
}

export function validateDoctorSelection(data: DoctorSelection): StepErrors {
  const errors: StepErrors = {};

  if (!data.doctorCode.trim()) {
    errors.doctorCode = 'Vui lòng chọn hoặc nhập mã Bác sĩ/Chuyên gia';
  }

  return errors;
}
