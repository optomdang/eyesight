/**
 * Status Helpers Unit Tests
 * Tests for exercise status and result status utility functions
 */

import { vi } from 'vitest';
import {
  getStatusColor,
  getStatusText,
  getStatusConfig,
  isActiveStatus,
  isFinalStatus,
  getAllStatusValues,
  getResultStatusColor,
  getResultStatusText,
  getResultStatusConfig,
  isResultCompleted,
  getAllResultStatusValues,
  type ExerciseStatus,
  type ExerciseResultStatus,
} from '../statusHelpers';

// Mock i18n
vi.mock('src/utils/i18n', () => ({
  default: {
    t: (key: string) => {
      const translations: Record<string, string> = {
        'exerciseStatus.incomplete': 'Chưa hoàn thành',
        'exerciseStatus.completed': 'Hoàn thành',
        'exerciseStatus.expired': 'Hết hạn',
        'exerciseStatus.cancelled': 'Đã hủy',
        'exerciseStatus.unknown': 'Không xác định',
        'exerciseResultStatus.incomplete': 'Chưa hoàn thành',
        'exerciseResultStatus.completed': 'Hoàn thành',
        'exerciseResultStatus.unknown': 'Không xác định',
      };
      return translations[key] || key;
    },
  },
}));

describe('Status Helpers', () => {
  // ============================================
  // EXERCISE STATUS TESTS (Session/Assignment level)
  // ============================================
  describe('Exercise Status Functions', () => {
    describe('getStatusColor', () => {
      it('should return warning.main for incomplete status', () => {
        expect(getStatusColor('incomplete')).toBe('warning.main');
      });

      it('should return success.main for completed status', () => {
        expect(getStatusColor('completed')).toBe('success.main');
      });

      it('should return error.main for expired status', () => {
        expect(getStatusColor('expired')).toBe('error.main');
      });

      it('should return error.light for cancelled status', () => {
        expect(getStatusColor('cancelled')).toBe('error.light');
      });

      it('should return primary.main for unknown status', () => {
        expect(getStatusColor('unknown' as ExerciseStatus)).toBe('primary.main');
      });
    });

    describe('getStatusText', () => {
      it('should return localized text for incomplete', () => {
        expect(getStatusText('incomplete')).toBe('Chưa hoàn thành');
      });

      it('should return localized text for completed', () => {
        expect(getStatusText('completed')).toBe('Hoàn thành');
      });

      it('should return localized text for expired', () => {
        expect(getStatusText('expired')).toBe('Hết hạn');
      });

      it('should return localized text for cancelled', () => {
        expect(getStatusText('cancelled')).toBe('Đã hủy');
      });

      it('should return default text for unknown status', () => {
        expect(getStatusText('unknown' as ExerciseStatus)).toBe('Không xác định');
      });
    });

    describe('getStatusConfig', () => {
      it('should return complete config object', () => {
        const config = getStatusConfig('completed');
        expect(config).toEqual({
          color: 'success.main',
          text: 'Hoàn thành',
        });
      });
    });

    describe('isActiveStatus', () => {
      it('should return true for incomplete', () => {
        expect(isActiveStatus('incomplete')).toBe(true);
      });

      it('should return false for completed', () => {
        expect(isActiveStatus('completed')).toBe(false);
      });

      it('should return false for expired', () => {
        expect(isActiveStatus('expired')).toBe(false);
      });

      it('should return false for cancelled', () => {
        expect(isActiveStatus('cancelled')).toBe(false);
      });
    });

    describe('isFinalStatus', () => {
      it('should return true for completed', () => {
        expect(isFinalStatus('completed')).toBe(true);
      });

      it('should return true for expired', () => {
        expect(isFinalStatus('expired')).toBe(true);
      });

      it('should return true for cancelled', () => {
        expect(isFinalStatus('cancelled')).toBe(true);
      });

      it('should return false for incomplete', () => {
        expect(isFinalStatus('incomplete')).toBe(false);
      });
    });

    describe('getAllStatusValues', () => {
      it('should return all exercise status values', () => {
        const values = getAllStatusValues();
        expect(values).toEqual(['incomplete', 'completed', 'expired', 'cancelled']);
        expect(values).toHaveLength(4);
      });
    });
  });

  // ============================================
  // EXERCISE RESULT STATUS TESTS (Individual result level)
  // ============================================
  describe('Exercise Result Status Functions', () => {
    describe('getResultStatusColor', () => {
      it('should return success.main for completed status', () => {
        expect(getResultStatusColor('completed')).toBe('success.main');
      });

      it('should return warning.main for incomplete status', () => {
        expect(getResultStatusColor('incomplete')).toBe('warning.main');
      });

      it('should return grey.500 for unknown status', () => {
        expect(getResultStatusColor('unknown' as ExerciseResultStatus)).toBe('grey.500');
      });
    });

    describe('getResultStatusText', () => {
      it('should return "Hoàn thành" for completed status', () => {
        expect(getResultStatusText('completed')).toBe('Hoàn thành');
      });

      it('should return "Chưa hoàn thành" for incomplete status', () => {
        expect(getResultStatusText('incomplete')).toBe('Chưa hoàn thành');
      });

      it('should return default text for unknown status', () => {
        expect(getResultStatusText('unknown' as ExerciseResultStatus)).toBe('Không xác định');
      });
    });

    describe('getResultStatusConfig', () => {
      it('should return complete config for completed', () => {
        const config = getResultStatusConfig('completed');
        expect(config).toEqual({
          color: 'success.main',
          text: 'Hoàn thành',
        });
      });

      it('should return complete config for incomplete', () => {
        const config = getResultStatusConfig('incomplete');
        expect(config).toEqual({
          color: 'warning.main',
          text: 'Chưa hoàn thành',
        });
      });
    });

    describe('isResultCompleted', () => {
      it('should return true for completed status', () => {
        expect(isResultCompleted('completed')).toBe(true);
      });

      it('should return false for incomplete status', () => {
        expect(isResultCompleted('incomplete')).toBe(false);
      });
    });

    describe('getAllResultStatusValues', () => {
      it('should return all result status values', () => {
        const values = getAllResultStatusValues();
        expect(values).toEqual(['incomplete', 'completed']);
        expect(values).toHaveLength(2);
      });
    });
  });

  // ============================================
  // PROPERTY-LIKE TESTS
  // ============================================
  describe('Property Tests', () => {
    it('all exercise statuses should have valid color and text', () => {
      const statuses = getAllStatusValues();
      statuses.forEach((status) => {
        const color = getStatusColor(status);
        const text = getStatusText(status);
        expect(color).toBeTruthy();
        expect(text).toBeTruthy();
        expect(text).not.toBe('Không xác định');
      });
    });

    it('all result statuses should have valid color and text', () => {
      const statuses = getAllResultStatusValues();
      statuses.forEach((status) => {
        const color = getResultStatusColor(status);
        const text = getResultStatusText(status);
        expect(color).toBeTruthy();
        expect(text).toBeTruthy();
        expect(text).not.toBe('Không xác định');
      });
    });

    it('getStatusConfig should be consistent with individual functions', () => {
      const statuses = getAllStatusValues();
      statuses.forEach((status) => {
        const config = getStatusConfig(status);
        expect(config.color).toBe(getStatusColor(status));
        expect(config.text).toBe(getStatusText(status));
      });
    });

    it('getResultStatusConfig should be consistent with individual functions', () => {
      const statuses = getAllResultStatusValues();
      statuses.forEach((status) => {
        const config = getResultStatusConfig(status);
        expect(config.color).toBe(getResultStatusColor(status));
        expect(config.text).toBe(getResultStatusText(status));
      });
    });

    it('active and final statuses should be mutually exclusive', () => {
      const statuses = getAllStatusValues();
      statuses.forEach((status) => {
        const isActive = isActiveStatus(status);
        const isFinal = isFinalStatus(status);
        // A status cannot be both active and final
        expect(isActive && isFinal).toBe(false);
      });
    });
  });
});
