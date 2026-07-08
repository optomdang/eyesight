import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { BasicConfigFields } from '../BasicConfigFields';

// Mock translation: t(key, fallback) => fallback || key (assertions theo key)
vi.mock('src/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

const baseValues = {
  eye: 'left' as const,
  distance: 3,
  duration: 30,
  frequency: 'daily' as const,
  executionCount: 1,
  inactivityThreshold: 30,
  colorScheme: { preset: 'whiteBlack', textColor: '#000000', backgroundColor: '#FFFFFF' },
  visionType: 'far' as const,
};

const renderFields = (overrides: Partial<typeof baseValues> = {}, onFieldChange = vi.fn()) => {
  render(
    <BasicConfigFields
      values={{ ...baseValues, ...overrides }}
      errors={{}}
      touched={{}}
      onFieldChange={onFieldChange}
    />
  );
  return onFieldChange;
};

// Tìm combobox của ô "Mắt" theo text giá trị đang hiển thị
const getEyeCombobox = (displayedValueKey: string) => {
  const combos = screen.getAllByRole('combobox');
  const match = combos.find((c) => c.textContent === displayedValueKey);
  if (!match) throw new Error(`Không tìm thấy combobox hiển thị "${displayedValueKey}"`);
  return match;
};

describe('BasicConfigFields - lựa chọn mắt theo loại thị lực', () => {
  it('far: dropdown Mắt có option "Cả 2 mắt" (config.eyes.both)', async () => {
    const user = userEvent.setup();
    renderFields({ visionType: 'far', eye: 'left' });

    await user.click(getEyeCombobox('config.eyes.left'));

    const listbox = await screen.findByRole('listbox');
    expect(within(listbox).getByText('config.eyes.right')).toBeInTheDocument();
    expect(within(listbox).getByText('config.eyes.left')).toBeInTheDocument();
    expect(within(listbox).getByText('config.eyes.both')).toBeInTheDocument();
  });

  it('far: chọn "Cả 2 mắt" gọi onFieldChange("eye","both")', async () => {
    const user = userEvent.setup();
    const onFieldChange = renderFields({ visionType: 'far', eye: 'left' });

    await user.click(getEyeCombobox('config.eyes.left'));
    const listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByText('config.eyes.both'));

    expect(onFieldChange).toHaveBeenCalledWith('eye', 'both');
  });

  it('near & contrast cũng có option "Cả 2 mắt"', async () => {
    const user = userEvent.setup();
    renderFields({ visionType: 'near', eye: 'right' });
    await user.click(getEyeCombobox('config.eyes.right'));
    const listbox = await screen.findByRole('listbox');
    expect(within(listbox).getByText('config.eyes.both')).toBeInTheDocument();
  });

  it('stereopsis: ô Mắt hiển thị "Cả 2 mắt" và bị disabled', () => {
    renderFields({ visionType: 'stereopsis', eye: 'both' });

    const combo = getEyeCombobox('config.eyes.both');
    expect(combo).toHaveAttribute('aria-disabled', 'true');
  });

  it('đổi visionType far → stereopsis: ép eye=both', async () => {
    const user = userEvent.setup();
    const onFieldChange = renderFields({ visionType: 'far', eye: 'left' });

    // mở combobox loại thị lực (đang hiển thị "Thị lực xa (Far Vision)")
    await user.click(getEyeCombobox('Thị lực xa (Far Vision)'));
    const listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByText('Thị giác lập thể (Stereopsis)'));

    expect(onFieldChange).toHaveBeenCalledWith('eye', 'both');
  });
});
