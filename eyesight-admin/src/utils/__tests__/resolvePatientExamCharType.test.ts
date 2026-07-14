import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('src/services/patient.service', () => ({
  getMyExamResults: vi.fn(),
  getMyExerciseResults: vi.fn(),
}));

import { getMyExamResults, getMyExerciseResults } from 'src/services/patient.service';
import { resolveDefaultFarAcuityCharType } from '../resolvePatientExamCharType';

describe('resolveDefaultFarAcuityCharType', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('prefers matching exam charType over exercise', async () => {
    vi.mocked(getMyExamResults).mockImplementation(async (params?: { examType?: string }) => {
      if (params?.examType === 'far') {
        return { rows: [{ charType: 'A', completedAt: '2026-07-13T10:00:00Z' }] };
      }
      return { rows: [] };
    });
    vi.mocked(getMyExerciseResults).mockResolvedValue({
      rows: [
        {
          resultMetrics: { charType: 'N' },
          assignment: { exerciseConfig: { visionType: 'far' } },
          completedAt: '2026-07-13T12:00:00Z',
        },
      ],
    });

    const resolved = await resolveDefaultFarAcuityCharType('far');
    expect(resolved).toEqual({
      charType: 'A',
      source: 'exam',
      fromExam: 'A',
      fromExercise: 'N',
    });
  });

  it('falls back to last exercise when no exam charType', async () => {
    vi.mocked(getMyExamResults).mockResolvedValue({ rows: [] });
    vi.mocked(getMyExerciseResults).mockResolvedValue({
      rows: [
        {
          resultMetrics: { charType: 'C' },
          assignment: { exerciseConfig: { visionType: 'far' } },
          completedAt: '2026-07-13T12:00:00Z',
        },
      ],
    });

    const resolved = await resolveDefaultFarAcuityCharType('far');
    expect(resolved.charType).toBe('C');
    expect(resolved.source).toBe('exercise');
  });

  it('defaults to E when no history', async () => {
    vi.mocked(getMyExamResults).mockResolvedValue({ rows: [] });
    vi.mocked(getMyExerciseResults).mockResolvedValue({ rows: [] });

    const resolved = await resolveDefaultFarAcuityCharType('far');
    expect(resolved).toEqual({
      charType: 'E',
      source: 'default',
      fromExam: null,
      fromExercise: null,
    });
  });
});
