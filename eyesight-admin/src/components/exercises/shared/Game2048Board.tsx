import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box } from '@mui/material';
import LoadingBoundary from 'src/components/shared/LoadingBoundary';
import { use2048Exercise } from 'src/hooks/use2048Exercise';
import { Game2048SessionResult, GameManager, VisualSettings } from 'src/types/core';
import { calculateVisualSettings, calculatePPI, VisionCalculationInput, ScreenInfo } from 'src/utils/visionUtils';
import { loadGame2048Scripts } from 'src/utils/game2048Utils';
import { getLastScreenConfig, DEFAULT_SCREEN_CONFIG } from 'src/services/deviceProfile.service';

interface Game2048BoardProps {
  exerciseId?: number;
  onGameComplete?: (result: unknown) => void;
  // Standard visual settings prop
  visualSettings?: VisualSettings;
  // Legacy external visual settings (deprecated)
  externalVisualSettings?: {
    fontSize: number;
    contrast: number;
    colorScheme: {
      textColor: string;
      backgroundColor: string;
    };
  };
  // Vision scaling props
  visionType?: 'far' | 'near' | 'contrast'; // Vision exercise type
  visionLevel?: number; // Vision level number (1-20 for far, 1-6 for near, 1-16 for contrast)
  levelOverride?: boolean;
  patientVision?: {
    farVisionLevel?: string;
    nearVisionLevel?: string;
    contrastLevel?: string;
    distance?: number;
  };
  onGameStateChange?: (gameState: {
    score: number;
    moves: number;
    startTime: number | null;
    endTime: number | null;
    restartCount: number;
  }) => void;
}

