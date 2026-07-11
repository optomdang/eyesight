import type { DoctorFormData, DoctorRecord, DoctorTitle } from '@/types/doctor';

export const doctorTitleOptions: { value: DoctorTitle; label: string }[] = [
  { value: 'doctor', label: 'Bác sĩ (Doctor)' },
  { value: 'optometrist', label: 'Chuyên gia (Optometrist)' },
  { value: 'optician', label: 'Kính thuật viên (Optician)' },
  { value: 'nurse', label: 'Điều dưỡng (Nurse)' },
];

const titlePrefixes: Record<DoctorTitle, string> = {
  doctor: 'DT',
  optometrist: 'OP',
  optician: 'OC',
  nurse: 'NU',
};

export function getDoctorTitleLabel(title: DoctorTitle): string {
  return doctorTitleOptions.find((o) => o.value === title)?.label ?? title;
}

export function getVisibleDoctors(doctors: DoctorRecord[]): DoctorRecord[] {
  return doctors.filter((d) => !d.hidden);
}

export function findDoctorByCode(doctors: DoctorRecord[], code: string): DoctorRecord | undefined {
  const normalized = code.trim().toUpperCase();
  return doctors.find((d) => d.code.toUpperCase() === normalized);
}

export function generateDoctorCode(title: DoctorTitle, doctors: DoctorRecord[]): string {
  const prefix = titlePrefixes[title];
  const existing = doctors
    .filter((d) => d.code.startsWith(prefix))
    .map((d) => parseInt(d.code.slice(prefix.length), 10))
    .filter((n) => !Number.isNaN(n));

  const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

export function formatDoctorBirthDate(date: string): string {
  if (!date) return '—';
  const [year, month, day] = date.split('-');
  if (!year || !month || !day) return date;
  return `${day}/${month}/${year}`;
}

export function createDoctorId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `doc-${Date.now()}`;
}

export function validateDoctorForm(data: DoctorFormData): string | null {
  if (!data.fullName.trim()) return 'Vui lòng nhập họ tên.';
  if (!data.dateOfBirth) return 'Vui lòng chọn ngày sinh.';
  if (!data.workplace.trim()) return 'Vui lòng nhập đơn vị công tác.';
  if (!data.title) return 'Vui lòng chọn chức danh.';
  return null;
}
