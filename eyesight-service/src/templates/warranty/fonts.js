const path = require('path');
const fs = require('fs');

let cachedFontFamily = null;

const resolveFontPath = (filename) =>
  path.join(process.cwd(), 'node_modules', '@fontsource', 'noto-sans', 'files', filename);

/**
 * Register Noto Sans for Vietnamese PDF rendering via @react-pdf/renderer.
 * @returns {Promise<string>} font family name
 */
const getWarrantyPdfFontFamily = async () => {
  if (cachedFontFamily) return cachedFontFamily;

  const { Font } = await import('@react-pdf/renderer');

  const regularPath = resolveFontPath('noto-sans-vietnamese-400-normal.woff');
  const boldPath = resolveFontPath('noto-sans-vietnamese-700-normal.woff');

  if (!fs.existsSync(regularPath) || !fs.existsSync(boldPath)) {
    throw new Error('Noto Sans Vietnamese font files not found for warranty PDF');
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
};
