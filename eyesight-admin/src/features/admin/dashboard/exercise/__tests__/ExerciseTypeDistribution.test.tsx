import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import ExerciseTypeDistribution, {
  computeBoxHeight,
  MAX_VISIBLE_HEIGHT,
  BAR_HEIGHT,
} from '../ExerciseTypeDistribution';

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  global.ResizeObserver = ResizeObserverMock as any;
});

// #25 — distribution rows keyed by exerciseType (BU-spec contract: { exerciseType, count }).
const mockData = [
  { exerciseType: '2048', count: 80 },
  { exerciseType: 'stereopsis', count: 60 },
  { exerciseType: 'memory', count: 40 },
  { exerciseType: 'color', count: 25 },
  { exerciseType: 'reflex', count: 15 },
  { exerciseType: 'balance', count: 10 },
  { exerciseType: 'focus', count: 8 },
];

describe('ExerciseTypeDistribution', () => {
  it('renders loading state', () => {
    render(<ExerciseTypeDistribution data={[]} loading={true} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders empty state when no data', () => {
    render(<ExerciseTypeDistribution data={[]} loading={false} />);
    expect(screen.getByText('Chưa có dữ liệu')).toBeInTheDocument();
  });

  it('renders title and subtitle', () => {
    render(<ExerciseTypeDistribution data={mockData} loading={false} />);
    expect(screen.getByText('Phân Bổ Bài Tập')).toBeInTheDocument();
    expect(screen.getByText('Thống kê theo loại bài tập')).toBeInTheDocument();
  });

  it('mounts the chart container when data is present', () => {
    const { container } = render(<ExerciseTypeDistribution data={mockData} loading={false} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });

  it('does not render pie chart', () => {
    const { container } = render(<ExerciseTypeDistribution data={mockData} loading={false} />);
    expect(container.querySelector('.recharts-pie')).not.toBeInTheDocument();
  });

  it('accepts all items without slicing — no old slice(0,6) limit', () => {
    expect(() =>
      render(<ExerciseTypeDistribution data={mockData} loading={false} />),
    ).not.toThrow();
  });

  it('renders with single item without crashing', () => {
    render(
      <ExerciseTypeDistribution
        data={[{ exerciseType: 'single', count: 5 }]}
        loading={false}
      />,
    );
    expect(screen.getByText('Phân Bổ Bài Tập')).toBeInTheDocument();
  });

  it('does not render chart container when data is empty', () => {
    const { queryByTestId } = render(<ExerciseTypeDistribution data={[]} loading={false} />);
    expect(queryByTestId('chart-scroll-box')).not.toBeInTheDocument();
  });
});

describe('computeBoxHeight (height cap logic)', () => {
  it('caps at MAX_VISIBLE_HEIGHT when content exceeds it', () => {
    const result = computeBoxHeight(20); // 20 × 40 = 800 → capped at 400
    expect(result).toBe(MAX_VISIBLE_HEIGHT);
  });

  it('returns content height when under MAX_VISIBLE_HEIGHT', () => {
    // 6 × 40 = 240 — above the 200px minimum, below the 400px cap
    const result = computeBoxHeight(6);
    expect(result).toBe(6 * BAR_HEIGHT);
    expect(result).toBeLessThan(MAX_VISIBLE_HEIGHT);
  });

  it('uses minimum of 200px when count is 0', () => {
    expect(computeBoxHeight(0)).toBe(200);
  });

  it('uses minimum of 200px when count × BAR_HEIGHT < 200', () => {
    const result = computeBoxHeight(1); // 1 × 40 = 40 → min 200
    expect(result).toBe(200);
  });

  it('boundary: exactly at MAX_VISIBLE_HEIGHT returns MAX_VISIBLE_HEIGHT', () => {
    const exactItems = MAX_VISIBLE_HEIGHT / BAR_HEIGHT; // 400 / 40 = 10
    expect(computeBoxHeight(exactItems)).toBe(MAX_VISIBLE_HEIGHT);
  });
});
