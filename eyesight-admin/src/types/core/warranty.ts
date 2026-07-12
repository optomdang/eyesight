/**
 * WARRANTY E-SIGN TYPES
 * Matches backend warranty-agreements API shape.
 */

import type { ExamEyeResult } from './patient';

export type WarrantyAgreementStatus =
  | 'draft'
  | 'awaiting_guardian'
  | 'awaiting_doctor'
  | 'completed';

export type WarrantyPhaseType = 'initial' | 'reexam' | 'final';

export type WarrantyPhaseStatus = 'draft' | 'awaiting_guardian' | 'awaiting_doctor' | 'completed';

export interface WarrantySignatureRecord {
  signatureDataUrl: string;
  signerName: string;
  signerRelation?: string | null;
  signedAt: string;
}

export interface WarrantyExamTypeClinical {
  initial?: ExamEyeResult;
  current?: ExamEyeResult;
  lastExamDate?: string | null;
}

export interface WarrantyComplianceClinical {
  performanceRate: number;
  status: string;
  completedExams: number;
  requiredExams: number;
  lastCalculatedAt?: string | null;
}

export interface WarrantyClinicalData {
  examResults?: {
    far?: WarrantyExamTypeClinical;
    near?: WarrantyExamTypeClinical;
    contrast?: WarrantyExamTypeClinical;
    stereopsis?: WarrantyExamTypeClinical;
  };
  compliance?: {
    far?: WarrantyComplianceClinical;
    near?: WarrantyComplianceClinical;
    contrast?: WarrantyComplianceClinical;
    stereopsis?: WarrantyComplianceClinical;
  };
  clinicalNotes?: string;
  improvementObserved?: boolean | null;
  doctorConfirmation?: string;
  /** Required when creating reexam phase within 6 months of prior completed phase */
  reexamEarlyOverrideReason?: string;
}

export interface WarrantyPhase {
  id: number;
  agreementId: number;
  phaseType: WarrantyPhaseType;
  phaseNumber: number;
  status: WarrantyPhaseStatus;
  clinicalData: WarrantyClinicalData;
  guardianSignature?: WarrantySignatureRecord | null;
  doctorSignature?: WarrantySignatureRecord | null;
  completedAt?: string | null;
  documentHash?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface WarrantyAgreement {
  id: number;
  patientId: number;
  doctorId: number;
  policyVersion: string;
  status: WarrantyAgreementStatus;
  packageSnapshot: Record<string, unknown>;
  patientSnapshot: Record<string, unknown>;
  phases: WarrantyPhase[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateWarrantyPhasePayload {
  phaseType: WarrantyPhaseType;
  clinicalData: WarrantyClinicalData;
}

export interface UpdateWarrantyClinicalDataPayload {
  clinicalData: WarrantyClinicalData;
}

export interface SignWarrantyPhasePayload {
  signatureDataUrl: string;
  signerName: string;
  signerRelation?: string;
  consentAccepted: true;
}
