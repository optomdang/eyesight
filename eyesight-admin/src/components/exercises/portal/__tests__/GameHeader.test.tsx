/**
 * Unit Tests for GameHeader Component
 * Tests display of game statistics and controls
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GameHeader from '../GameHeader';
import type { GameSession } from 'src/hooks/exercises';

describe('GameHeader Component', () => {
  const createMockSession = (overrides?: Partial<GameSession>): GameSession => ({
    startTime: Date.now() - 60000, // Started 60 seconds ago
    maxScore: 256,
    movesCount: 25,
    scoringMoves: 10,
    completed: false,
    ...overrides,
  });

  describe('Basic Rendering', () => {
    it('should render null when gameSession is null', () => {
      const { container } = render(
        <GameHeader
          gameSession={null}
          currentTime={Date.now()}
          timeRemaining={null}
          onEndExercise={vi.fn()}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render game stats when gameSession is provided', () => {
      const session = createMockSession({ maxScore: 512, movesCount: 30 });
      const currentTime = session.startTime + 60000; // 60 seconds elapsed

      render(
        <GameHeader
          gameSession={session}
          currentTime={currentTime}
          timeRemaining={null}
          onEndExercise={vi.fn()}
        />
      );

      expect(screen.getByText('512')).toBeInTheDocument(); // Score
      expect(screen.getByText('30')).toBeInTheDocument(); // Moves
      expect(screen.getByText('Điểm')).toBeInTheDocument();
      expect(screen.getByText('Nước đi')).toBeInTheDocument();
    });

    it('should display elapsed time correctly', () => {
      const session = createMockSession();
      const currentTime = session.startTime + 45000; // 45 seconds elapsed

      render(
        <GameHeader
          gameSession={session}
          currentTime={currentTime}
          timeRemaining={null}
          onEndExercise={vi.fn()}
        />
      );

      expect(screen.getByText('45s')).toBeInTheDocument();
      expect(screen.getByText('Thời gian')).toBeInTheDocument();
    });
  });

  describe('Time Remaining Display', () => {
    it('should display time remaining when provided', () => {
      const session = createMockSession();

      render(
        <GameHeader
          gameSession={session}
          currentTime={Date.now()}
          timeRemaining={120000} // 2 minutes remaining
          onEndExercise={vi.fn()}
        />
      );

      expect(screen.getByText('2:00')).toBeInTheDocument();
      expect(screen.getByText('Còn lại')).toBeInTheDocument();
    });

    it('should not display time remaining when null', () => {
      const session = createMockSession();

      render(
        <GameHeader
          gameSession={session}
          currentTime={Date.now()}
          timeRemaining={null}
          onEndExercise={vi.fn()}
        />
      );

      expect(screen.queryByText('Còn lại')).not.toBeInTheDocument();
    });

    it('should format time remaining with leading zeros', () => {
      const session = createMockSession();

      render(
        <GameHeader
          gameSession={session}
          currentTime={Date.now()}
          timeRemaining={65000} // 1 minute 5 seconds
          onEndExercise={vi.fn()}
        />
      );

      expect(screen.getByText('1:05')).toBeInTheDocument();
    });
  });

  describe('End Exercise Button', () => {
    it('should render end exercise button', () => {
      const session = createMockSession();

      render(
        <GameHeader
          gameSession={session}
          currentTime={Date.now()}
          timeRemaining={null}
          onEndExercise={vi.fn()}
        />
      );

      expect(screen.getByRole('button', { name: 'Kết thúc' })).toBeInTheDocument();
    });

    it('should call onEndExercise when button is clicked', () => {
      const onEndExercise = vi.fn();
      const session = createMockSession();

      render(
        <GameHeader
          gameSession={session}
          currentTime={Date.now()}
          timeRemaining={null}
          onEndExercise={onEndExercise}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Kết thúc' }));

      expect(onEndExercise).toHaveBeenCalledTimes(1);
    });
  });

  describe('Score Display', () => {
    it('should display maxScore from session', () => {
      const session = createMockSession({ maxScore: 1024 });

      render(
        <GameHeader
          gameSession={session}
          currentTime={Date.now()}
          timeRemaining={null}
          onEndExercise={vi.fn()}
        />
      );

      expect(screen.getByText('1024')).toBeInTheDocument();
    });

    it('should display zero score', () => {
      const session = createMockSession({ maxScore: 0 });

      render(
        <GameHeader
          gameSession={session}
          currentTime={Date.now()}
          timeRemaining={null}
          onEndExercise={vi.fn()}
        />
      );

      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  describe('Moves Display', () => {
    it('should display movesCount from session', () => {
      const session = createMockSession({ movesCount: 100 });

      render(
        <GameHeader
          gameSession={session}
          currentTime={Date.now()}
          timeRemaining={null}
          onEndExercise={vi.fn()}
        />
      );

      expect(screen.getByText('100')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero elapsed time', () => {
      const session = createMockSession();

      render(
        <GameHeader
          gameSession={session}
          currentTime={session.startTime} // Same as start time
          timeRemaining={null}
          onEndExercise={vi.fn()}
        />
      );

      expect(screen.getByText('0s')).toBeInTheDocument();
    });

    it('should handle large elapsed time', () => {
      const session = createMockSession();
      const currentTime = session.startTime + 3600000; // 1 hour elapsed

      render(
        <GameHeader
          gameSession={session}
          currentTime={currentTime}
          timeRemaining={null}
          onEndExercise={vi.fn()}
        />
      );

      expect(screen.getByText('3600s')).toBeInTheDocument();
    });

    it('should handle zero time remaining', () => {
      const session = createMockSession();

      render(
        <GameHeader
          gameSession={session}
          currentTime={Date.now()}
          timeRemaining={0}
          onEndExercise={vi.fn()}
        />
      );

      expect(screen.getByText('0:00')).toBeInTheDocument();
    });
  });
});
