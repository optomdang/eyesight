import type { PatientWithCompliance } from 'src/types/core';
import type { WarrantyClinicalData } from 'src/types/core/warranty';

const EXAM_TYPES = ['far', 'near', 'contrast', 'stereopsis'] as const;

/**
 * Build warranty clinical data snapshot from patient exam results and compliance.
 */
export function buildClinicalDataFromPatient(patient: PatientWithCompliance): WarrantyClinicalData {
  const clinicalData: WarrantyClinicalData = {
    examResults: {},
    compliance: {},
  };

  for (const examType of EXAM_TYPES) {
    const examResult = patient.examResults?.[examType];
    if (examResult) {
      if (!clinicalData.examResults) clinicalData.examResults = {};
      clinicalData.examResults[examType] = {
        initial: examResult.initialResult,
        current: examResult.currentResult,
        lastExamDate: examResult.lastExamDate,
      };
    }

    const compliance = patient.compliance?.[examType];
    if (compliance) {
      if (!clinicalData.compliance) clinicalData.compliance = {};
      clinicalData.compliance[examType] = {
        performanceRate: compliance.performanceRate,
        status: compliance.status,
        completedExams: compliance.completedExams,
        requiredExams: compliance.requiredExams,
        lastCalculatedAt: compliance.lastCalculatedAt,
      };
    }
  }

  return clinicalData;
}

const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

/**
 * True when the most recent completed phase finished less than ~6 months ago.
 */
export function isReexamWithinSixMonths(phases: { completedAt?: string | null }[]): boolean {
  const completedDates = phases
    .map((p) => p.completedAt)
    .filter((d): d is string => Boolean(d))
    .map((d) => new Date(d).getTime())
    .sort((a, b) => b - a);

  if (completedDates.length === 0) return false;
  return Date.now() - completedDates[0] < SIX_MONTHS_MS;
}

export function getPhaseTypeLabel(phaseType: string): string {
  switch (phaseType) {
    case 'initial':
      return 'Đánh giá ban đầu';
    case 'reexam':
      return 'Tái khám';
    case 'final':
      return 'Kết thúc gói';
    default:
      return phaseType;
  }
}

export function getWarrantyStatusLabel(status: string): string {
  switch (status) {
    case 'draft':
      return 'Nháp';
    case 'awaiting_guardian':
      return 'Chờ phụ huynh ký';
    case 'awaiting_doctor':
      return 'Chờ bác sĩ ký';
    case 'completed':
      return 'Hoàn tất';
    default:
      return status;
  }
}

export function getWarrantyStatusColor(status: string): 'default' | 'warning' | 'info' | 'success' {
  switch (status) {
    case 'awaiting_guardian':
      return 'warning';
    case 'awaiting_doctor':
      return 'info';
    case 'completed':
      return 'success';
    default:
      return 'default';
  }
}
