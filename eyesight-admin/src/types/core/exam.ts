/**
 * EXAM TYPES
 * Single source of truth for exam sessions, results, and configuration
 */

// Forward declaration for ExamRawData (defined below)

/**
 * Exam result from exam session
 */
export interface ExamResult {
  id?: number;
  code?: string;
  examSessionId?: number;
  patientId: number;
  examType: 'far' | 'near' | 'contrast' | 'stereopsis';
  /**
   * Status lifecycle:
   * - 'incomplete': Exam not yet completed (scheduled, in progress)
   * - 'completed': Exam finished
   */
  status: 'incomplete' | 'completed';
  // Legacy payload (older API versions)
  result?: ExamResultData;
  // Current backend schema fields
  rawData?: ExamRawData | any;
  distance?: number;
  charType?: string;
  accuracy?: number;
  leftEyeLevel?: number;
  rightEyeLevel?: number;
  bothEyeLevel?: number;
  leftEyeAccuracy?: number;
  rightEyeAccuracy?: number;
  bothEyeAccuracy?: number;
  centerId: number;
  startedAt?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Patient exam configuration
 */
export interface ExamAssignment {
  id: number;
  patientId: number;
  examType: 'far' | 'near' | 'contrast' | 'stereopsis';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  totalSessions?: number;
  isEnabled: boolean;
  notificationSettings?: {
    enabled: boolean;
    templateId?: number | null;
    beforeDays: number;
    time: string;
    methods: ('email' | 'zalo' | 'sms')[];
  };
  centerId: number;
  patient?: {
    id: number;
    code: string;
    user: {
      name: string;
      email: string;
      phoneNumber: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Exam session tracking
 */
export interface ExamSession {
  id: number;
  patientId: number;
  examType: 'far' | 'near' | 'contrast' | 'stereopsis';
  /**
   * Status lifecycle:
   * - 'incomplete': Session not yet completed (scheduled, in progress)
   * - 'completed': Session finished
   */
  status: 'incomplete' | 'completed';
  scheduledDate: string;
  startedAt?: string;
  completedAt?: string;
  notes?: string;
  centerId: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Exam metric/statistics
 */
export interface ExamMetric {
  id: number;
  patientId: number;
  examType: 'far' | 'near' | 'contrast' | 'stereopsis';
  totalSessions: number;
  completedSessions: number;
  averageAccuracy: number;
  trend: 'improving' | 'stable' | 'declining';
  lastUpdatedAt: string;
}

/**
 * Query parameters for patient exam
 */
export interface ExamAssignmentQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  status?: string;
  patientId?: number;
  examType?: 'far' | 'near' | 'contrast' | 'stereopsis';
  isEnabled?: boolean;
  [key: string]: unknown;
}

/**
 * Request to create patient exam
 */
export interface CreateExamAssignmentRequest {
  patientId: number;
  examType: 'far' | 'near' | 'contrast' | 'stereopsis';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  totalSessions?: number;
  isEnabled?: boolean;
  notificationSettings?: {
    enabled: boolean;
    beforeDays: number;
    time: string;
    methods: ('email' | 'zalo' | 'sms')[];
  };
}

/**
 * Request to update patient exam
 */
export interface UpdateExamAssignmentRequest {
  frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  totalSessions?: number;
  isEnabled?: boolean;
  notificationSettings?: {
    enabled: boolean;
    beforeDays: number;
    time: string;
    methods: ('email' | 'zalo' | 'sms')[];
  };
}

/**
 * Dashboard response with exam data
 */
export interface ExamDashboardResponse {
  configs: ExamAssignment[];
  completedResultsByType: Record<string, ExamResult[]>;
  inProgressResultsByType: Record<string, ExamResult[]>;
  totalCompletedResults: number;
  totalInProgressResults: number;
}

/**
 * Request to remind about exam
 */
export interface ExamReminderRequest {
  patientId: number;
  examType: 'far' | 'near' | 'contrast' | 'stereopsis';
  scheduledDate: string;
  reminderTime?: string;
}

// ============ EXAM RAW DATA ============

/**
 * Single exam raw data item (char/answer pair)
 */
export interface ExamRawDataItem {
  char: string;
  answer: string;
  display: string;
  result?: boolean;
}

/**
 * Exam raw data structure
 */
export interface ExamRawData {
  both: ExamRawDataItem[][];
  left: ExamRawDataItem[][];
  right: ExamRawDataItem[][];
  mode?: string;
}

/**
 * Exam result data (legacy structure)
 */
export interface ExamResultData {
  date: string;
  leftEye: string;
  bothEye: string;
  charType: string;
  rightEye: string;
  startedAt: string;
  totalLevel: string;
  completedAt: string;
}

// ============ EXAM PERFORMANCE ============

/**
 * Exam performance tracking (calculated from ExamMetrics)
 */
export interface ExamPerformance {
  examType: 'far' | 'near' | 'contrast' | 'stereopsis';
  intervalDays: number;
  requiredExams: number;
  completedExams: number;
  performanceRate: number;
  status: 'excellent' | 'good' | 'warning' | 'poor';
  nextDueDate: Date;
  isOverdue: boolean;
  latestExamDate?: Date;
  initialResult?: {
    leftEye: string;
    rightEye: string;
  };
  currentResult?: {
    leftEye: string;
    rightEye: string;
  };
}

// ============ EXAM TYPES ============

/**
 * Exam type enum-like type
 */
export type ExamType = 'far' | 'near' | 'contrast' | 'stereopsis';

/**
 * Test status
 */
export type TestStatus = 'incomplete' | 'completed';

/**
 * A single test within an exam session
 */
export interface ExamTest {
  id: number;
  examType: ExamType;
  status: TestStatus;
  scheduledDate: string;
  completedDate?: string;
  result?: string;
}

// ============ EXAM UI TYPES ============

type Eye = 'left' | 'right';

/**
 * Test character for vision exam
 */
export interface TestChar {
  char: 'E' | 'C' | 'A' | 'N' | 'S' | 'I';
  display: string;
  answer?: string;
  result?: boolean;
}

export type ExamItem = TestChar[];

/**
 * Exam items for each eye and mode
 */
export interface ExamItems {
  right: ExamItem[];
  left: ExamItem[];
  both: ExamItem[];
  mode: 'far' | 'near' | 'contrast' | 'stereopsis';
}

// Backward compatibility aliases
export type TestItem = ExamItem;
export type TestItems = ExamItems;

/**
 * Exam step in UI flow
 */
export type ExamStep =
  | 'distance'
  | 'instructions'
  | 'test-right'
  | 'test-left'
  | 'test-both'
  | 'switch-eye'
  | 'results';

/**
 * Props for exam step component
 */
export interface ExamStepProps {
  eye: Eye;
  testItems: ExamItems;
  currentLine: number;
  distance: string;
  charType: string;
  onAnswerSelect: (index: number, result: string) => void;
  onNextLine: () => void;
  onResetCurrentLine: () => void;
}

// Backward compatibility alias
export type TestStepProps = ExamStepProps;
