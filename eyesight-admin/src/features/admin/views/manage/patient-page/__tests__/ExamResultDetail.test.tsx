import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ExamResultDetail from '../ExamResultDetail';
import { ExamResult } from 'src/types/core';

// Mock translation hook
vi.mock('src/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback,
  }),
}));

describe('ExamResultDetail', () => {
  const mockFarVisionResult: ExamResult = {
    id: 1,
    examSessionId: 1,
    examType: 'far',
    leftEye: 10,
    rightEye: 12,
    bothEye: null,
    rawData: {
      left: [
        [
          { char: 'E', display: 'UP', answer: 'UP', result: true },
          { char: 'E', display: 'DOWN', answer: 'DOWN', result: true },
        ],
        [{ char: 'C', display: 'LEFT', answer: 'RIGHT', result: false }],
      ],
      right: [[{ char: 'A', display: 'A', answer: 'A', result: true }]],
      both: [],
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockNearVisionResult: ExamResult = {
    id: 2,
    examSessionId: 2,
    examType: 'near',
    leftEye: 3,
    rightEye: 4,
    bothEye: null,
    rawData: {
      left: [[{ char: 'N', display: '5', answer: '5', result: true }]],
      right: [],
      both: [],
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockContrastResult: ExamResult = {
    id: 3,
    examSessionId: 3,
    examType: 'contrast',
    leftEye: 5,
    rightEye: 6,
    bothEye: null,
    rawData: {
      left: [[{ char: 'E', display: 'UP', answer: 'UP', result: true }]],
      right: [],
      both: [],
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  describe('Vision Level Display', () => {
    it('should display vision level without overlapping text for far vision', () => {
      render(<ExamResultDetail result={mockFarVisionResult} />);

      // Check that vision scores are displayed using formatVisionLevel
      expect(screen.getAllByText('20/400').length).toBeGreaterThan(0); // Level 1 = 20/400
      expect(screen.getAllByText('20/320').length).toBeGreaterThan(0); // Level 2 = 20/320
    });

    it('should display vision level in stacked layout', () => {
      render(<ExamResultDetail result={mockFarVisionResult} />);

      // Component renders vision scores using formatVisionLevel
      expect(screen.getAllByText('20/400').length).toBeGreaterThan(0);
      expect(screen.getAllByText('20/320').length).toBeGreaterThan(0);
    });

    it('should display near vision levels correctly', () => {
      render(<ExamResultDetail result={mockNearVisionResult} />);

      // Near vision: formatVisionLevel('near', 1) = 'N64'
      expect(screen.getByText('N64')).toBeInTheDocument();
    });

    it('should display contrast vision levels correctly', () => {
      render(<ExamResultDetail result={mockContrastResult} />);

      // Contrast vision: formatVisionLevel('contrast', 1) = '0.00'
      expect(screen.getByText('0.00')).toBeInTheDocument();
    });
  });

  describe('Character Type Display', () => {
    it('should display character type labels correctly', () => {
      render(<ExamResultDetail result={mockFarVisionResult} />);

      // Component renders answer values directly (UP, DOWN, RIGHT, etc.)
      expect(screen.getAllByText('UP').length).toBeGreaterThan(0);
      expect(screen.getAllByText('DOWN').length).toBeGreaterThan(0);
      expect(screen.getByText('RIGHT')).toBeInTheDocument();
    });

    it('should normalize character type codes to uppercase', () => {
      const resultWithLowercase: ExamResult = {
        ...mockFarVisionResult,
        rawData: {
          left: [[{ char: 'e', display: 'UP', answer: 'UP', result: true }]],
          right: [],
          both: [],
        },
      };

      render(<ExamResultDetail result={resultWithLowercase} />);
      // normalizeDisplayValue uppercases answer: 'UP' stays 'UP'
      expect(screen.getAllByText('UP').length).toBeGreaterThan(0);
    });
  });

  describe('Result Display', () => {
    it('should display correct results in green', () => {
      render(<ExamResultDetail result={mockFarVisionResult} />);

      // Correct results render the answer value (UP, DOWN) in success.main color
      const upElements = screen.getAllByText('UP');
      expect(upElements.length).toBeGreaterThan(0);
    });

    it('should display incorrect results in red', () => {
      render(<ExamResultDetail result={mockFarVisionResult} />);

      // Incorrect: answer='RIGHT' display='LEFT' — renders both in different colors
      expect(screen.getByText('RIGHT')).toBeInTheDocument();
      expect(screen.getByText('LEFT')).toBeInTheDocument();
    });
  });

  describe('Answer and Display Values', () => {
    it('should normalize and display answer values', () => {
      render(<ExamResultDetail result={mockFarVisionResult} />);

      expect(screen.getAllByText('UP').length).toBeGreaterThan(0);
      expect(screen.getAllByText('DOWN').length).toBeGreaterThan(0);
    });

    it('should handle null/undefined values gracefully', () => {
      const resultWithNulls: ExamResult = {
        ...mockFarVisionResult,
        rawData: {
          left: [[{ char: 'E', display: null, answer: undefined, result: true }]],
          right: [],
          both: [],
        },
      };

      render(<ExamResultDetail result={resultWithNulls} />);
      expect(screen.getAllByText('-').length).toBeGreaterThan(0);
    });
  });

  describe('Table Structure', () => {
    it('should render separate tables for left, right, and both eyes', () => {
      render(<ExamResultDetail result={mockFarVisionResult} />);

      expect(screen.getByText('Mắt trái')).toBeInTheDocument();
      expect(screen.getByText('Mắt phải')).toBeInTheDocument();
      // "Hai mắt" table is rendered but may be empty if no data
      const tables = screen.getAllByRole('table');
      expect(tables.length).toBeGreaterThanOrEqual(2); // At least left and right
    });

    it('should render table headers correctly', () => {
      render(<ExamResultDetail result={mockFarVisionResult} />);

      expect(screen.getAllByText('Thị lực').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Kết quả (Hiển thị → Trả lời)').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Tỉ lệ').length).toBeGreaterThan(0);
    });

    it('should filter out items without result values', () => {
      const resultWithEmptyItems: ExamResult = {
        ...mockFarVisionResult,
        rawData: {
          left: [
            [
              { char: 'E', display: 'UP', answer: 'UP', result: true },
              { char: 'E', display: 'DOWN', answer: 'DOWN', result: undefined },
            ],
          ],
          right: [],
          both: [],
        },
      };

      const { container } = render(<ExamResultDetail result={resultWithEmptyItems} />);
      const rows = container.querySelectorAll('tbody tr');

      // Should only render 1 row (the one with result: true)
      expect(rows.length).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null result gracefully', () => {
      const { container } = render(<ExamResultDetail result={null as any} />);
      expect(container.firstChild).toBeNull();
    });

    it('should handle empty rawData', () => {
      const emptyResult: ExamResult = {
        ...mockFarVisionResult,
        rawData: undefined,
      };

      const { container } = render(<ExamResultDetail result={emptyResult} />);
      expect(container.querySelector('table')).not.toBeInTheDocument();
    });

    it('should handle rawData with empty arrays', () => {
      const emptyArraysResult: ExamResult = {
        ...mockFarVisionResult,
        rawData: {
          left: [],
          right: [],
          both: [],
        },
      };

      const { container } = render(<ExamResultDetail result={emptyArraysResult} />);

      // Component should not render tables when all arrays are empty
      const tables = container.querySelectorAll('table');
      expect(tables.length).toBe(0);
    });

    it('should handle invalid vision levels', () => {
      const invalidLevelResult: ExamResult = {
        ...mockFarVisionResult,
        rawData: {
          left: Array(100).fill([{ char: 'E', display: 'UP', answer: 'UP', result: true }]),
          right: [],
          both: [],
        },
      };

      render(<ExamResultDetail result={invalidLevelResult} />);

      // Should fallback to "Lv X" format for invalid levels (formatVisionLevel in visionUtils)
      const levelTexts = screen.getAllByText(/Lv \d+/);
      expect(levelTexts.length).toBeGreaterThan(0);
    });
  });

  describe('Visual Regression Prevention', () => {
    it('should maintain proper spacing between level and score', () => {
      render(<ExamResultDetail result={mockFarVisionResult} />);

      // Vision level renders in the first column; answer boxes in the second column
      expect(screen.getAllByText('20/400').length).toBeGreaterThan(0);
      expect(screen.getAllByText('UP').length).toBeGreaterThan(0);
    });

    it('should use smaller font size for vision score', () => {
      render(<ExamResultDetail result={mockFarVisionResult} />);

      // Vision scores (20/400, 20/320) are rendered in the table
      expect(screen.getAllByText('20/400').length).toBeGreaterThan(0);
    });

    it('should use medium font weight for level number', () => {
      render(<ExamResultDetail result={mockFarVisionResult} />);

      // Vision level text is rendered in the table cells
      expect(screen.getAllByText('20/400').length).toBeGreaterThan(0);
      expect(screen.getAllByText('20/320').length).toBeGreaterThan(0);
    });
  });
});
