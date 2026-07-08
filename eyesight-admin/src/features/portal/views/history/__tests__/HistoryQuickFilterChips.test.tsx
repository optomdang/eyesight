import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HistoryQuickFilterChips, { QuickFilterOption } from '../HistoryQuickFilterChips';

describe('HistoryQuickFilterChips', () => {
  const options: QuickFilterOption[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'far', label: 'Nhìn xa', value: 'far' },
    { key: 'near', label: 'Nhìn gần', value: 'near' },
  ];

  it('renders all filter chips', () => {
    render(
      <HistoryQuickFilterChips options={options} activeKey="all" onChange={vi.fn()} />
    );

    expect(screen.getByText('Tất cả')).toBeInTheDocument();
    expect(screen.getByText('Nhìn xa')).toBeInTheDocument();
    expect(screen.getByText('Nhìn gần')).toBeInTheDocument();
  });

  it('calls onChange with selected option', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <HistoryQuickFilterChips options={options} activeKey="all" onChange={onChange} />
    );

    await user.click(screen.getByText('Nhìn xa'));

    expect(onChange).toHaveBeenCalledWith({
      key: 'far',
      label: 'Nhìn xa',
      value: 'far',
    });
  });
});
