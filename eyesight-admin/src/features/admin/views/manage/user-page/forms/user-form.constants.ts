// Doctor specialization options
export const SPECIALIZATION_OPTIONS = [
  {
    value: 'ophthalmologist',
    label: 'doctor.ophthalmologist',
    defaultLabel: 'Bác sĩ chuyên khoa mắt',
  },
  { value: 'optometrist', label: 'doctor.optometrist', defaultLabel: 'Khúc xạ nhãn khoa' },
  { value: 'optician', label: 'doctor.optician', defaultLabel: 'Kỹ thuật viên' },
  { value: 'nurse', label: 'doctor.nurse', defaultLabel: 'Điều dưỡng' },
] as const;

// Doctor qualification options
export const QUALIFICATION_OPTIONS = [
  { value: 'professor', label: 'doctor.professor', defaultLabel: 'Giáo sư' },
  { value: 'associate_professor', label: 'doctor.associateProfessor', defaultLabel: 'Phó Giáo sư' },
  { value: 'phd', label: 'doctor.phd', defaultLabel: 'Tiến sĩ' },
  { value: 'master', label: 'doctor.master', defaultLabel: 'Thạc sĩ' },
  { value: 'bachelor', label: 'doctor.bachelor', defaultLabel: 'Đại học' },
  { value: 'college', label: 'doctor.college', defaultLabel: 'Cao đẳng' },
  { value: 'vocational', label: 'doctor.vocational', defaultLabel: 'Trung cấp' },
] as const;

// Severity level options for patients
export const SEVERITY_LEVEL_OPTIONS = [
  { value: 'mild', label: 'Nhẹ (Mild)' },
  { value: 'moderate', label: 'Trung Bình (Moderate)' },
  { value: 'severe', label: 'Nặng (Severe)' },
  { value: 'critical', label: 'Rất Nặng (Critical)' },
] as const;
