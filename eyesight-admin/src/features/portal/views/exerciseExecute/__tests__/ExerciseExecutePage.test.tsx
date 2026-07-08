import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ExerciseExecutePage from '../ExerciseExecutePage';
import { getData } from 'src/utils/request';
import { getLastScreenConfig } from 'src/services/deviceProfile.service';

const mockPortalExercise = vi.fn(() => <div data-testid="portal-exercise" />);

const mockAuthUser = {
  patient: {
    examResults: {
      far: { currentResult: { leftEye: 10, rightEye: 10 } },
    },
  },
};

const mockFreshExamResults = vi.fn(() => ({
  examResults: mockAuthUser.patient.examResults,
  loading: false,
  error: null,
}));

vi.mock('src/hooks/useFreshPatientExamResults', () => ({
  default: () => mockFreshExamResults(),
}));

vi.mock('src/components/exercises/portal/PortalExercise', () => ({
  default: (props: unknown) => mockPortalExercise(props),
}));

vi.mock('src/utils/request', () => ({
  getData: vi.fn(),
}));

vi.mock('src/services/deviceProfile.service', () => ({
  getLastScreenConfig: vi.fn(),
}));

describe('ExerciseExecutePage', () => {
  const mockAssignment = {
    id: 55,
    levelOverride: false,
    visionLevel: null,
    exerciseConfig: {
      exerciseId: 12,
      name: 'Cấu hình 2048',
      duration: 10,
      visionType: 'far',
      eye: 'both',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFreshExamResults.mockReturnValue({
      examResults: mockAuthUser.patient.examResults,
      loading: false,
      error: null,
    });
    vi.mocked(getLastScreenConfig).mockReturnValue({
      diagonalInch: 15.6,
      screenWidth: 1920,
      screenHeight: 1080,
    });
  });

  it('loads assignment and last screen config when location state is missing', async () => {
    vi.mocked(getData).mockResolvedValue(mockAssignment);

    render(
      <MemoryRouter initialEntries={['/portal/assignments/55/sessions/77/execute']}>
        <Routes>
          <Route
            path="/portal/assignments/:assignmentId/sessions/:sessionId/execute"
            element={<ExerciseExecutePage />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('portal-exercise')).toBeInTheDocument();
    });

    expect(getData).toHaveBeenCalledWith('/me/assignments/55');
    expect(mockPortalExercise).toHaveBeenCalledWith(
      expect.objectContaining({
        assignmentId: 55,
        sessionId: 77,
        assignment: mockAssignment,
        screenParams: {
          diagonalInch: 15.6,
          screenWidth: 1920,
          screenHeight: 1080,
        },
      })
    );
  });

  it('loads assignment from API even when location state has a cached assignment', async () => {
    vi.mocked(getData).mockResolvedValue({
      ...mockAssignment,
      exerciseConfig: { ...mockAssignment.exerciseConfig, inactivityThreshold: 45 },
    });

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/portal/assignments/55/sessions/77/execute',
            state: {
              assignment: mockAssignment,
              screenParams: {
                diagonalInch: 14,
                screenWidth: 1366,
                screenHeight: 768,
              },
            },
          },
        ]}
      >
        <Routes>
          <Route
            path="/portal/assignments/:assignmentId/sessions/:sessionId/execute"
            element={<ExerciseExecutePage />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('portal-exercise')).toBeInTheDocument();
    });

    expect(getData).toHaveBeenCalledWith('/me/assignments/55');
    expect(mockPortalExercise).toHaveBeenCalledWith(
      expect.objectContaining({
        assignmentId: 55,
        sessionId: 77,
        assignment: expect.objectContaining({
          exerciseConfig: expect.objectContaining({ inactivityThreshold: 45 }),
        }),
        screenParams: {
          diagonalInch: 14,
          screenWidth: 1366,
          screenHeight: 768,
        },
      })
    );
  });

  it('shows vision required alert when patient has no exam and no override', async () => {
    mockFreshExamResults.mockReturnValue({
      examResults: {},
      loading: false,
      error: null,
    });

    vi.mocked(getData).mockResolvedValue({
      ...mockAssignment,
      levelOverride: false,
      visionLevel: null,
    });

    render(
      <MemoryRouter initialEntries={['/portal/assignments/55/sessions/77/execute']}>
        <Routes>
          <Route
            path="/portal/assignments/:assignmentId/sessions/:sessionId/execute"
            element={<ExerciseExecutePage />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Không thể xác định kích thước bài tập');
    });

    expect(screen.queryByTestId('portal-exercise')).not.toBeInTheDocument();
  });
});
