/**
 * Dichoptic balance support matrix and config validation helpers.
 * Single source of truth for admin warnings and test-dialog defaults.
 */

import { normalizeExerciseType } from 'src/components/exercises/registry';
import { isAnaglyphExerciseColorScheme } from 'src/components/exercises/vt/core/vtStimulusColors';
import { colorSchemeFromPreset } from 'src/services/colorPreset.service';
import type { ColorScheme, DichopticConfig } from 'src/types/core/visual-settings';

export type DichopticBalanceSupport = 'full' | 'partial' | 'none';

/** How fully dichoptic balance is rendered at runtime for an exercise type. */
export function getDichopticBalanceSupport(exerciseType?: string | null): DichopticBalanceSupport {
  const t = normalizeExerciseType(exerciseType ?? '');
  if (t === '2048' || t === 'far-acuity' || t === 'vt-crowding' || t === 'vt-vernier') {
    return 'full';
  }
  if (t === 'vt-quest') {
    return 'partial';
  }
  return 'none';
}

export function exerciseUsesAnaglyphTestDefaults(exerciseType?: string | null): boolean {
  const t = normalizeExerciseType(exerciseType ?? '');
  return [
    '2048',
    'far-acuity',
    'vt-quest',
    'vt-crowding',
    'vt-vernier',
    'vt-gabor',
    'vt-stereopsis',
  ].includes(t);
}

export interface BaseGameTestVisualOptions {
  colorScheme?: ColorScheme | null;
  dichoptic?: DichopticConfig | null;
  eye?: 'left' | 'right' | 'both';
  distance?: number;
  visionType?: 'far' | 'near' | 'contrast';
}

/** Defaults for admin "Chơi thử" when no ExerciseConfig is available. */
export function buildBaseGameTestVisualOptions(
  exerciseType?: string | null,
  overrides?: BaseGameTestVisualOptions | null
): BaseGameTestVisualOptions {
  const t = normalizeExerciseType(exerciseType ?? '');
  const usesAnaglyph = exerciseUsesAnaglyphTestDefaults(t);
  const defaultDistance = t === 'far-acuity' ? 3 : t === '2048' ? 0.5 : 3;

  return {
    eye: overrides?.eye ?? (usesAnaglyph ? 'left' : 'both'),
    distance: overrides?.distance ?? defaultDistance,
    visionType: overrides?.visionType ?? 'far',
    colorScheme:
      overrides?.colorScheme ?? (usesAnaglyph ? colorSchemeFromPreset('redBlue') : null),
    dichoptic: overrides?.dichoptic ?? null,
  };
}

/** User-facing warnings when balance config will not take effect at runtime. */
export function getDichopticBalanceConfigWarnings(params: {
  mode?: string | null;
  eye?: string | null;
  exerciseType?: string | null;
  colorScheme?: ColorScheme | null;
}): string[] {
  const warnings: string[] = [];
  const mode = params.mode ?? 'off';
  if (mode !== 'balance') {
    return warnings;
  }

  if (!isAnaglyphExerciseColorScheme(params.colorScheme)) {
    warnings.push(
      'Cân bằng dichoptic cần preset màu Đỏ–Xanh hoặc Đỏ–Xanh lá — hiện tại balance sẽ không chạy.'
    );
  }

  if (params.eye === 'both') {
    warnings.push(
      'Chọn Mắt trái hoặc phải (không dùng Cả 2 mắt) — balance tắt im lặng khi Mắt = Cả 2.'
    );
  }

  const support = getDichopticBalanceSupport(params.exerciseType);
  const t = normalizeExerciseType(params.exerciseType ?? '');

  if (support === 'none') {
    if (t === 'vt-gabor') {
      warnings.push(
        'Bài Gabor lưu được cấu hình dichoptic nhưng chưa áp dụng cân bằng khi bệnh nhân chơi.'
      );
    } else if (t === 'vt-stereopsis') {
      warnings.push(
        'Stereopsis dùng engine anaglyph riêng — cấu hình cân bằng dichoptic không có hiệu lực.'
      );
    } else if (params.exerciseType) {
      warnings.push('Loại bài tập này chưa hỗ trợ cân bằng dichoptic khi chơi.');
    }
  } else if (support === 'partial') {
    warnings.push(
      'VT Quest tổng hợp: balance chỉ áp dụng Crowding và Vernier — không áp dụng Gabor/Stereopsis.'
    );
  }

  return warnings;
}
