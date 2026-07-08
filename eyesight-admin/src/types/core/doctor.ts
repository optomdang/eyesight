/**
 * DOCTOR TYPES
 * Single source of truth for doctor/physician types
 */

import type { User } from './user';

/**
 * Doctor entity
 */
export interface Doctor {
  id: number;
  code: string;
  specialization: string;
  licenseNumber: string;
  experience?: number;
  qualification?: string;
  clinicId?: number;
  centerId?: number;
  userId?: number;
  treatedPatientsCount?: number;
  user?: Pick<User, 'id' | 'name' | 'email' | 'isEmailVerified'>;
  clinic?: {
    id: number;
    name: string;
    code: string;
  };
  center?: {
    id: number;
    name: string;
    nameEng: string;
    code: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Request to create doctor
 */
export interface CreateDoctorRequest {
  name: string;
  nameEng?: string;
  title?: string;
  email: string;
  phoneNumber: string;
  password: string;
  specialization: string;
  licenseNumber: string;
  experience?: number;
  qualification?: string;
  departmentId?: number;
  clinicId?: number;
  centerId?: number;
}

/**
 * Request to update doctor
 */
export interface UpdateDoctorRequest {
  name?: string;
  nameEng?: string;
  title?: string;
  email?: string;
  phoneNumber?: string;
  specialization?: string;
  licenseNumber?: string;
  experience?: number;
  qualification?: string;
  departmentId?: number;
  clinicId?: number;
  centerId?: number;
  isActive?: boolean;
}
