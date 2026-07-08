/**
 * SINGLE SOURCE OF TRUTH FOR VISUAL SETTINGS
 * Used across admin, portal, and games
 *
 * This is the ONLY place where VisualSettings should be defined.
 * All other files should import from here.
 */

// ============ VISUAL SETTINGS TYPES ============

/**
 * Color scheme definition (matches backend ColorScheme entity)
 * ONLY 4 presets are supported
 */
export interface ColorScheme {
  /** `original` = native game palette, no color overrides applied at runtime */
  preset: 'original' | 'whiteBlack' | 'redBlue' | 'redGreen' | 'custom';
  textColor: string;
  backgroundColor: string;
  accentColor?: string;
}

export type Contrast = number; // 0-100 percentage (NOT 0-1)
export type Speed = 'slow' | 'medium' | 'fast';
export type ObjectSize = 'small' | 'medium' | 'large';

/**
 * Visual settings for vision exercises
 * Maps to backend VisualSettings entity
 */
export interface VisualSettings {
  colorScheme?: ColorScheme; // Optional - use original game colors if not specified
  contrast: Contrast; // 0-100 percentage (NOT 0-1)
  fontSize?: number; // pixels (optional)
  scaleFactor?: number; // Pre-calculated scale factor for games (optional)
  visionType?: 'far' | 'near' | 'contrast'; // Vision test type
  speed?: Speed;
  objectSize?: ObjectSize;
}

/**
 * Pass conditions for exercise completion
 */
export interface PassConditions {
  minScore: number;
  minAccuracy: number; // 0-1 range
  maxTime?: number; // seconds
  minMoves?: number;
}

/**
 * Auto-adjustment rules for level management
 */
export interface AutoAdjustmentRules {
  enabled: boolean;
  upThreshold: number; // accuracy threshold to increase level
  downThreshold: number; // accuracy threshold to decrease level
  checkAfterSessions: number; // number of sessions before adjustment
}

// ============ HELPER FUNCTIONS ============

/**
 * Get actual colors from color scheme preset
 * ONLY 4 presets supported: whiteBlack, redBlue, redGreen, custom
 */
export const getColorSchemeConfig = (
  preset: 'whiteBlack' | 'redBlue' | 'redGreen' | 'custom',
  overrides?: Partial<Record<'whiteBlack' | 'redBlue' | 'redGreen', Omit<ColorScheme, 'preset'>>>
): Omit<ColorScheme, 'preset'> => {
  const schemes: Record<string, Omit<ColorScheme, 'preset'>> = {
    whiteBlack: { textColor: '#000000', backgroundColor: '#ffffff' },
    redBlue: { textColor: '#ff0000', backgroundColor: '#0000ff' },
    redGreen: { textColor: '#ff0000', backgroundColor: '#00ff00' },
    custom: { textColor: '#000000', backgroundColor: '#ffffff' },
  };

  const base = schemes[preset] || schemes.whiteBlack;
  const override = overrides?.[preset as 'whiteBlack' | 'redBlue' | 'redGreen'];
  return override ? { ...base, ...override } : base;
};

/**
 * Create full color scheme object
 */
export const createColorScheme = (
  preset: ColorScheme['preset'],
  custom?: Partial<Omit<ColorScheme, 'preset'>>
): ColorScheme => ({
  preset,
  ...getColorSchemeConfig(preset),
  ...custom,
});

/**
 * Default visual settings
 */
export const DEFAULT_VISUAL_SETTINGS: VisualSettings = {
  colorScheme: {
    preset: 'whiteBlack',
    textColor: '#000000',
    backgroundColor: '#ffffff',
  },
  contrast: 100, // 100% (NOT 0.5)
  fontSize: 16,
  speed: 'medium',
  objectSize: 'medium',
};

/**
 * Default pass conditions
 */
export const DEFAULT_PASS_CONDITIONS: PassConditions = {
  minScore: 1000,
  minAccuracy: 0.7,
  maxTime: 600,
  minMoves: 10,
};

/**
 * Default auto-adjustment rules
 */
export const DEFAULT_AUTO_ADJUSTMENT_RULES: AutoAdjustmentRules = {
  enabled: true,
  upThreshold: 0.8,
  downThreshold: 0.5,
  checkAfterSessions: 3,
};

/**
 * Get default visual settings for a level
 */
export const getDefaultVisualSettings = (): VisualSettings => ({
  colorScheme: {
    preset: 'whiteBlack',
    textColor: '#000000',
    backgroundColor: '#ffffff',
  },
  contrast: 100, // 100% (NOT 0.5)
  fontSize: 16,
  speed: 'medium',
  objectSize: 'medium',
});

/**
 * Get default level config (for portal compatibility)
 */
export interface ExerciseLevelConfig {
  level: number;
  visualSettings: VisualSettings;
}

export const getDefaultLevelConfig = (level: number): ExerciseLevelConfig => ({
  level,
  visualSettings: {
    colorScheme: {
      preset: 'whiteBlack',
      textColor: '#000000',
      backgroundColor: '#ffffff',
    },
    contrast: Math.max(50, 100 - (level - 1) * 10), // Decreasing contrast: 100% → 50%
    fontSize: Math.max(16, 32 - level * 3), // Decreasing font size by level
    speed: 'medium',
    objectSize: 'medium',
  },
});

/**
 * Get default color scheme
 */
export const getDefaultColorScheme = (): ColorScheme => ({
  preset: 'whiteBlack',
  textColor: '#000000',
  backgroundColor: '#ffffff',
});

/**
 * Get default pass conditions
 */
export const getDefaultPassConditions = (): PassConditions => ({
  minScore: 1000,
  minAccuracy: 0.7,
  maxTime: 600,
  minMoves: 10,
});
