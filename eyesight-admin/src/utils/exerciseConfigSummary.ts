/**
 * Build a natural-language Vietnamese summary of an exercise training config,
 * used for tooltips in the config form and patient assignment form.
 *
 * Example:
 *   Chế độ tập luyện "Nhìn xa" ở khoảng cách tập 3m. Bạn cần tập hằng ngày với
 *   2 lần tập, mỗi lần 5 phút. Kích thước bài tập sẽ cấu hình theo thị lực nhìn xa
 *   và cần sử dụng kính đỏ - xanh dương.
 */

export interface ExerciseConfigSummaryInput {
  visionType?: string | null;
  distance?: number | string | null;
  frequency?: string | null;
  executionCount?: number | string | null;
  duration?: number | string | null;
  colorScheme?:
    | {
        preset?: string | null;
      }
    | string
    | null;
  /** Tên dạng bài tập (ví dụ: "Phi hành gia thị giác"). */
  exerciseName?: string | null;
  /** How starting difficulty is determined between sessions. */
  difficultyBaselineSource?: 'current_exam' | 'latest_achieved' | null;
}

const VISION_TYPE_LABEL: Record<string, string> = {
  far: 'Nhìn xa',
  near: 'Nhìn gần',
  contrast: 'Độ tương phản',
  stereopsis: 'Thị giác lập thể',
};

const VISION_SIZE_PHRASE: Record<string, string> = {
  far: 'thị lực nhìn xa',
  near: 'thị lực nhìn gần',
  contrast: 'độ nhạy tương phản',
  stereopsis: 'thị giác lập thể',
};

const FREQUENCY_LABEL: Record<string, string> = {
  daily: 'hằng ngày',
  weekly: 'hằng tuần',
  monthly: 'hằng tháng',
  quarterly: 'hằng quý',
  yearly: 'hằng năm',
};

const COLOR_PRESET_LABEL: Record<string, string> = {
  original: 'màu gốc của game',
  whiteBlack: 'bảng màu trắng - đen tiêu chuẩn',
  redBlue: 'kính đỏ - xanh dương',
  redGreen: 'kính đỏ - xanh lá',
  custom: 'bảng màu tùy chỉnh',
};

const DIFFICULTY_BASELINE_LABEL: Record<string, string> = {
  current_exam: 'mức thị lực hiện tại (theo kết quả khám)',
  latest_achieved: 'cấp độ cao nhất đã đạt trong bài tập này',
};

function resolveColorPreset(colorScheme: ExerciseConfigSummaryInput['colorScheme']): string {
  if (!colorScheme) return 'whiteBlack';
  if (typeof colorScheme === 'string') return colorScheme;
  return colorScheme.preset || 'custom';
}

function formatNumber(value: number | string | null | undefined): string | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Number.isInteger(n) ? String(n) : String(n).replace(/\.?0+$/, '');
}

/**
 * Compose the full human-readable summary sentence(s).
 * Returns null when there is not enough data to build a meaningful summary.
 */
export function buildExerciseConfigSummary(input: ExerciseConfigSummaryInput): string | null {
  const visionType = input.visionType || 'far';
  const visionLabel = VISION_TYPE_LABEL[visionType] ?? visionType;
  const visionSizePhrase = VISION_SIZE_PHRASE[visionType] ?? visionLabel.toLowerCase();

  const distance = formatNumber(input.distance);
  const executionCount = formatNumber(input.executionCount);
  const duration = formatNumber(input.duration);
  const frequencyLabel = input.frequency ? FREQUENCY_LABEL[input.frequency] ?? input.frequency : null;
  const colorPreset = resolveColorPreset(input.colorScheme);
  const colorLabel = COLOR_PRESET_LABEL[colorPreset] ?? COLOR_PRESET_LABEL.custom;
  const needsGlasses = colorPreset === 'redBlue' || colorPreset === 'redGreen';

  const parts: string[] = [];

  // 1) Vision type + distance
  const exercisePrefix = input.exerciseName
    ? `Bài tập "${input.exerciseName}" ở chế độ luyện "${visionLabel}"`
    : `Chế độ tập luyện "${visionLabel}"`;
  parts.push(distance ? `${exercisePrefix} ở khoảng cách tập ${distance}m.` : `${exercisePrefix}.`);

  // 2) Frequency + execution count + duration
  const scheduleBits: string[] = [];
  if (frequencyLabel) scheduleBits.push(`Bạn cần tập ${frequencyLabel}`);
  if (executionCount) scheduleBits.push(`${executionCount} lần tập`);
  if (duration) scheduleBits.push(`mỗi lần ${duration} phút`);
  if (scheduleBits.length > 0) {
    // "Bạn cần tập hằng ngày với 2 lần tập, mỗi lần 5 phút."
    const [head, ...rest] = scheduleBits;
    const sentence =
      rest.length > 0 ? `${head} với ${rest.join(', ')}.` : `${head}.`;
    parts.push(sentence);
  }

  // 3) Sizing + color scheme
  const sizingSentence = `Kích thước bài tập sẽ cấu hình theo ${visionSizePhrase}`;
  if (needsGlasses) {
    parts.push(`${sizingSentence} và cần sử dụng ${colorLabel}.`);
  } else {
    parts.push(`${sizingSentence}, sử dụng ${colorLabel}.`);
  }

  // 4) Difficulty progression between sessions
  if (visionType !== 'stereopsis') {
    const baselineKey = input.difficultyBaselineSource ?? 'current_exam';
    const baselineLabel =
      DIFFICULTY_BASELINE_LABEL[baselineKey] ?? DIFFICULTY_BASELINE_LABEL.current_exam;
    parts.push(`Độ khó giữa các lượt tập dựa vào ${baselineLabel}.`);
  }

  return parts.join(' ');
}
