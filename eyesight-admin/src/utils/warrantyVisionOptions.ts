import {
  contrastVisionLevels,
  farVisionLevels,
  nearVisionLevels,
  stereopsisLevels,
} from './constant';
import { formatVisionLevel } from './visionUtils';

export type WarrantyExamTypeKey = 'far' | 'near' | 'contrast' | 'stereopsis';

export const WARRANTY_EXAM_TYPES: { key: WarrantyExamTypeKey; label: string }[] = [
  { key: 'far', label: 'Thị lực xa' },
  { key: 'near', label: 'Thị lực gần' },
  { key: 'contrast', label: 'Độ tương phản' },
  { key: 'stereopsis', label: 'Thị giác lập thể' },
];

export function getVisionLevelOptions(
  examType: WarrantyExamTypeKey
): { value: number; label: string }[] {
  switch (examType) {
    case 'far':
      return farVisionLevels.map((v) => ({ value: v.level, label: v.score }));
    case 'near':
      return nearVisionLevels.map((v) => ({ value: v.level, label: v.score }));
    case 'contrast':
      return contrastVisionLevels.map((v) => ({ value: v.level, label: v.score }));
    case 'stereopsis':
      return stereopsisLevels.map((v) => ({ value: v.level, label: v.score }));
    default:
      return [];
  }
}

export function formatWarrantyEyeLevel(
  examType: WarrantyExamTypeKey,
  level: number | null | undefined
): string {
  if (level == null) return '—';
  return formatVisionLevel(examType, level);
}

export function eyesForWarrantyExam(examType: WarrantyExamTypeKey): ('leftEye' | 'rightEye' | 'bothEye')[] {
  return examType === 'stereopsis' ? ['bothEye'] : ['rightEye', 'leftEye'];
}

export function warrantyEyeLabel(eye: 'leftEye' | 'rightEye' | 'bothEye'): string {
  if (eye === 'leftEye') return 'Trái (MT)';
  if (eye === 'rightEye') return 'Phải (MP)';
  return 'Hai mắt';
}
