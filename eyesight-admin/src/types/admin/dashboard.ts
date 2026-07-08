/**
 * Dashboard types for admin panel
 * Centralized types for all dashboard components
 */

// ==================== CORRELATION CHART ====================

/**
 * Single data point for correlation chart showing training time vs vision level
 */
export interface CorrelationDataPoint {
  date: string; // ISO date: "2025-01-15"
  trainingTime: number; // Hours (decimal): 2.5
  visionLevel: number | null; // Level: 1-20 for far, 1-8 for near, etc.
}

/**
 * Statistics calculated from correlation data
 */
export interface CorrelationStatistics {
  totalTrainingHours: number; // Total hours trained in period
  avgDailyTrainingTime: number; // Average hours per day with training
  avgVisionLevel: number; // Average vision level across period
  visionImprovement: number; // Difference from start to end
  correlationScore: number; // Pearson correlation coefficient (-1 to 1)
}

/**
 * Complete correlation chart response
 */
export interface CorrelationChartData {
  data: CorrelationDataPoint[];
  statistics: CorrelationStatistics;
}

/**
 * Filter parameters for correlation chart
 */
export interface PatientCorrelationFilter {
  visionType: 'far' | 'near' | 'contrast' | 'stereopsis';
  days: 7 | 30 | 90 | 365;
}

// ==================== EXAM DASHBOARD ====================

/**
 * Trend data for exam completion charts
 */
export interface ExamTrendData {
  date: string;
  totalExams: number;
  completedExams: number;
  completionRate: number;
}

// ==================== EXERCISE DASHBOARD ====================

/**
 * KPI data for exercise dashboard
 */
export interface ExerciseKPIData {
  // Tab 3 (Hiệu Suất Bài Tập) — aligned to BE getExerciseStats (#19–#23)
  inUseExercises: number; // #19 số Exercise distinct đã giao
  totalExercises: number; // #19 tổng Exercise hệ thống
  inUsePct: number; // #19 %
  totalConfigs: number; // #20 số phác đồ tập
  timeCompletionRate: number; // #21 % hoàn thành (theo thời gian)
  countComplianceRate: number; // #22 tuân thủ (theo số lần)
  excellentPatientsCount: number; // #23 BN xuất sắc >80%
}

/** Per-exercise-type distribution (#25) / compliance (#26). */
export interface ExerciseTypeStat {
  exerciseType: string;
  count?: number; // #25
  assigned?: number; // #26
  completed?: number; // #26
  complianceRate?: number; // #26
}

/**
 * Top performer entry for leaderboard
 */
export interface TopPerformer {
  id: number;
  name: string;
  code: string;
  avgScore: number;
  totalSessions: number;
  rank: number;
}

// ==================== PATIENT DASHBOARD ====================

/**
 * KPI data for patient dashboard
 */
export interface PatientKPIData {
  /** #1 — tổng bệnh nhân trong center */
  totalPatients?: number;
  /** #2 — bệnh nhân đang điều trị */
  activePatients?: number;
  /** #3 — % everTreated có cải thiện ≥1 loại thị lực */
  improvementRate?: number;
  improvedCount?: number;
  /** #4 — TB số dòng thị lực xa cải thiện (improvedSet) */
  avgImprovementLevel?: number;
  /** #5 — tuổi Min/Max/TB trên improvedSet */
  minAge?: number | null;
  maxAge?: number | null;
  avgAge?: number | null;
  /** Legacy fields (deprecated — do not use in Tab 1 KPI row) */
  trainingDays?: number;
  totalTrainingHours?: number;
  totalExercises?: number;
  avgRecoveryPct?: number;
  completionRate?: number;
}

/**
 * Inactive patient data for alerts
 */
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

/**
 * Patient activity trend data
 */
export interface ActivityTrendItem {
  date: string;
  activePatients: number;
  newPatients: number;
  sessionsCompleted: number;
}

/**
 * Improvement breakdown data
 */
export interface ImprovementData {
  improved: number;
  stable: number;
  declined: number;
  total: number;
  improvementRate: number;
  visionType?: string;
}

// ==================== DASHBOARD STATE ====================

/**
 * Dashboard filter state for date range
 */
export interface DashboardFilterState {
  startDate: string;
  endDate: string;
}

/**
 * Dashboard loading state
 */
export interface DashboardLoading {
  exercise: boolean;
  exam: boolean;
  compliance: boolean;
}

/**
 * Dashboard error state
 */
export interface DashboardError {
  exercise?: string;
  exam?: string;
  compliance?: string;
}

// ==================== STATS RESPONSES (Tab 2 & 3 — BU-spec contract) ====================

/**
 * #16 — per-vision-type exam completion row (far | near | contrast | stereopsis).
 */
export interface ExamVisionTypeRow {
  type: string;
  total: number;
  completed: number;
  notCompleted?: number;
  completionRate: number;
}

/**
 * #11 — exam KPI block. `testComplianceRate` is session-level (completed / assigned).
 * BE returns extra counts; the UI only reads testComplianceRate.
 */
export interface ExamStatsKpi {
  testComplianceRate: number;
  totalExams?: number;
  uniquePatients?: number;
  completedCount?: number;
  pendingCount?: number;
}

/**
 * getExamStats response (Tab 2 — #11 KPI, #16 breakdown, #17 trend).
 * `details` is returned by BE but unused by the UI (the detail table was removed).
 */
export interface ExamStatsResponse {
  stats: {
    kpi: ExamStatsKpi;
    breakdown: ExamVisionTypeRow[];
    trend: ExamTrendData[];
    trendPeriod?: string;
  };
  details?: unknown;
}

/**
 * getExerciseStats response (Tab 3 — #19–#23 KPIs, #25 distribution, #26 compliance-by-type).
 * `details` is returned by BE but unused by the UI (the detail table was removed).
 */
export interface ExerciseStatsResponse {
  stats: {
    kpi: ExerciseKPIData;
    distributionByType: ExerciseTypeStat[];
    complianceByType: ExerciseTypeStat[];
  };
  details?: unknown;
}
