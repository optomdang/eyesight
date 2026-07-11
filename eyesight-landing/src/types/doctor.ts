export type DoctorTitle = 'doctor' | 'optometrist' | 'optician' | 'nurse';

export interface DoctorRecord {
  id: string;
  code: string;
  fullName: string;
  dateOfBirth: string;
  workplace: string;
  title: DoctorTitle;
  description?: string;
}

export type DoctorFormData = Omit<DoctorRecord, 'id' | 'code'> & {
  id?: string;
  code?: string;
};
