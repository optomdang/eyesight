import { beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ExerciseSessionProgressChart from '../ExerciseSessionProgressChart';

// Mock recharts: expose the `data` array passed to each ComposedChart so we can
// assert the computed metrics (the 4 công thức) directly.
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  ComposedChart: ({ data, children }: any) => (
    <div data-testid="composed-chart" data-points={JSON.stringify(data)}>
      {children}
    </div>
  ),
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Legend: () => null,
  Bar: ({ children }: any) => <div data-testid="bar">{children}</div>,
  Line: ({ dataKey }: any) => <div data-testid="line" data-key={dataKey} />,
  LabelList: ({ dataKey }: any) => <div data-testid="labellist" data-key={dataKey} />,
  Cell: () => null,
}));

const theme = createTheme();
const renderChart = (sessions: any[]) =>
  render(
    <ThemeProvider theme={theme}>
      <ExerciseSessionProgressChart sessions={sessions} />
    </ThemeProvider>
  );

/** Parse the data-points JSON from the Nth composed chart (default first). */
const pointsOf = (idx = 0) => {
  const charts = screen.getAllByTestId('composed-chart');
  return JSON.parse(charts[idx].getAttribute('data-points') || '[]');
};

const makeSession = (over: any = {}) => ({
  id: 1,
  exerciseAssignmentId: 101,
  completedAt: '2026-02-10T08:00:00Z',
  averageScore: 220,
  duration: 1620, // 27 min active
  executionDuration: 10, // phút/lượt
  executionCount: 5, // lượt yêu cầu → 50 min required
  focusScore: 95,
  visionLevel: 14,
  exerciseAssignment: {
    exerciseConfig: { id: 1, name: 'Config xa', visionType: 'far', eye: 'left', frequency: 'daily' },
  },
  ...over,
});

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  global.ResizeObserver = ResizeObserverMock as never;
});

describe('ExerciseSessionProgressChart — 4 công thức', () => {
  it('Chỉ số 1: điểm trung bình lấy từ session.averageScore', () => {
    renderChart([makeSession({ averageScore: 220 })]);
    expect(pointsOf()[0].averageScore).toBe(220);
  });

  it('Chỉ số 2: timePercent = duration / (executionDuration×executionCount×60) (ví dụ 27/50 = 54%)', () => {
    renderChart([makeSession({ duration: 1620, executionDuration: 10, executionCount: 5 })]);
    expect(pointsOf()[0].timePercent).toBe(54);
  });

  it('Chỉ số 2: KHÔNG cap — vượt 100% giữ giá trị thật (lộ bug)', () => {
    renderChart([makeSession({ duration: 3300, executionDuration: 10, executionCount: 5 })]);
    expect(pointsOf()[0].timePercent).toBe(110);
  });

  it('Chỉ số 2: null khi thiếu snapshot (không chia cho 0)', () => {
    renderChart([makeSession({ executionDuration: null, executionCount: null })]);
    expect(pointsOf()[0].timePercent).toBeNull();
  });

  it('Chỉ số 3: tập trung lấy từ session.focusScore', () => {
    renderChart([makeSession({ focusScore: 88 })]);
    expect(pointsOf()[0].focusScore).toBe(88);
  });

  it('Chỉ số 4: độ khó định dạng theo visionType (far, level 14 → 20/20)', () => {
    renderChart([makeSession({ visionType: 'far', visionLevel: 14 })]);
    expect(pointsOf()[0].difficultyLabel).toBe('20/20');
  });

  it('Chỉ số 4: visionLevel null → "-"', () => {
    renderChart([makeSession({ visionLevel: null })]);
    expect(pointsOf()[0].difficultyLabel).toBe('-');
  });

  it('Chỉ số 4: stereopsis → "Lv N"', () => {
    renderChart([
      makeSession({
        visionLevel: 3,
        exerciseAssignment: {
          exerciseConfig: { id: 9, name: 'Lập thể', visionType: 'stereopsis', eye: 'both', frequency: 'daily' },
        },
      }),
    ]);
    expect(pointsOf()[0].difficultyLabel).toBe('Lv 3');
  });
});

describe('ExerciseSessionProgressChart — small multiples & states', () => {
  it('mỗi assignment → 1 biểu đồ con', () => {
    renderChart([
      makeSession({ id: 1, exerciseAssignmentId: 101 }),
      makeSession({
        id: 2,
        exerciseAssignmentId: 202,
        exerciseAssignment: {
          exerciseConfig: { id: 2, name: 'Config gần', visionType: 'near', eye: 'right', frequency: 'weekly' },
        },
      }),
    ]);
    expect(screen.getAllByTestId('composed-chart')).toHaveLength(2);
  });

  it('nhãn mắt ưu tiên trainingEye trên assignment (không dùng config.eye)', () => {
    renderChart([
      makeSession({
        exerciseAssignment: {
          trainingEye: 'right',
          exerciseConfig: {
            id: 1,
            name: '2048 – N',
            visionType: 'near',
            eye: 'both',
            frequency: 'daily',
          },
        },
      }),
    ]);
    expect(screen.getByText('2048 – N — Mắt phải')).toBeInTheDocument();
    expect(screen.queryByText(/Cả hai mắt/)).not.toBeInTheDocument();
  });

  it('gom nhiều session cùng assignment vào 1 biểu đồ, sắp theo thời gian', () => {
    renderChart([
      makeSession({ id: 2, completedAt: '2026-03-01T08:00:00Z', averageScore: 300 }),
      makeSession({ id: 1, completedAt: '2026-02-01T08:00:00Z', averageScore: 100 }),
    ]);
    const charts = screen.getAllByTestId('composed-chart');
    expect(charts).toHaveLength(1);
    const pts = pointsOf();
    expect(pts.map((p: any) => p.averageScore)).toEqual([100, 300]); // sorted asc
  });

  it('bỏ qua session chưa completed (completedAt null)', () => {
    renderChart([makeSession({ completedAt: null })]);
    expect(screen.queryByTestId('composed-chart')).toBeNull();
    expect(screen.getByText('Chưa có dữ liệu phiên bài tập.')).toBeInTheDocument();
  });

  it('empty input → thông báo trống', () => {
    renderChart([]);
    expect(screen.getByText('Chưa có dữ liệu phiên bài tập.')).toBeInTheDocument();
  });
});
