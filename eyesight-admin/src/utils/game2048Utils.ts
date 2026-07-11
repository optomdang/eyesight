/**
 * GAME2048 UTILITIES - SHARED HELPERS
 * Consolidates helper functions previously scattered across components
 *
 * Previously defined in:
 * - src/components/exercises/shared/Game2048Board.tsx
 * - src/components/exercises/admin/Game2048Preview.tsx
 * - src/components/exercises/portal/PortalExercise.tsx
 *
 * Import and use these instead of duplicating code:
 * import { loadGame2048Scripts, loadScript, loadCSS } from 'src/utils/game2048Utils'
 * const loadScript = ...
 */

// ============ SCRIPT & CSS LOADING ============

/**
 * List of Game2048 JavaScript dependencies
 * Order matters: dependencies must be loaded before dependents
 */
const GAME2048_SCRIPTS = [
  '/2048/js/bind_polyfill.js',
  '/2048/js/classlist_polyfill.js',
  '/2048/js/animframe_polyfill.js',
  '/2048/js/keyboard_input_manager.js',
  '/2048/js/html_actuator.js',
  '/2048/js/grid.js',
  '/2048/js/tile.js',
  '/2048/js/local_storage_manager.js',
  '/2048/js/game_manager.js',
];

/**
 * Game2048 CSS file
 */
const GAME2048_CSS = '/2048/style/main.css';

const isGame2048RuntimeReady = (): boolean => {
  return Boolean(
    window.GameManager &&
    window.KeyboardInputManager &&
    window.HTMLActuator &&
    window.LocalStorageManager &&
    window.Grid &&
    window.Tile
  );
};

const waitForGame2048Globals = (
  timeoutMs: number = 4000,
  intervalMs: number = 50
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const check = () => {
      if (isGame2048RuntimeReady()) {
        resolve();
        return;
      }

      if (Date.now() - start >= timeoutMs) {
        reject(new Error('Timed out waiting for Game2048 globals'));
        return;
      }

      window.setTimeout(check, intervalMs);
    };

    check();
  });
};

/**
 * Load a CSS file
 * Safe: checks if already loaded before creating new link
 *
 * @param href - CSS file URL
 * @returns Promise that resolves when CSS is loaded
 * @throws Error if CSS load fails
 *
 * @example
 * await loadCSS('/2048/style/main.css');
 */
export const loadCSS = (href: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if CSS is already loaded
    const existingLink = document.querySelector(`link[href="${href}"]`) as HTMLLinkElement | null;
    if (existingLink) {
      // Existing tags are treated as loaded to avoid hanging on events that may have already fired.
      resolve();
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = () => {
      link.dataset.loaded = 'true';
      resolve();
    };
    link.onerror = () => {
      reject(new Error(`CSS load error: ${href}`));
    };
    document.head.appendChild(link);
  });
};

/**
 * Load a single JavaScript file
 * Safe: checks if already loaded before creating new script
 *
 * @param src - Script URL
 * @returns Promise that resolves when script is loaded
 * @throws Error if script load fails
 *
 * @example
 * await loadScript('/2048/js/game_manager.js');
 */
export const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if script is already loaded
    const existingScript = document.querySelector(
      `script[src="${src}"]`
    ) as HTMLScriptElement | null;
    if (existingScript) {
      // Existing tags are treated as loaded to avoid waiting on a load event that already fired.
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = false; // Important: maintain order dependency
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => {
      reject(new Error(`Script load error: ${src}`));
    };
    document.head.appendChild(script);
  });
};

/**
 * Load all Game2048 scripts and CSS
 * Safe: checks if all globals are available before loading
 *
 * Loads in order:
 * 1. CSS (styling)
 * 2. Polyfills (compatibility)
 * 3. Utilities (helpers)
 * 4. Game (main)
 *
 * @returns Promise that resolves when all resources are loaded
 * @throws Error if any resource fails to load
 * @throws Error if globals are not available after loading
 *
 * @example
 * try {
 *   await loadGame2048Scripts();
 *   console.log('Game ready!');
 * } catch (error) {
 *   console.error('Failed to load game:', error);
 * }
 */
export const loadGame2048Scripts = async (): Promise<void> => {
  try {
    // Check if all globals are already available (scripts already loaded)
    if (isGame2048RuntimeReady()) {
      return;
    }

    // Load CSS first (needed for styling)
    await loadCSS(GAME2048_CSS);

    // Load all JS files sequentially (order matters - dependencies!)
    for (const script of GAME2048_SCRIPTS) {
      await loadScript(script);
    }

    // Existing script tags may have been appended by another component moments earlier.
    // Poll briefly for globals instead of assuming immediate availability.
    await waitForGame2048Globals();

    // Verify all globals are available
    if (!isGame2048RuntimeReady()) {
      throw new Error(
        'Game2048 scripts loaded but globals not fully available. ' +
          'Check console for errors and verify /public/2048/ directory exists.'
      );
    }
  } catch (error) {
    throw error;
  }
};

