/**
 * Unit Tests for ActiveSessionsPage
 * Tests status display, compliance percentage, and action button behavior
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import ActiveSessionsPage from '../ActiveSessionsPage';
import type { PortalExerciseAssignment } from 'src/types/core/portal';

// Mock useDataTable
const mockUseDataTable = vi.fn();
vi.mock('src/contexts/data-context/useDataTable', () => ({
  useDataTable: () => mockUseDataTable(),
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// Mock CustomDataTable - render columns directly for easier testing
vi.mock('src/components/shared/CustomDataTable', () => ({
  default: ({ columns, dataRes }: any) => (
    <div data-testid="data-table">
      {dataRes?.rows?.map((row: any, rowIndex: number) => (
        <div key={row.id} data-testid={`row-${rowIndex}`}>
          {columns.map((col: any) => {
            if (!col.options?.customBodyRender) return null;
            const value = col.name?.split('.').reduce((obj: any, key: string) => obj?.[key], row);
            return (
              <div key={col.name || col.label} data-testid={`col-${col.label}`}>
                {col.options.customBodyRender(value, { rowIndex })}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('src/components/container/PageContainer', () => ({
  default: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('src/utils/tableColumnUtils', () => ({
  createNestedColumn: (name: string, label: string) => ({
    name,
    label,
    options: { customBodyRender: (v: any) => v },
  }),
}));

const makeAssignment = (
  overrides: Partial<PortalExerciseAssignment> = {}
): PortalExerciseAssignment => ({
  id: 1,
  patientId: 1,
  exerciseConfigId: 1,
  assignedBy: 1,
  assignedAt: '2024-01-01T00:00:00Z',
  status: 'active',
  sessionsCompleted: 5,
  complianceStatus: 'on_track',
  notificationCount: 0,
  currentLevel: 1,
  autoAdjustLevel: false,
  centerId: 1,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  exerciseConfig: {
    exerciseId: 1,
    frequency: 'daily',
    executionCount: 3,
    eye: 'both',
    exercise: { id: 1, name: 'Game 2048', code: 'game2048', exerciseType: '2048' },
  },
  compliancePercentage: 80,
  ...overrides,
});

const renderPage = (rows: PortalExerciseAssignment[] = []) => {
  mockUseDataTable.mockReturnValue({
    dataRes: { rows, count: rows.length, page: 1, limit: 10, totalPages: 1 },
    tableState: {},
    onTableChange: vi.fn(),
    loading: false,
  });

  return render(
    <BrowserRouter>
      <ActiveSessionsPage />
    </BrowserRouter>
  );
};

describe('ActiveSessionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Cột Trạng thái', () => {
    it('hiển thị "Đã hoàn thành" khi currentSession.status === completed', () => {
      renderPage([
        makeAssignment({
          currentSession: {
            id: 10,
            status: 'completed',
            executionsCompleted: 3,
            validExecutions: 3,
            validityPercentage: 100,
            totalScore: 300,
            averageScore: 100,
            bestScore: 120,
            createdAt: '',
            updatedAt: '',
          },
        }),
      ]);
      expect(screen.getByText('Đã hoàn thành')).toBeInTheDocument();
    });

    it('hiển thị "Chưa hoàn thành" khi currentSession.status === incomplete', () => {
      renderPage([
        makeAssignment({
          currentSession: {
            id: 10,
            status: 'incomplete',
            executionsCompleted: 1,
            validExecutions: 1,
            validityPercentage: 33,
            totalScore: 100,
            averageScore: 100,
            bestScore: 100,
            createdAt: '',
            updatedAt: '',
          },
        }),
      ]);
      expect(screen.getByText('Chưa hoàn thành')).toBeInTheDocument();
    });

    it('hiển thị "Chưa hoàn thành" khi không có currentSession', () => {
      renderPage([makeAssignment({ currentSession: undefined })]);
      expect(screen.getByText('Chưa hoàn thành')).toBeInTheDocument();
    });
  });

  describe('Cột % Tuân thủ', () => {
    it('hiển thị % từ compliancePercentage', () => {
      renderPage([makeAssignment({ compliancePercentage: 75 })]);
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('hiển thị "-" khi compliancePercentage là null', () => {
      renderPage([makeAssignment({ compliancePercentage: null })]);
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('hiển thị "-" khi compliancePercentage là undefined', () => {
      renderPage([makeAssignment({ compliancePercentage: undefined })]);
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('hiển thị 100%', () => {
      renderPage([makeAssignment({ compliancePercentage: 100 })]);
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('hiển thị 0%', () => {
      renderPage([makeAssignment({ compliancePercentage: 0 })]);
      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });

  describe('Nút Thực hiện', () => {
    it('disabled khi session đã completed', () => {
      renderPage([
        makeAssignment({
          currentSession: {
            id: 10,
            status: 'completed',
            executionsCompleted: 3,
            validExecutions: 3,
            validityPercentage: 100,
            totalScore: 300,
            averageScore: 100,
            bestScore: 120,
            createdAt: '',
            updatedAt: '',
          },
        }),
      ]);
      const btn = screen.getByRole('button', { name: /Thực hiện/i });
      expect(btn).toBeDisabled();
    });

    it('enabled khi session là incomplete', () => {
      renderPage([
        makeAssignment({
          currentSession: {
            id: 10,
            status: 'incomplete',
            executionsCompleted: 1,
            validExecutions: 1,
            validityPercentage: 33,
            totalScore: 100,
            averageScore: 100,
            bestScore: 100,
            createdAt: '',
            updatedAt: '',
          },
        }),
      ]);
      const btn = screen.getByRole('button', { name: /Thực hiện/i });
      expect(btn).not.toBeDisabled();
    });

    it('disabled khi không có currentSession', () => {
      renderPage([makeAssignment({ currentSession: undefined })]);
      const btn = screen.getByRole('button', { name: /Thực hiện/i });
      expect(btn).toBeDisabled();
    });

    it('navigate đúng path khi click Thực hiện', async () => {
      const user = userEvent.setup();
      renderPage([
        makeAssignment({
          id: 42,
          currentSession: {
            id: 99,
            status: 'incomplete',
            executionsCompleted: 1,
            validExecutions: 1,
            validityPercentage: 33,
            totalScore: 100,
            averageScore: 100,
            bestScore: 100,
            createdAt: '',
            updatedAt: '',
          },
        }),
      ]);
      await user.click(screen.getByRole('button', { name: /Thực hiện/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/portal/exercise/assignments/42/sessions/99');
    });
  });

  describe('Nút Lịch sử', () => {
    it('navigate đúng path khi click Lịch sử', async () => {
      const user = userEvent.setup();
      renderPage([makeAssignment({ id: 7 })]);
      await user.click(screen.getByRole('button', { name: /Lịch sử/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/portal/assignments/7/sessions');
    });
  });

  describe('Hiển thị nhiều rows', () => {
    it('render đúng số rows', () => {
      renderPage([
        makeAssignment({ id: 1, compliancePercentage: 90 }),
        makeAssignment({ id: 2, compliancePercentage: 40 }),
        makeAssignment({ id: 3, compliancePercentage: 60 }),
      ]);
      expect(screen.getByText('90%')).toBeInTheDocument();
      expect(screen.getByText('40%')).toBeInTheDocument();
      expect(screen.getByText('60%')).toBeInTheDocument();
    });
  });
});
