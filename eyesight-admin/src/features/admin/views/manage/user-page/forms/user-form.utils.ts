import dayjs from 'dayjs';
import { AddressValue } from 'src/components/forms/AddressFields';
import { generateCode } from 'src/utils';
import i18n from 'src/utils/i18n';
import { User } from 'src/types';
import { UnifiedUserFormData, UserType } from './user-form.types';

/**
 * Parse user data from API response to form data format
 * Handles all fields including dates, doctor, patient, address
 */
export const parseUserData = (data: Partial<User>): UnifiedUserFormData => {
  // Parse address - support legacy string format
  let parsedAddress: AddressValue = { country: 'Vietnam' };
  if (data.address) {
    if (typeof data.address === 'string') {
      // Try to parse if it's a JSON string
      try {
        const parsed = JSON.parse(data.address);
        if (typeof parsed === 'object' && parsed !== null) {
          parsedAddress = parsed;
        } else {
          // Real legacy string format
          parsedAddress = {
            country: 'Vietnam',
            specificAddress: data.address,
          };
        }
      } catch {
        // Not JSON, treat as legacy string format
        parsedAddress = {
          country: 'Vietnam',
          specificAddress: data.address,
        };
      }
    } else {
      // New format: already an object
      parsedAddress = data.address;
    }
  }

  return {
    id: data.id,
    userType: (data.userType as UserType) || UserType.ADMIN,
    name: data.name || '',
    email: data.email || '',
    phoneNumber: data.phoneNumber || '',
    dateOfBirth: data.dateOfBirth ? dayjs(data.dateOfBirth).format('YYYY-MM-DD') : undefined,
    gender: data.gender,
    zaloUserId: data.zaloUserId,
    zaloPhoneNumber: data.zaloPhoneNumber,
    address: parsedAddress,
    roleId: data.roleId,
    centerId: data.centerId || 0,
    password: data.password,
    defaultClinicId: data.defaultClinicId,
    active: data.active ?? true,
    // Initialize doctor object with all fields
    doctor: {
      id: data.doctor?.id,
      code: data.doctor?.code || generateCode('DT'),
      specialization: data.doctor?.specialization || '',
      licenseNumber: data.doctor?.licenseNumber || '',
      qualification: data.doctor?.qualification || '',
      departmentId: data.doctor?.departmentId,
      treatedPatientsCount: data.doctor?.treatedPatientsCount || 0,
    },
    // Initialize patient object with all fields including dates
    patient: {
      id: data.patient?.id,
      code: data.patient?.code || generateCode('PT'),
      doctorId: data.patient?.doctorId,
      currentEyesight: data.patient?.currentEyesight,
      severityLevel: data.patient?.severityLevel,
      severityNotes: data.patient?.severityNotes || '',
      // API uses the string enum; the form models the doctor's pause intent as a
      // boolean (true = đang điều trị / not paused, false = tạm dừng).
      treatmentStatus: data.patient?.treatmentStatus !== 'paused',
      activeFrom: data.patient?.activeFrom
        ? dayjs(data.patient.activeFrom).format('YYYY-MM-DD')
        : undefined,
      activeTo: data.patient?.activeTo
        ? dayjs(data.patient.activeTo).format('YYYY-MM-DD')
        : undefined,
    },
  };
};

/**
 * Get derived treatment status label based on treatment data.
 * Mirrors the backend status derivation; labels are i18n-driven.
 */
export const getDerivedTreatmentLabel = (
  treatmentStatus: boolean | null | undefined,
  activeFrom?: string,
  activeTo?: string
): string => {
  if (treatmentStatus === false) return i18n.t('patient.treatmentPhase.paused', 'Tạm dừng điều trị');

  const now = dayjs();
  const from = activeFrom ? dayjs(activeFrom) : null;
  const to = activeTo ? dayjs(activeTo) : null;

  if (from && now.isBefore(from, 'day')) return i18n.t('patient.treatmentPhase.notStarted', 'Chưa bắt đầu');
  if (to && now.isAfter(to, 'day')) return i18n.t('patient.treatmentPhase.completed', 'Hoàn thành');
  return i18n.t('patient.treatmentPhase.active', 'Đang điều trị');
};

/**
 * Format user data for API submission
 */
export const formatUserDataForSubmit = (
  values: UnifiedUserFormData,
  userType: UserType,
  centerId?: number
) => {
  // Base user data (common fields)
  const baseUserData = {
    userType,
    name: values.name!,
    email: values.email!,
    phoneNumber: values.phoneNumber!,
    dateOfBirth: values.dateOfBirth,
    gender: values.gender,
    zaloUserId: values.zaloUserId,
    zaloPhoneNumber: values.zaloPhoneNumber,
    address: values.address,
    roleId: values.roleId,
    centerId: centerId || values.centerId,
    defaultClinicId: values.defaultClinicId,
  };

  return baseUserData;
};
