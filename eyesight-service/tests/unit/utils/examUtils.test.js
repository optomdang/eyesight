/**
 * ExamUtils Unit Tests
 * Tests for exam utility functions
 */

const {
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
} = require('../../../src/utils/examUtils');

describe('ExamUtils', () => {
  // ==================== CONSTANTS ====================
  describe('Constants', () => {
    it('should have correct EXAM_TYPES', () => {
      expect(EXAM_TYPES.FAR).toBe('far');
      expect(EXAM_TYPES.NEAR).toBe('near');
      expect(EXAM_TYPES.CONTRAST).toBe('contrast');
      expect(EXAM_TYPES.STEREOPSIS).toBe('stereopsis');
    });

    it('should have correct VALID_EXAM_TYPES', () => {
      expect(VALID_EXAM_TYPES).toContain('far');
      expect(VALID_EXAM_TYPES).toContain('near');
      expect(VALID_EXAM_TYPES).toContain('contrast');
      expect(VALID_EXAM_TYPES).toContain('stereopsis');
      expect(VALID_EXAM_TYPES).toHaveLength(4);
    });

    it('should have correct EXAM_STATUS', () => {
      expect(EXAM_STATUS.INCOMPLETE).toBe('incomplete');
      expect(EXAM_STATUS.COMPLETED).toBe('completed');
    });

    it('should have correct FREQUENCY_DAYS', () => {
      expect(FREQUENCY_DAYS.daily).toBe(1);
      expect(FREQUENCY_DAYS.weekly).toBe(7);
      expect(FREQUENCY_DAYS.monthly).toBe(30);
      expect(FREQUENCY_DAYS.quarterly).toBe(90);
      expect(FREQUENCY_DAYS.yearly).toBe(365);
    });
  });

  // ==================== FREQUENCY UTILITIES ====================
  describe('frequencyToDays', () => {
    it('should convert daily to 1 day', () => {
      expect(frequencyToDays('daily')).toBe(1);
    });

    it('should convert weekly to 7 days', () => {
      expect(frequencyToDays('weekly')).toBe(7);
    });

    it('should convert monthly to 30 days', () => {
      expect(frequencyToDays('monthly')).toBe(30);
    });

    it('should convert quarterly to 90 days', () => {
      expect(frequencyToDays('quarterly')).toBe(90);
    });

    it('should convert yearly to 365 days', () => {
      expect(frequencyToDays('yearly')).toBe(365);
    });

    it('should default to 7 days for unknown frequency', () => {
      expect(frequencyToDays('unknown')).toBe(7);
      expect(frequencyToDays(null)).toBe(7);
      expect(frequencyToDays(undefined)).toBe(7);
    });
  });

  describe('getFrequencyText', () => {
    it('should return Vietnamese text for daily', () => {
      expect(getFrequencyText('daily')).toBe('Hàng ngày');
    });

    it('should return Vietnamese text for weekly', () => {
      expect(getFrequencyText('weekly')).toBe('Hàng tuần');
    });

    it('should return Vietnamese text for monthly', () => {
      expect(getFrequencyText('monthly')).toBe('Hàng tháng');
    });

    it('should return Vietnamese text for quarterly', () => {
      expect(getFrequencyText('quarterly')).toBe('Hàng quý');
    });

    it('should return Vietnamese text for yearly', () => {
      expect(getFrequencyText('yearly')).toBe('Hàng năm');
    });

    it('should return original value for unknown frequency', () => {
      expect(getFrequencyText('unknown')).toBe('unknown');
    });
  });

  // ==================== EXAM TYPE UTILITIES ====================
  describe('isValidExamType', () => {
    it('should return true for valid exam types', () => {
      expect(isValidExamType('far')).toBe(true);
      expect(isValidExamType('near')).toBe(true);
      expect(isValidExamType('contrast')).toBe(true);
      expect(isValidExamType('stereopsis')).toBe(true);
    });

    it('should return false for invalid exam types', () => {
      expect(isValidExamType('invalid')).toBe(false);
      expect(isValidExamType('')).toBe(false);
      expect(isValidExamType(null)).toBe(false);
      expect(isValidExamType(undefined)).toBe(false);
    });
  });

  describe('getExamTypeText', () => {
    it('should return Vietnamese text for far', () => {
      expect(getExamTypeText('far')).toBe('Thị lực nhìn xa');
    });

    it('should return Vietnamese text for near', () => {
      expect(getExamTypeText('near')).toBe('Thị lực nhìn gần');
    });

    it('should return Vietnamese text for contrast', () => {
      expect(getExamTypeText('contrast')).toBe('Độ tương phản');
    });

    it('should return Vietnamese text for stereopsis', () => {
      expect(getExamTypeText('stereopsis')).toBe('Thị giác lập thể');
    });

    it('should return original value for unknown type', () => {
      expect(getExamTypeText('unknown')).toBe('unknown');
    });
  });

  describe('isBothEyeOnly', () => {
    it('should return true for stereopsis', () => {
      expect(isBothEyeOnly('stereopsis')).toBe(true);
    });

    it('should return false for other exam types', () => {
      expect(isBothEyeOnly('far')).toBe(false);
      expect(isBothEyeOnly('near')).toBe(false);
      expect(isBothEyeOnly('contrast')).toBe(false);
    });
  });

  // ==================== STATUS UTILITIES ====================
  describe('isValidStatusTransition', () => {
    describe('from incomplete', () => {
      it('should allow transition to completed', () => {
        expect(isValidStatusTransition('incomplete', 'completed')).toBe(true);
      });
    });

    describe('from completed', () => {
      it('should not allow any transitions (terminal state)', () => {
        expect(isValidStatusTransition('completed', 'incomplete')).toBe(false);
      });
    });

    it('should return false for invalid status', () => {
      expect(isValidStatusTransition('invalid', 'completed')).toBe(false);
    });
  });

  describe('getStatusText', () => {
    it('should return Vietnamese text for incomplete', () => {
      expect(getStatusText('incomplete')).toBe('Chưa hoàn thành');
    });

    it('should return Vietnamese text for completed', () => {
      expect(getStatusText('completed')).toBe('Đã hoàn thành');
    });

    it('should return original value for unknown status', () => {
      expect(getStatusText('unknown')).toBe('unknown');
    });
  });

  // ==================== COMPLIANCE UTILITIES ====================
  describe('calculateRequiredExams', () => {
    it('should calculate required exams for daily frequency', () => {
      const startDate = new Date('2026-01-01');
      const currentDate = new Date('2026-01-15'); // 14 days later

      const required = calculateRequiredExams(startDate, currentDate, 'daily');

      expect(required).toBe(15); // 14/1 + 1 = 15
    });

    it('should calculate required exams for weekly frequency', () => {
      const startDate = new Date('2026-01-01');
      const currentDate = new Date('2026-01-15'); // 14 days later

      const required = calculateRequiredExams(startDate, currentDate, 'weekly');

      expect(required).toBe(3); // 14/7 + 1 = 3
    });

    it('should calculate required exams for monthly frequency', () => {
      const startDate = new Date('2026-01-01');
      const currentDate = new Date('2026-01-15'); // 14 days later

      const required = calculateRequiredExams(startDate, currentDate, 'monthly');

      expect(required).toBe(1); // 14/30 + 1 = 1
    });

    it('should return at least 1 required exam', () => {
      const startDate = new Date('2026-01-01');
      const currentDate = new Date('2026-01-01'); // Same day

      const required = calculateRequiredExams(startDate, currentDate, 'weekly');

      expect(required).toBe(1);
    });
  });

  describe('calculatePerformanceRate', () => {
    it('should calculate 100% for all completed', () => {
      expect(calculatePerformanceRate(10, 10)).toBe(100);
    });

    it('should calculate 50% for half completed', () => {
      expect(calculatePerformanceRate(5, 10)).toBe(50);
    });

    it('should calculate 0% for none completed', () => {
      expect(calculatePerformanceRate(0, 10)).toBe(0);
    });

    it('should cap at 100% for over-completion', () => {
      expect(calculatePerformanceRate(15, 10)).toBe(100);
    });

    it('should return 100% for zero required', () => {
      expect(calculatePerformanceRate(0, 0)).toBe(100);
    });

    it('should round to nearest integer', () => {
      expect(calculatePerformanceRate(1, 3)).toBe(33); // 33.33...
      expect(calculatePerformanceRate(2, 3)).toBe(67); // 66.66...
    });
  });

  describe('getComplianceStatus', () => {
    it('should return excellent for 90% and above', () => {
      expect(getComplianceStatus(100)).toBe('excellent');
      expect(getComplianceStatus(95)).toBe('excellent');
      expect(getComplianceStatus(90)).toBe('excellent');
    });

    it('should return good for 75-89%', () => {
      expect(getComplianceStatus(89)).toBe('good');
      expect(getComplianceStatus(80)).toBe('good');
      expect(getComplianceStatus(75)).toBe('good');
    });

    it('should return warning for 50-74%', () => {
      expect(getComplianceStatus(74)).toBe('warning');
      expect(getComplianceStatus(60)).toBe('warning');
      expect(getComplianceStatus(50)).toBe('warning');
    });

    it('should return poor for below 50%', () => {
      expect(getComplianceStatus(49)).toBe('poor');
      expect(getComplianceStatus(25)).toBe('poor');
      expect(getComplianceStatus(0)).toBe('poor');
    });
  });

  // ==================== DATE UTILITIES ====================
  describe('calculateNextDueDate', () => {
    it('should add 1 day for daily frequency', () => {
      const lastDate = new Date('2026-01-01');
      const nextDue = calculateNextDueDate(lastDate, 'daily');

      expect(nextDue.toISOString().split('T')[0]).toBe('2026-01-02');
    });

    it('should add 7 days for weekly frequency', () => {
      const lastDate = new Date('2026-01-01');
      const nextDue = calculateNextDueDate(lastDate, 'weekly');

      expect(nextDue.toISOString().split('T')[0]).toBe('2026-01-08');
    });

    it('should add 30 days for monthly frequency', () => {
      const lastDate = new Date('2026-01-01');
      const nextDue = calculateNextDueDate(lastDate, 'monthly');

      expect(nextDue.toISOString().split('T')[0]).toBe('2026-01-31');
    });

    it('should not modify original date', () => {
      const lastDate = new Date('2026-01-01');
      const originalTime = lastDate.getTime();

      calculateNextDueDate(lastDate, 'weekly');

      expect(lastDate.getTime()).toBe(originalTime);
    });
  });

  describe('isExamDue', () => {
    it('should return true if no last exam date', () => {
      expect(isExamDue(null, 'weekly')).toBe(true);
      expect(isExamDue(undefined, 'weekly')).toBe(true);
    });

    it('should return true if past due date', () => {
      const lastExamDate = new Date('2026-01-01');
      const currentDate = new Date('2026-01-10'); // 9 days later, past weekly due

      expect(isExamDue(lastExamDate, 'weekly', currentDate)).toBe(true);
    });

    it('should return false if before due date', () => {
      const lastExamDate = new Date('2026-01-01');
      const currentDate = new Date('2026-01-05'); // 4 days later, before weekly due

      expect(isExamDue(lastExamDate, 'weekly', currentDate)).toBe(false);
    });

    it('should return true on exact due date', () => {
      const lastExamDate = new Date('2026-01-01');
      const currentDate = new Date('2026-01-08'); // Exactly 7 days later

      expect(isExamDue(lastExamDate, 'weekly', currentDate)).toBe(true);
    });
  });
});
