import { Severity } from 'src/types/core';

export const SNACKBAR_SEVERITY: Severity = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  SUCCESS: 'success',
};

export const FONT_MAP = {
  E: 'OptomDangELetterChart',
  C: 'OptomDangLandotC',
  A: 'OptomDangLatinChart',
  N: 'OptomDangNumber',
  S: 'OptomDangLeaChart',
  I: '',
};

export const CHAR_POOL_MAP: { [key: string]: string[] } = {
  C: ['A', 'B', 'C', 'D'],
  E: ['A', 'B', 'C', 'D'],
  A: [
    'A',
    'B',
    'C',
    'D',
    'E',
    'H',
    'K',
    'M',
    'N',
    'S',
    'T',
    'U',
    'V',
    'X',
    'Y', // Bỏ I, O, Q, W, Z
  ],
  N: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  S: ['A', 'B', 'C', 'D'],
};

/**
 * Far Vision Levels based on Snellen Notation
 *
 * Standard: 20/20 = 5 arc minutes = 8.73mm at 6 meters (ISO 8596)
 *
 * n = Snellen denominator × 0.3 (where 0.3 = 6/20 conversion factor)
 * Formula: fontSize = (n / 6) × 8.73mm × (distance / 6m)
 *
 * This formula has been tested and verified in production.
 */
export const farVisionLevels = [
  { level: 1, n: 120, score: '20/400' }, // 400 × 0.3
  { level: 2, n: 96, score: '20/320' }, // 320 × 0.3
  { level: 3, n: 75, score: '20/250' }, // 250 × 0.3
  { level: 4, n: 60, score: '20/200' }, // 200 × 0.3
  { level: 5, n: 48, score: '20/160' }, // 160 × 0.3
  { level: 6, n: 37.5, score: '20/125' }, // 125 × 0.3
  { level: 7, n: 30, score: '20/100' }, // 100 × 0.3
  { level: 8, n: 24, score: '20/80' }, // 80 × 0.3
  { level: 9, n: 18.9, score: '20/63' }, // 63 × 0.3
  { level: 10, n: 15, score: '20/50' }, // 50 × 0.3
  { level: 11, n: 12, score: '20/40' }, // 40 × 0.3
  { level: 12, n: 9.6, score: '20/32' }, // 32 × 0.3
  { level: 13, n: 7.5, score: '20/25' }, // 25 × 0.3
  { level: 14, n: 6, score: '20/20' }, // 20 × 0.3 - Normal vision
  { level: 15, n: 4.8, score: '20/16' }, // 16 × 0.3
  { level: 16, n: 3.75, score: '20/12.5' }, // 12.5 × 0.3
  { level: 17, n: 3, score: '20/10' }, // 10 × 0.3
  { level: 18, n: 2.4, score: '20/8' }, // 8 × 0.3
  { level: 19, n: 1.89, score: '20/6.3' }, // 6.3 × 0.3
  { level: 20, n: 1.5, score: '20/5' }, // 5 × 0.3
];

export const nearVisionLevels = [
  { level: 1, size: 5.8, score: 'N64', mScore: '8M' }, // Index 0: easiest (largest)
  { level: 2, size: 4.35, score: 'N32', mScore: '4M' },
  { level: 3, size: 2.9, score: 'N24', mScore: '3M' },
  { level: 4, size: 2.18, score: 'N16', mScore: '2M' },
  { level: 5, size: 1.81, score: 'N12', mScore: '1.5M' },
  { level: 6, size: 1.45, score: 'N8', mScore: '1M' },
  { level: 7, size: 0.91, score: 'N5', mScore: '0.625M' },
  { level: 8, size: 0.54, score: 'N3', mScore: '0.375M' }, // Index 7: hardest (smallest)
];

