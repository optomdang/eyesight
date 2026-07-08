import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import ExerciseComplianceByType, {
  getBarColor,
  computeBoxHeight,
  MAX_VISIBLE_HEIGHT,
  BAR_HEIGHT,
} from '../ExerciseComplianceByType';

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  global.ResizeObserver = ResizeObserverMock as any;
});

// #26 — compliance rows keyed by exerciseType (BU-spec contract: assigned/completed, not pass/fail).
const mockData = [
  { exerciseType: '2048', assigned: 100, completed: 85, complianceRate: 85 },
  { exerciseType: 'stereopsis', assigned: 80, completed: 52, complianceRate: 65 },
  { exerciseType: 'memory', assigned: 60, completed: 24, complianceRate: 40 },
  { exerciseType: 'color', assigned: 40, completed: 30, complianceRate: 75 },
];

describe('ExerciseComplianceByType', () => {
  it('renders loading state', () => {
    render(<ExerciseComplianceByType data={[]} loading={true} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders empty state when no data', () => {
    render(<ExerciseComplianceByType data={[]} loading={false} />);
    expect(screen.getByText('Chưa có dữ liệu')).toBeInTheDocument();
  });

  it('renders title and subtitle', () => {
    render(<ExerciseComplianceByType data={mockData} loading={false} />);
    expect(screen.getByText('Tuân Thủ Theo Loại Bài Tập')).toBeInTheDocument();
    expect(
      screen.getByText('% hoàn thành buổi tập được giao theo từng loại bài tập'),
    ).toBeInTheDocument();
  });

  it('mounts chart container when data is present', () => {
    const { container } = render(<ExerciseComplianceByType data={mockData} loading={false} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });

  it('does not render chart container when data is empty', () => {
    const { queryByTestId } = render(<ExerciseComplianceByType data={[]} loading={false} />);
    expect(queryByTestId('chart-scroll-box')).not.toBeInTheDocument();
  });

  it('handles complianceRate = 0 without crashing', () => {
    expect(() =>
      render(
        <ExerciseComplianceByType
          data={[
            {
              exerciseType: 'nobody',
              assigned: 50,
              completed: 0,
              complianceRate: 0,
            },
          ]}
          loading={false}
        />,
      ),
    ).not.toThrow();
  });

  it('handles complianceRate = 100 without crashing', () => {
    expect(() =>
      render(
        <ExerciseComplianceByType
          data={[
            {
              exerciseType: 'perfect',
              assigned: 50,
              completed: 50,
              complianceRate: 100,
            },
          ]}
          loading={false}
        />,
      ),
    ).not.toThrow();
  });

  it('renders with single item without crashing', () => {
    render(
      <ExerciseComplianceByType
        data={[
          { exerciseType: 'single', assigned: 10, completed: 8, complianceRate: 80 },
        ]}
        loading={false}
      />,
    );
    expect(screen.getByText('Tuân Thủ Theo Loại Bài Tập')).toBeInTheDocument();
  });
});

describe('getBarColor (color threshold logic)', () => {
  it('returns green (#13DEB9) for rate >= 75', () => {
    expect(getBarColor(75)).toBe('#13DEB9');
    expect(getBarColor(85)).toBe('#13DEB9');
    expect(getBarColor(100)).toBe('#13DEB9');
  });

  it('returns yellow (#FFAE1F) for rate >= 50 and < 75', () => {
    expect(getBarColor(50)).toBe('#FFAE1F');
    expect(getBarColor(65)).toBe('#FFAE1F');
    expect(getBarColor(74)).toBe('#FFAE1F');
  });

  it('returns red (#FA896B) for rate < 50', () => {
    expect(getBarColor(0)).toBe('#FA896B');
    expect(getBarColor(40)).toBe('#FA896B');
    expect(getBarColor(49)).toBe('#FA896B');
  });

  it('boundary: 75 is green not yellow', () => {
    expect(getBarColor(75)).toBe('#13DEB9');
    expect(getBarColor(74.9)).toBe('#FFAE1F');
  });

  it('boundary: 50 is yellow not red', () => {
    expect(getBarColor(50)).toBe('#FFAE1F');
    expect(getBarColor(49.9)).toBe('#FA896B');
  });
});

describe('computeBoxHeight (height cap logic)', () => {
  it('caps at MAX_VISIBLE_HEIGHT when content exceeds it', () => {
    const result = computeBoxHeight(20); // 20 × 44 = 880 → capped at 480
    expect(result).toBe(MAX_VISIBLE_HEIGHT);
  });

  it('returns content height when under MAX_VISIBLE_HEIGHT', () => {
    // 5 × 44 = 220 — above the 200px minimum, below the 480px cap
    const result = computeBoxHeight(5);
    expect(result).toBe(5 * BAR_HEIGHT);
    expect(result).toBeLessThan(MAX_VISIBLE_HEIGHT);
  });

  it('uses minimum of 200px when count is 0', () => {
    expect(computeBoxHeight(0)).toBe(200);
  });

  it('uses minimum of 200px when count × BAR_HEIGHT < 200', () => {
    const result = computeBoxHeight(1); // 1 × 44 = 44 → min 200
    expect(result).toBe(200);
  });

  it('boundary: content exactly at MAX_VISIBLE_HEIGHT', () => {
    const exactItems = Math.floor(MAX_VISIBLE_HEIGHT / BAR_HEIGHT); // floor(480/44) = 10
    const result = computeBoxHeight(exactItems); // 10 × 44 = 440 < 480
    expect(result).toBeLessThanOrEqual(MAX_VISIBLE_HEIGHT);
  });
});
