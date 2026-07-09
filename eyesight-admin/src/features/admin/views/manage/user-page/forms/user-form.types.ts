import { FormDialogProps } from 'src/types/core';
import { AddressValue } from 'src/components/forms/AddressFields';

// Extended props for reusable form
export interface UserFormProps extends FormDialogProps {
  userType?: UserType; // Predefined user type - if provided, hide user type selection
  readOnly?: boolean;
}

// Enum cho user types (sync với UserRole từ types)
export enum UserType {
  ADMIN = 'admin',
  DOCTOR = 'doctor',
  PATIENT = 'patient',
}

// Interface cho unified form data
export interface UnifiedUserFormData {
  // Base user fields
  id?: number;
  userType: UserType;
  name?: string;
  email?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  zaloUserId?: string;
  zaloPhoneNumber?: string;
  password?: string;
  changePassword?: boolean; // For edit mode: toggle password change
  newPassword?: string; // New password when changing
  confirmPassword?: string; // Confirm new password
  active?: boolean; // Account active status
  address?: AddressValue | string; // Support both object (new) and string (legacy)
  roleId?: number;
  centerId?: number;
  defaultClinicId?: number;
  // Doctor và Patient là objects (giống API response)
  doctor?: DoctorFormData;
  patient?: PatientFormData;
}

export interface DoctorFormData {
  id?: number;
  code?: string;
  specialization?: string;
  licenseNumber?: string;
  qualification?: string;
  departmentId?: number;
  treatedPatientsCount?: number; // Số bệnh nhân đã điều trị
}

export interface PatientFormData {
  id?: number;
  code?: string;
  gender?: 'male' | 'female' | 'other';
  doctorId?: number;
  currentEyesight?: number;
  // Treatment fields
  severityLevel?: 'mild' | 'moderate' | 'severe' | 'critical';
  severityNotes?: string;
  // true = not paused, false = paused
  treatmentStatus?: boolean;
  activeFrom?: string; // Treatment start date
  activeTo?: string; // Treatment end date
  treatmentPackageId?: number;
}

// Props for sub-form components
export interface FormFieldProps {
  values: UnifiedUserFormData;
  touched: any;
  errors: any;
  handleChange: (e: React.ChangeEvent<any>) => void;
  userType?: UserType;
}
