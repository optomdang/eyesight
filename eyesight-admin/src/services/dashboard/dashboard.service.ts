import { getData } from '../../utils/request';
import type {
  ExamStatsResponse,
  ExerciseStatsResponse,
  PatientKPIData,
} from 'src/types/admin/dashboard';

const API_BASE = '/dashboard';

/**
 * #11–#17 — exam statistics (KPI, per-vision-type breakdown, completion trend).
 * `period` sets the #17 trend bucket: week | month | quarter | year | day.
 */
export const getExamStats = async (
  startDate: string,
  endDate: string,
  page: number = 1,
  limit: number = 10,
  period: string = 'day',
): Promise<ExamStatsResponse> => {
  return await getData(
    `${API_BASE}/exam-stats?startDate=${startDate}&endDate=${endDate}&page=${page}&limit=${limit}&period=${period}`,
  );
};

/**
 * #19–#26 — exercise statistics (KPIs, distribution & compliance by type).
 */
export const getExerciseStats = async (
  startDate: string,
  endDate: string,
  page: number = 1,
  limit: number = 10,
): Promise<ExerciseStatsResponse> => {
  return await getData(
    `${API_BASE}/exercise-stats?startDate=${startDate}&endDate=${endDate}&page=${page}&limit=${limit}`,
  );
};

// ==================== PATIENT DASHBOARD ====================

export interface PatientDashboardStats {
  totalPatients: number;
  activePatients: number;
  completedPatients: number;
  kpi?: PatientKPIData;
  ageStats?: {
    minAge: number | null;
    maxAge: number | null;
    avgAge: number | null;
  };
  improvement: {
    improved: number;
    improvedCount?: number;
    stable: number;
    declined: number;
    total: number;
    improvementRate: number;
    avgImprovementLevel?: number;
    visionType?: string;
  };
  activityTrend: Array<{
    date: string;
    loginCount: number;
  }>;
  topPerformers?: Array<{
    patientCode: string;
    patientName: string;
    completionRate?: number;
    focusScore?: number;
    improvementLines?: number;
    recoveryPct?: number | null;
  }>;
}

export interface InactivePatient {
  id: number;
  code: string;
  activeFrom: string;
  activeTo: string;
  severityLevel: string | null;
  daysInactive: number | null;
  user: {
    id: number;
    name: string;
    email: string;
    phoneNumber: string;
    lastLoginAt: string | null;
  };
}

export interface InactivePatientsResponse {
  rows: InactivePatient[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AgeCorrelationDataPoint {
  ageGroup: string;
  totalPatients: number;
  improvedPatients: number;
  improvementRate: number;
  avgCompletionRate: number | null;
  avgFocusScore: number | null;
}

export interface AgeCorrelationResponse {
  data: AgeCorrelationDataPoint[];
}

/**
 * Get patient dashboard statistics (5 KPIs)
 */
export const getPatientDashboardStats = async (
  visionType: string = 'far',
  trendDays: number = 30,
  causes?: string[],
): Promise<PatientDashboardStats> => {
  const params = new URLSearchParams({
    visionType,
    trendDays: String(trendDays),
  });
  if (causes && causes.length > 0) {
    params.set('causes', causes.join(','));
  }
  return await getData(`${API_BASE}/patient-stats?${params.toString()}`);
};

/**
 * Get inactive patients list
 */
export const getInactivePatients = async (
  inactiveDays: number = 7,
  page: number = 1,
  limit: number = 10,
): Promise<InactivePatientsResponse> => {
  return await getData(
    `${API_BASE}/inactive-patients?inactiveDays=${inactiveDays}&page=${page}&limit=${limit}`,
  );
};
/**
 * Get patient correlation chart data (vision level vs training time)
 */
export const getPatientCorrelation = async (
  visionType: 'far' | 'near' | 'contrast' | 'stereopsis' = 'far',
  days: number = 30,
): Promise<any> => {
  return await getData(`${API_BASE}/patient-correlation?visionType=${visionType}&days=${days}`);
};

/**
 * Get age-based correlation chart data
 */
export const getAgeCorrelation = async (): Promise<AgeCorrelationResponse> => {
  return await getData(`${API_BASE}/age-correlation`);
};
