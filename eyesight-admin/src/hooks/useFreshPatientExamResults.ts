import { useEffect, useState } from 'react';
import useAuth from 'src/contexts/authGuard/useAuth';
import { fetchFreshPatientExamResults } from 'src/utils/exerciseVisionPrerequisites';
import type { ExerciseExamResults } from 'src/utils/visionUtils';

/**
 * Patient examResults from auth can be stale after completing a vision test.
 * This hook always refetches GET /me/info (with server-side cache rebuild) on mount.
 */
export const useFreshPatientExamResults = () => {
  const { user } = useAuth();
  const [examResults, setExamResults] = useState<ExerciseExamResults | null | undefined>(
    user?.patient?.examResults
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const fresh = await fetchFreshPatientExamResults();
        if (isMounted) {
          setExamResults(fresh);
        }
      } catch {
        if (isMounted) {
          setExamResults(user?.patient?.examResults);
          setError('Không thể tải kết quả thị lực mới nhất.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [user?.patient?.examResults]);

  return { examResults, loading, error };
};

export default useFreshPatientExamResults;
