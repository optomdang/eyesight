export interface PersonalInfo {
  fullName: string;
  dateOfBirth: string;
  phone: string;
  address: string;
}

export type YesNo = 'yes' | 'no';

export interface MedicalHistory {
  currentAge: string;
  glassesStartAge: string;
  myopia: YesNo;
  hyperopia: YesNo;
  astigmatism: YesNo;
  strabismus: YesNo;
  cataract: YesNo;
  nystagmus: YesNo;
  otherEyeCondition: string;
  refractiveError: string;
  visualAcuityWithGlasses: string;
  treatmentDuration: string;
  machineTraining: YesNo;
  softwareTraining: YesNo;
  sessionsCompleted: number;
}

export interface DoctorSelection {
  doctorCode: string;
  doctorName: string;
}

export interface RegistrationFormData {
  personal: PersonalInfo;
  medical: MedicalHistory;
  selectedPlanCode: string;
  recommendedPlanCodes: string[];
  recommendedPlanCode: string;
  recommendationReason: string;
  doctor: DoctorSelection;
}

export const initialPersonalInfo: PersonalInfo = {
  fullName: '',
  dateOfBirth: '',
  phone: '',
  address: '',
};

export const initialMedicalHistory: MedicalHistory = {
  currentAge: '',
  glassesStartAge: '',
  myopia: 'no',
  hyperopia: 'no',
  astigmatism: 'no',
  strabismus: 'no',
  cataract: 'no',
  nystagmus: 'no',
  otherEyeCondition: '',
  refractiveError: '',
  visualAcuityWithGlasses: '',
  treatmentDuration: '',
  machineTraining: 'no',
  softwareTraining: 'no',
  sessionsCompleted: 0,
};

export const initialDoctorSelection: DoctorSelection = {
  doctorCode: '',
  doctorName: '',
};
