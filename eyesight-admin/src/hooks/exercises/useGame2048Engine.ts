/**
 * useGame2048Engine - Consolidated Game2048 Engine Hook
 *
 * SINGLE SOURCE OF TRUTH for Game2048 initialization and management.
 * Replaces duplicated logic from:
 * - Game2048Preview.tsx
 * - PortalExercise.tsx
 * - Game2048Board.tsx
 *
 * This hook ensures vision calculation formulas and game initialization
 * are synchronized across all contexts (admin preview, patient execution).
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  loadGame2048Scripts,
  getGame2048HTML,
  buildGame2048TileColorCss,
} from 'src/utils/game2048Utils';
import { get2048EffectiveScale } from 'src/utils/visionUtils';
import { VisualSettings, GameManager } from 'src/types/core';

// ==================== INTERFACES ====================

export interface UseGame2048EngineOptions {
  /**
   * Visual settings for the game (font size, contrast, color scheme)
   * Uses calculateVisualSettings() from visionUtils for consistency
   */
  visualSettings?: VisualSettings;

  /**
   * Callback when game is initialized
   * Use this to attach component-specific tracking or enhancements
   */
  onGameInit?: (gameManager: GameManager) => void;

  /**
   * Whether to enable game tracking (moves, score updates)
   * - false for Preview (admin)
   * - true for Portal (patient execution) and Board
   */
  enableTracking?: boolean;

  /**
   * Hide unnecessary UI elements (heading, above-game)
   * - true for Preview and Portal (clean gameplay)
   * - false for Board (show full UI)
   */
  hideUnnecessaryUI?: boolean;

  /**
   * When false, defer GameManager creation until session bootstrap completes
   * (e.g. after startExercise API returns resume state).
   */
  enabled?: boolean;

  /**
   * Saved 2048 state to restore on first setup (from pause/resume API).
   */
  initialGameState?: Record<string, unknown> | null;
}

export interface UseGame2048EngineReturn {
  /**
   * Ref to attach to game container div
   */
  gameContainerRef: React.RefObject<HTMLDivElement | null>;

  /**
   * Ref to GameManager instance (for accessing game state)
   */
  gameInstanceRef: React.RefObject<GameManager | null>;

  /**
   * True when scripts loaded AND game initialized
   */
  isReady: boolean;

  /**
   * Error message if script loading or initialization fails
   */
  error: string | null;

  /**
   * Manual initialization function (if needed)
   */
  initGame: () => void;

  /**
   * Apply or update visual settings after initialization
   */
  applyVisualSettings: (settings: VisualSettings) => void;
}

// ==================== HOOK IMPLEMENTATION ====================

