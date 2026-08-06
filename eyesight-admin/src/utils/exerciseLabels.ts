/**
 * Legacy far-acuity catalog label was BTL; product name is VAC.
 * Apply anywhere exercise/config names are shown in the UI.
 */
export const normalizeVacExerciseLabel = (label: string): string =>
  String(label || '').replaceAll('BTL', 'VAC');