// ============ VISION SCALING ============

/**
 * Configuration for vision scaling
 */
export interface VisionScaleResult {
  fontSize: number; // Target font size in pixels
  scaleFactor: number; // Scale multiplier for transform: scale()
  contrast: number; // Contrast percentage (1-100)
}

import { blendHexAtContrastPercent } from 'src/utils/clinicalContrastColor';

/** Re-export shared clinical blend for 2048 callers / tests. */
export { blendHexAtContrastPercent };

export const GAME2048_TILE_INNER_SELECTORS = [
  '.game-container .tile.tile-2 .tile-inner',
  '.game-container .tile.tile-4 .tile-inner',
  '.game-container .tile.tile-8 .tile-inner',
  '.game-container .tile.tile-16 .tile-inner',
  '.game-container .tile.tile-32 .tile-inner',
  '.game-container .tile.tile-64 .tile-inner',
  '.game-container .tile.tile-128 .tile-inner',
  '.game-container .tile.tile-256 .tile-inner',
  '.game-container .tile.tile-512 .tile-inner',
  '.game-container .tile.tile-1024 .tile-inner',
  '.game-container .tile.tile-2048 .tile-inner',
  '.game-container .tile.tile-super .tile-inner',
].join(',');

export interface Game2048TileColorInput {
  textColor?: string;
  backgroundColor?: string;
  preset?: string;
}

/**
 * Opaque tile fill + digit colors for 2048 vision training.
 * Avoids `filter: contrast()` which greys the whole board like a fog layer.
 *
 * @param containerPrefix - e.g. '' or '#my-root ' to scope selectors under a container id
 */
export function buildGame2048TileColorCss(
  contrastPercent: number,
  colorScheme?: Game2048TileColorInput | null,
  containerPrefix = ''
): string {
  const contrast =
    typeof contrastPercent === 'number' && Number.isFinite(contrastPercent)
      ? Math.max(0, Math.min(100, contrastPercent))
      : 100;

  const preset = colorScheme?.preset;
  const isOriginal = !colorScheme || preset === 'original';

  // Full contrast + original palette: keep native multi-color tile stylesheet.
  if (isOriginal && contrast >= 99.5) {
    return '';
  }

  const backgroundColor =
    colorScheme?.backgroundColor || (isOriginal ? '#eee4da' : '#ffffff');
  const textColor = colorScheme?.textColor || (isOriginal ? '#776e65' : '#000000');
  const digitColor = blendHexAtContrastPercent(textColor, contrast, backgroundColor);
  const selectors = GAME2048_TILE_INNER_SELECTORS.split(',')
    .map((sel) => `${containerPrefix}${sel.trim()}`)
    .join(',');

  return ` ${selectors} { background: ${backgroundColor} !important; color: ${digitColor} !important; }`;
}

/**
 * Build CSS for dichoptic anaglyph mode on the 2048 game (balance or plain color).
 *
 * Layout:
 *   - ALL tile backgrounds → #000000 (black, neutral to both anaglyph channels)
 *   - Tile digit color alternates in a checkerboard pattern by grid position:
 *       (col + row) % 2 === 0  →  colorA  (signal / amblyopic eye)
 *       (col + row) % 2 === 1  →  colorB  (fellow / dominant eye)
 *
 * For balance mode: pass contrast-blended signal/fellow colors.
 * For plain anaglyph (anti_cue / no dichoptic config): pass raw colorScheme.textColor /
 * colorScheme.backgroundColor.
 *
 * @param colorA - Digit color for even-sum positions (signal channel)
 * @param colorB - Digit color for odd-sum positions (fellow channel)
 * @param containerPrefix - Optional CSS selector prefix (for scoped previews)
 */
export function buildDichopticBalance2048Css(
  colorA: string,
  colorB: string,
  containerPrefix = ''
): string {
  const p = containerPrefix;

  const aSelectors: string[] = [];
  const bSelectors: string[] = [];

  // 4×4 grid; positions are 1-indexed (col=x, row=y)
  for (let col = 1; col <= 4; col++) {
    for (let row = 1; row <= 4; row++) {
      const sel = `${p}.game-container .tile.tile-position-${col}-${row} .tile-inner`;
      if ((col + row) % 2 === 0) {
        aSelectors.push(sel);
      } else {
        bSelectors.push(sel);
      }
    }
  }

  const allTileInner = `${p}.game-container .tile .tile-inner`;

  return [
    ` ${allTileInner} { background: #000000 !important; }`,
    ` ${aSelectors.join(', ')} { color: ${colorA} !important; }`,
    ` ${bSelectors.join(', ')} { color: ${colorB} !important; }`,
  ].join('');
}

