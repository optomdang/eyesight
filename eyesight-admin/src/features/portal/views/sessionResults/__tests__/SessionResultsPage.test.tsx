import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SessionResultsPage from '../SessionResultsPage';

const mockGetData = vi.fn();

vi.mock('src/utils/request', () => ({
  getData: (...args: unknown[]) => mockGetData(...args),
}));

vi.mock('src/components/shared/PortalBreadcrumb', () => ({
  default: () => <div data-testid="portal-breadcrumb" />,
}));

vi.mock('src/components/shared/CustomDataTable', () => ({
  default: ({ title, columns, dataRes }: any) => (
    <div data-testid="custom-data-table">
      <div>{title}</div>
      <div data-testid="column-labels">
        {columns.map((col: any) => (
          <span key={col.name || col.label}>{col.label}</span>
        ))}
      </div>
      <div data-testid="cell-values">
        {columns.map((col: any) => {
          if (!col.options?.customBodyRenderLite || !dataRes?.rows?.length) return null;
          return (
            <span key={`cell-${col.name}`} data-testid={`cell-${col.name}`}>
              {col.options.customBodyRenderLite(0)}
            </span>
          );
        })}
      </div>
      <div data-testid="rows-count">{dataRes?.rows?.length ?? 0}</div>
    </div>
  ),
}));

vi.mock('src/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback || _key,
  }),
}));

describe('SessionResultsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = () =>
    render(
      <MemoryRouter initialEntries={['/portal/assignments/42/sessions/99/results']}>
        <Routes>
          <Route
            path="/portal/assignments/:assignmentId/sessions/:sessionId/results"
            element={<SessionResultsPage />}
          />
        </Routes>
      </MemoryRouter>
    );

  it('renders session-level summary and attempt-level labels for BUG-09', async () => {
    mockGetData.mockImplementation(async (url: string) => {
      if (url.includes('/sessions?page=1&limit=100')) {
        return {
          rows: [
            {
              id: 99,
              status: 'completed',
              validExecutions: 2,
              executionsCompleted: 3,
              executionDuration: 10,
              exerciseAssignment: {
                exerciseConfig: {
                  executionCount: 3,
                  duration: 10,
                },
              },
            },
          ],
        };
      }

      return {
        rows: [
          {
            id: 1,
            status: 'completed',
            score: 123,
            accuracy: 0.5,
            duration: 600,
            focusScore: 95,
            createdAt: '2026-04-05T08:00:00.000Z',
          },
        ],
        count: 1,
        totalPages: 1,
      };
    });

    renderPage();

    expect(await screen.findByText('Trạng thái phiên: Hoàn thành')).toBeInTheDocument();
    expect(screen.getByText('Tiến độ hợp lệ: 2/3')).toBeInTheDocument();
    expect(screen.getByText('Tổng lần đã chơi: 3')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Bảng dưới là kết quả theo từng lần chơi; trạng thái phiên tổng được hiển thị ở phần tóm tắt phía trên.'
      )
    ).toBeInTheDocument();

    expect(screen.getByText('% hoàn thành')).toBeInTheDocument();
    expect(screen.getByText('% tập trung')).toBeInTheDocument();
    expect(screen.getByTestId('cell-completionPct')).toHaveTextContent('100%');
    expect(screen.getByTestId('cell-focusScore')).toHaveTextContent('95%');
    expect(screen.getByTestId('rows-count')).toHaveTextContent('1');

    await waitFor(() => {
      expect(mockGetData).toHaveBeenCalledWith('me/assignments/42/sessions?page=1&limit=100');
      expect(mockGetData).toHaveBeenCalledWith(
        'me/assignments/42/sessions/99/results?page=1&limit=10'
      );
    });
  });

  it('does not render summary block when session summary cannot be resolved', async () => {
    mockGetData.mockImplementation(async (url: string) => {
      if (url.includes('/sessions?page=1&limit=100')) {
        return {
          rows: [
            {
              id: 1000,
              status: 'incomplete',
              validExecutions: 1,
              executionsCompleted: 1,
              exerciseAssignment: {
                exerciseConfig: {
                  executionCount: 3,
                },
              },
            },
          ],
        };
      }

      return {
        rows: [],
        count: 0,
        totalPages: 0,
      };
    });

    renderPage();

    await screen.findByTestId('custom-data-table');

    expect(screen.queryByText(/Trạng thái phiên:/)).not.toBeInTheDocument();
    expect(
      screen.getByText(
        'Bảng dưới là kết quả theo từng lần chơi; trạng thái phiên tổng được hiển thị ở phần tóm tắt phía trên.'
      )
    ).toBeInTheDocument();
  });
});
