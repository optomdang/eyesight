import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Game2048Preview from '../Game2048Preview';

/**
 * Regression guard for the admin "Nhìn xa" (look-far) preview.
 *
 * The preview used to render a STATIC board (two fixed "2" tiles), so arrow
 * keys did nothing. It must now drive the real interactive engine
 * (useGame2048Engine) — the same one the patient flow uses — so the clinician
 * can play it. These tests lock that contract without needing a real browser
 * (the engine, which loads external /2048/js scripts, is mocked).
 */

const gameContainerRef = { current: document.createElement('div') };
const gameInstanceRef = { current: null as unknown };
let engineReady = true;
let engineError: string | null = null;
let lastEngineOptions: Record<string, unknown> | undefined;

vi.mock('src/hooks/exercises/useGame2048Engine', () => ({
  useGame2048Engine: (options?: Record<string, unknown>) => {
    lastEngineOptions = options;
    return {
      gameContainerRef,
      gameInstanceRef,
      isReady: engineReady,
      error: engineError,
      initGame: vi.fn(),
      applyVisualSettings: vi.fn(),
    };
  },
}));

const visualSettings = { fontSize: 36, contrast: 100, scaleFactor: 1 };

describe('Game2048Preview', () => {
  beforeEach(() => {
    engineReady = true;
    engineError = null;
    lastEngineOptions = undefined;
  });

  it('renders the interactive game container (not a static board)', () => {
    render(<Game2048Preview visualSettings={visualSettings} />);

    // The interactive engine attaches its board to this container. Its presence
    // is the guard against regressing to the old static two-tile mock.
    expect(screen.getByRole('application', { name: /2048 Game Preview/i })).toBeInTheDocument();
  });

  it('drives the shared engine with preview options (no result tracking)', () => {
    render(<Game2048Preview visualSettings={visualSettings} />);

    expect(lastEngineOptions).toBeDefined();
    expect(lastEngineOptions?.enableTracking).toBe(false);
    expect(lastEngineOptions?.hideUnnecessaryUI).toBe(true);
    expect(lastEngineOptions?.visualSettings).toBe(visualSettings);
  });

  it('shows a loading state until the engine is ready', () => {
    engineReady = false;
    render(<Game2048Preview visualSettings={visualSettings} />);

    expect(screen.getByText(/Đang khởi tạo bài tập 2048/i)).toBeInTheDocument();
  });

  it('surfaces an engine error when script loading fails', () => {
    engineReady = false;
    engineError = 'Failed to load game scripts';
    render(<Game2048Preview visualSettings={visualSettings} />);

    expect(screen.getByText(/Failed to load game scripts/i)).toBeInTheDocument();
  });

  it('shows the arrow-key hint once the game is ready', () => {
    render(<Game2048Preview visualSettings={visualSettings} />);

    expect(screen.getByText(/phím mũi tên/i)).toBeInTheDocument();
  });
});
