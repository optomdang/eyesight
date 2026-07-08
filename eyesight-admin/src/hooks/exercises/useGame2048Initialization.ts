/**
 * Game 2048 Initialization Hook
 * Handles game initialization, visual settings, and DOM manipulation
 * Extracted from PortalExercise.tsx for better separation of concerns
 */

import { useRef, useCallback, useEffect } from 'react';
import { loadGame2048Scripts, buildGame2048TileColorCss } from 'src/utils/game2048Utils';
import { VisualSettings, GameManager } from 'src/types/core';

export interface UseGame2048InitializationOptions {
  visualSettings?: VisualSettings;
  onGameReady?: (gameManager: GameManager) => void;
}

export interface UseGame2048InitializationReturn {
  gameContainerRef: React.RefObject<HTMLDivElement | null>;
  gameInstanceRef: React.RefObject<GameManager | null>;
  initializeGame: () => void;
  applyVisionScaling: () => void;
  isGameReady: boolean;
}

export const useGame2048Initialization = (
  options: UseGame2048InitializationOptions = {}
): UseGame2048InitializationReturn => {
  const { visualSettings, onGameReady } = options;

  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameInstanceRef = useRef<GameManager | null>(null);
  const isGameReadyRef = useRef(false);

  // Initialize game function
  const initializeGame = useCallback(() => {
    if (!gameContainerRef.current || !window.GameManager) return;

    // Create game HTML structure
    gameContainerRef.current.innerHTML = `
      <div class="heading" style="display: none;">
        <h1 class="title">2048</h1>
        <div class="scores-container">
          <div class="score-container">0</div>
          <div class="best-container">0</div>
        </div>
      </div>
      
      <div class="above-game" style="display: none;">
        <p class="game-intro">Join the numbers and get to the <strong>2048 tile!</strong></p>
        <a class="restart-button">New Game</a>
      </div>
      
      <div class="game-container">
        <div class="game-message">
          <p></p>
          <div class="lower">
            <a class="keep-playing-button">Keep going</a>
            <a class="retry-button">Try again</a>
          </div>
        </div>
        
        <div class="grid-container">
          ${Array(4)
            .fill(0)
            .map(
              () => `
            <div class="grid-row">
              ${Array(4)
                .fill(0)
                .map(() => '<div class="grid-cell"></div>')
                .join('')}
            </div>
          `
            )
            .join('')}
        </div>
        
        <div class="tile-container"></div>
      </div>
    `;

    // Initialize game manager
    setTimeout(() => {
      const gameManager = new window.GameManager(
        4,
        window.KeyboardInputManager,
        window.HTMLActuator,
        window.LocalStorageManager
      );

      gameInstanceRef.current = gameManager;
      isGameReadyRef.current = true;

      // Notify parent component
      if (onGameReady) {
        onGameReady(gameManager);
      }

      // Apply visual settings
      setTimeout(() => {
        applyVisionScaling();
      }, 200);
    }, 100);
  }, [onGameReady]);

  // Apply vision scaling
  const applyVisionScaling = useCallback(() => {
    if (!gameContainerRef.current || !visualSettings || !visualSettings.fontSize) return;

    const { contrast, colorScheme } = visualSettings;
    const scaleFactor = visualSettings.scaleFactor || 1; // Use pre-calculated game scale factor

    // Remove old style
    const oldStyle = document.getElementById('game-visual-settings-portal');
    if (oldStyle) oldStyle.remove();

    // Create new style
    const styleTag = document.createElement('style');
    styleTag.id = 'game-visual-settings-portal';

    let css = `
      .heading, .above-game, .game-message { display: none !important; }
      
      .game-container {
        transform: scale(${scaleFactor}) !important;
        transform-origin: center center !important;
      }
      
      .game-container .tile,
      .game-container .tile .tile-inner {
        font-size: 55px !important;
      }
    `;

    // Opaque digit/background contrast blend (not filter:contrast fog)
    const numericContrast =
      typeof contrast === 'number'
        ? contrast
        : Number.parseFloat(String(contrast ?? 100).replace('%', '')) || 100;
    css += buildGame2048TileColorCss(
      numericContrast,
      colorScheme && typeof colorScheme === 'object' ? colorScheme : null
    );

    styleTag.textContent = css;
    document.head.appendChild(styleTag);
  }, [visualSettings]);

  // Auto-initialize game when scripts are loaded
  useEffect(() => {
    const initializeGameAsync = async () => {
      if (!window.GameManager) {
        await loadGame2048Scripts().catch(() => {
          alert('Không thể tải game scripts');
        });
      }

      if (gameContainerRef.current && !gameInstanceRef.current) {
        initializeGame();
      }
    };

    const timeout = setTimeout(() => {
      initializeGameAsync();
    }, 1000);

    return () => clearTimeout(timeout);
  }, [initializeGame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const styleTag = document.getElementById('game-visual-settings-portal');
      if (styleTag) styleTag.remove();
    };
  }, []);

  return {
    gameContainerRef,
    gameInstanceRef,
    initializeGame,
    applyVisionScaling,
    isGameReady: isGameReadyRef.current,
  };
};
