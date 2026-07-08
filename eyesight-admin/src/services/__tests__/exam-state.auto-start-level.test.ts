/**
 * Exam State - Auto Start Level Tests
 *
 * Tests for getAutoStartLevel() — the logic that determines WHICH LEVEL each eye
 * starts from when beginning a new test, based on previous exam results.
 *
 * CRITICAL BUSINESS RULE:
 *   Each eye must start at its OWN previous result, not the other eye's.
 *   A stronger eye's result must NEVER force the weaker eye to begin at a harder level.
 *
 * BUG HISTORY:
 *   Bug 1 (fixed): targetEye specified but that eye had no prior result →
 *     fallthrough to max-across-all → inherited the OTHER eye's level.
 *     FIX: when targetEye specified and eye has no prior result → return 0 (start fresh).
 *
 *   Bug 2 (fixed): handleInitTest pre-generated items.left with totalChars from
 *     the RIGHT eye's display strategy, not the left eye's own start level.
 *     FIX: compute leftStrategy independently from getAutoStartLevel('left').
 *
 *   Bug 3 (fixed): handleNextLine dep array omitted getAutoStartLevel →
 *     stale closure could call getAutoStartLevel with old user data.
 *     FIX: added getAutoStartLevel to handleNextLine's dependency array.
 *
 * BU SCENARIO (regression guard):
 *   Patient: rightEye = Level 5 (20/160), leftEye = Level 3 (20/250)
 *   Expected: right starts at index 4, left starts at index 2
 *   Bug behaviour: left started at index 4 (right eye's level) — wrong
 */

import { describe, it, expect } from 'vitest';
import { nearVisionLevels, farVisionLevels } from 'src/utils/constant';
import { getLevels } from 'src/utils/examUtils';

// ---------------------------------------------------------------------------
// Helper: mirrors the FIXED logic of getAutoStartLevel() in exam-state.ts
// Keep this in sync with exam-state.ts whenever that function changes.
// ---------------------------------------------------------------------------
type TargetEye = 'right' | 'left' | 'both';

interface CurrentResult {
  rightEye?: string | number | null;
  leftEye?: string | number | null;
  bothEye?: string | number | null;
}

const computeAutoStartLevel = (
  currentResult: CurrentResult | null | undefined,
  examType: 'far' | 'near' | 'contrast' | 'stereopsis',
  targetEye?: TargetEye
): number => {
  if (!currentResult) return 0;

  const levels = getLevels(examType);

  const toIndex = (val: any): number => {
    const idx = levels.findIndex((l) => l.level === parseInt(val));
    return idx >= 0 ? idx : 0;
  };

  // FIXED: when a specific eye is requested, use ONLY that eye's own result.
  // If the eye has no prior result, return 0 (start from the easiest level).
  // Never inherit another eye's result.
  if (targetEye === 'right') return currentResult.rightEye ? toIndex(currentResult.rightEye) : 0;
  if (targetEye === 'left')  return currentResult.leftEye  ? toIndex(currentResult.leftEye)  : 0;
  if (targetEye === 'both')  return currentResult.bothEye  ? toIndex(currentResult.bothEye)  : 0;

  // No specific eye → fallback: max across all (used for stereopsis init only)
  let maxLevel = 0;
  if (currentResult.rightEye) { const i = toIndex(currentResult.rightEye); if (i > maxLevel) maxLevel = i; }
  if (currentResult.leftEye)  { const i = toIndex(currentResult.leftEye);  if (i > maxLevel) maxLevel = i; }
  if (currentResult.bothEye)  { const i = toIndex(currentResult.bothEye);  if (i > maxLevel) maxLevel = i; }
  return maxLevel;
};

// ---------------------------------------------------------------------------
// NEAR VISION
// ---------------------------------------------------------------------------