/**
 * Apply vision scaling CSS to a game container
 * Uses CSS transform for scale; digit contrast via opaque color blend (not filter).
 *
 * This consolidates vision scaling that was previously in:
 * - Game2048Board.tsx (inline)
 * - Game2048Preview.tsx (applyVisualSettings)
 * - PortalExercise.tsx (applyVisionScaling)
 *
 * @param container - DOM element to apply scaling to
 * @param scaleFactor - Scale factor from calculateVisionScale
 * @param contrast - Contrast percentage (1-100)
 * @param styleId - Unique ID for style tag (allows multiple containers)
 * @returns void
 *
 * @example
 * const container = document.getElementById('game');
 * applyVisionScalingStyles(container, 1.5, 80, 'game-scaling');
 */
export const applyVisionScalingStyles = (
  container: HTMLElement | null,
  scaleFactor: number,
  contrast: number,
  styleId: string = 'game-vision-scaling'
): void => {
  if (!container) {
    return;
  }

  // Remove old style if exists (cleanup)
  const oldStyle = document.getElementById(styleId);
  if (oldStyle) {
    oldStyle.remove();
  }

  // Create new style tag
  const styleTag = document.createElement('style');
  styleTag.id = styleId;

  // CSS for vision scaling
  // - Hide unnecessary UI elements
  // - Scale entire game container
  // - Opaque digit/background blend for contrast (no board-wide filter fog)
  const css = `
    /* Vision Scaling Styles - ID: ${styleId} */
    
    /* Hide UI elements not needed for exercises */
    #${container.id} .heading,
    #${container.id} .above-game {
      display: none !important;
    }
    
    /* Scale entire game to match vision requirements */
    #${container.id} .game-container {
      transform: scale(${scaleFactor}) !important;
      transform-origin: center center !important;
    }
    
    /* Preserve original game styling - scaling handles sizing */
    #${container.id} .game-container .tile,
    #${container.id} .game-container .tile .tile-inner {
      font-size: 55px !important;
    }
    ${buildGame2048TileColorCss(contrast, null, `#${container.id} `)}
  `;

  styleTag.textContent = css;
  document.head.appendChild(styleTag);
};

/**
 * Remove vision scaling CSS from a container
 *
 * @param styleId - Unique ID of style tag to remove (must match applyVisionScalingStyles call)
 *
 * @example
 * removeVisionScalingStyles('game-scaling');
 */
export const removeVisionScalingStyles = (styleId: string = 'game-vision-scaling'): void => {
  const styleTag = document.getElementById(styleId);
  if (styleTag) {
    styleTag.remove();
  }
};

// ============ GAME HTML STRUCTURE ============

/**
 * Generate HTML structure for 2048 game container
 *
 * This consolidates HTML generation that was previously duplicated in:
 * - Game2048Board.tsx (initGame)
 * - Game2048Preview.tsx (initGame)
 * - PortalExercise.tsx (initGame)
 *
 * @param hiddenUnnecessary - If true, hides heading and above-game sections
 * @returns HTML string for complete game structure
 *
 * @example
 * const html = getGame2048HTML(true);
 * container.innerHTML = html;
 */
export const getGame2048HTML = (hiddenUnnecessary: boolean = true): string => {
  const hiddenStyle = hiddenUnnecessary ? 'style="display: none;"' : '';

  return `
    <div class="heading" ${hiddenStyle}>
      <h1 class="title">2048</h1>
      <div class="scores-container">
        <div class="score-container">0</div>
        <div class="best-container">0</div>
      </div>
    </div>
    
    <div class="above-game" ${hiddenStyle}>
      <p class="game-intro">Join the numbers and get to the <strong>2048 tile!</strong></p>
      <a class="restart-button">New Game</a>
    </div>
    
    <div class="game-container">
      <div class="game-message" style="display: none;">
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
};

// ============ GAME STATE MANAGEMENT ============

/**
 * Extract game score from GameManager instance
 *
 * @param gameManager - GameManager instance
 * @returns Current score (0 if not available)
 */
export const getGameScore = (gameManager: any): number => {
  return gameManager?.score ?? 0;
};

/**
 * Check if GameManager instance is in valid state
 *
 * @param gameManager - GameManager instance
 * @returns true if gameManager has essential methods/properties
 */
export const isGameManagerValid = (gameManager: any): boolean => {
  return (
    gameManager &&
    typeof gameManager.restart === 'function' &&
    typeof gameManager.setup === 'function' &&
    typeof gameManager.move === 'function' &&
    typeof gameManager.actuate === 'function'
  );
};

/**
 * Reset game to initial state
 *
 * @param gameManager - GameManager instance
 * @returns true if restart was successful
 */
export const resetGame = (gameManager: any): boolean => {
  try {
    if (!isGameManagerValid(gameManager)) {
      return false;
    }
    gameManager.restart();
    gameManager.setup();
    return true;
  } catch (error) {
    console.error('Error resetting game:', error);
    return false;
  }
};
