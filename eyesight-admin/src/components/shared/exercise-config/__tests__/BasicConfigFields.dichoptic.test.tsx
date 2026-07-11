import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BasicConfigFields } from '../BasicConfigFields';

vi.mock('src/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

vi.mock('src/contexts/UseSnackbar', () => ({
  default: () => ({ showSnackbar: vi.fn() }),
}));

vi.mock('src/services/colorPreset.service', () => ({
  fetchColorSchemePresets: vi.fn().mockResolvedValue({}),
  colorSchemeFromPreset: vi.fn(),
  saveColorSchemePreset: vi.fn(),
  isOriginalGameColorScheme: vi.fn().mockReturnValue(false),
}));

const baseValues = {
  eye: 'both' as const,
  distance: 3,
  duration: 30,
  frequency: 'daily' as const,
  executionCount: 1,
  inactivityThreshold: 30,
  colorScheme: { preset: 'redBlue' as const, textColor: '#ff0000', backgroundColor: '#0000ff' },
  visionType: 'far' as const,
  dichoptic: {
    mode: 'balance' as const,
    mapping: { redEye: 'left' as const },
    balance: {
      amblyopicContrastPercent: 100,
      fellowContrastPercent: 5,
      fellowContent: 'none' as const,
    },
  },
};

describe('BasicConfigFields dichoptic warnings', () => {
  it('shows warning when balance + eye both + unsupported exercise type', () => {
    render(
      <BasicConfigFields
        values={baseValues}
        errors={{}}
        touched={{}}
        onFieldChange={vi.fn()}
        exerciseType="vt-gabor"
      />
    );

    expect(screen.getByText(/Cả 2 mắt/)).toBeInTheDocument();
    expect(screen.getByText(/Gabor/)).toBeInTheDocument();
  });
});
