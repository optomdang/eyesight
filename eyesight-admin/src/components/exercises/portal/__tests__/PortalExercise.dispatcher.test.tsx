import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Stub the playable 2048 component so we test ONLY the dispatcher's routing.
// The real registry imports this module, so the mock flows through getExerciseComponent('2048').
vi.mock('../Game2048Exercise', () => ({
  default: () => <div data-testid="game-2048" />,
}));

// UnsupportedExercise uses useNavigate — provide a stub router hook.
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

import PortalExercise from '../PortalExercise';

const baseProps = { assignmentId: 1, sessionId: 2, screenParams: {} as any };

describe('PortalExercise dispatcher', () => {
  it('routes a 2048 assignment to the 2048 exercise component', () => {
    const assignment = {
      exercise: { id: 1, code: '2048', exerciseType: '2048' },
    } as any;

    render(<PortalExercise {...baseProps} assignment={assignment} />);

    expect(screen.getByTestId('game-2048')).toBeInTheDocument();
  });

  it('renders UnsupportedExercise for an unregistered exercise type', () => {
    const assignment = {
      exercise: { id: 99, code: 'stereopsis-01', exerciseType: 'stereopsis' },
    } as any;

    render(<PortalExercise {...baseProps} assignment={assignment} />);

    expect(screen.queryByTestId('game-2048')).not.toBeInTheDocument();
    expect(screen.getByText(/chưa được hỗ trợ/i)).toBeInTheDocument();
  });

  it('falls back to exercise code when exerciseType is missing', () => {
    const assignment = {
      exercise: { id: 1, code: '2048', exerciseType: null },
    } as any;

    render(<PortalExercise {...baseProps} assignment={assignment} />);

    expect(screen.getByTestId('game-2048')).toBeInTheDocument();
  });
});
