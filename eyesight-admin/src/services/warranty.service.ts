/**
 * Warranty Agreement Service
 * E-sign warranty PDF workflow for admin (doctor) and portal (guardian).
 */

import { getData, postData, patchData, getBlob } from 'src/utils/request';
import type {
  WarrantyAgreement,
  CreateWarrantyPhasePayload,
  UpdateWarrantyClinicalDataPayload,
  SignWarrantyPhasePayload,
} from 'src/types/core/warranty';

// ============================================================================
// ADMIN / DOCTOR
// ============================================================================

/** GET /warranty-agreements/patients/:patientId */
export const getPatientWarrantyAgreement = (patientId: number): Promise<WarrantyAgreement | null> =>
  getData<WarrantyAgreement | null>(`warranty-agreements/patients/${patientId}`);

/** POST /warranty-agreements/patients/:patientId */
export const createPatientWarrantyAgreement = (patientId: number): Promise<WarrantyAgreement> =>
  postData<WarrantyAgreement, Record<string, never>>(
    `warranty-agreements/patients/${patientId}`,
    {}
  );

/** POST /warranty-agreements/:agreementId/phases */
export const createWarrantyPhase = (
  agreementId: number,
  payload: CreateWarrantyPhasePayload
): Promise<WarrantyAgreement> =>
  postData<WarrantyAgreement, CreateWarrantyPhasePayload>(
    `warranty-agreements/${agreementId}/phases`,
    payload
  );

/** PATCH /warranty-agreements/:agreementId/phases/:phaseId/clinical-data */
export const updateWarrantyPhaseClinicalData = (
  agreementId: number,
  phaseId: number,
  payload: UpdateWarrantyClinicalDataPayload
): Promise<WarrantyAgreement> =>
  patchData<WarrantyAgreement, UpdateWarrantyClinicalDataPayload>(
    `warranty-agreements/${agreementId}/phases/${phaseId}/clinical-data`,
    payload
  );

/** POST /warranty-agreements/:agreementId/phases/:phaseId/sign */
export const signWarrantyPhase = (
  agreementId: number,
  phaseId: number,
  payload: SignWarrantyPhasePayload
): Promise<WarrantyAgreement> =>
  postData<WarrantyAgreement, SignWarrantyPhasePayload>(
    `warranty-agreements/${agreementId}/phases/${phaseId}/sign`,
    payload
  );

/** GET /warranty-agreements/:agreementId/phases/:phaseId/download */
export const downloadWarrantyPhasePdf = (agreementId: number, phaseId: number): Promise<Blob> =>
  getBlob(`warranty-agreements/${agreementId}/phases/${phaseId}/download`);

/** GET /warranty-agreements/:agreementId/download */
export const downloadWarrantyAggregatePdf = (agreementId: number): Promise<Blob> =>
  getBlob(`warranty-agreements/${agreementId}/download`);

// ============================================================================
// PORTAL (PATIENT / GUARDIAN)
// ============================================================================

/** GET /warranty-agreements/me */
export const getMyWarrantyAgreement = (): Promise<WarrantyAgreement | null> =>
  getData<WarrantyAgreement | null>('warranty-agreements/me');

/** Trigger browser download from blob */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
