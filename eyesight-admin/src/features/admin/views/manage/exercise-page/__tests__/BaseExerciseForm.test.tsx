import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BaseExerciseForm from '../forms/BaseExerciseForm';

vi.mock('src/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback || _key,
  }),
}));

vi.mock('src/contexts/UseSnackbar', () => ({
  default: () => ({ showSnackbar: vi.fn() }),
}));

describe('BaseExerciseForm', () => {
  it('lists registered game types from exercise registry', () => {
    render(
      <BaseExerciseForm open onClose={vi.fn()} onSuccess={vi.fn()} />
    );

    expect(screen.getByText(/Trò chơi 2048 \(2048\)/)).toBeInTheDocument();
    expect(screen.getByText('Thêm game gốc')).toBeInTheDocument();
  });
});
