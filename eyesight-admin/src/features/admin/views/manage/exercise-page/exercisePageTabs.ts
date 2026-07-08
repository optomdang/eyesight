export const EXERCISE_PAGE_PATH = '/admin/exercises';
export const EXERCISE_TAB_QUERY_KEY = 'tab';

export function parseExerciseTab(searchParams: URLSearchParams): number {
  const raw = Number(searchParams.get(EXERCISE_TAB_QUERY_KEY) ?? 0);
  return raw === 1 ? 1 : 0;
}
