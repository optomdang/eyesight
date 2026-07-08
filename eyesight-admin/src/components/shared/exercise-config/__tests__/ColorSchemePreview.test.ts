import { describe, it, expect } from 'vitest';
import { lensLuminance, simulateAnaglyphLens } from 'src/components/shared/exercise-config/ColorSchemePreview';

describe('ColorSchemePreview anaglyph simulation', () => {
  it('pure blue is invisible through red lens', () => {
    expect(lensLuminance('#0000FF', 'red')).toBe(0);
    expect(simulateAnaglyphLens('#0000FF', 'red')).toBe('rgb(0, 0, 0)');
  });

  it('pure red is invisible through blue lens', () => {
    expect(lensLuminance('#FF0000', 'blue')).toBe(0);
  });

  it('red channel visible through red lens', () => {
    expect(lensLuminance('#FF0000', 'red')).toBe(255);
  });
});
