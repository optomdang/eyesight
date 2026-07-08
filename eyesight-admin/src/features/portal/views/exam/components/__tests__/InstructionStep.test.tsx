import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import InstructionStep from '../InstructionStep';

const mockHandleStartTest = vi.fn();
const mockUseExamContext = vi.fn();

vi.mock('src/contexts/ExamContext', () => ({
  useExamContext: () => mockUseExamContext(),
}));

vi.mock('src/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback || _key,
  }),
}));

describe('InstructionStep - BUG-02 stereopsis content', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows stereopsis-specific guidance and hides eye-cover instruction for stereopsis', () => {
    mockUseExamContext.mockReturnValue({
      examType: 'stereopsis',
      handleStartTest: mockHandleStartTest,
    });

    render(<InstructionStep />);

    expect(
      screen.getByText(
        'Với bài kiểm tra này bạn cần mở cả 2 mắt, đeo kính xanh đỏ chồng lên kính đang đeo.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(/hình hoặc số nào nổi lên khỏi nền/, { exact: false })
    ).toBeInTheDocument();
    expect(screen.queryByText('che mắt trái lại')).not.toBeInTheDocument();
  });

  it('shows non-stereopsis guidance and does not show stereopsis-only text for far exam', () => {
    mockUseExamContext.mockReturnValue({
      examType: 'far',
      handleStartTest: mockHandleStartTest,
    });

    render(<InstructionStep />);

    expect(screen.getByText('che mắt trái lại')).toBeInTheDocument();
    expect(screen.getByText(/chọn hướng/i)).toBeInTheDocument();
    expect(screen.queryByText(/đeo kính xanh đỏ/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/hình nổi lên|lõm vào/i)).not.toBeInTheDocument();
  });

  it('triggers start handler when user clicks start button', () => {
    mockUseExamContext.mockReturnValue({
      examType: 'stereopsis',
      handleStartTest: mockHandleStartTest,
    });

    render(<InstructionStep />);
    screen.getByRole('button', { name: 'Bắt đầu kiểm tra' }).click();

    expect(mockHandleStartTest).toHaveBeenCalledTimes(1);
  });
});
