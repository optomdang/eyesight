/**
 * Color Scheme Utilities
 * Centralized color scheme CSS generation for exercise components
 * Extracted from PortalExercise.tsx and Game2048Board.tsx
 */

// Color scheme types
export interface ColorScheme {
  preset: 'whiteBlack' | 'blackWhite' | 'yellowBlue' | 'custom';
  textColor: string;
  backgroundColor: string;
}

// Predefined color schemes
export const COLOR_SCHEMES: Record<string, Omit<ColorScheme, 'preset'>> = {
  whiteBlack: {
    textColor: '#000000',
    backgroundColor: '#ffffff',
  },
  blackWhite: {
    textColor: '#ffffff',
    backgroundColor: '#000000',
  },
  yellowBlue: {
    textColor: '#0066cc',
    backgroundColor: '#ffff99',
  },
};

/**
 * Generate CSS styles for color scheme application
 * @param colorScheme - Color scheme configuration
 * @param containerSelector - CSS selector for the container (default: '.game-container')
 * @returns CSS string for color scheme
 */
export function generateColorSchemeCSS(
  colorScheme: ColorScheme,
  containerSelector: string = '.game-container'
): string {
  const { textColor, backgroundColor } = colorScheme;

  return `
    ${containerSelector} .tile.tile-2 .tile-inner,
    ${containerSelector} .tile.tile-4 .tile-inner,
    ${containerSelector} .tile.tile-8 .tile-inner,
    ${containerSelector} .tile.tile-16 .tile-inner,
    ${containerSelector} .tile.tile-32 .tile-inner,
    ${containerSelector} .tile.tile-64 .tile-inner,
    ${containerSelector} .tile.tile-128 .tile-inner,
    ${containerSelector} .tile.tile-256 .tile-inner,
    ${containerSelector} .tile.tile-512 .tile-inner,
    ${containerSelector} .tile.tile-1024 .tile-inner,
    ${containerSelector} .tile.tile-2048 .tile-inner,
    ${containerSelector} .tile.tile-super .tile-inner {
      background: ${backgroundColor} !important;
      color: ${textColor} !important;
    }
  `;
}

/**
 * Apply color scheme to a DOM element by injecting CSS
 * @param colorScheme - Color scheme configuration
 * @param styleId - Unique ID for the style element (default: 'color-scheme-styles')
 * @param containerSelector - CSS selector for the container
 */
export function applyColorScheme(
  colorScheme: ColorScheme,
  styleId: string = 'color-scheme-styles',
  containerSelector: string = '.game-container'
): void {
  // Remove existing style if it exists
  const existingStyle = document.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }

  // Create new style element
  const styleElement = document.createElement('style');
  styleElement.id = styleId;
  styleElement.textContent = generateColorSchemeCSS(colorScheme, containerSelector);

  // Append to document head
  document.head.appendChild(styleElement);
}

/**
 * Remove color scheme styles from DOM
 * @param styleId - Unique ID for the style element
 */
export function removeColorScheme(styleId: string = 'color-scheme-styles'): void {
  const styleElement = document.getElementById(styleId);
  if (styleElement) {
    styleElement.remove();
  }
}

/**
 * Get color scheme configuration from preset name
 * @param preset - Preset name
 * @returns Color scheme configuration
 */
export function getColorSchemeFromPreset(preset: string): ColorScheme {
  const scheme = COLOR_SCHEMES[preset];
  if (!scheme) {
    // Fallback to whiteBlack if preset not found
    return {
      preset: 'whiteBlack',
      ...COLOR_SCHEMES.whiteBlack,
    };
  }

  return {
    preset: preset as ColorScheme['preset'],
    ...scheme,
  };
}

/**
 * Create custom color scheme
 * @param textColor - Text color (hex or CSS color)
 * @param backgroundColor - Background color (hex or CSS color)
 * @returns Custom color scheme configuration
 */
export function createCustomColorScheme(textColor: string, backgroundColor: string): ColorScheme {
  return {
    preset: 'custom',
    textColor,
    backgroundColor,
  };
}

/**
 * Validate color scheme configuration
 * @param colorScheme - Color scheme to validate
 * @returns True if valid, false otherwise
 */
export function isValidColorScheme(colorScheme: ColorScheme): boolean {
  return (
    typeof colorScheme.textColor === 'string' &&
    typeof colorScheme.backgroundColor === 'string' &&
    colorScheme.textColor.length > 0 &&
    colorScheme.backgroundColor.length > 0
  );
}