describe('getAutoStartLevel — near vision', () => {

  it('nearVisionLevels index sanity: index 0 = N64 (level 1), index 2 = N24 (level 3)', () => {
    expect(nearVisionLevels[0]).toMatchObject({ level: 1, score: 'N64' });
    expect(nearVisionLevels[2]).toMatchObject({ level: 3, score: 'N24' });
  });

  // ── BU scenario: asymmetric eyes ──────────────────────────────────────────
  describe('[REGRESSION] BU scenario: left eye weaker than right eye', () => {
    // Patient: right = Level 5 (N12), left = Level 3 (N24)
    // Bug: left was starting at Level 5 (right eye's level) instead of Level 3
    const currentResult: CurrentResult = { rightEye: '5', leftEye: '3' };

    it('right eye starts at its own level N12 (index 4)', () => {
      const idx = computeAutoStartLevel(currentResult, 'near', 'right');
      expect(idx).toBe(4);
      expect(nearVisionLevels[idx].score).toBe('N12');
    });

    it('left eye starts at its own level N24 (index 2) — NOT right eye level', () => {
      const idx = computeAutoStartLevel(currentResult, 'near', 'left');
      expect(idx).toBe(2);
      expect(nearVisionLevels[idx].score).toBe('N24');
    });

    it('left eye does NOT inherit right eye level (regression guard)', () => {
      const rightIdx = computeAutoStartLevel(currentResult, 'near', 'right');
      const leftIdx  = computeAutoStartLevel(currentResult, 'near', 'left');
      expect(leftIdx).not.toBe(rightIdx); // they must differ
    });
  });

  describe('[REGRESSION] BU scenario: right eye weaker than left eye', () => {
    const currentResult: CurrentResult = { rightEye: '1', leftEye: '3' }; // MP=N64, MT=N24

    it('right eye starts at N64 (index 0), not pulled up to MT level', () => {
      const idx = computeAutoStartLevel(currentResult, 'near', 'right');
      expect(idx).toBe(0);
      expect(nearVisionLevels[idx].score).toBe('N64');
    });

    it('left eye starts at N24 (index 2)', () => {
      const idx = computeAutoStartLevel(currentResult, 'near', 'left');
      expect(idx).toBe(2);
      expect(nearVisionLevels[idx].score).toBe('N24');
    });
  });

  // ── No prior result for one eye ────────────────────────────────────────────
  describe('only right eye has prior result — left eye never tested', () => {
    const currentResult: CurrentResult = { rightEye: '5', leftEye: null };

    it('right eye starts at its own level (N12, index 4)', () => {
      expect(computeAutoStartLevel(currentResult, 'near', 'right')).toBe(4);
    });

    it('[FIXED] left eye starts at 0 (fresh start), NOT right eye level', () => {
      // Bug (before fix): returned 4 (inherited right eye's level)
      // Fixed behaviour:   returns 0 (start from easiest level)
      expect(computeAutoStartLevel(currentResult, 'near', 'left')).toBe(0);
    });
  });

  describe('only left eye has prior result — right eye never tested', () => {
    const currentResult: CurrentResult = { rightEye: null, leftEye: '5' };

    it('left eye starts at its own level (N12, index 4)', () => {
      const idx = computeAutoStartLevel(currentResult, 'near', 'left');
      expect(idx).toBe(4);
      expect(nearVisionLevels[idx].score).toBe('N12');
    });

    it('[FIXED] right eye starts at 0 (fresh start), NOT left eye level', () => {
      expect(computeAutoStartLevel(currentResult, 'near', 'right')).toBe(0);
    });
  });

  // ── First-time patient ─────────────────────────────────────────────────────
  describe('first-time patient: all results null', () => {
    const currentResult: CurrentResult = { rightEye: null, leftEye: null, bothEye: null };

    it('right eye starts at index 0 (easiest) when no prior result', () => {
      expect(computeAutoStartLevel(currentResult, 'near', 'right')).toBe(0);
    });

    it('left eye starts at index 0 (easiest) when no prior result', () => {
      expect(computeAutoStartLevel(currentResult, 'near', 'left')).toBe(0);
    });
  });

  describe('missing currentResult entirely', () => {
    it('returns 0 when currentResult is null', () => {
      expect(computeAutoStartLevel(null, 'near', 'right')).toBe(0);
    });
    it('returns 0 when currentResult is undefined', () => {
      expect(computeAutoStartLevel(undefined, 'near', 'left')).toBe(0);
    });
  });

  // ── Both eyes equal ────────────────────────────────────────────────────────
  describe('both eyes with same result N24 (level 3)', () => {
    const currentResult: CurrentResult = { rightEye: '3', leftEye: '3' };

    it('right eye starts at index 2 (N24)', () => {
      expect(computeAutoStartLevel(currentResult, 'near', 'right')).toBe(2);
    });
    it('left eye starts at index 2 (N24)', () => {
      expect(computeAutoStartLevel(currentResult, 'near', 'left')).toBe(2);
    });
  });

  // ── Data types: backend may return number instead of string ────────────────
  describe('numeric values from backend (number not string)', () => {
    it('handles number input: rightEye=1, leftEye=3', () => {
      const currentResult: CurrentResult = { rightEye: 1, leftEye: 3 };
      expect(computeAutoStartLevel(currentResult, 'near', 'right')).toBe(0);
      expect(computeAutoStartLevel(currentResult, 'near', 'left')).toBe(2);
    });
  });

  // ── Edge: invalid / out-of-range level ────────────────────────────────────
  describe('invalid level in currentResult', () => {
    it('returns 0 (safe fallback) when level does not exist', () => {
      const currentResult: CurrentResult = { rightEye: '99' };
      expect(computeAutoStartLevel(currentResult, 'near', 'right')).toBe(0);
    });
  });

  // ── Boundary levels ────────────────────────────────────────────────────────
  describe('boundary levels', () => {
    it('level 1 (N64, easiest) → index 0', () => {
      expect(computeAutoStartLevel({ rightEye: '1' }, 'near', 'right')).toBe(0);
    });
    it('level 8 (N3, hardest) → index 7', () => {
      const idx = computeAutoStartLevel({ rightEye: '8' }, 'near', 'right');
      expect(idx).toBe(7);
      expect(nearVisionLevels[idx].score).toBe('N3');
    });
  });

  // ── No targetEye: fallback max (stereopsis / legacy call sites) ────────────
  describe('no targetEye specified: max-across-all fallback', () => {
    it('returns max of both eyes when no targetEye', () => {
      const currentResult: CurrentResult = { rightEye: '1', leftEye: '3' };
      expect(computeAutoStartLevel(currentResult, 'near')).toBe(2); // max(0,2) = 2
    });
    it('returns 0 when no targetEye and all eyes null', () => {
      expect(computeAutoStartLevel({ rightEye: null, leftEye: null }, 'near')).toBe(0);
    });
  });
});

