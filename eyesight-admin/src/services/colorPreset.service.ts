/**
 * Global anaglyph color preset API (per center, admin-calibrated).
 */

import { getData, putData } from 'src/utils/request';
import type { ColorScheme } from 'src/types/core/visual-settings';

export type ColorPresetKey = 'whiteBlack' | 'redBlue' | 'redGreen' | 'original';

export type ColorPresetMap = Record<
  ColorPresetKey,
  { textColor: string; backgroundColor: string }
>;

let cachedPresets: ColorPresetMap | null = null;
let loadPromise: Promise<ColorPresetMap> | null = null;

const FALLBACK_PRESETS: ColorPresetMap = {
  whiteBlack: { textColor: '#000000', backgroundColor: '#FFFFFF' },
  redBlue: { textColor: '#FF0000', backgroundColor: '#0000FF' },
  redGreen: { textColor: '#FF0000', backgroundColor: '#00FF00' },
  original: { textColor: '#776E65', backgroundColor: '#F9F6F2' },
};

export async function fetchColorSchemePresets(force = false): Promise<ColorPresetMap> {
  if (!force && cachedPresets) return cachedPresets;
  if (!force && loadPromise) return loadPromise;

  loadPromise = getData<ColorPresetMap>('/exercise-configs/color-presets')
    .then((data) => {
      cachedPresets = { ...FALLBACK_PRESETS, ...data };
      return cachedPresets;
    })
    .catch(() => {
      cachedPresets = { ...FALLBACK_PRESETS };
      return cachedPresets;
    })
    .finally(() => {
      loadPromise = null;
    });

  return loadPromise;
}

export function getCachedColorSchemePresets(): ColorPresetMap {
  return cachedPresets ?? FALLBACK_PRESETS;
}

export async function saveColorSchemePreset(
  preset: 'redBlue' | 'redGreen' | 'whiteBlack',
  colors: { textColor: string; backgroundColor: string }
): Promise<ColorPresetMap> {
  const updated = await putData<ColorPresetMap>('/exercise-configs/color-presets', {
    preset,
    textColor: colors.textColor,
    backgroundColor: colors.backgroundColor,
  });
  cachedPresets = { ...FALLBACK_PRESETS, ...updated };
  return cachedPresets;
}

/** Merge global preset calibration into an exercise colorScheme. */
export function resolveExerciseColorScheme(
  scheme: ColorScheme | null | undefined,
  presets?: ColorPresetMap | null
): ColorScheme | null {
  if (!scheme) return null;

  const map = presets ?? getCachedColorSchemePresets();
  const preset = scheme.preset;

  if (preset === 'custom' || preset === 'original') {
    return preset === 'original' ? null : scheme;
  }

  if (preset === 'whiteBlack' || preset === 'redBlue' || preset === 'redGreen') {
    const calibrated = map[preset];
    if (calibrated) {
      return {
        preset,
        textColor: calibrated.textColor,
        backgroundColor: calibrated.backgroundColor,
      };
    }
  }

  return scheme;
}

/** Build colorScheme when user picks a preset in the config form. */
export function isOriginalGameColorScheme(
  scheme: ColorScheme | null | undefined
): boolean {
  return scheme?.preset === 'original';
}

export function colorSchemeFromPreset(
  preset: ColorScheme['preset'],
  presets?: ColorPresetMap | null
): ColorScheme {
  const map = presets ?? getCachedColorSchemePresets();
  if (preset === 'original') {
    const defaults = map.original;
    return {
      preset: 'original',
      textColor: defaults.textColor,
      backgroundColor: defaults.backgroundColor,
    };
  }
  const defaults = map[preset as ColorPresetKey] ?? map.whiteBlack;
  return {
    preset,
    textColor: defaults.textColor,
    backgroundColor: defaults.backgroundColor,
  };
}

export function invalidateColorPresetCache(): void {
  cachedPresets = null;
}
