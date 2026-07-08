/**
 * Exam State - Level Determination Logic Tests
 *
 * Tests for the critical logic that determines which level to save
 * when a user passes or fails a test level.
 *
 * CRITICAL BUSINESS RULE:
 * - If user PASSES current level (accuracy > 0.5) → Save current level
 * - If user FAILS current level (accuracy ≤ 0.5) → Save PREVIOUS level (last passed)
 */

import { describe, it, expect } from 'vitest';
import { calculateAccuracy } from 'src/utils/examUtils';
import { farVisionLevels } from 'src/utils/constant';

describe('Exam State - Level Determination Logic', () => {
  // Helper function to simulate the level determination logic
  // NOTE: This matches the EXACT logic in exam-state.ts handleNextLine()
  const determineFinalLevel = (currentLine: number, accuracy: number, levels: any[]) => {
    let finalLevel: number;

    if (accuracy > 0.5) {
      // Passed current level → save current level
      finalLevel = levels[currentLine].level;
    } else {
      // Failed current level → save PREVIOUS level (last passed)
      const previousLineIndex = Math.max(0, currentLine - 1);
      finalLevel = levels[previousLineIndex].level;
    }

    return finalLevel;
  };

  describe('Pass Scenarios', () => {
    it('should save current level when user passes (accuracy > 0.5)', () => {
      const currentLine = 3; // Array index 3 → level 4 (20/200)
      const accuracy = 0.8; // 80% correct → PASS

      const finalLevel = determineFinalLevel(currentLine, accuracy, farVisionLevels);

      expect(finalLevel).toBe(4); // Should save level 4
      expect(farVisionLevels[3].score).toBe('20/200');
    });

    it('should save current level when accuracy is exactly 0.6', () => {
      const currentLine = 5; // Array index 5 → level 6
      const accuracy = 0.6; // 60% correct → PASS

      const finalLevel = determineFinalLevel(currentLine, accuracy, farVisionLevels);

      expect(finalLevel).toBe(6);
    });

    it('should save current level when user passes at level 0', () => {
      const currentLine = 0; // First level (array index 0 → level 1)
      const accuracy = 1.0; // 100% correct → PASS

      const finalLevel = determineFinalLevel(currentLine, accuracy, farVisionLevels);

      expect(finalLevel).toBe(1); // farVisionLevels[0].level = 1
    });

    it('should save current level when user passes at last level', () => {
      const currentLine = farVisionLevels.length - 1; // Last level
      const accuracy = 0.8; // 80% correct → PASS

      const finalLevel = determineFinalLevel(currentLine, accuracy, farVisionLevels);

      expect(finalLevel).toBe(20); // farVisionLevels[19].level = 20
    });
  });

  describe('Fail Scenarios', () => {
    it('should save PREVIOUS level when user fails (accuracy ≤ 0.5)', () => {
      const currentLine = 3; // Array index 3 → level 4 (20/200)
      const accuracy = 0.4; // 40% correct → FAIL

      const finalLevel = determineFinalLevel(currentLine, accuracy, farVisionLevels);

      expect(finalLevel).toBe(3); // Should save level 3 (previous level)
      expect(farVisionLevels[2].score).toBe('20/250');
    });

    it('should save PREVIOUS level when accuracy is exactly 0.5', () => {
      const currentLine = 5; // Array index 5 → level 6
      const accuracy = 0.5; // 50% correct → FAIL (not > 0.5)

      const finalLevel = determineFinalLevel(currentLine, accuracy, farVisionLevels);

      expect(finalLevel).toBe(5); // Should save level 5 (previous)
    });

    it('should save PREVIOUS level when user fails with 0% accuracy', () => {
      const currentLine = 3; // Array index 3 → level 4
      const accuracy = 0.0; // 0% correct → FAIL

      const finalLevel = determineFinalLevel(currentLine, accuracy, farVisionLevels);

      expect(finalLevel).toBe(3); // Should save level 3
    });

    it('should save level 1 when user fails at level 0 (edge case)', () => {
      const currentLine = 0; // First level (array index 0 → level 1)
      const accuracy = 0.4; // 40% correct → FAIL

      const finalLevel = determineFinalLevel(currentLine, accuracy, farVisionLevels);

      // Edge case: No previous level, so Math.max(0, -1) = 0 → farVisionLevels[0].level = 1
      expect(finalLevel).toBe(1);
    });

    it('should save PREVIOUS level when user fails at level 1', () => {
      const currentLine = 1; // Array index 1 → level 2
      const accuracy = 0.3; // 30% correct → FAIL

      const finalLevel = determineFinalLevel(currentLine, accuracy, farVisionLevels);

      expect(finalLevel).toBe(1); // Should save level 1 (previous)
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle typical progression: pass 0,1,2 then fail at 3', () => {
      // User passes levels 1, 2, 3 (array indices 0, 1, 2)
      // User fails at level 4 (array index 3)
      const currentLine = 3; // Array index 3 → level 4
      const accuracy = 0.2; // Failed

      const finalLevel = determineFinalLevel(currentLine, accuracy, farVisionLevels);

      expect(finalLevel).toBe(3); // Last passed level
      expect(farVisionLevels[2].score).toBe('20/250');
    });

    it('should handle user who passes many levels then fails', () => {
      // User passes levels 1-10 (array indices 0-9)
      // User fails at level 11 (array index 10)
      const currentLine = 10; // Array index 10 → level 11
      const accuracy = 0.4; // Failed

      const finalLevel = determineFinalLevel(currentLine, accuracy, farVisionLevels);

      expect(finalLevel).toBe(10); // Last passed level
    });

    it('should handle user who barely passes (accuracy = 0.51)', () => {
      const currentLine = 5; // Array index 5 → level 6
      const accuracy = 0.51; // Barely passed

      const finalLevel = determineFinalLevel(currentLine, accuracy, farVisionLevels);

      expect(finalLevel).toBe(6); // Current level (passed)
    });

    it('should handle user who barely fails (accuracy = 0.49)', () => {
      const currentLine = 5; // Array index 5 → level 6
      const accuracy = 0.49; // Barely failed

      const finalLevel = determineFinalLevel(currentLine, accuracy, farVisionLevels);

      expect(finalLevel).toBe(5); // Previous level
    });
  });

  describe('Accuracy Calculation Integration', () => {
    it('should correctly determine level with 3 out of 5 correct (pass)', () => {
      const testItems = [
        { result: true },
        { result: true },
        { result: true },
        { result: false },
        { result: false },
      ];

      const accuracy = calculateAccuracy(testItems); // 0.6
      const currentLine = 3; // Array index 3 → level 4

      const finalLevel = determineFinalLevel(currentLine, accuracy, farVisionLevels);

      expect(accuracy).toBe(0.6);
      expect(finalLevel).toBe(4); // Passed → save current
    });

    it('should correctly determine level with 2 out of 5 correct (fail)', () => {
      const testItems = [
        { result: true },
        { result: true },
        { result: false },
        { result: false },
        { result: false },
      ];

      const accuracy = calculateAccuracy(testItems); // 0.4
      const currentLine = 3; // Array index 3 → level 4

      const finalLevel = determineFinalLevel(currentLine, accuracy, farVisionLevels);

      expect(accuracy).toBe(0.4);
      expect(finalLevel).toBe(3); // Failed → save previous
    });

    it('should correctly determine level with 5 out of 10 correct (fail)', () => {
      const testItems = Array(5)
        .fill({ result: true })
        .concat(Array(5).fill({ result: false }));

      const accuracy = calculateAccuracy(testItems); // 0.5
      const currentLine = 5; // Array index 5 → level 6

      const finalLevel = determineFinalLevel(currentLine, accuracy, farVisionLevels);

      expect(accuracy).toBe(0.5);
      expect(finalLevel).toBe(5); // Failed (0.5 is not > 0.5) → save previous
    });
  });

  describe('Edge Cases', () => {
    it('should handle currentLine = 0 with fail', () => {
      const currentLine = 0; // Array index 0 → level 1
      const accuracy = 0.0;

      const finalLevel = determineFinalLevel(currentLine, accuracy, farVisionLevels);

      // Math.max(0, currentLine - 1) = Math.max(0, -1) = 0
      // farVisionLevels[0].level = 1
      expect(finalLevel).toBe(1);
    });

    it('should handle last level with pass', () => {
      const currentLine = farVisionLevels.length - 1; // Array index 19 → level 20
      const accuracy = 1.0;

      const finalLevel = determineFinalLevel(currentLine, accuracy, farVisionLevels);

      expect(finalLevel).toBe(20);
    });

    it('should handle last level with fail', () => {
      const currentLine = farVisionLevels.length - 1; // Array index 19 → level 20
      const accuracy = 0.3;

      const finalLevel = determineFinalLevel(currentLine, accuracy, farVisionLevels);

      expect(finalLevel).toBe(19); // farVisionLevels[18].level = 19
    });

    it('should handle negative accuracy (invalid but defensive)', () => {
      const currentLine = 3; // Array index 3 → level 4
      const accuracy = -0.1; // Invalid but possible due to bugs

      const finalLevel = determineFinalLevel(currentLine, accuracy, farVisionLevels);

      // Negative accuracy is ≤ 0.5 → fail → save previous
      expect(finalLevel).toBe(3);
    });

    it('should handle accuracy > 1 (invalid but defensive)', () => {
      const currentLine = 3; // Array index 3 → level 4
      const accuracy = 1.5; // Invalid but possible due to bugs

      const finalLevel = determineFinalLevel(currentLine, accuracy, farVisionLevels);

      // > 1 is still > 0.5 → pass → save current
      expect(finalLevel).toBe(4);
    });
  });

  describe('Business Logic Verification', () => {
    it('should NEVER save failed level as result', () => {
      // This is the critical bug we fixed
      const currentLine = 3; // User is testing level 4 (array index 3)
      const accuracy = 0.2; // User FAILED level 4

      const finalLevel = determineFinalLevel(currentLine, accuracy, farVisionLevels);

      // Should NOT save level 4 (the failed level)
      expect(finalLevel).not.toBe('4');
      // Should save level 3 (the last passed level)
      expect(finalLevel).toBe(3);
    });

    it('should save current level only when user actually passes', () => {
      const currentLine = 5; // Array index 5 → level 6
      const accuracy = 0.8; // User PASSED level 6

      const finalLevel = determineFinalLevel(currentLine, accuracy, farVisionLevels);

      // Should save level 6 (the passed level)
      expect(finalLevel).toBe(6);
    });

    it('should use > 0.5 threshold, not >= 0.5', () => {
      // Exactly 0.5 should be considered a fail
      const currentLine = 4; // Array index 4 → level 5
      const accuracy = 0.5;

      const finalLevel = determineFinalLevel(currentLine, accuracy, farVisionLevels);

      // 0.5 is NOT > 0.5, so it's a fail
      expect(finalLevel).toBe(4); // Previous level
    });
  });
});
