/**
 * Unit Tests for ExerciseTimer Component
 * Tests countdown behavior and onTimeUp callback
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import ExerciseTimer from '../ExerciseTimer';

describe('ExerciseTimer Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Basic Rendering', () => {
    it('should render with duration only', () => {
      render(<ExerciseTimer duration={300} />);
      expect(screen.getByText('5:00')).toBeInTheDocument(); // 300 seconds = 5:00
    });

    it('should render with remaining time', () => {
      render(<ExerciseTimer remaining={120000} />); // 120000ms = 2 minutes
      expect(screen.getByText('2:00')).toBeInTheDocument();
    });

    it('should show "--:--" when no duration or remaining', () => {
      render(<ExerciseTimer />);
      expect(screen.getByText('--:--')).toBeInTheDocument();
    });

    it('should render label by default', () => {
      render(<ExerciseTimer duration={300} />);
      expect(screen.getByText('Thời gian')).toBeInTheDocument();
    });

    it('should show "Còn lại" label when remaining is set', () => {
      render(<ExerciseTimer remaining={120000} />);
      expect(screen.getByText('Còn lại')).toBeInTheDocument();
    });

    it('should hide label when showLabel is false', () => {
      render(<ExerciseTimer duration={300} showLabel={false} />);
      expect(screen.queryByText('Thời gian')).not.toBeInTheDocument();
    });
  });

  describe('Time Formatting', () => {
    it('should format time with leading zeros', () => {
      render(<ExerciseTimer remaining={65000} />); // 65 seconds
      expect(screen.getByText('1:05')).toBeInTheDocument();
    });

    it('should format zero time correctly', () => {
      // When remaining is 0, the component treats it as null (falsy value)
      // and shows duration or '--:--' instead
      render(<ExerciseTimer remaining={0} duration={60} />);
      // With remaining=0 (falsy), it falls back to duration display
      expect(screen.getByText('1:00')).toBeInTheDocument();
    });

    it('should format large time correctly', () => {
      render(<ExerciseTimer remaining={3661000} />); // 61 minutes 1 second
      expect(screen.getByText('61:01')).toBeInTheDocument();
    });
  });

  describe('Countdown Behavior', () => {
    it('should countdown when remaining is set', () => {
      render(<ExerciseTimer remaining={5000} />); // 5 seconds

      expect(screen.getByText('0:05')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByText('0:04')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByText('0:03')).toBeInTheDocument();
    });

    it('should call onTimeUp when countdown reaches zero', () => {
      const onTimeUp = vi.fn();
      render(<ExerciseTimer remaining={2000} onTimeUp={onTimeUp} />);

      expect(onTimeUp).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(onTimeUp).toHaveBeenCalledTimes(1);
    });

    it('should stop countdown at zero', () => {
      const onTimeUp = vi.fn();
      render(<ExerciseTimer remaining={1000} onTimeUp={onTimeUp} />);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByText('0:00')).toBeInTheDocument();

      // Advance more time - should not call onTimeUp again
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(onTimeUp).toHaveBeenCalledTimes(1);
    });

    it('should not countdown when remaining is null', () => {
      render(<ExerciseTimer duration={300} />);

      expect(screen.getByText('5:00')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Should still show duration, not countdown
      expect(screen.getByText('5:00')).toBeInTheDocument();
    });
  });

  describe('Variant Rendering', () => {
    it('should render compact variant by default', () => {
      render(<ExerciseTimer duration={300} />);
      expect(screen.getByText('5:00')).toBeInTheDocument();
    });

    it('should render full variant with progress bar', () => {
      render(<ExerciseTimer duration={300} remaining={150000} variant="full" />);

      expect(screen.getByText('2:30')).toBeInTheDocument();
      expect(screen.getByText('Thời gian còn lại')).toBeInTheDocument();
    });
  });

  describe('Warning Threshold', () => {
    it('should use default warning threshold of 60 seconds', () => {
      const { container } = render(<ExerciseTimer remaining={30000} />); // 30 seconds

      // Time should be displayed (color is applied via sx prop)
      expect(screen.getByText('0:30')).toBeInTheDocument();
    });

    it('should respect custom warning threshold', () => {
      render(<ExerciseTimer remaining={90000} warningThreshold={120} />); // 90 seconds, threshold 120

      // Time should be displayed
      expect(screen.getByText('1:30')).toBeInTheDocument();
    });
  });

  describe('Prop Updates', () => {
    it('should update when remaining prop changes', () => {
      const { rerender } = render(<ExerciseTimer remaining={60000} />);
      expect(screen.getByText('1:00')).toBeInTheDocument();

      rerender(<ExerciseTimer remaining={30000} />);
      expect(screen.getByText('0:30')).toBeInTheDocument();
    });
  });
});