export function useGame2048Engine(options: UseGame2048EngineOptions = {}): UseGame2048EngineReturn {
  const {
    visualSettings,
    onGameInit,
    hideUnnecessaryUI = true,
    enabled = true,
    initialGameState = null,
  } = options;

  // Refs
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameInstanceRef = useRef<GameManager | null>(null);
  const initRetryCountRef = useRef(0);
  const initRetryTimerRef = useRef<number | null>(null);

  // State
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [scriptLoadAttempted, setScriptLoadAttempted] = useState(false);

  // ==================== SCRIPT LOADING ====================

  useEffect(() => {
    if (!scriptLoadAttempted) {
      setScriptLoadAttempted(true);

      loadGame2048Scripts()
        .then(() => {
          setScriptsLoaded(true);
        })
        .catch((err) => {
          setError(`Failed to load game scripts: ${err.message}`);
        });
    }
  }, [scriptLoadAttempted]);

  // ==================== VISUAL SETTINGS APPLICATION ====================

  /**
   * Apply visual settings to game.
   * Generates CSS based on visual settings (scale, contrast, colors).
   *
   * Scale priority:
   * 1. fontSize (if provided): clinically calibrated to screen size + distance
   *    effectiveScale = fontSize / BASE_FONT_SIZE
   * 2. scaleFactor (fallback): vision-level-only scale (ignores screen/distance)
   *
   * Using fontSize ensures that changing screen size or viewing distance in the
   * preview header actually updates the displayed game tile size.
   */
  const applyVisualSettings = useCallback(
    (settings: VisualSettings) => {
      if (!gameContainerRef.current) {
        return;
      }

      const { contrast = 100, colorScheme } = settings;

      const effectiveScale = get2048EffectiveScale(settings);

      // Remove old style tag
      const styleId = 'game2048-visual-settings';
      const oldStyle = document.getElementById(styleId);
      if (oldStyle) {
        oldStyle.remove();
      }

      // Create new style tag
      const styleTag = document.createElement('style');
      styleTag.id = styleId;

      // Build CSS using individual property assignments to avoid template literal issues
      const hideDisplay = hideUnnecessaryUI ? 'none' : 'block';

      let css = `.heading, .above-game { display: ${hideDisplay} !important; }`;
      css += ` .game-container { transform: scale(${effectiveScale}) !important; transform-origin: center center !important; }`;
      css += ` .game-container .tile, .game-container .tile .tile-inner { font-size: 55px !important; }`;

      // Clinical contrast: blend digit color toward tile background (opaque).
      // Do NOT use filter:contrast() — that greys the whole board like a fog layer.
      const numericContrast =
        typeof contrast === 'number'
          ? contrast
          : Number.parseFloat(String(contrast).replace('%', '')) || 100;
      css += buildGame2048TileColorCss(numericContrast, colorScheme ?? null);

      styleTag.textContent = css;
      document.head.appendChild(styleTag);
    },
    [hideUnnecessaryUI]
  );

  // ==================== GAME INITIALIZATION ====================

  /**
   * Initialize game instance
   * Creates HTML structure and GameManager instance
   */
  const initGame = useCallback(() => {
    const MAX_INIT_RETRIES = 40;
    const RETRY_DELAY_MS = 100;

    if (!enabled) {
      return;
    }

    if (!gameContainerRef.current) {
      if (initRetryCountRef.current < MAX_INIT_RETRIES) {
        initRetryCountRef.current += 1;
        initRetryTimerRef.current = window.setTimeout(() => {
          initGame();
        }, RETRY_DELAY_MS);
        return;
      }

      setError('Failed to initialize game: game container not mounted in time');
      return;
    }

    if (!window.GameManager) {
      if (initRetryCountRef.current < MAX_INIT_RETRIES) {
        initRetryCountRef.current += 1;
        initRetryTimerRef.current = window.setTimeout(() => {
          initGame();
        }, RETRY_DELAY_MS);
        return;
      }

      setError('Failed to initialize game: GameManager script not available');
      return;
    }

    initRetryCountRef.current = 0;

    // Create game HTML structure
    gameContainerRef.current.innerHTML = getGame2048HTML(hideUnnecessaryUI);

    const shouldRestore =
      initialGameState &&
      typeof initialGameState === 'object' &&
      initialGameState.grid &&
      typeof (initialGameState.grid as { size?: unknown }).size === 'number';

    // Initialize GameManager after DOM is ready
    setTimeout(() => {
      try {
        const gameManager = new window.GameManager(
          4, // Grid size
          window.KeyboardInputManager,
          window.HTMLActuator,
          window.LocalStorageManager,
          Boolean(shouldRestore)
        );

        gameInstanceRef.current = gameManager;

        // Restore paused state before first paint when resuming a session
        if (shouldRestore && gameManager.storageManager) {
          gameManager.storageManager.clearGameState();
          gameManager.storageManager.setGameState(initialGameState);
          gameManager.setup(true);
        } else {
          gameManager.setup();
        }

        // Call component-specific initialization callback
        if (onGameInit) {
          onGameInit(gameManager);
        }

        // Apply initial visual settings
        if (visualSettings) {
          applyVisualSettings(visualSettings);
        }

        setIsReady(true);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setError(`Failed to initialize game: ${message}`);
      }
    }, 100);
  }, [enabled, hideUnnecessaryUI, onGameInit, visualSettings, applyVisualSettings, initialGameState]);

  // ==================== AUTO-INITIALIZATION ====================

  // Auto-initialize when scripts are loaded and session bootstrap allows it
  useEffect(() => {
    if (enabled && scriptsLoaded && !isReady) {
      initGame();
    }
  }, [enabled, scriptsLoaded, isReady, initGame]);

  // Reset ready state when disabled (e.g. waiting for startExercise API)
  useEffect(() => {
    if (!enabled && isReady) {
      if (gameInstanceRef.current && typeof gameInstanceRef.current.destroy === 'function') {
        gameInstanceRef.current.destroy();
      }
      gameInstanceRef.current = null;
      setIsReady(false);
      initRetryCountRef.current = 0;
    }
  }, [enabled, isReady]);

  // ==================== VISUAL SETTINGS UPDATES ====================

  // Update visual settings when they change
  useEffect(() => {
    if (isReady && visualSettings) {
      applyVisualSettings(visualSettings);
    }
  }, [isReady, visualSettings, applyVisualSettings]);

  // ==================== CLEANUP ====================

  useEffect(() => {
    return () => {
      if (initRetryTimerRef.current !== null) {
        window.clearTimeout(initRetryTimerRef.current);
        initRetryTimerRef.current = null;
      }

      // Tear down the game instance so its document-level keyboard listener is
      // removed. The vendored KeyboardInputManager attaches to `document` and
      // has no teardown of its own, so without this the listener (and the
      // GameManager it drives) leaks every mount/unmount cycle.
      if (gameInstanceRef.current && typeof gameInstanceRef.current.destroy === 'function') {
        gameInstanceRef.current.destroy();
      }
      gameInstanceRef.current = null;

      // Cleanup: remove visual settings styles
      const styleTag = document.getElementById('game2048-visual-settings');
      if (styleTag) {
        styleTag.remove();
      }
    };
  }, []);

  // ==================== RETURN ====================

  return {
    gameContainerRef,
    gameInstanceRef,
    isReady,
    error,
    initGame,
    applyVisualSettings,
  };
}