const Game2048Board: React.FC<Game2048BoardProps> = ({
  exerciseId,
  onGameComplete,
  visualSettings,
  externalVisualSettings,
  visionType,
  visionLevel,
  levelOverride,
  patientVision,
  onGameStateChange,
}) => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameInstanceRef = useRef<GameManager | null>(null);
  const moveCountRef = useRef<number>(0);
  const gameSessionRef = useRef<Game2048SessionResult>({
    // Sử dụng Game2048SessionResult từ types
    startTime: null,
    endTime: null,
    moves: 0,
    score: 0,
    restartCount: 0,
    highestTile: 0,
    efficiency: 0,
  });
  const [gameInitialized, setGameInitialized] = useState(false);
  const [scriptLoadAttempted, setScriptLoadAttempted] = useState(false);

  // Helper function to get effective visual settings
  const getEffectiveVisualSettings = (): VisualSettings => {
    // Priority: visualSettings prop > externalVisualSettings > default
    if (visualSettings) {
      return visualSettings;
    }

    if (externalVisualSettings) {
      return {
        colorScheme: {
          preset: 'whiteBlack',
          textColor: externalVisualSettings.colorScheme.textColor,
          backgroundColor: externalVisualSettings.colorScheme.backgroundColor,
        },
        fontSize: externalVisualSettings.fontSize,
        contrast: externalVisualSettings.contrast,
      };
    }

    return {
      colorScheme: {
        preset: 'whiteBlack',
        textColor: '#000000',
        backgroundColor: '#ffffff',
      },
      contrast: 100,
      fontSize: 16,
    };
  };

  // Applied Settings - Settings thực sự được áp dụng vào game
  const [appliedSettings, setAppliedSettings] = useState<VisualSettings>(() =>
    getEffectiveVisualSettings()
  );

  const [gameSession, setGameSession] = useState<Game2048SessionResult>({
    // Sử dụng Game2048SessionResult từ types
    startTime: null,
    endTime: null,
    moves: 0,
    score: 0,
    restartCount: 0,
    highestTile: 0,
    efficiency: 0,
  });

  // Use the 2048 exercise hook for game state management
  // Note: gameState and loading are available for future use or debugging
  // The actual game rendering is handled by GameManager from game2048Utils
  const {
    gameState: _gameState, // Available for debugging/future use
    isLoading: _loading, // Available for debugging/future use
    initializeBoard,
  } = use2048Exercise({
    visualSettings: appliedSettings,
  });

  // Update visual settings when props change
  useEffect(() => {
    const newSettings = getEffectiveVisualSettings();
    setAppliedSettings(newSettings);

    // Apply settings to game if it's already initialized
    if (gameInitialized && gameInstanceRef.current?.applyVisualSettings) {
      gameInstanceRef.current.applyVisualSettings(newSettings);
    }
  }, [visualSettings, externalVisualSettings, gameInitialized]);

  // Apply vision scaling using consolidated vision calculation
  useEffect(() => {
    if (patientVision || (levelOverride && visionLevel !== undefined)) {
      try {
        const currentVisionType = visionType || 'far'; // Use prop or default to far vision
        const distance = patientVision?.distance || 0.5; // Use patient distance or default 0.5m

        // Get vision level - prioritize levelOverride prop if set
        let currentVisionLevel = 14; // Default level 14 = 20/20

        if (levelOverride && visionLevel !== undefined) {
          // Use explicit visionLevel prop when levelOverride is true
          currentVisionLevel = visionLevel;
        } else if (patientVision) {
          // Otherwise use patient vision data
          if (currentVisionType === 'far' && patientVision.farVisionLevel) {
            currentVisionLevel =
              typeof patientVision.farVisionLevel === 'string'
                ? parseInt(patientVision.farVisionLevel)
                : patientVision.farVisionLevel;
          } else if (currentVisionType === 'near' && patientVision.nearVisionLevel) {
            currentVisionLevel =
              typeof patientVision.nearVisionLevel === 'string'
                ? parseInt(patientVision.nearVisionLevel)
                : patientVision.nearVisionLevel;
          } else if (currentVisionType === 'contrast' && patientVision.contrastLevel) {
            currentVisionLevel =
              typeof patientVision.contrastLevel === 'string'
                ? parseInt(patientVision.contrastLevel)
                : patientVision.contrastLevel;
          }
        }

        // Use the same screen config source as PortalExercise / ExerciseExecutePage:
        // the user's saved device profile from localStorage, with a sensible default.
        // This ensures calculateVisualSettings receives the same calibrated screenInfo
        // used everywhere else — no more 96-DPI hardcode.
        const screenInfo: ScreenInfo = getLastScreenConfig() ?? DEFAULT_SCREEN_CONFIG;
        // Sanity: verify PPI is a positive finite number before passing to calculateVisualSettings.
        const _ppi = calculatePPI(screenInfo);
        if (!Number.isFinite(_ppi) || _ppi <= 0) {
          throw new Error(`Invalid screen config — PPI=${_ppi}`);
        }

        const visionInput: VisionCalculationInput = {
          visionType: currentVisionType,
          visionLevel: currentVisionLevel,
          distance,
          screenInfo,
          patientFarVisionLevel:
            currentVisionType === 'contrast' && patientVision?.farVisionLevel
              ? typeof patientVision.farVisionLevel === 'string'
                ? parseInt(patientVision.farVisionLevel)
                : patientVision.farVisionLevel
              : undefined,
        };

        const { scaleFactor, fontSize } = calculateVisualSettings(visionInput);

        // Apply scale factor to game elements.
        // Always set these CSS variables (even when scaleFactor === 1) so that
        // getBaseCss can unconditionally consume them via var().
        document.documentElement.style.setProperty('--game-scale-factor', scaleFactor.toString());
        document.documentElement.style.setProperty('--game-font-size', `${fontSize}px`);
        document.documentElement.style.setProperty('--game-tile-size', `${60 * scaleFactor}px`);
        document.documentElement.style.setProperty('--game-spacing', `${4 * scaleFactor}px`);
      } catch (error) {
        console.error('Error applying vision scaling:', error);
      }
    }

    // Cleanup on unmount
    return () => {
      document.documentElement.style.removeProperty('--game-scale-factor');
      document.documentElement.style.removeProperty('--game-font-size');
      document.documentElement.style.removeProperty('--game-tile-size');
      document.documentElement.style.removeProperty('--game-spacing');
    };
  }, [patientVision, visionType, visionLevel, levelOverride]);

  // Notify parent component of game state changes
  useEffect(() => {
    if (onGameStateChange) {
      onGameStateChange({
        score: gameSession.score,
        moves: gameSession.moves,
        startTime: gameSession.startTime ?? null,
        endTime: gameSession.endTime ?? null,
        restartCount: gameSession.restartCount ?? 0,
      });
    }
  }, [gameSession, onGameStateChange]);

  // Helper functions for LocalStorage sync
  const getScoreFromLocalStorage = useCallback(() => {
    try {
      const gameState = localStorage.getItem('gameState');
      if (gameState) {
        const parsed = JSON.parse(gameState);
        return {
          score: parsed.score || 0,
          bestScore: parsed.bestScore || 0,
        };
      }
    } catch (error) {
      console.warn('Error reading from localStorage:', error);
    }
    return { score: 0, bestScore: 0 };
  }, []);

  const syncWithLocalStorage = useCallback(() => {
    try {
      const gameState = localStorage.getItem('gameState');
      if (gameState && gameInstanceRef.current) {
        const parsed = JSON.parse(gameState);

        // Sync current score
        const gameScore = gameInstanceRef.current.score || parsed.score || 0;

        // Cập nhật cả ref và state để đảm bảo đồng bộ
        gameSessionRef.current = {
          ...gameSessionRef.current,
          score: gameScore,
        };

        setGameSession((prev) => ({
          ...prev,
          score: gameScore,
        }));
      }
    } catch (error) {
      console.warn('Could not sync with localStorage:', error);
    }
  }, []);

  // Helper functions for visual settings
  const calculateFontSize = useCallback((fontSize: number): number => {
    // fontSize is already in pixels from calculateVisualSettings
    return Math.max(8, Math.round(fontSize));
  }, []);

  const calculateContrast = useCallback((contrast: string | number): number => {
    if (typeof contrast === 'number') {
      return contrast;
    }
    const contrastMap = {
      low: 0.8,
      medium: 1.0,
      high: 1.3,
      'very-high': 1.6,
    };
    return contrastMap[contrast as keyof typeof contrastMap] || 100;
  }, []);

  // CSS Generator helpers
  const getBaseCss = useCallback((fontSize: number, contrastValue: number): string => {
    // Use CSS custom properties set by the vision-scaling effect so that the
    // computed font-size and transform scale are always in sync.
    // Fallbacks are the passed-in values so this function still works when no
    // vision-scaling has run (e.g. when patientVision is not provided).
    return `
      .game-container .tile,
      .game-container .tile .tile-inner {
        font-size: var(--game-font-size, ${fontSize}px) !important;
      }

      .game-container {
        filter: contrast(${contrastValue}) !important;
        transform: scale(var(--game-scale-factor, 1)) !important;
        transform-origin: center center !important;
      }
    `;
  }, []);

  const getColorModeCss = useCallback(
    (colorMode: string, customColors?: { textColor: string; backgroundColor: string }): string => {
      if (colorMode === 'custom' && customColors) {
        return `
        .game-container .tile,
        .game-container .tile .tile-inner {
          background: ${customColors.backgroundColor} !important;
          color: ${customColors.textColor} !important;
        }
        .game-container .tile-2,
        .game-container .tile-4,
        .game-container .tile-8,
        .game-container .tile-16,
        .game-container .tile-32,
        .game-container .tile-64,
        .game-container .tile-128,
        .game-container .tile-256,
        .game-container .tile-512,
        .game-container .tile-1024,
        .game-container .tile-2048 {
          background: ${customColors.backgroundColor} !important;
          color: ${customColors.textColor} !important;
        }
      `;
      } else if (colorMode === 'redgreen') {
        return `
        .game-container .tile-2 { background: #ffcccc !important; color: #660000 !important; }
        .game-container .tile-4 { background: #ffaaaa !important; color: #660000 !important; }
        .game-container .tile-8 { background: #ff8888 !important; color: #ffffff !important; }
        .game-container .tile-16 { background: #ff6666 !important; color: #ffffff !important; }
        .game-container .tile-32 { background: #ccffcc !important; color: #006600 !important; }
        .game-container .tile-64 { background: #aaffaa !important; color: #006600 !important; }
        .game-container .tile-128 { background: #88ff88 !important; color: #ffffff !important; }
        .game-container .tile-256 { background: #66ff66 !important; color: #ffffff !important; }
        .game-container .tile-512 { background: #ff4444 !important; color: #ffffff !important; }
        .game-container .tile-1024 { background: #44ff44 !important; color: #ffffff !important; }
        .game-container .tile-2048 { background: #ff0000 !important; color: #ffffff !important; }
      `;
      } else if (colorMode === 'bluewhite') {
        return `
        .game-container .tile-2 { background: #e6f3ff !important; color: #003366 !important; }
        .game-container .tile-4 { background: #cce7ff !important; color: #003366 !important; }
        .game-container .tile-8 { background: #99d6ff !important; color: #003366 !important; }
        .game-container .tile-16 { background: #66c2ff !important; color: #ffffff !important; }
        .game-container .tile-32 { background: #ffffff !important; color: #0080ff !important; }
        .game-container .tile-64 { background: #f0f8ff !important; color: #0060cc !important; }
        .game-container .tile-128 { background: #e0f0ff !important; color: #0040aa !important; }
        .game-container .tile-256 { background: #d0e8ff !important; color: #002088 !important; }
        .game-container .tile-512 { background: #3399ff !important; color: #ffffff !important; }
        .game-container .tile-1024 { background: #0066cc !important; color: #ffffff !important; }
        .game-container .tile-2048 { background: #003399 !important; color: #ffffff !important; }
      `;
      }
      return ''; // Fallback for unknown color mode
    },
    []
  );

  // Apply visual settings when game is initialized
  useEffect(() => {
    if (gameInitialized && gameInstanceRef.current?.applyVisualSettings) {
      gameInstanceRef.current.applyVisualSettings(appliedSettings);
    }
  }, [gameInitialized, appliedSettings]);

  // Load game scripts
  useEffect(() => {
    if (!scriptLoadAttempted) {
      setScriptLoadAttempted(true);
      loadGame2048Scripts().catch(() => {
        window.alert('Không thể tải game scripts. Vui lòng tải lại trang.');
      });
    }
  }, []);

  // Initialize game when scripts are loaded
  useEffect(() => {
    if (window.GameManager && !gameInitialized) {
      initGame();
    }
  }, [gameInitialized]);

  // Enhance game manager with vision care features
  const enhanceGameManager = useCallback(
    (gameManager: GameManager) => {
      // Add visual settings application
      gameManager.applyVisualSettings = (settings: VisualSettings) => {
        const container = gameContainerRef.current;
        if (!container) return;

        const fontSize = calculateFontSize(settings.fontSize || 1);
        const contrastValue = calculateContrast(settings.contrast || 100);
        const colorPreset = settings.colorScheme?.preset || 'standard';

        // Remove old style tag if exists
        const oldStyle = document.getElementById('game-visual-settings');
        if (oldStyle) oldStyle.remove();

        // Create new style tag với CSS override
        const styleTag = document.createElement('style');
        styleTag.id = 'game-visual-settings';

        // Generate base CSS for font size and contrast
        const baseCss = getBaseCss(fontSize, contrastValue);

        // Original preset: keep native tile colors from the game stylesheet
        const colorModeCss =
          colorPreset === 'original'
            ? ''
            : getColorModeCss(colorPreset, externalVisualSettings?.colorScheme);

        // Combine CSS rules
        styleTag.textContent = baseCss + colorModeCss;
        document.head.appendChild(styleTag);
      };

      // Track game events
      const originalRestart = gameManager.restart.bind(gameManager);

      gameManager.restart = () => {
        // Reset counters
        moveCountRef.current = 0;

        // Tính toán giá trị restartCount mới từ giá trị ref hiện tại
        const newRestartCount = (gameSessionRef.current.restartCount || 0) + 1;

        // Reset session - cập nhật cả ref và state
        const newSession: Game2048SessionResult = {
          startTime: Date.now(),
          endTime: null,
          moves: 0,
          score: 0,
          restartCount: newRestartCount,
          highestTile: 0,
          efficiency: 0,
        };

        // Cập nhật cả ref và state
        gameSessionRef.current = newSession;
        setGameSession(newSession);

        // Call original restart
        originalRestart();
      };

      // Simple keyboard tracking
      const handleKeydown = (event: KeyboardEvent) => {
        const validKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
        if (validKeys.includes(event.key)) {
          setTimeout(() => {
            // Sử dụng moveCountRef thay vì biến cục bộ
            moveCountRef.current += 1;

            // Cập nhật cả gameSessionRef và gameSession state
            gameSessionRef.current = {
              ...gameSessionRef.current,
              moves: moveCountRef.current,
            };

            setGameSession((prev) => ({
              ...prev,
              moves: moveCountRef.current,
            }));
          }, 100);
        }
      };

      document.addEventListener('keydown', handleKeydown);

      // Cleanup function
      gameManager._cleanupMoveTracking = () => {
        document.removeEventListener('keydown', handleKeydown);
      };
    },
    [
      calculateFontSize,
      calculateContrast,
      getBaseCss,
      getColorModeCss,
      externalVisualSettings?.colorScheme,
    ]
  );

  const initGame = useCallback(() => {
    if (!gameContainerRef.current || !window.GameManager) return;

    // Create complete game structure with all required elements
    gameContainerRef.current.innerHTML = `
      <div class="heading">
        <h1 class="title">2048</h1>
        <div class="scores-container">
          <div class="score-container">0</div>
          <div class="best-container">0</div>
        </div>
      </div>
      
      <div class="above-game">
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
          <div class="grid-row">
            <div class="grid-cell"></div>
            <div class="grid-cell"></div>
            <div class="grid-cell"></div>
            <div class="grid-cell"></div>
          </div>
          <div class="grid-row">
            <div class="grid-cell"></div>
            <div class="grid-cell"></div>
            <div class="grid-cell"></div>
            <div class="grid-cell"></div>
          </div>
          <div class="grid-row">
            <div class="grid-cell"></div>
            <div class="grid-cell"></div>
            <div class="grid-cell"></div>
            <div class="grid-cell"></div>
          </div>
          <div class="grid-row">
            <div class="grid-cell"></div>
            <div class="grid-cell"></div>
            <div class="grid-cell"></div>
            <div class="grid-cell"></div>
          </div>
        </div>
        
        <div class="tile-container"></div>
      </div>
    `;

    // Initialize game with custom settings
    setTimeout(() => {
      const gameManager = new window.GameManager(
        4,
        window.KeyboardInputManager,
        window.HTMLActuator,
        window.LocalStorageManager
      );

      // Extend game manager with vision care features
      enhanceGameManager(gameManager);

      gameInstanceRef.current = gameManager;
      initializeBoard(); // Initialize the game board via hook

      setGameInitialized(true);

      // Load existing game state from localStorage
      const localStorageData = getScoreFromLocalStorage();
      const hasExistingGame = localStorageData.score > 0;

      // Initialize session data
      const initialStartTime = hasExistingGame ? Date.now() - 60000 : Date.now(); // Mock start time for existing games
      const initialMoves = hasExistingGame ? Math.floor(localStorageData.score / 10) : 0; // Estimate moves from score
      const initialRestartCount = 0; // Reset restart count

      // Initialize both ref and state with the same values
      const initialSession: Game2048SessionResult = {
        startTime: initialStartTime,
        endTime: null,
        moves: initialMoves,
        score: hasExistingGame ? localStorageData.score : 0,
        restartCount: initialRestartCount,
        highestTile: 0,
        efficiency: 0,
      };

      // Luôn cập nhật cả ref và state để đồng bộ
      gameSessionRef.current = initialSession;
      setGameSession(initialSession);

      // Khởi tạo moveCountRef với giá trị ban đầu chính xác
      moveCountRef.current = initialMoves;

      // Nếu có game cũ, sync với LocalStorage data
      if (hasExistingGame) {
        setTimeout(() => {
          syncWithLocalStorage();
        }, 500);
      }

      // Callback cho parent component biết game đã bắt đầu
      if (onGameComplete) {
        onGameComplete({
          type: 'GAME_STARTED',
          timestamp: Date.now(),
          exerciseId,
        });
      }
    }, 100);
  }, [
    exerciseId,
    onGameComplete,
    initializeBoard,
    getScoreFromLocalStorage,
    syncWithLocalStorage,
    enhanceGameManager,
  ]);

  // Show loading state while scripts are loading
  return (
    <LoadingBoundary loading={!gameInitialized && scriptLoadAttempted} height="200px">
      <Box sx={{ width: '100%', maxWidth: 600, margin: '0 auto' }}>
        {/* Pure Game Board - No UI wrapper */}
        <div
          ref={gameContainerRef}
          role="application"
          aria-label="2048 Game Board"
          aria-describedby="game-instructions"
          tabIndex={0}
          style={{
            width: '100%',
            maxWidth: '500px',
            margin: '0 auto',
            outline: 'none', // Remove default focus outline since game handles its own focus
          }}
          onKeyDown={(e) => {
            // Ensure keyboard events are handled by the game
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
              e.preventDefault(); // Prevent page scrolling
            }
          }}
        />

        {/* Screen reader instructions */}
        <div
          id="game-instructions"
          className="sr-only"
          style={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: 0,
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: 0,
          }}
        >
          Use arrow keys to move tiles. Combine tiles with the same number to reach 2048. Current
          score is announced when tiles move.
        </div>
      </Box>
    </LoadingBoundary>
  );
};

export default Game2048Board;