export const contrastVisionLevels = [
  { level: 1, size: 1, score: '0.00', contrastPercent: 100 },
  { level: 2, size: 1, score: '0.15', contrastPercent: 70.79 },
  { level: 3, size: 1, score: '0.30', contrastPercent: 50.12 },
  { level: 4, size: 1, score: '0.45', contrastPercent: 35.48 },
  { level: 5, size: 1, score: '0.60', contrastPercent: 25.12 },
  { level: 6, size: 1, score: '0.75', contrastPercent: 17.78 },
  { level: 7, size: 1, score: '0.90', contrastPercent: 12.59 },
  { level: 8, size: 1, score: '1.05', contrastPercent: 8.91 },
  { level: 9, size: 1, score: '1.20', contrastPercent: 6.31 },
  { level: 10, size: 1, score: '1.35', contrastPercent: 4.47 },
  { level: 11, size: 1, score: '1.50', contrastPercent: 3.16 },
  { level: 12, size: 1, score: '1.65', contrastPercent: 2.24 },
  { level: 13, size: 1, score: '1.80', contrastPercent: 1.58 },
  { level: 14, size: 1, score: '1.95', contrastPercent: 1.12 },
  { level: 15, size: 1, score: '2.10', contrastPercent: 0.79 },
  { level: 16, size: 1, score: '2.25', contrastPercent: 0.56 },
];

// Thêm vào file constant.ts
// Stereopsis arcsec thresholds (Titmus RDS — lower = better)
export const stereopsisLevels = [
  { level: 800, score: '800″' },
  { level: 400, score: '400″' },
  { level: 200, score: '200″' },
  { level: 150, score: '150″' },
  { level: 100, score: '100″' },
  { level: 80, score: '80″' },
  { level: 60, score: '60″' },
  { level: 40, score: '40″' },
  { level: 32, score: '32″' },
  { level: 25, score: '25″' },
  { level: 20, score: '20″' },
];

// Chỉ lưu trữ tên file không có đuôi
// Stereopsis: Độ lệch lớn (bd10) = dễ nhìn, độ lệch nhỏ (bd01) = khó nhìn
// Level 1 = bd10 (dễ nhất - 10 arc seconds), Level 10 = bd01 (khó nhất - 1 arc second)
export const stereopsisImages = [
  // Level 1 - Dễ nhất (độ lệch 10 arc seconds - mắt kém nhất vẫn nhìn thấy)
  { level: 1, display: 'bd10s0' },
  { level: 1, display: 'bd10s1' },
  { level: 1, display: 'fd10s0' },
  { level: 1, display: 'fd10s1' },

  // Level 2 (độ lệch 9 arc seconds)
  { level: 2, display: 'bd09s0' },
  { level: 2, display: 'bd09s1' },
  { level: 2, display: 'fd09s0' },
  { level: 2, display: 'fd09s1' },

  // Level 3 (độ lệch 8 arc seconds)
  { level: 3, display: 'bd08s0' },
  { level: 3, display: 'bd08s1' },
  { level: 3, display: 'fd08s0' },
  { level: 3, display: 'fd08s1' },

  // Level 4 (độ lệch 7 arc seconds)
  { level: 4, display: 'bd07s0' },
  { level: 4, display: 'bd07s1' },
  { level: 4, display: 'fd07s0' },
  { level: 4, display: 'fd07s1' },

  // Level 5 (độ lệch 6 arc seconds)
  { level: 5, display: 'bd06s0' },
  { level: 5, display: 'bd06s1' },
  { level: 5, display: 'fd06s0' },
  { level: 5, display: 'fd06s1' },

  // Level 6 (độ lệch 5 arc seconds)
  { level: 6, display: 'bd05s0' },
  { level: 6, display: 'bd05s1' },
  { level: 6, display: 'fd05s0' },
  { level: 6, display: 'fd05s1' },

  // Level 7 (độ lệch 4 arc seconds)
  { level: 7, display: 'bd04s0' },
  { level: 7, display: 'bd04s1' },
  { level: 7, display: 'fd04s0' },
  { level: 7, display: 'fd04s1' },

  // Level 8 (độ lệch 3 arc seconds)
  { level: 8, display: 'bd03s0' },
  { level: 8, display: 'bd03s1' },
  { level: 8, display: 'fd03s0' },
  { level: 8, display: 'fd03s1' },

  // Level 9 (độ lệch 2 arc seconds)
  { level: 9, display: 'bd02s0' },
  { level: 9, display: 'bd02s1' },
  { level: 9, display: 'fd02s0' },
  { level: 9, display: 'fd02s1' },

  // Level 10 - Khó nhất (độ lệch 1 arc second - chỉ mắt tốt mới nhìn thấy)
  { level: 10, display: 'bd01s0' },
  { level: 10, display: 'bd01s1' },
  { level: 10, display: 'fd01s0' },
  { level: 10, display: 'fd01s1' },
];
