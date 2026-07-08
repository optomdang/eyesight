/**
 * USER & AUTHENTICATION TYPES
 * Single source of truth for user-related types
 */

import type { TreatmentStatus, PatientExamResults } from './patient';

export type UserType = 'admin' | 'doctor' | 'patient';
export type UserStatus = 'active' | 'inactive' | 'suspended';

/**
 * Address structure
 */
export interface AddressValue {
  country?: string;
  province?: string;
  provinceCode?: number;
  ward?: string;
  wardCode?: number;
  specificAddress?: string;
}

/**
 * User base interface - comprehensive
 */
export interface User {
  id?: number;
  name: string;
  nameEng?: string;
  email: string;
  phoneNumber?: string;
  zaloUserId?: string;
  zaloPhoneNumber?: string;
  avatar?: string;
  address?: AddressValue | string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  userType: UserType;
  status?: UserStatus;
  password?: string;
  roleId?: number;
  roleCode?: string;
  isEmailVerified?: boolean;
  defaultClinicId?: number;
  fcmRegistrationToken?: string;
  centerId?: number;
  active?: boolean;

  // Relations
  center?: {
    id: number;
    name: string;
    nameEng?: string;
    code: string;
  };
  role?: Role;

  // Doctor profile (when userType = 'doctor')
  doctor?: DoctorProfile;
  doctorProfile?: DoctorProfile; // Legacy

  // Patient profile (when userType = 'patient')
  patient?: PatientProfile;
  patientProfile?: PatientProfile; // Legacy

  createdAt?: string;
  updatedAt?: string;
}

/**
 * Doctor profile embedded in User
 */
export interface DoctorProfile {
  id: number;
  code?: string;
  specialization?: string;
  licenseNumber?: string;
  qualification?: string;
  departmentId?: number;
  userId?: number;
  treatedPatientsCount?: number;
}

/**
 * Patient profile embedded in User
 */
export interface PatientProfile {
  id: number;
  code: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  doctorId?: number;
  currentEyesight?: number;
  userId?: number;
  severityLevel?: 'mild' | 'moderate' | 'severe' | 'critical';
  severityNotes?: string;
  treatmentStatus?: TreatmentStatus;
  activeFrom?: string;
  activeTo?: string;
  /** Exam results embedded in patient profile (mirrors Patient.examResults) */
  examResults?: PatientExamResults;
}

/**
 * User with role information
 */
export interface UserWithRole extends User {
  role?: Role;
}

/**
 * Role definition
 */
export interface Role {
  id: number;
  name: string;
  code?: string;
  description?: string;
  rights?: Permission[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Permission type
 */
export interface Permission {
  id: number;
  name: string;
  resource?: string;
  action?: string;
}

/**
 * Authentication credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Authentication tokens
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Current user context
 */
export interface CurrentUser extends User {
  role?: Role;
  permissions?: string[];
}
