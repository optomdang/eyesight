import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BaseGameTestDialog from '../components/BaseGameTestDialog';
import type { Exercise } from 'src/types/core';

vi.mock('src/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback || _key,
  }),
}));

const baseExercise: Exercise = {
  id: 1,
  name: 'Game 2048',
  code: '2048',
  exerciseType: '2048',
  status: 'active',
  centerId: 1,
  deleted: false,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

describe('BaseGameTestDialog', () => {
  it('renders interactive preview for supported registry game', () => {
    render(<BaseGameTestDialog open exercise={baseExercise} onClose={vi.fn()} />);

    expect(screen.getByText(/Chơi thử: Game 2048/)).toBeInTheDocument();
    expect(screen.getByLabelText('2048 Game Preview')).toBeInTheDocument();
  });

  it('shows warning when game is not in registry', () => {
    render(
      <BaseGameTestDialog
        open
        exercise={{ ...baseExercise, exerciseType: 'unknown-game', code: 'unknown' }}
        onClose={vi.fn()}
      />
    );

    expect(
      screen.getByText('Game này chưa có component chơi thử trong hệ thống (registry).')
    ).toBeInTheDocument();
  });
});
