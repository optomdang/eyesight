import dayjs from 'dayjs';
import {
  farVisionLevels,
  nearVisionLevels,
  contrastVisionLevels,
  stereopsisLevels,
} from 'src/utils/constant';
import { getCorrectStereopsisAnswer } from 'src/utils/visionUtils';

// ==================== EXAM TYPE CONSTANTS ====================

export const EXAM_TYPES = {
  FAR: 'far',
  NEAR: 'near',
  CONTRAST: 'contrast',
  STEREOPSIS: 'stereopsis',
} as const;

export const VALID_EXAM_TYPES = Object.values(EXAM_TYPES);

// ==================== TYPE DEFINITIONS ====================

export type FrequencyType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type ExamType = (typeof EXAM_TYPES)[keyof typeof EXAM_TYPES];

/**
 * Status for exam/exercise sessions
 * - incomplete: Chưa hoàn thành
 * - completed: Đã hoàn thành
 */
export type ExamStatus = 'incomplete' | 'completed';

/**
 * Convert frequency enum to human readable text
 */
export const getFrequencyText = (frequency: FrequencyType): string => {
  const frequencies = {
    daily: 'Hàng ngày',
    weekly: 'Hàng tuần',
    monthly: 'Hàng tháng',
    quarterly: 'Hàng quý',
    yearly: 'Hàng năm',
  };
  return frequencies[frequency] || frequency;
};

/**
 * Convert frequency to days for calculations
 */
export const frequencyToDays = (frequency: FrequencyType): number => {
  const frequencyMap = {
    daily: 1,
    weekly: 7,
    monthly: 30,
    quarterly: 90,
    yearly: 365,
  };
  return frequencyMap[frequency] || 7;
};

/**
 * Calculate next due date based on last exam date and frequency
 */
export const calculateNextDueDate = (lastDate: string, frequency: FrequencyType): string => {
  const last = dayjs(lastDate);
  switch (frequency) {
    case 'daily':
      return last.add(1, 'day').toISOString();
    case 'weekly':
      return last.add(1, 'week').toISOString();
    case 'monthly':
      return last.add(1, 'month').toISOString();
    case 'quarterly':
      return last.add(3, 'month').toISOString();
    case 'yearly':
      return last.add(1, 'year').toISOString();
    default:
      return last.add(1, 'week').toISOString();
  }
};

// ==================== EXAM TYPE UTILITIES ====================

/**
 * Get exam type display name
 */
export const getExamTitle = (examType: ExamType): string => {
  const titles = {
    far: 'Thị lực nhìn xa',
    near: 'Thị lực nhìn gần',
    contrast: 'Độ tương phản',
    stereopsis: 'Thị giác lập thể',
  };
  return titles[examType] || examType;
};

/**
 * Get exam type icon mapping for consistent UI
 */
export const getExamTypeConfig = (examType: ExamType) => {
  const configs = {
    far: {
      title: 'Kiểm tra thị lực nhìn xa',
      color: '#1976d2',
      bgColor: '#e3f2fd',
      defaultFrequency: 'weekly' as FrequencyType,
    },
    near: {
      title: 'Kiểm tra thị lực nhìn gần',
      color: '#388e3c',
      bgColor: '#e8f5e8',
      defaultFrequency: 'weekly' as FrequencyType,
    },
    contrast: {
      title: 'Kiểm tra độ tương phản',
      color: '#f57c00',
      bgColor: '#fff3e0',
      defaultFrequency: 'monthly' as FrequencyType,
    },
    stereopsis: {
      title: 'Kiểm tra thị giác lập thể',
      color: '#7b1fa2',
      bgColor: '#f3e5f5',
      defaultFrequency: 'monthly' as FrequencyType,
    },
  };
  return configs[examType];
};

// ==================== STATUS UTILITIES ====================

/**
 * Get status display information
 * Status: incomplete | completed
 */
export const getStatusInfo = (status: ExamStatus) => {
  const statusMap = {
    incomplete: {
      label: 'Chưa hoàn thành',
      color: 'warning' as const,
      priority: 1,
    },
    completed: {
      label: 'Đã hoàn thành',
      color: 'success' as const,
      priority: 0,
    },
  };
  return statusMap[status] || statusMap.incomplete;
};

/**
 * Determine exam status based on database status
 * Returns: incomplete | completed
 */
export const determineExamStatus = (
  _frequency: FrequencyType,
  _lastCompletedExamDate?: string,
  isCompleted?: boolean
): ExamStatus => {
  return isCompleted ? 'completed' : 'incomplete';
};

