/**
 * Exam Utils Unit Tests
 * Tests for exam utility functions - frequency, status, levels, evaluation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getFrequencyText,
  frequencyToDays,
  calculateNextDueDate,
  getExamTitle,
  getExamTypeConfig,
  getStatusInfo,
  determineExamStatus,
  generateExamCode,
  validateExamConfig,
  getLevels,
  getEyeKey,
  evaluateAnswer,
  calculateAccuracy,
  EXAM_TYPES,
  VALID_EXAM_TYPES,
} from '../examUtils';
import dayjs from 'dayjs';

describe('Exam Utils', () => {
  // ==================== FREQUENCY UTILITIES ====================
  describe('Frequency Utilities', () => {
    describe('getFrequencyText', () => {
      it('should return correct Vietnamese text for daily', () => {
        expect(getFrequencyText('daily')).toBe('Hàng ngày');
      });

      it('should return correct Vietnamese text for weekly', () => {
        expect(getFrequencyText('weekly')).toBe('Hàng tuần');
      });

      it('should return correct Vietnamese text for monthly', () => {
        expect(getFrequencyText('monthly')).toBe('Hàng tháng');
      });

      it('should return correct Vietnamese text for quarterly', () => {
        expect(getFrequencyText('quarterly')).toBe('Hàng quý');
      });

      it('should return correct Vietnamese text for yearly', () => {
        expect(getFrequencyText('yearly')).toBe('Hàng năm');
      });

      it('should return original value for unknown frequency', () => {
        expect(getFrequencyText('unknown' as any)).toBe('unknown');
      });
    });

    describe('frequencyToDays', () => {
      it('should return 1 for daily', () => {
        expect(frequencyToDays('daily')).toBe(1);
      });

      it('should return 7 for weekly', () => {
        expect(frequencyToDays('weekly')).toBe(7);
      });

      it('should return 30 for monthly', () => {
        expect(frequencyToDays('monthly')).toBe(30);
      });

      it('should return 90 for quarterly', () => {
        expect(frequencyToDays('quarterly')).toBe(90);
      });

      it('should return 365 for yearly', () => {
        expect(frequencyToDays('yearly')).toBe(365);
      });

      it('should return 7 as default for unknown frequency', () => {
        expect(frequencyToDays('unknown' as any)).toBe(7);
      });
    });

    describe('calculateNextDueDate', () => {
      const baseDate = '2026-01-01T00:00:00.000Z';

      it('should add 1 day for daily frequency', () => {
        const result = calculateNextDueDate(baseDate, 'daily');
        expect(dayjs(result).format('YYYY-MM-DD')).toBe('2026-01-02');
      });

      it('should add 1 week for weekly frequency', () => {
        const result = calculateNextDueDate(baseDate, 'weekly');
        expect(dayjs(result).format('YYYY-MM-DD')).toBe('2026-01-08');
      });

      it('should add 1 month for monthly frequency', () => {
        const result = calculateNextDueDate(baseDate, 'monthly');
        expect(dayjs(result).format('YYYY-MM-DD')).toBe('2026-02-01');
      });

      it('should add 3 months for quarterly frequency', () => {
        const result = calculateNextDueDate(baseDate, 'quarterly');
        expect(dayjs(result).format('YYYY-MM-DD')).toBe('2026-04-01');
      });

      it('should add 1 year for yearly frequency', () => {
        const result = calculateNextDueDate(baseDate, 'yearly');
        expect(dayjs(result).format('YYYY-MM-DD')).toBe('2027-01-01');
      });
    });
  });

  // ==================== EXAM TYPE UTILITIES ====================
  describe('Exam Type Utilities', () => {
    describe('EXAM_TYPES constant', () => {
      it('should have all exam types defined', () => {
        expect(EXAM_TYPES.FAR).toBe('far');
        expect(EXAM_TYPES.NEAR).toBe('near');
        expect(EXAM_TYPES.CONTRAST).toBe('contrast');
        expect(EXAM_TYPES.STEREOPSIS).toBe('stereopsis');
      });

      it('should have 4 valid exam types', () => {
        expect(VALID_EXAM_TYPES).toHaveLength(4);
        expect(VALID_EXAM_TYPES).toContain('far');
        expect(VALID_EXAM_TYPES).toContain('near');
        expect(VALID_EXAM_TYPES).toContain('contrast');
        expect(VALID_EXAM_TYPES).toContain('stereopsis');
      });
    });

    describe('getExamTitle', () => {
      it('should return correct Vietnamese title for far vision', () => {
        expect(getExamTitle('far')).toBe('Thị lực nhìn xa');
      });

      it('should return correct Vietnamese title for near vision', () => {
        expect(getExamTitle('near')).toBe('Thị lực nhìn gần');
      });

      it('should return correct Vietnamese title for contrast', () => {
        expect(getExamTitle('contrast')).toBe('Độ tương phản');
      });

      it('should return correct Vietnamese title for stereopsis', () => {
        expect(getExamTitle('stereopsis')).toBe('Thị giác lập thể');
      });

      it('should return original value for unknown type', () => {
        expect(getExamTitle('unknown' as any)).toBe('unknown');
      });
    });

    describe('getExamTypeConfig', () => {
      it('should return correct config for far vision', () => {
        const config = getExamTypeConfig('far');
        expect(config.title).toBe('Kiểm tra thị lực nhìn xa');
        expect(config.color).toBe('#1976d2');
        expect(config.defaultFrequency).toBe('weekly');
      });

      it('should return correct config for near vision', () => {
        const config = getExamTypeConfig('near');
        expect(config.title).toBe('Kiểm tra thị lực nhìn gần');
        expect(config.color).toBe('#388e3c');
        expect(config.defaultFrequency).toBe('weekly');
      });

      it('should return correct config for contrast', () => {
        const config = getExamTypeConfig('contrast');
        expect(config.title).toBe('Kiểm tra độ tương phản');
        expect(config.color).toBe('#f57c00');
        expect(config.defaultFrequency).toBe('monthly');
      });

      it('should return correct config for stereopsis', () => {
        const config = getExamTypeConfig('stereopsis');
        expect(config.title).toBe('Kiểm tra thị giác lập thể');
        expect(config.color).toBe('#7b1fa2');
        expect(config.defaultFrequency).toBe('monthly');
      });
    });
  });

  // ==================== STATUS UTILITIES ====================
  describe('Status Utilities', () => {
    describe('getStatusInfo', () => {
      it('should return correct info for incomplete status', () => {
        const info = getStatusInfo('incomplete');
        expect(info.label).toBe('Chưa hoàn thành');
        expect(info.color).toBe('warning');
        expect(info.priority).toBe(1);
      });

      it('should return correct info for completed status', () => {
        const info = getStatusInfo('completed');
        expect(info.label).toBe('Đã hoàn thành');
        expect(info.color).toBe('success');
        expect(info.priority).toBe(0);
      });
    });

    describe('determineExamStatus', () => {
      it('should return completed if isCompleted is true', () => {
        const status = determineExamStatus('weekly', '2026-01-01', true);
        expect(status).toBe('completed');
      });

      it('should return incomplete if isCompleted is false', () => {
        const status = determineExamStatus('weekly', undefined, false);
        expect(status).toBe('incomplete');
      });

      it('should return incomplete if no parameters', () => {
        const status = determineExamStatus('weekly');
        expect(status).toBe('incomplete');
      });
    });
  });

  // ==================== CODE GENERATION ====================
  describe('Code Generation', () => {
    describe('generateExamCode', () => {
      it('should generate code with correct prefix for far', () => {
        const code = generateExamCode('far');
        expect(code).toMatch(/^FAR/);
      });

      it('should generate code with correct prefix for near', () => {
        const code = generateExamCode('near');
        expect(code).toMatch(/^NEA/);
      });

      it('should generate code with correct prefix for contrast', () => {
        const code = generateExamCode('contrast');
        expect(code).toMatch(/^CON/);
      });

      it('should generate code with correct prefix for stereopsis', () => {
        const code = generateExamCode('stereopsis');
        expect(code).toMatch(/^STE/);
      });

      it('should generate unique codes', () => {
        const codes = new Set();
        for (let i = 0; i < 100; i++) {
          codes.add(generateExamCode('far'));
        }
        // Should have at least 90 unique codes out of 100
        expect(codes.size).toBeGreaterThan(90);
      });
    });
  });

  // ==================== VALIDATION ====================
  describe('Validation', () => {
    describe('validateExamConfig', () => {
      it('should return valid for correct config', () => {
        const result = validateExamConfig({
          examType: 'far',
          frequency: 'weekly',
          isEnabled: true,
        });
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should return error for missing examType', () => {
        const result = validateExamConfig({
          examType: '' as any,
          frequency: 'weekly',
          isEnabled: true,
        });
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Exam type is required');
      });

      it('should return error for missing frequency', () => {
        const result = validateExamConfig({
          examType: 'far',
          frequency: '' as any,
          isEnabled: true,
        });
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Frequency is required');
      });
    });
  });

  // ==================== EXAM EXECUTION ====================
  describe('Exam Execution Utilities', () => {
    describe('getLevels', () => {
      it('should return levels for far vision', () => {
        const levels = getLevels('far');
        expect(levels.length).toBeGreaterThan(0);
        expect(levels[0]).toHaveProperty('level');
      });

      it('should return levels for near vision', () => {
        const levels = getLevels('near');
        expect(levels.length).toBeGreaterThan(0);
        expect(levels[0]).toHaveProperty('level');
      });

      it('should return levels for contrast', () => {
        const levels = getLevels('contrast');
        expect(levels.length).toBeGreaterThan(0);
        expect(levels[0]).toHaveProperty('level');
      });

      it('should return levels for stereopsis', () => {
        const levels = getLevels('stereopsis');
        expect(levels.length).toBeGreaterThan(0);
        expect(levels[0]).toHaveProperty('level');
      });

      it('should return empty array for unknown type', () => {
        const levels = getLevels('unknown' as any);
        expect(levels).toHaveLength(0);
      });
    });

    describe('getEyeKey', () => {
      it('should return both for stereopsis regardless of step', () => {
        expect(getEyeKey('stereopsis', 'test-right')).toBe('both');
        expect(getEyeKey('stereopsis', 'test-left')).toBe('both');
        expect(getEyeKey('stereopsis', 'test-both')).toBe('both');
      });

      it('should return right for test-right step', () => {
        expect(getEyeKey('far', 'test-right')).toBe('right');
        expect(getEyeKey('near', 'test-right')).toBe('right');
      });

      it('should return left for test-left step', () => {
        expect(getEyeKey('far', 'test-left')).toBe('left');
        expect(getEyeKey('near', 'test-left')).toBe('left');
      });

      it('should return both for test-both step', () => {
        expect(getEyeKey('far', 'test-both')).toBe('both');
      });

      it('should return right as default', () => {
        expect(getEyeKey('far', 'unknown')).toBe('right');
      });
    });

    describe('evaluateAnswer', () => {
      it('should return true for correct answer (exact match)', () => {
        const item = { display: 'A', answer: 'A' };
        const result = evaluateAnswer(item, 'far');
        expect(result.result).toBe(true);
      });

      it('should return true for correct answer (case insensitive)', () => {
        const item = { display: 'A', answer: 'a' };
        const result = evaluateAnswer(item, 'far');
        expect(result.result).toBe(true);
      });

      it('should return false for incorrect answer', () => {
        const item = { display: 'A', answer: 'B' };
        const result = evaluateAnswer(item, 'far');
        expect(result.result).toBe(false);
      });

      it('should handle null answer', () => {
        const item = { display: 'A', answer: null };
        const result = evaluateAnswer(item, 'far');
        expect(result.result).toBe(false);
      });

      it('should handle undefined answer', () => {
        const item = { display: 'A', answer: undefined };
        const result = evaluateAnswer(item, 'far');
        expect(result.result).toBe(false);
      });

      it('should handle whitespace in answer', () => {
        const item = { display: 'A', answer: ' A ' };
        const result = evaluateAnswer(item, 'far');
        expect(result.result).toBe(true);
      });

      it('should preserve original item properties', () => {
        const item = { display: 'A', answer: 'A', char: 'A', extra: 'data' };
        const result = evaluateAnswer(item, 'far');
        expect(result.display).toBe('A');
        expect(result.answer).toBe('A');
        expect(result.char).toBe('A');
        expect(result.extra).toBe('data');
      });

      // Stereopsis-specific tests
      it('should evaluate stereopsis front answer correctly', () => {
        const item = { display: 'fd10s0', answer: 'front' };
        const result = evaluateAnswer(item, 'stereopsis');
        expect(result.result).toBe(true);
      });

      it('should evaluate stereopsis back answer correctly', () => {
        const item = { display: 'bd10s0', answer: 'back' };
        const result = evaluateAnswer(item, 'stereopsis');
        expect(result.result).toBe(true);
      });

      it('should evaluate stereopsis none answer correctly', () => {
        const item = { display: 'bd10s0', answer: 'none' };
        const result = evaluateAnswer(item, 'stereopsis');
        expect(result.result).toBe(false); // 'none' is always wrong if image is valid
      });

      it('should reject wrong stereopsis answer', () => {
        const item = { display: 'fd10s0', answer: 'back' }; // Should be 'front'
        const result = evaluateAnswer(item, 'stereopsis');
        expect(result.result).toBe(false);
      });

      it('should handle stereopsis with case insensitive', () => {
        const item = { display: 'fd10s0', answer: 'FRONT' };
        const result = evaluateAnswer(item, 'stereopsis');
        expect(result.result).toBe(true);
      });
    });

    describe('calculateAccuracy', () => {
      it('should return 0 for empty array', () => {
        expect(calculateAccuracy([])).toBe(0);
      });

      it('should return 1 for all correct', () => {
        const items = [{ result: true }, { result: true }, { result: true }];
        expect(calculateAccuracy(items)).toBe(1);
      });

      it('should return 0 for all incorrect', () => {
        const items = [{ result: false }, { result: false }, { result: false }];
        expect(calculateAccuracy(items)).toBe(0);
      });

      it('should return correct ratio for mixed results', () => {
        const items = [{ result: true }, { result: true }, { result: false }, { result: false }];
        expect(calculateAccuracy(items)).toBe(0.5);
      });

      it('should handle 3 out of 5 correct', () => {
        const items = [
          { result: true },
          { result: true },
          { result: true },
          { result: false },
          { result: false },
        ];
        expect(calculateAccuracy(items)).toBe(0.6);
      });
    });
  });
});
