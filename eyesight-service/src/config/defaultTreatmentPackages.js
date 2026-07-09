/**
 * System-default treatment packages provisioned per center.
 * exerciseModeNames reference DEFAULT_EXERCISE_MODES.name on that center.
 *
 * Tier sizes: Standard 5 → Pro 8 → Ultra 11 → Ultimate 15 (all catalog modes).
 */

const NEAR_CORE = ['2048 - N', 'ODETS - N', 'Gabor - N', 'Vernier - N', 'Crowding - N'];

const PRO_EXTRA = ['2048 (D-Max)', 'ODETS - (D-Max)', 'Stereopsis'];

const ULTRA_EXTRA = ['2048 -NC', 'ODETS - NC', 'Gabor - (D-Max)'];

const ULTIMATE_EXTRA = ['2048 (DC-Max)', 'ODETS - (DC-Max)', 'Vernier - (D-Max)', 'Crowding - (D-Max)'];

/** @type {{ code: string, name: string, durationDays: number, exerciseModeNames: string[] }[]} */
const DEFAULT_TREATMENT_PACKAGES = [
  {
    code: 'AMBLYOPIA_STANDARD',
    name: 'Amblyopia Standard',
    durationDays: 365,
    exerciseModeNames: [...NEAR_CORE],
  },
  {
    code: 'AMBLYOPIA_PRO',
    name: 'Amblyopia Pro',
    durationDays: 365,
    exerciseModeNames: [...NEAR_CORE, ...PRO_EXTRA],
  },
  {
    code: 'AMBLYOPIA_ULTRA',
    name: 'Amblyopia Ultra',
    durationDays: 365,
    exerciseModeNames: [...NEAR_CORE, ...PRO_EXTRA, ...ULTRA_EXTRA],
  },
  {
    code: 'AMBLYOPIA_ULTIMATE',
    name: 'Amblyopia Ultimate',
    durationDays: 365,
    exerciseModeNames: [...NEAR_CORE, ...PRO_EXTRA, ...ULTRA_EXTRA, ...ULTIMATE_EXTRA],
  },
];

module.exports = {
  DEFAULT_TREATMENT_PACKAGES,
};
