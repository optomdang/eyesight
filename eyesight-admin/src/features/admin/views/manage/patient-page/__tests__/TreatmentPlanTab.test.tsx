import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import TreatmentPlanTab from '../TreatmentPlanTab';
import type { Patient } from 'src/types/core';
import * as PatientService from 'src/services/patient.service';

vi.mock('src/services/patient.service', () => ({
  getPatientExamResults: vi.fn(),
  getPatientExerciseSessions: vi.fn(),
}));

vi.mock('src/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string) => fallback,
  }),
}));

vi.mock('src/contexts/data-context/DataTableContext', () => ({
  DataTableProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../ExamHistoryTable', () => ({
  default: () => <div>ExamHistoryTable</div>,
}));

vi.mock('../PatientExerciseResultsTable', () => ({
  default: () => <div>PatientExerciseResultsTable</div>,
}));

vi.mock('../ExamResultDetail', () => ({
  default: () => <div>ExamResultDetail</div>,
}));

vi.mock('src/components/shared/LoadingBoundary', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Shared chart is tested separately — stub it here
vi.mock('src/components/shared/ExerciseSessionProgressChart', () => ({
  default: ({ sessions }: { sessions: any[] }) => (
    <div data-testid="exercise-session-chart" data-session-count={sessions.length} />
  ),
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Legend: () => <div data-testid="legend" />,
  XAxis: ({ dataKey }: { dataKey?: string }) => <div data-testid="x-axis" data-key={dataKey} />,
  YAxis: ({ tickFormatter }: { tickFormatter?: (value: number) => string }) => (
    <div data-testid="y-axis-sample">{tickFormatter ? tickFormatter(14) : ''}</div>
  ),
  Tooltip: ({ formatter }: { formatter?: (value: number, name: string) => [string, string] }) => {
    const formatted = formatter ? formatter(14, 'Mắt trái') : ['', ''];
    return <div data-testid="tooltip-sample">{formatted[0]}</div>;
  },
  Line: ({ name, dataKey }: { name: string; dataKey?: string }) => (
    <div data-testid="line-series" data-key={dataKey}>{name}</div>
  ),
  LineChart: ({ data, children }: { data?: Array<Record<string, unknown>>; children: React.ReactNode }) => (
    <div data-testid="line-chart" data-length={(data || []).length}>
      {children}
    </div>
  ),
}));

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);

const basePatient: Patient = {
  id: 7,
  name: 'Nguyen Quynh Nhu',
  code: 'PT260130TIZ',
  userId: 1,
  phoneNumber: '0900000000',
  activeFrom: '2026-01-01T00:00:00Z',
};

const mockExamResultsResponse = {
  rows: [
    { id: 1, examType: 'far', leftEyeLevel: 2,  rightEyeLevel: 4,  startedAt: '2025-12-15T09:00:00Z' },
    { id: 2, examType: 'far', leftEyeLevel: 14, rightEyeLevel: 15, startedAt: '2026-02-04T00:10:00Z' },
    { id: 3, examType: 'far', leftEyeLevel: 16, rightEyeLevel: 17, startedAt: '2026-05-05T23:47:00Z' },
  ],
};

const mockSessionsResponse = {
  rows: [
    {
      id: 10,
      exerciseAssignmentId: 101,
      completedAt: '2026-02-10T08:00:00Z',
      averageScore: 200,
      duration: 170,            // Σ active seconds (server snapshot)
      executionDuration: 3,     // phút/lượt (snapshot)
      executionCount: 1,        // số lượt (snapshot)
      focusScore: 90,
      visionLevel: 14,          // độ khó snapshot trên session
      exerciseAssignment: {
        exerciseConfig: { id: 1, name: 'Config xa - MT', visionType: 'far', eye: 'left', frequency: 'daily' },
      },
    },
    {
      id: 11,
      exerciseAssignmentId: 102,
      completedAt: '2026-04-20T08:00:00Z',
      averageScore: 250,
      duration: 220,
      executionDuration: 4,
      executionCount: 1,
      focusScore: 85,
      visionLevel: 8,
      exerciseAssignment: {
        exerciseConfig: { id: 2, name: 'Config gần - MP', visionType: 'near', eye: 'right', frequency: 'weekly' },
      },
    },
  ],
};

describe('TreatmentPlanTab', () => {
  beforeAll(() => {
    class ResizeObserverMock {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    global.ResizeObserver = ResizeObserverMock as never;
  });

  beforeEach(() => {
    vi.mocked(PatientService.getPatientExamResults).mockResolvedValue(
      mockExamResultsResponse as never
    );
    vi.mocked(PatientService.getPatientExerciseSessions).mockResolvedValue(
      mockSessionsResponse as never
    );
  });

  it('fetches exam results and exercise sessions on mount', async () => {
    renderWithTheme(
      <TreatmentPlanTab patient={basePatient} getExamTypeName={(t) => t} />
    );

    await waitFor(() => {
      expect(PatientService.getPatientExamResults).toHaveBeenCalledWith(7);
      expect(PatientService.getPatientExerciseSessions).toHaveBeenCalledWith(7, { limit: 500 });
    });
  });

  it('passes sessions to ExerciseSessionProgressChart', async () => {
    renderWithTheme(
      <TreatmentPlanTab patient={basePatient} getExamTypeName={(t) => t} />
    );

    await waitFor(() => {
      const chart = screen.getByTestId('exercise-session-chart');
      expect(chart).toHaveAttribute('data-session-count', '2');
    });
  });

  it('uses the shared vision formatter for the exam chart axis and tooltip', async () => {
    renderWithTheme(
      <TreatmentPlanTab patient={basePatient} getExamTypeName={(t) => t} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('y-axis-sample')).toHaveTextContent('20/20');
      expect(screen.getByTestId('tooltip-sample')).toHaveTextContent('20/20');
    });
  });

  it('filters exam chart to activeFrom onward in all-time range', async () => {
    renderWithTheme(
      <TreatmentPlanTab patient={basePatient} getExamTypeName={(t) => t} />
    );

    // basePatient.activeFrom = 2026-01-01 → row id:1 (2025-12-15) excluded → 2 rows remain
    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toHaveAttribute('data-length', '2');
    });
  });

  it('filters exam chart to 3 months when time range is changed', async () => {
    renderWithTheme(
      <TreatmentPlanTab patient={basePatient} getExamTypeName={(t) => t} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toHaveAttribute('data-length', '2');
    });

    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(await screen.findByText('3 tháng đầu'));

    // activeFrom 2026-01-01 + 3m = 2026-04-01 → only row 2026-02-04 remains
    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toHaveAttribute('data-length', '1');
    });
  });

  it('shows all exam rows when patient has no activeFrom', async () => {
    renderWithTheme(
      <TreatmentPlanTab
        patient={{ ...basePatient, activeFrom: undefined }}
        getExamTypeName={(t) => t}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toHaveAttribute('data-length', '3');
    });
  });
});
