const fs = require('fs');
const { resolveNotoFontPath } = require('../../../src/templates/warranty/fonts');

describe('warranty PDF fonts', () => {
  test('resolveNotoFontPath points at bundled Vietnamese woff files', () => {
    const regularPath = resolveNotoFontPath('noto-sans-vietnamese-400-normal.woff');
    const boldPath = resolveNotoFontPath('noto-sans-vietnamese-700-normal.woff');

    expect(fs.existsSync(regularPath)).toBe(true);
    expect(fs.existsSync(boldPath)).toBe(true);
    expect(regularPath).toContain('@fontsource/noto-sans');
  });
});
