/**
 * Utility functions for exam-related calculations
 */

// ==================== CONSTANTS ====================

const EXAM_TYPES = {
  FAR: 'far',
  NEAR: 'near',
  CONTRAST: 'contrast',
  STEREOPSIS: 'stereopsis',
};

const VALID_EXAM_TYPES = Object.values(EXAM_TYPES);

const EXAM_STATUS = {
  INCOMPLETE: 'incomplete',
  COMPLETED: 'completed',
};

// Frequency constants (adjective form: daily, weekly, monthly, quarterly, yearly)
const FREQUENCY_DAYS = {
  daily: 1,
  weekly: 7,
  monthly: 30,
  quarterly: 90,
  yearly: 365,
};

// ==================== FREQUENCY UTILITIES ====================

/**
 * Convert frequency string to number of days
 * @param {string} frequency - Frequency type (daily, weekly, monthly, quarterly, yearly)
 * @returns {number} Number of days
 */
const frequencyToDays = (frequency) => {
  return FREQUENCY_DAYS[frequency] || 7; // Default to weekly
};

/**
 * Get frequency text for display
 * @param {string} frequency - Frequency type
 * @returns {string} Display text in Vietnamese
 */
const getFrequencyText = (frequency) => {
  const texts = {
    daily: 'Hàng ngày',
    weekly: 'Hàng tuần',
    monthly: 'Hàng tháng',
    quarterly: 'Hàng quý',
    yearly: 'Hàng năm',
  };
  return texts[frequency] || frequency;
};

// ==================== EXAM TYPE UTILITIES ====================

/**
 * Check if exam type is valid
 * @param {string} examType - Exam type to validate
 * @returns {boolean}
 */
const isValidExamType = (examType) => {
  return VALID_EXAM_TYPES.includes(examType);
};

/**
 * Get exam type display name
 * @param {string} examType - Exam type
 * @returns {string} Display name in Vietnamese
 */
const getExamTypeText = (examType) => {
  const texts = {
    far: 'Thị lực nhìn xa',
    near: 'Thị lực nhìn gần',
    contrast: 'Độ tương phản',
    stereopsis: 'Thị giác lập thể',
  };
  return texts[examType] || examType;
};

/**
 * Check if exam type uses bothEye only (stereopsis)
 * @param {string} examType - Exam type
 * @returns {boolean}
 */
const isBothEyeOnly = (examType) => {
  return examType === EXAM_TYPES.STEREOPSIS;
};

// ==================== STATUS UTILITIES ====================

/**
 * Check if status transition is valid
 * @param {string} fromStatus - Current status
 * @param {string} toStatus - Target status
 * @returns {boolean}
 */
const isValidStatusTransition = (fromStatus, toStatus) => {
  const validTransitions = {
    [EXAM_STATUS.INCOMPLETE]: [EXAM_STATUS.COMPLETED],
    [EXAM_STATUS.COMPLETED]: [], // Terminal state
  };
  return validTransitions[fromStatus]?.includes(toStatus) ?? false;
};

/**
 * Get status display text
 * @param {string} status - Exam status
 * @returns {string} Display text in Vietnamese
 */
const getStatusText = (status) => {
  const texts = {
    incomplete: 'Chưa hoàn thành',
    completed: 'Đã hoàn thành',
  };
  return texts[status] || status;
};

// ==================== COMPLIANCE UTILITIES ====================

/**
 * Calculate required exams based on frequency and time elapsed
 * @param {Date} startDate - Start date of exam config
 * @param {Date} currentDate - Current date
 * @param {string} frequency - Frequency type
 * @returns {number} Number of required exams
 */
const calculateRequiredExams = (startDate, currentDate, frequency) => {
  const totalDays = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24));
  const intervalDays = frequencyToDays(frequency);
  return Math.max(1, Math.floor(totalDays / intervalDays) + 1);
};

/**
 * Calculate performance rate
 * @param {number} completed - Number of completed exams
 * @param {number} required - Number of required exams
 * @returns {number} Performance rate (0-100)
 */
const calculatePerformanceRate = (completed, required) => {
  if (required <= 0) return 100;
  return Math.min(100, Math.round((completed / required) * 100));
};

/**
 * Determine compliance status based on performance rate
 * @param {number} performanceRate - Performance rate (0-100)
 * @returns {string} Status: excellent, good, warning, poor
 */
const getComplianceStatus = (performanceRate) => {
  if (performanceRate >= 90) return 'excellent';
  if (performanceRate >= 75) return 'good';
  if (performanceRate >= 50) return 'warning';
  return 'poor';
};

// ==================== DATE UTILITIES ====================

/**
 * Calculate next due date based on last exam date and frequency
 * @param {Date} lastDate - Last exam date
 * @param {string} frequency - Frequency type
 * @returns {Date} Next due date
 */
const calculateNextDueDate = (lastDate, frequency) => {
  const days = frequencyToDays(frequency);
  const nextDate = new Date(lastDate);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

/**
 * Check if exam is due
 * @param {Date} lastExamDate - Last exam date
 * @param {string} frequency - Frequency type
 * @param {Date} currentDate - Current date (optional, defaults to now)
 * @returns {boolean}
 */
const isExamDue = (lastExamDate, frequency, currentDate = new Date()) => {
  if (!lastExamDate) return true;
  const nextDue = calculateNextDueDate(lastExamDate, frequency);
  return currentDate >= nextDue;
};

module.exports = {
  // Constants
  EXAM_TYPES,
  VALID_EXAM_TYPES,
  EXAM_STATUS,
  FREQUENCY_DAYS,
  // Frequency utilities
  frequencyToDays,
  getFrequencyText,
  // Exam type utilities
  isValidExamType,
  getExamTypeText,
  isBothEyeOnly,
  // Status utilities
  isValidStatusTransition,
  getStatusText,
  // Compliance utilities
  calculateRequiredExams,
  calculatePerformanceRate,
  getComplianceStatus,
  // Date utilities
  calculateNextDueDate,
  isExamDue,
};