// ==================== CODE GENERATION UTILITIES ====================

/**
 * Generate unique exam session code
 */
export const generateExamCode = (examType: ExamType): string => {
  const prefix = examType.toUpperCase().substring(0, 3);
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}${timestamp}${random}`;
};

// ==================== VALIDATION UTILITIES ====================

/**
 * Validate exam configuration
 */
export const validateExamConfig = (config: {
  examType: ExamType;
  frequency: FrequencyType;
  isEnabled: boolean;
}) => {
  const errors: string[] = [];

  if (!config.examType) {
    errors.push('Exam type is required');
  }

  if (!config.frequency) {
    errors.push('Frequency is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// ==================== EXAM EXECUTION UTILITIES ====================

/**
 * Get exam levels for different exam types
 */
export const getLevels = (examType: ExamType) => {
  if (examType === 'far') {
    return farVisionLevels.map((l) => ({ level: l.level }));
  }
  if (examType === 'near') {
    return nearVisionLevels.map((l) => ({ level: l.level }));
  }
  if (examType === 'contrast') {
    return contrastVisionLevels.map((l) => ({ level: l.level }));
  }
  if (examType === 'stereopsis') {
    return stereopsisLevels.map((l) => ({ level: l.level }));
  }
  return [];
};

/**
 * Get eye key for test items
 */
export const getEyeKey = (examType: ExamType, step: string): 'right' | 'left' | 'both' => {
  if (examType === 'stereopsis') return 'both';
  if (step === 'test-right') return 'right';
  if (step === 'test-left') return 'left';
  if (step === 'test-both') return 'both';
  return 'right';
};

/**
 * Evaluate answer for exam
 */
export const evaluateAnswer = (item: any, examType: ExamType) => {
  const normalize = (value: unknown) => {
    if (value === null || value === undefined) return '';
    return String(value).trim().toUpperCase();
  };

  let isCorrect = false;

  if (examType === 'stereopsis') {
    // For stereopsis, compare answer with correct answer derived from display
    const correctAnswer = getCorrectStereopsisAnswer(item.display);
    isCorrect = normalize(item.answer) === normalize(correctAnswer);
  } else {
    // For other exam types, compare answer with display value
    isCorrect = normalize(item.answer) === normalize(item.display);
  }

  return {
    ...item,
    result: isCorrect,
  };
};

/**
 * Calculate accuracy from evaluated items
 */
export const calculateAccuracy = (evaluatedItems: any[]): number => {
  if (evaluatedItems.length === 0) return 0;
  const correct = evaluatedItems.filter((item) => item.result).length;
  return correct / evaluatedItems.length;
};

/**
 * Get visual acuity values for a specific line
 * @param mode - Exam type (far, near, contrast)
 * @param lineIndex - Current line index (0-based)
 * @returns Object with feet and snellen notation
 */
export const getVisualAcuityValues = (mode: 'far' | 'near' | 'contrast', lineIndex: number) => {
  if (mode === 'far') {
    const levelData = farVisionLevels[lineIndex];
    if (!levelData) return { feet: '20/200', snellen: '20/200' };
    return { feet: levelData.score, snellen: levelData.score };
  } else if (mode === 'near') {
    const levelData = nearVisionLevels[lineIndex];
    if (!levelData) return { feet: 'N24', snellen: 'N24' };
    return { feet: levelData.score, snellen: levelData.mScore };
  } else if (mode === 'contrast') {
    const levelData = contrastVisionLevels[lineIndex];
    if (!levelData) return { feet: '0.00', snellen: '0.00' };
    return { feet: levelData.score, snellen: levelData.score };
  }
  return { feet: '20/200', snellen: '6/60' };
};

/**
 * Prepare exam result for submission
 */
export const prepareExamResult = (
  patient: any,
  examResult: any,
  examType: ExamType,
  level: number,
  testItems: any,
  distance: string,
  charType: string,
  rightEyeResult: number | null,
  startedAt: Date,
  completedAt: Date
) => {
  return {
    patientId: patient?.id,
    examType,
    status: 'completed' as const,
    charType,
    accuracy: calculateAccuracy(testItems.right[0] || []), // Overall accuracy
    rightEyeLevel: rightEyeResult,
    leftEyeLevel: level,
    rightEyeAccuracy: calculateAccuracy(testItems.right[0] || []),
    leftEyeAccuracy: calculateAccuracy(testItems.left[0] || []),
    distance: parseFloat(distance),
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    rawData: testItems,
    centerId: patient?.centerId || 1,
  };
};
