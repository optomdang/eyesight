import { IntroShapeType, SeededRng } from './stereopsisEngine';

export const INTRO_ARCSEC = 800;
export const ROW_A_ARCSEC = 400;
export const ROW_B_ARCSEC = 200;
export const DIGIT_ARCSEC = [200, 150, 100, 80, 60, 40, 32, 25, 20] as const;

export type ShapeChoiceId = 'circle' | 'triangle' | 'square' | 'star' | 'diamond' | 'rect';

export type StereopsisStepType = 'shape-single' | 'shape-row' | 'digit';

export interface StereopsisTestStep {
  type: StereopsisStepType;
  arcsec: number;
  label: string;
  diff: string;
  /** Correct answer: shape id or digit string */
  answer: string;
  shapeType?: IntroShapeType;
  floatShape?: 'square' | 'circle';
  floatAt?: number;
  digit?: number;
}

export interface StereopsisStepResult {
  stepIndex: number;
  label: string;
  arcsec: number;
  userAnswer: string;
  correct: boolean;
}

export const SHAPE_CHOICES: { id: ShapeChoiceId; label: string; icon: string }[] = [
  { id: 'circle', label: 'Tròn', icon: '⬤' },
  { id: 'triangle', label: 'Tam giác', icon: '▲' },
  { id: 'square', label: 'Vuông', icon: '■' },
  { id: 'star', label: 'Ngôi sao', icon: '★' },
  { id: 'diamond', label: 'Hình thoi', icon: '◆' },
  { id: 'rect', label: 'Chữ nhật', icon: '▬' },
];

export const SHAPE_LABELS: Record<string, string> = Object.fromEntries(
  SHAPE_CHOICES.map((c) => [c.id, c.label])
);

const INTRO_SHAPES: IntroShapeType[] = ['star', 'triangle', 'square'];
const DIGIT_DIFF = ['Dễ nhất', '', '', '', 'Trung bình', '', '', '', 'Khó nhất'];

export function generateStereopsisSteps(rng: SeededRng): StereopsisTestStep[] {
  const introType = INTRO_SHAPES[rng.int(INTRO_SHAPES.length)];
  const floatAtA = rng.int(5);
  const floatAtB = rng.int(5);
  const digits = DIGIT_ARCSEC.map(() => rng.int(10));

  return [
    {
      type: 'shape-single',
      arcsec: INTRO_ARCSEC,
      label: 'Mục 1',
      diff: 'Mức khởi động',
      answer: introType,
      shapeType: introType,
    },
    {
      type: 'shape-row',
      arcsec: ROW_A_ARCSEC,
      label: 'Hàng A',
      diff: 'Dễ',
      answer: 'square',
      floatShape: 'square',
      floatAt: floatAtA,
    },
    {
      type: 'shape-row',
      arcsec: ROW_B_ARCSEC,
      label: 'Hàng B',
      diff: 'Trung bình',
      answer: 'circle',
      floatShape: 'circle',
      floatAt: floatAtB,
    },
    ...DIGIT_ARCSEC.map((arcsec, i) => ({
      type: 'digit' as const,
      arcsec,
      label: `Hình ${i + 1}`,
      diff: DIGIT_DIFF[i],
      answer: String(digits[i]),
      digit: digits[i],
    })),
  ];
}

/**
 * Compute achieved arcsec after test ends.
 * @param failedStepIndex - index where user failed, or steps.length if all passed
 */
export function computeAchievedArcsec(
  steps: StereopsisTestStep[],
  failedStepIndex: number
): number | null {
  if (failedStepIndex <= 0) return null;
  if (failedStepIndex >= steps.length) return 20;
  return steps[failedStepIndex - 1].arcsec;
}

export function computeStereopsisAccuracy(
  results: StereopsisStepResult[],
  totalSteps: number
): number {
  if (totalSteps === 0) return 0;
  return results.filter((r) => r.correct).length / totalSteps;
}

/** Legacy level index 1–10 vs new arcsec storage (≥20). */
export function isLegacyStereopsisLevel(level: number): boolean {
  return level >= 1 && level <= 10;
}

/**
 * Arcsec stereopsis: lower = better (20″ best, 800″ worst).
 * Reverse Y so larger arcsec sits lower and improvement (e.g. 400″→200″) trends upward.
 * Legacy Lv 1–10: higher = better — keep normal axis.
 */
export function shouldReverseStereopsisChartYAxis(
  levels: Array<number | null | undefined>
): boolean {
  return levels.some((v) => {
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) && n > 10;
  });
}

export function formatStereopsisLevel(level: number | string | null | undefined): string {
  if (level === null || level === undefined || level === '') return '-';
  const n = typeof level === 'string' ? parseInt(level, 10) : level;
  if (!Number.isFinite(n)) return '-';
  if (isLegacyStereopsisLevel(n)) return `Lv ${n}`;
  return `${n}″`;
}
