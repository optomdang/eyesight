import { describe, it, expect } from 'vitest';
import {
  applyDichopticAutoBalanceStep,
  resolveDichopticPresentation,
  tryApplyDichopticAutoBalanceStep,
} from '../dichopticUtils';
import { blendHexAtContrastPercent, blendHexAtLogContrastPercent } from '../clinicalContrastColor';
import type { DichopticConfig } from 'src/types/core/visual-settings';

const balanceConfig: DichopticConfig = {
  mode: 'balance',
  mapping: { redEye: 'left' },
  balance: {
    amblyopicContrastPercent: 100,
    fellowContrastPercent: 20,
    fellowContent: 'none',
    autoBalance: {
      enabled: true,
      stepPercent: 10,
      maxFellowPercent: 80,
      accuracyThreshold: 0.75,
    },
  },
};

describe('dichopticUtils log contrast', () => {
  it('log blend is brighter than linear at low contrast %', () => {
    const linear = blendHexAtContrastPercent('#ff0000', 25, '#000000');
    const log = blendHexAtLogContrastPercent('#ff0000', 25, '#000000');
    const parseR = (hex: string) => parseInt(hex.slice(1, 3), 16);
    expect(parseR(log)).toBeGreaterThan(parseR(linear));
  });

  it('resolveDichopticPresentation uses log curve for balance channels', () => {
    const presentation = resolveDichopticPresentation(
      {
        colorScheme: { preset: 'redBlue', textColor: '#ff0000', backgroundColor: '#0000ff' },
        dichoptic: {
          mode: 'balance',
          mapping: { redEye: 'left' },
          balance: {
            amblyopicContrastPercent: 100,
            fellowContrastPercent: 25,
            fellowContent: 'none',
          },
        },
        eye: 'left',
      },
      { trainingEye: 'left' }
    );
    expect(presentation.ch2ChannelColor).toBe(
      blendHexAtLogContrastPercent('#0000ff', 25, '#000000')
    );
  });
});

describe('tryApplyDichopticAutoBalanceStep', () => {
  it('increases fellow contrast when accuracy meets threshold', () => {
    const next = tryApplyDichopticAutoBalanceStep(balanceConfig, 0.8);
    expect(next?.balance?.fellowContrastPercent).toBe(30);
  });

  it('does not change when accuracy below threshold', () => {
    const next = tryApplyDichopticAutoBalanceStep(balanceConfig, 0.5);
    expect(next).toBe(balanceConfig);
    expect(next?.balance?.fellowContrastPercent).toBe(20);
  });

  it('respects maxFellowPercent cap', () => {
    const high: DichopticConfig = {
      ...balanceConfig,
      balance: {
        ...balanceConfig.balance!,
        fellowContrastPercent: 78,
        autoBalance: { ...balanceConfig.balance!.autoBalance!, maxFellowPercent: 80 },
      },
    };
    const next = applyDichopticAutoBalanceStep(high);
    expect(next.balance?.fellowContrastPercent).toBe(80);
  });
});
