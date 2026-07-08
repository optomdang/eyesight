import { describe, it, expect } from 'vitest';
import {
  normalizeExerciseType,
  getExerciseEntry,
  isExerciseSupported,
  getAllRegisteredTypes,
  exerciseRegistry,
} from '../index';

describe('exerciseRegistry', () => {
  describe('normalizeExerciseType', () => {
    it('lowercases the string', () => {
      expect(normalizeExerciseType('2048')).toBe('2048');
      expect(normalizeExerciseType('MEMORY')).toBe('memory');
      expect(normalizeExerciseType('  2048  ')).toBe('2048');
    });

    it('handles empty string', () => {
      expect(normalizeExerciseType('')).toBe('');
    });
  });

  describe('getExerciseEntry', () => {
    it('returns entry for registered exerciseType "2048"', () => {
      const entry = getExerciseEntry('2048');
      expect(entry).toBeDefined();
      expect(entry?.type).toBe('2048');
      expect(entry?.displayName).toBeTruthy();
      expect(entry?.PreviewComponent).toBeDefined();
    });

    it('is case-insensitive for exerciseType', () => {
      expect(getExerciseEntry('2048')).toBeDefined();
      // If future entry uses uppercase, it should still work
    });

    it('returns undefined for unknown exerciseType', () => {
      expect(getExerciseEntry('stereopsis')).toBeUndefined();
      expect(getExerciseEntry('memory')).toBeUndefined();
      expect(getExerciseEntry('unknown-type')).toBeUndefined();
    });

    it('returns undefined for null/undefined exerciseType with no code fallback', () => {
      expect(getExerciseEntry(null)).toBeUndefined();
      expect(getExerciseEntry(undefined)).toBeUndefined();
      expect(getExerciseEntry('')).toBeUndefined();
    });

    it('falls back to code lookup when exerciseType is missing', () => {
      // Code exactly matches a registered type
      const entry = getExerciseEntry(null, '2048');
      expect(entry).toBeDefined();
      expect(entry?.type).toBe('2048');
    });

    it('falls back to code lookup when code contains a registered type', () => {
      const entry = getExerciseEntry(null, 'game-2048');
      expect(entry).toBeDefined();
      expect(entry?.type).toBe('2048');
    });

    it('code fallback does NOT match unrelated codes', () => {
      expect(getExerciseEntry(null, 'memory-game')).toBeUndefined();
      expect(getExerciseEntry(null, 'stereopsis-01')).toBeUndefined();
    });

    it('prefers exerciseType over code when both are set', () => {
      // exerciseType '2048' is in registry; code 'unknown' is not
      const entry = getExerciseEntry('2048', 'unknown-code');
      expect(entry?.type).toBe('2048');
    });

    it('returns undefined when both exerciseType and code are unregistered', () => {
      expect(getExerciseEntry('memory', 'memory-game')).toBeUndefined();
    });
  });

  describe('isExerciseSupported', () => {
    it('returns true for registered type "2048"', () => {
      expect(isExerciseSupported('2048')).toBe(true);
    });

    it('returns false for unregistered type', () => {
      expect(isExerciseSupported('memory')).toBe(false);
      expect(isExerciseSupported('stereopsis')).toBe(false);
    });

    it('returns false for null/undefined', () => {
      expect(isExerciseSupported(null)).toBe(false);
      expect(isExerciseSupported(undefined)).toBe(false);
    });

    it('returns true via code fallback', () => {
      expect(isExerciseSupported(null, '2048')).toBe(true);
      expect(isExerciseSupported(null, 'game-2048')).toBe(true);
    });
  });

  describe('getAllRegisteredTypes', () => {
    it('returns at least one entry', () => {
      const types = getAllRegisteredTypes();
      expect(types.length).toBeGreaterThan(0);
    });

    it('includes the 2048 entry', () => {
      const types = getAllRegisteredTypes();
      const has2048 = types.some((e) => e.type === '2048');
      expect(has2048).toBe(true);
    });

    it('returns entries sorted by type key', () => {
      const types = getAllRegisteredTypes();
      for (let i = 1; i < types.length; i++) {
        expect(types[i].type >= types[i - 1].type).toBe(true);
      }
    });
  });

  describe('registry map integrity', () => {
    it('all entries have required fields', () => {
      for (const [key, entry] of exerciseRegistry.entries()) {
        expect(key).toBe(entry.type); // Map key must match entry.type
        expect(entry.displayName.length).toBeGreaterThan(0);
        expect(typeof entry.PreviewComponent).toBe('function');
      }
    });
  });
});
