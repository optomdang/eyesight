/**
 * Unit Tests for calculateCompliancePercentage
 */

const moment = require('moment');
const { calculateCompliancePercentage } = require('../../../src/services/exercise/exerciseAssignment.service');

describe('calculateCompliancePercentage', () => {
  describe('Missing / invalid inputs', () => {
    test('should return null when assignedAt is missing', () => {
      expect(calculateCompliancePercentage(5, null, 'daily')).toBeNull();
    });

    test('should return null when frequency is missing', () => {
      expect(calculateCompliancePercentage(5, new Date(), null)).toBeNull();
    });

    test('should return null when frequency is unsupported', () => {
      expect(calculateCompliancePercentage(5, new Date(), 'quarterly')).toBeNull();
    });

    test('should treat undefined sessionsCompleted as 0', () => {
      const assignedAt = moment().subtract(9, 'days').toDate();
      const result = calculateCompliancePercentage(undefined, assignedAt, 'daily');
      expect(result).toBe(0);
    });
  });

  describe('Daily frequency', () => {
    test('should return 100% when all daily sessions completed', () => {
      const assignedAt = moment().subtract(9, 'days').toDate();
      const result = calculateCompliancePercentage(10, assignedAt, 'daily');
      expect(result).toBe(100);
    });

    test('should return 50% when half of daily sessions completed', () => {
      const assignedAt = moment().subtract(9, 'days').toDate();
      const result = calculateCompliancePercentage(5, assignedAt, 'daily');
      expect(result).toBe(50);
    });

    test('should return 0% when no sessions completed', () => {
      const assignedAt = moment().subtract(9, 'days').toDate();
      const result = calculateCompliancePercentage(0, assignedAt, 'daily');
      expect(result).toBe(0);
    });

    test('should cap at 100% even if sessionsCompleted exceeds expected', () => {
      const assignedAt = moment().subtract(4, 'days').toDate();
      const result = calculateCompliancePercentage(99, assignedAt, 'daily');
      expect(result).toBe(100);
    });

    test('should return 100% when assigned today (1 expected, 1 completed)', () => {
      const assignedAt = moment().toDate();
      const result = calculateCompliancePercentage(1, assignedAt, 'daily');
      expect(result).toBe(100);
    });

    test('should return 0% when assigned today and no sessions done', () => {
      const assignedAt = moment().toDate();
      const result = calculateCompliancePercentage(0, assignedAt, 'daily');
      expect(result).toBe(0);
    });

    test('should count partial current session (1/2 valid → 50% when assigned today)', () => {
      const assignedAt = moment().toDate();
      const result = calculateCompliancePercentage(0, assignedAt, 'daily', {
        currentSession: { status: 'incomplete', validExecutions: 1, executionCount: 2 },
        executionCount: 2,
      });
      expect(result).toBe(50);
    });

    test('should not double-count when current session is already completed', () => {
      const assignedAt = moment().toDate();
      const result = calculateCompliancePercentage(1, assignedAt, 'daily', {
        currentSession: { status: 'completed', validExecutions: 2, executionCount: 2 },
        executionCount: 2,
      });
      expect(result).toBe(100);
    });
  });

  describe('Weekly frequency', () => {
    test('should return 100% when all weekly sessions completed', () => {
      const assignedAt = moment().subtract(3, 'weeks').toDate();
      const result = calculateCompliancePercentage(4, assignedAt, 'weekly');
      expect(result).toBe(100);
    });

    test('should return 50% when half of weekly sessions completed', () => {
      const assignedAt = moment().subtract(3, 'weeks').toDate();
      const result = calculateCompliancePercentage(2, assignedAt, 'weekly');
      expect(result).toBe(50);
    });
  });

  describe('Partial session across multiple expected periods', () => {
    test('should add fractional credit for in-progress session', () => {
      const assignedAt = moment().subtract(9, 'days').toDate(); // 10 expected
      const result = calculateCompliancePercentage(5, assignedAt, 'daily', {
        currentSession: { status: 'incomplete', validExecutions: 1, executionCount: 2 },
        executionCount: 2,
      });
      // 5 + 0.5 = 5.5 / 10 = 55%
      expect(result).toBe(55);
    });
  });

  describe('Rounding', () => {
    test('should round to nearest integer', () => {
      const assignedAt = moment().subtract(6, 'days').toDate();
      const result = calculateCompliancePercentage(1, assignedAt, 'daily');
      expect(result).toBe(14);
    });
  });
});
