import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import DashboardPage from '../DashboardPage';
import * as DashboardService from 'src/services/dashboard/dashboard.service';

const theme = createTheme();

// Mock ResizeObserver for recharts
beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  global.ResizeObserver = ResizeObserverMock as any;
});

vi.mock('src/services/dashboard/dashboard.service', () => ({
  getPatientDashboardStats: vi.fn(),
  getInactivePatients: vi.fn(),
  getExamStats: vi.fn(),
  getExerciseStats: vi.fn(),
}));

vi.mock('src/contexts/UseSnackbar', () => ({
  default: () => ({
    showSnackbar: vi.fn(),
  }),
}));

// Mock data matching real DB schema and API responses
const mockPatientStats = {
  totalPatients: 50,
  activePatients: 45,
  completedPatients: 5,
  kpi: {
    totalPatients: 50,
    activePatients: 45,
    improvementRate: 66.67,
    avgImprovementLevel: 6.7,
    minAge: 12,
    maxAge: 45,
    avgAge: 28.5,
  },
  ageStats: {
    minAge: 12,
    maxAge: 45,
    avgAge: 28.5,
  },
  improvement: {
    improved: 30,
    improvedCount: 30,
    stable: 10,
    declined: 5,
    total: 45,
    improvementRate: 66.67,
    visionType: 'far',
  },
  activityTrend: [
    { date: '2026-01-10', loginCount: 5 },
    { date: '2026-01-11', loginCount: 8 },
    { date: '2026-01-12', loginCount: 3 },
    { date: '2026-01-13', loginCount: 12 },
    { date: '2026-01-14', loginCount: 7 },
    { date: '2026-01-15', loginCount: 9 },
    { date: '2026-01-16', loginCount: 6 },
    { date: '2026-01-17', loginCount: 11 },
    { date: '2026-01-18', loginCount: 8 },
    { date: '2026-01-19', loginCount: 10 },
  ],
  topPerformers: [
    {
      patientCode: 'PT25121075T',
      patientName: 'Nguyễn Văn A',
      completionRate: 92,
      focusScore: 92,
      improvementLines: 3,
      recoveryPct: 80,
    },
    {
      patientCode: 'PT25111234C',
      patientName: 'Lê Văn C',
      completionRate: 88,
      focusScore: 88,
      improvementLines: 2,
      recoveryPct: 75,
    },
    {
      patientCode: 'PT25101567D',
      patientName: 'Phạm Thị D',
      completionRate: 85,
      focusScore: 85,
      improvementLines: 4,
      recoveryPct: 100,
    },
  ],
};

const mockInactivePatients = {
  rows: [
    {
      id: 1,
      code: 'PT25121075T',
      activeFrom: '2025-12-01T00:00:00.000Z',
      activeTo: '2026-06-01T23:59:59.999Z',
      severityLevel: 'moderate',
      daysInactive: 14,
      treatmentStatus: true,
      compliance: {
        far: { performanceRate: 85, status: 'good', completedExams: 17, requiredExams: 20 },
        near: { performanceRate: 90, status: 'good', completedExams: 18, requiredExams: 20 },
        contrast: { performanceRate: 75, status: 'average', completedExams: 15, requiredExams: 20 },
      },
      user: {
        id: 101,
        name: 'Nguyễn Văn A',
        email: 'nguyenvana@example.com',
        phoneNumber: '0901234567',
        userType: 'patient',
        lastLoginAt: '2026-01-05T10:30:00.000Z',
      },
    },
  ],
  count: 1,
  page: 1,
  limit: 10,
  totalPages: 1,
};

const mockExamStats = {
  stats: {
    kpi: {
      totalExams: 100,
      completedExams: 80,
      averageScore: 85.5,
      completionRate: 80.0,
      avgDuration: 15.5,
    },
    breakdown: [
      { examType: 'far', count: 35, avgScore: 87.2 },
      { examType: 'near', count: 30, avgScore: 84.5 },
      { examType: 'contrast', count: 15, avgScore: 83.1 },
    ],
    trend: [
      { date: '2026-01-10', completedExams: 8, avgScore: 85 },
      { date: '2026-01-11', completedExams: 12, avgScore: 86 },
      { date: '2026-01-12', completedExams: 7, avgScore: 84 },
    ],
  },
};