// ---------------------------------------------------------------------------
// FAR VISION
// ---------------------------------------------------------------------------

describe('getAutoStartLevel — far vision', () => {
  it('farVisionLevels index sanity: index 0 = 20/400 (level 1), index 13 = 20/20 (level 14)', () => {
    expect(farVisionLevels[0]).toMatchObject({ level: 1, score: '20/400' });
    expect(farVisionLevels[13]).toMatchObject({ level: 14, score: '20/20' });
  });

  // ── BU exact complaint: far vision, MP=Level5 (20/160), MT=Level3 (20/250) ──
  describe('[REGRESSION] BU far vision: MP=20/160 (L5), MT=20/250 (L3)', () => {
    const currentResult: CurrentResult = { rightEye: '5', leftEye: '3' };

    it('right eye starts at Level 5 (20/160), index 4', () => {
      const idx = computeAutoStartLevel(currentResult, 'far', 'right');
      expect(idx).toBe(4);
      expect(farVisionLevels[idx].score).toBe('20/160');
    });

    it('left eye starts at Level 3 (20/250), index 2 — NOT Level 5', () => {
      const idx = computeAutoStartLevel(currentResult, 'far', 'left');
      expect(idx).toBe(2);
      expect(farVisionLevels[idx].score).toBe('20/250');
    });
  });

  describe('far vision: left eye never tested (null)', () => {
    const currentResult: CurrentResult = { rightEye: '5', leftEye: null };

    it('right eye starts at Level 5 (index 4)', () => {
      expect(computeAutoStartLevel(currentResult, 'far', 'right')).toBe(4);
    });

    it('[FIXED] left eye starts at index 0 (fresh start), not right eye level', () => {
      // Bug (before fix): returned 4 → left eye started at 20/160 instead of 20/400
      expect(computeAutoStartLevel(currentResult, 'far', 'left')).toBe(0);
    });
  });

  it('both eyes same far result (20/20)', () => {
    const currentResult: CurrentResult = { rightEye: '14', leftEye: '14' };
    expect(computeAutoStartLevel(currentResult, 'far', 'right')).toBe(13);
    expect(computeAutoStartLevel(currentResult, 'far', 'left')).toBe(13);
  });

  it('no previous result → both start at index 0', () => {
    const r = { rightEye: null, leftEye: null };
    expect(computeAutoStartLevel(r, 'far', 'right')).toBe(0);
    expect(computeAutoStartLevel(r, 'far', 'left')).toBe(0);
  });

  it('asymmetric: right better (20/20 = L14), left weaker (20/400 = L1)', () => {
    const currentResult: CurrentResult = { rightEye: '14', leftEye: '1' };
    expect(computeAutoStartLevel(currentResult, 'far', 'right')).toBe(13); // 20/20
    expect(computeAutoStartLevel(currentResult, 'far', 'left')).toBe(0);   // 20/400
  });
});

// ---------------------------------------------------------------------------
// STEREOPSIS
// ---------------------------------------------------------------------------

describe('getAutoStartLevel — stereopsis (bothEye only)', () => {
  it('uses bothEye result when targetEye=both', () => {
    const currentResult: CurrentResult = { bothEye: '5' };
    expect(computeAutoStartLevel(currentResult, 'stereopsis', 'both')).toBe(4);
  });

  it('no prior stereopsis result → starts at index 0', () => {
    expect(computeAutoStartLevel({ bothEye: null }, 'stereopsis', 'both')).toBe(0);
  });

  it('bothEye null: returns 0 (fresh stereopsis start), does NOT inherit per-eye results', () => {
    const currentResult: CurrentResult = { rightEye: '5', leftEye: '5', bothEye: null };
    // targetEye='both' && bothEye=null → false → returns 0.
    // Per-eye results are irrelevant for stereopsis; don't carry them over.
    expect(computeAutoStartLevel(currentResult, 'stereopsis', 'both')).toBe(0);
  });
});
