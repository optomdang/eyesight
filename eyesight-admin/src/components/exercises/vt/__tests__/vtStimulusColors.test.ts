import { describe, it, expect } from 'vitest';
import {
  alternatingLetterColors,
  colorAtContrastPercent,
  crowdingReferenceLetterOffsetPx,
  isAnaglyphExerciseColorScheme,
  isVtColoredStimulusScheme,
  randomAnaglyphLetterColors,
  resolveVtStimulusColorScheme,
} from '../core/vtStimulusColors';

describe('vtStimulusColors', () => {
  it('detects non-default color schemes', () => {
    expect(isVtColoredStimulusScheme({ preset: 'whiteBlack', textColor: '#000', backgroundColor: '#fff' })).toBe(false);
    expect(isVtColoredStimulusScheme({ preset: 'redBlue', textColor: '#ff0000', backgroundColor: '#0000ff' })).toBe(true);
  });

  it('resolves color1/color2 from scheme', () => {
    const scheme = resolveVtStimulusColorScheme({
      preset: 'redBlue',
      textColor: '#ff0000',
      backgroundColor: '#0000ff',
    });
    expect(scheme?.color1).toBe('#ff0000');
    expect(scheme?.color2).toBe('#0000ff');
  });

  it('alternates 3 letter colors', () => {
    const colors = alternatingLetterColors(3, '#ff0000', '#0000ff', 100);
    expect(colors).toHaveLength(3);
    expect(colors[0]).toBe('#ff0000');
    expect(colors[1]).toBe('#0000ff');
    expect(colors[2]).toBe('#ff0000');
  });

  it('alternates 2 letter colors', () => {
    const colors = alternatingLetterColors(2, '#ff0000', '#0000ff', 100);
    expect(colors).toEqual(['#ff0000', '#0000ff']);
  });

  it('reduces contrast toward black background', () => {
    const muted = colorAtContrastPercent('#ff0000', 50, '#000000');
    expect(muted).not.toBe('#ff0000');
    expect(muted).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('anaglyph preset detection is redBlue/redGreen only', () => {
    expect(isAnaglyphExerciseColorScheme({ preset: 'redBlue', textColor: '#f00', backgroundColor: '#00f' })).toBe(true);
    expect(isAnaglyphExerciseColorScheme({ preset: 'redGreen', textColor: '#f00', backgroundColor: '#0f0' })).toBe(true);
    expect(isAnaglyphExerciseColorScheme({ preset: 'whiteBlack', textColor: '#f00', backgroundColor: '#00f' })).toBe(false);
    expect(isAnaglyphExerciseColorScheme({ textColor: '#f00', backgroundColor: '#00f' })).toBe(false);
  });

  it('randomAnaglyphLetterColors always uses both colours', () => {
    const seq = [0.1, 0.1, 0.9, 0.1];
    let i = 0;
    const rnd = () => seq[i++ % seq.length];

    const three = randomAnaglyphLetterColors(3, '#ff0000', '#0000ff', 100, rnd);
    expect(new Set(three).size).toBe(2);
    expect(three.filter((c) => c === '#ff0000').length).toBeGreaterThan(0);
    expect(three.filter((c) => c === '#0000ff').length).toBeGreaterThan(0);

    const two = randomAnaglyphLetterColors(2, '#ff0000', '#0000ff', 100, () => 0.9);
    expect(two).toEqual(['#0000ff', '#ff0000']);
  });

  it('randomAnaglyphLetterColors can differ from fixed alternating pattern', () => {
    const alt = alternatingLetterColors(3, '#ff0000', '#0000ff', 100);
    const shuffled = randomAnaglyphLetterColors(3, '#ff0000', '#0000ff', 100, () => 0.1);
    expect(shuffled).not.toEqual(alt);
  });

  it('crowdingReferenceLetterOffsetPx matches signal outer span in anaglyph mode', () => {
    expect(crowdingReferenceLetterOffsetPx(40, false)).toBe(20);
    expect(crowdingReferenceLetterOffsetPx(40, true)).toBe(40);
  });
});