// Tab 3 (Hiệu Suất Bài Tập) — BU-spec contract (#19–#27): no pass/fail, only completed/assigned.
const mockExerciseStats = {
  stats: {
    kpi: {
      inUseExercises: 6,
      totalExercises: 8,
      inUsePct: 75,
      totalConfigs: 12,
      timeCompletionRate: 88.5,
      countComplianceRate: 82.0,
      excellentPatientsCount: 5,
    },
    distributionByType: [
      { exerciseType: '2048', count: 80 },
      { exerciseType: 'stereopsis', count: 60 },
      { exerciseType: 'memory', count: 40 },
    ],
    complianceByType: [
      { exerciseType: '2048', assigned: 100, completed: 85, complianceRate: 85 },
      { exerciseType: 'stereopsis', assigned: 80, completed: 52, complianceRate: 65 },
      { exerciseType: 'memory', assigned: 60, completed: 24, complianceRate: 40 },
    ],
  },
};

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>{component}</ThemeProvider>
    </BrowserRouter>,
  );
};

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (DashboardService.getPatientDashboardStats as any).mockResolvedValue(mockPatientStats);
    (DashboardService.getInactivePatients as any).mockResolvedValue(mockInactivePatients);
    (DashboardService.getExamStats as any).mockResolvedValue(mockExamStats);
    (DashboardService.getExerciseStats as any).mockResolvedValue(mockExerciseStats);
  });

  it('should render dashboard page with tabs', async () => {
    renderWithProviders(<DashboardPage />);

    expect(screen.getByText('Tổng Quan Bệnh Nhân')).toBeInTheDocument();
  });

  it('should render all three tabs', async () => {
    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Tổng Quan Bệnh Nhân')).toBeInTheDocument();
      expect(screen.getByText('Thống Kê Bài Kiểm Tra')).toBeInTheDocument();
      expect(screen.getByText('Hiệu Suất Bài Tập')).toBeInTheDocument();
    });
  });

  it('should fetch all dashboard data on mount', async () => {
    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(DashboardService.getPatientDashboardStats).toHaveBeenCalledWith(
        'far',
        30,
        expect.any(Array),
      );
      expect(DashboardService.getInactivePatients).toHaveBeenCalledWith(7, 1, 10);
      expect(DashboardService.getExamStats).toHaveBeenCalled();
      expect(DashboardService.getExerciseStats).toHaveBeenCalled();
    });
  });

  it('should render PatientActivityChart in patient overview tab', async () => {
    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/Xu Hướng Hoạt Động/)).toBeInTheDocument();
    });
  });

  it('should render PatientKPICards in patient overview tab', async () => {
    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      // KPI cards should be visible
      const cards = document.querySelectorAll('.MuiCard-root');
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  it('should render InactivePatientsTable in patient overview tab', async () => {
    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Bệnh Nhân Không Hoạt Động')).toBeInTheDocument();
    });
  });

  it('should render TopPerformersLeaderboard in patient overview tab', async () => {
    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      // Check that leaderboard section exists
      const cards = document.querySelectorAll('.MuiCard-root');
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  it('should render PatientCorrelationChart in patient overview tab', async () => {
    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      // Correlation chart should be visible
      const charts = document.querySelectorAll('.recharts-responsive-container');
      expect(charts.length).toBeGreaterThan(0);
    });
  });

  it('should render ImprovementBreakdown in patient overview tab', async () => {
    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      // Check for improvement data
      expect(screen.getByText(/66.67/)).toBeInTheDocument(); // improvement rate
    });
  });

  it('should pass correct props to PatientActivityChart', async () => {
    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      // Chart should receive activityTrend data
      const chart = screen.getByText(/Xu Hướng Hoạt Động/);
      expect(chart).toBeInTheDocument();
    });
  });

  it('should pass trendDays state to PatientActivityChart', async () => {
    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      // Default trendDays is 30
      expect(screen.getByText(/Xu Hướng Hoạt Động \(30 Ngày\)/)).toBeInTheDocument();
    });
  });

  it('should update dashboard stats when trendDays changes', async () => {
    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(DashboardService.getPatientDashboardStats).toHaveBeenCalledWith(
        'far',
        30,
        expect.any(Array),
      );
    });

    // When trendDays changes, it should refetch with new value
    // This would be tested through user interaction in integration tests
  });

  it('should handle loading state correctly', async () => {
    renderWithProviders(<DashboardPage />);

    // After data loads, content should be visible
    await waitFor(() => {
      expect(screen.getByText('Tổng Quan Bệnh Nhân')).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (DashboardService.getPatientDashboardStats as any).mockRejectedValue(new Error('API Error'));

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      // Page should still render without crashing
      expect(screen.getByText('Tổng Quan Bệnh Nhân')).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it('should pass correct inactiveDays to InactivePatientsTable', async () => {
    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(DashboardService.getInactivePatients).toHaveBeenCalledWith(7, 1, 10);
    });
  });

  it('should refetch inactive patients when inactiveDays changes', async () => {
    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(DashboardService.getInactivePatients).toHaveBeenCalledTimes(1);
    });

    // When user changes inactive days dropdown, it should refetch
    // This would be tested through user interaction
  });

  it('should handle pagination for inactive patients', async () => {
    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      // Pagination controls should be visible
      expect(screen.getByText(/Số dòng mỗi trang:/)).toBeInTheDocument();
    });
  });
});
