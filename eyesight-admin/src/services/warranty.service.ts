/**
 * Warranty Agreement Service
 * E-sign warranty PDF workflow for admin (doctor) and portal (guardian).
 */

import axios from 'axios';
import type {
  WarrantyAgreement,
  CreateWarrantyPhasePayload,
  UpdateWarrantyClinicalDataPayload,
  SignWarrantyPhasePayload,
  DiligenceCalendarResponse,
} from 'src/types/core/warranty';
import { getData, postData, patchData, putData, getBlob } from 'src/utils/request';

export interface WarrantySignData {
  /** Who should sign when opening the link; null when phase is already completed */
  signRole: 'guardian' | 'doctor' | null;
  patientName: string;
  packageName: string;
  policyVersion: string;
  phase: import('src/types/core/warranty').WarrantyPhase;
  createdAt?: string;
}

export interface GenerateSignTokenResult {
  token: string;
  expiresAt: string;
}

// Public axios client (no auth token) for sign endpoints
const publicClient = axios.create({
  baseURL: import.meta.env.VITE_BASE_API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

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
  getBlob(`warranty-agreements/${agreementId}/phases/${phaseId}/download`, {
    timeoutMs: 60000,
  });

/** GET /warranty-agreements/:agreementId/download */
export const downloadWarrantyAggregatePdf = (agreementId: number): Promise<Blob> =>
  getBlob(`warranty-agreements/${agreementId}/download`, { timeoutMs: 60000 });

// ============================================================================
// PORTAL (PATIENT / GUARDIAN)
// ============================================================================

/** GET /warranty-agreements/me */
export const getMyWarrantyAgreement = (): Promise<WarrantyAgreement | null> =>
  getData<WarrantyAgreement | null>('warranty-agreements/me');

// ============================================================================
// SIGN LINK (public token-based signing)
// ============================================================================

/** POST /warranty-agreements/:agreementId/phases/:phaseId/sign-token (auth required) */
export const generateWarrantySignToken = (
  agreementId: number,
  phaseId: number
): Promise<GenerateSignTokenResult> =>
  postData<GenerateSignTokenResult, Record<string, never>>(
    `warranty-agreements/${agreementId}/phases/${phaseId}/sign-token`,
    {}
  );

/** GET /warranty-agreements/sign/:token (public — no auth) */
export const getWarrantySignData = async (token: string): Promise<WarrantySignData> => {
  const res = await publicClient.get<WarrantySignData>(`warranty-agreements/sign/${token}`);
  return res.data;
};

/** POST /warranty-agreements/sign/:token (public — no auth) */
export const submitWarrantySignature = async (
  token: string,
  payload: SignWarrantyPhasePayload
): Promise<WarrantyAgreement> => {
  const res = await publicClient.post<WarrantyAgreement>(
    `warranty-agreements/sign/${token}`,
    payload
  );
  return res.data;
};

/** GET /warranty-agreements/sign/:token/pdf (public — no auth, returns Blob) */
export const downloadWarrantyPdfByToken = async (token: string): Promise<Blob> => {
  const res = await publicClient.get<Blob>(`warranty-agreements/sign/${token}/pdf`, {
    responseType: 'blob',
  });
  return res.data;
};

/** GET /patients/:patientId/diligence-calendar?month=YYYY-MM */
export const getPatientDiligenceCalendar = (
  patientId: number,
  month: string
): Promise<DiligenceCalendarResponse> =>
  getData<DiligenceCalendarResponse>(
    `patients/${patientId}/diligence-calendar?month=${encodeURIComponent(month)}`,
    { timeout: 30000 }
  );

/** GET /me/diligence-calendar?month=YYYY-MM — patient portal (own calendar) */
export const getMyDiligenceCalendar = (month: string): Promise<DiligenceCalendarResponse> =>
  getData<DiligenceCalendarResponse>(`me/diligence-calendar?month=${encodeURIComponent(month)}`, {
    timeout: 30000,
  });

/** PUT /patients/:patientId/diligence-calendar/:date — mark day complete */
export const overridePatientDiligenceDay = (
  patientId: number,
  date: string,
  payload?: { reason?: string }
): Promise<{ date: string; day: DiligenceCalendarResponse['days'][number] | null; calendar: DiligenceCalendarResponse }> =>
  putData(`patients/${patientId}/diligence-calendar/${date}`, payload || {});

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
