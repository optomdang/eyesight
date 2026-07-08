import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Game2048Exercise from '../Game2048Exercise';

const navigateMock = vi.fn();
const blockerMock = { state: 'unblocked', proceed: vi.fn(), reset: vi.fn() };
const showSnackbarMock = vi.fn();
const mockStartExercise = vi.fn();
const mockPauseExercise = vi.fn();
const mockCompleteExercise = vi.fn();

const gameContainerRef = { current: document.createElement('div') };
const gameInstanceRef = { current: null as any };
let engineReady = false;
let onGameInitHook: ((manager: any) => void) | undefined;

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useBlocker: () => blockerMock,
  };
});

vi.mock('src/components/shared/LoadingBoundary', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('src/hooks/exercises/useGame2048Engine', () => ({
  useGame2048Engine: (options?: any) => {
    onGameInitHook = options?.onGameInit;
    return {
      gameContainerRef,
      gameInstanceRef,
      isReady: engineReady,
      error: null,
      initGame: vi.fn(),
      applyVisualSettings: vi.fn(),
    };
  },
}));

vi.mock('src/services/patient.service', () => ({
  startExercise: (...args: any[]) => mockStartExercise(...args),
  pauseExercise: (...args: any[]) => mockPauseExercise(...args),
  completeExercise: (...args: any[]) => mockCompleteExercise(...args),
}));

vi.mock('src/contexts/authGuard/useAuth', () => ({
  default: () => ({
    user: {
      patient: {
        examResults: null,
      },
    },
  }),
}));

vi.mock('src/contexts/UseSnackbar', () => ({
  default: () => ({
    showSnackbar: showSnackbarMock,
  }),
}));

vi.mock('src/utils/visionUtils', async () => {
  const actual = await vi.importActual<any>('src/utils/visionUtils');
  return {
    ...actual,
    calculateVisualSettings: () => ({
      fontSize: 16,
      letterHeightPx: 16,
      contrast: 100,
      scaleFactor: 1,
    }),
  };
});

// Registry: allow 2048 exercises, block unknown types
vi.mock('src/components/exercises/registry', () => ({
  isExerciseSupported: (_type: string | null, _code?: string | null) => {
    const t = String(_type ?? _code ?? '').toLowerCase();
    return t === '2048' || t.includes('2048');
  },
  getAllRegisteredTypes: () => [
    { type: '2048', displayName: 'Trò chơi 2048', PreviewComponent: () => null },
  ],
}));

describe('Game2048Exercise execution lifecycle', () => {
  const assignment = {
    id: 10,
    visionLevel: 14,
    exercise: { id: 1, name: 'Game 2048', code: '2048', exerciseType: '2048' },
    exerciseConfig: {
      exerciseId: 1,
      duration: 1,
      visionType: 'far',
      distance: 0.5,
      colorScheme: {
        preset: 'whiteBlack',
        textColor: '#000000',
        backgroundColor: '#ffffff',
      },
    },
  } as any;

  const screenParams = {
    screenWidth: 1920,
    screenHeight: 1080,
    diagonalInch: 14,
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    engineReady = false;
    onGameInitHook = undefined;
    gameInstanceRef.current = null;
    mockPauseExercise.mockResolvedValue({ success: true });
    mockCompleteExercise.mockResolvedValue({ success: true });
  });

  it('restores resume state after game engine becomes ready', async () => {
    const savedState = {
      grid: {
        size: 4,
        cells: [
          [null, null, null, null],
          [null, null, null, null],
          [null, null, null, null],
          [null, null, null, null],
        ],
      },
      score: 256,
      over: false,
      won: false,
      keepPlaying: false,
    };

    mockStartExercise.mockResolvedValue({
      action: 'resume',
      result: {
        id: 99,
        startedAt: '2026-03-27T09:58:00.000Z',
        score: 256,
        movesCount: 12,
        level: 14,
        exerciseState: savedState,
      },
    });

    const setGameState = vi.fn();
    const setup = vi.fn();

    const view = render(
      <Game2048Exercise
        assignmentId={10}
        sessionId={20}
        assignment={assignment}
        screenParams={screenParams}
      />
    );

    await waitFor(() => expect(mockStartExercise).toHaveBeenCalledWith(10, 20));
    expect(setGameState).not.toHaveBeenCalled();

    engineReady = true;
    gameInstanceRef.current = {
      score: 256,
      storageManager: { setGameState },
      setup,
      serialize: vi.fn(() => savedState),
    };

    view.rerender(
      <Game2048Exercise
        assignmentId={10}
        sessionId={20}
        assignment={assignment}
        screenParams={screenParams}
      />
    );

    await waitFor(() => {
      expect(setGameState).toHaveBeenCalledWith(savedState);
      expect(setup).toHaveBeenCalledWith(true);
    });
  });

  it('auto-submits immediately on timeout and removes continue action', async () => {
    gameInstanceRef.current = {
      score: 512,
      storageManager: { setGameState: vi.fn() },
      setup: vi.fn(),
      serialize: vi.fn(() => ({ score: 512 })),
    };
    engineReady = true;

    mockStartExercise.mockResolvedValue({
      action: 'continue',
      result: {
        id: 77,
        startedAt: '2026-03-27T09:58:00.000Z',
        duration: 61,
        score: 0,
        movesCount: 4,
        level: 14,
        exerciseState: null,
      },
    });

    render(
      <Game2048Exercise
        assignmentId={10}
        sessionId={20}
        assignment={assignment}
        screenParams={screenParams}
      />
    );

    await waitFor(() => expect(mockStartExercise).toHaveBeenCalled());

    await waitFor(() => {
      expect(mockCompleteExercise).toHaveBeenCalledTimes(1);
    });

    expect(screen.queryByText('Tiếp tục luyện')).not.toBeInTheDocument();
    expect(screen.getAllByText('Kết thúc').length).toBeGreaterThan(0);
  });

  it('tracks moves via inputManager events and updates move counter', async () => {
    engineReady = true;

    let moveListener: (() => void) | null = null;

    const fakeManager = {
      score: 0,
      inputManager: {
        on: vi.fn((event: string, cb: () => void) => {
          if (event === 'move') {
            moveListener = cb;
          }
        }),
      },
      restart: vi.fn(),
      actuator: {
        actuate: vi.fn(),
      },
      serialize: vi.fn(() => ({ score: 128 })),
    } as any;

    gameInstanceRef.current = fakeManager;

    mockStartExercise.mockResolvedValue({
      action: 'continue',
      result: {
        id: 88,
        score: 0,
        movesCount: 0,
        level: 14,
        duration: 0,
        exerciseState: null,
      },
    });

    render(
      <Game2048Exercise
        assignmentId={10}
        sessionId={20}
        assignment={assignment}
        screenParams={screenParams}
      />
    );

    await waitFor(() => expect(mockStartExercise).toHaveBeenCalledWith(10, 20));
    expect(onGameInitHook).toBeDefined();

    onGameInitHook?.(fakeManager);
    expect(typeof moveListener).toBe('function');

    moveListener?.();
    moveListener?.();

    await waitFor(() => {
      expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    });
  });
});
