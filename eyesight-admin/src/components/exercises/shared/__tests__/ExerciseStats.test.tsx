/**
 * Unit Tests for ExerciseStats Component
 * Tests rendering with various props and variants
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ExerciseStats from '../ExerciseStats';

describe('ExerciseStats Component', () => {
  describe('Basic Rendering', () => {
    it('should render score, duration, and moves', () => {
      render(<ExerciseStats score={100} moves={50} duration={120} />);

      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument();
      expect(screen.getByText('2:00')).toBeInTheDocument(); // 120 seconds = 2:00
    });

    it('should render labels by default', () => {
      render(<ExerciseStats score={100} moves={50} duration={120} />);

      expect(screen.getByText('Điểm')).toBeInTheDocument();
      expect(screen.getByText('Thời gian')).toBeInTheDocument();
      expect(screen.getByText('Nước đi')).toBeInTheDocument();
    });

    it('should hide labels when showLabels is false', () => {
      render(<ExerciseStats score={100} moves={50} duration={120} showLabels={false} />);

      expect(screen.queryByText('Điểm')).not.toBeInTheDocument();
      expect(screen.queryByText('Thời gian')).not.toBeInTheDocument();
      expect(screen.queryByText('Nước đi')).not.toBeInTheDocument();
    });
  });

  describe('Duration Formatting', () => {
    it('should format duration with leading zeros for seconds', () => {
      render(<ExerciseStats score={0} moves={0} duration={65} />);
      expect(screen.getByText('1:05')).toBeInTheDocument();
    });

    it('should format zero duration correctly', () => {
      render(<ExerciseStats score={0} moves={0} duration={0} />);
      expect(screen.getByText('0:00')).toBeInTheDocument();
    });

    it('should format large duration correctly', () => {
      render(<ExerciseStats score={0} moves={0} duration={3661} />); // 61 minutes 1 second
      expect(screen.getByText('61:01')).toBeInTheDocument();
    });

    it('should format duration under 1 minute correctly', () => {
      render(<ExerciseStats score={0} moves={0} duration={45} />);
      expect(screen.getByText('0:45')).toBeInTheDocument();
    });
  });

  describe('Variant Rendering', () => {
    it('should render horizontal variant by default', () => {
      const { container } = render(<ExerciseStats score={100} moves={50} duration={120} />);

      // Check flex direction is row (horizontal)
      const flexContainer = container.firstChild as HTMLElement;
      expect(flexContainer).toHaveStyle({ flexDirection: 'row' });
    });

    it('should render vertical variant when specified', () => {
      const { container } = render(
        <ExerciseStats score={100} moves={50} duration={120} variant="vertical" />
      );

      const flexContainer = container.firstChild as HTMLElement;
      expect(flexContainer).toHaveStyle({ flexDirection: 'column' });
    });
  });

  describe('Size Variants', () => {
    it('should render with medium size by default', () => {
      render(<ExerciseStats score={100} moves={50} duration={120} />);

      // Values should be rendered (size affects typography variant internally)
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('should render with small size', () => {
      render(<ExerciseStats score={100} moves={50} duration={120} size="small" />);
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('should render with large size', () => {
      render(<ExerciseStats score={100} moves={50} duration={120} size="large" />);
      expect(screen.getByText('100')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero values', () => {
      render(<ExerciseStats score={0} moves={0} duration={0} />);

      // Both score and moves are 0, so we should have two '0' elements
      const zeros = screen.getAllByText('0');
      expect(zeros).toHaveLength(2); // score and moves
      expect(screen.getByText('0:00')).toBeInTheDocument(); // duration
    });

    it('should handle large numbers', () => {
      render(<ExerciseStats score={999999} moves={10000} duration={36000} />);

      expect(screen.getByText('999999')).toBeInTheDocument();
      expect(screen.getByText('10000')).toBeInTheDocument();
      expect(screen.getByText('600:00')).toBeInTheDocument(); // 36000 seconds = 600 minutes
    });
  });
});
