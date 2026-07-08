import * as PatientService from 'src/services/patient.service';
import type { Patient } from 'src/types/core';

export const PATIENT_CAUSES_REQUIRED_MESSAGE =
  'Cần phân loại nguyên nhân gây nhược thị tại mục BỆNH ÁN trước khi thực hiện thao tác này.';

export const patientHasCauses = (patient?: Pick<Patient, 'causes'> | null): boolean =>
  Boolean(patient?.causes && patient.causes.length > 0);

/** Luôn đọc causes mới nhất từ API — tránh state patient cũ sau khi lưu BỆNH ÁN. */
export const fetchPatientWithCausesCheck = async (
  patientId: number
): Promise<{ ok: true; patient: Patient } | { ok: false; message: string }> => {
  const patient = (await PatientService.getPatient(patientId)) as Patient;
  if (!patientHasCauses(patient)) {
    return { ok: false, message: PATIENT_CAUSES_REQUIRED_MESSAGE };
  }
  return { ok: true, patient };
};
