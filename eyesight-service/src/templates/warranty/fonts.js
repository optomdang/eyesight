const path = require('path');
const fs = require('fs');

let cachedFontFamily = null;

const resolveNotoFontPath = (filename) => {
  const packageJsonPath = require.resolve('@fontsource/noto-sans/package.json');
  return path.join(path.dirname(packageJsonPath), 'files', filename);
};

const findExistingFontPair = (pairs) =>
  pairs.find(({ regular, bold }) => regular && bold && fs.existsSync(regular) && fs.existsSync(bold));

/**
 * Register Arial when available, fallback to Noto Sans Vietnamese for safe PDF rendering.
 * Uses require.resolve for Noto paths so font lookup works regardless of process.cwd().
 * @returns {Promise<string>} font family name
 */
const getWarrantyPdfFontFamily = async () => {
  if (cachedFontFamily) return cachedFontFamily;

  const { Font } = await import('@react-pdf/renderer');

  const arialPair = findExistingFontPair([
    {
      regular: process.env.WARRANTY_PDF_FONT_REGULAR || '',
      bold: process.env.WARRANTY_PDF_FONT_BOLD || '',
    },
    {
      regular: '/Library/Fonts/Arial.ttf',
      bold: '/Library/Fonts/Arial Bold.ttf',
    },
    {
      regular: '/System/Library/Fonts/Supplemental/Arial.ttf',
      bold: '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
    },
    {
      regular: 'C:\\Windows\\Fonts\\arial.ttf',
      bold: 'C:\\Windows\\Fonts\\arialbd.ttf',
    },
  ]);

  if (arialPair) {
    Font.register({
      family: 'Arial',
      fonts: [
        { src: arialPair.regular, fontWeight: 400 },
        { src: arialPair.bold, fontWeight: 700 },
      ],
    });

    cachedFontFamily = 'Arial';
    return cachedFontFamily;
  }

  const regularPath = resolveNotoFontPath('noto-sans-vietnamese-400-normal.woff');
  const boldPath = resolveNotoFontPath('noto-sans-vietnamese-700-normal.woff');

  if (!fs.existsSync(regularPath) || !fs.existsSync(boldPath)) {
    throw new Error(
      `Noto Sans Vietnamese font files not found for warranty PDF (regular=${regularPath}, bold=${boldPath})`
    );
  }

  Font.register({
    family: 'NotoSansVietnamese',
    fonts: [
      { src: regularPath, fontWeight: 400 },
      { src: boldPath, fontWeight: 700 },
    ],
  });

  cachedFontFamily = 'NotoSansVietnamese';
  return cachedFontFamily;
};

module.exports = {
  getWarrantyPdfFontFamily,
  resolveNotoFontPath,
};
