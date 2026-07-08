/**
 * Unit tests for ImprovementBreakdown (#9 cause-group pie + cause filter).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImprovementBreakdown from '../ImprovementBreakdown';
import { CAUSE_CODES } from 'src/constants/causes';

const data = { improved: 3, stable: 2, declined: 1, total: 6, improvementRate: 50 };

describe('ImprovementBreakdown', () => {
  it('renders the spec title and summary boxes', () => {
    render(
      <ImprovementBreakdown
        data={data}
        selectedCauses={[...CAUSE_CODES]}
        onCausesChange={() => {}}
      />,
    );
    expect(screen.getByText('Tỉ lệ cải thiện theo nhóm nguyên nhân')).toBeInTheDocument();
    expect(screen.getByText('Tỷ lệ cải thiện')).toBeInTheDocument();
    expect(screen.getAllByText('50%').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Tổng bệnh nhân')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('renders a selected cause CODE as its Vietnamese LABEL in the dropdown', () => {
    render(
      <ImprovementBreakdown
        data={data}
        selectedCauses={['strabismus']}
        onCausesChange={() => {}}
      />,
    );
    expect(screen.getByText('Lác/Lé')).toBeInTheDocument();
    expect(screen.queryByText('strabismus')).not.toBeInTheDocument();
  });

  it('lists all causes in the dropdown and emits the CODE on select', async () => {
    const onCausesChange = vi.fn();
    render(
      <ImprovementBreakdown data={data} selectedCauses={[]} onCausesChange={onCausesChange} />,
    );

    await userEvent.click(screen.getByRole('combobox'));
    const listbox = within(screen.getByRole('listbox'));
    expect(listbox.getByText('Tật khúc xạ')).toBeInTheDocument();
    expect(listbox.getByText('Lác/Lé')).toBeInTheDocument();
    expect(listbox.getByText('Đục thuỷ tinh thể')).toBeInTheDocument();
    expect(listbox.getByText('Bệnh lý đáy mắt')).toBeInTheDocument();

    await userEvent.click(listbox.getByText('Sụp mi'));
    expect(onCausesChange).toHaveBeenCalledWith(['ptosis']);
  });
});
