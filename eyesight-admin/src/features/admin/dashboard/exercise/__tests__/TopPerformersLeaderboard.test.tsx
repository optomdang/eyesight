import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TopPerformersLeaderboard from '../TopPerformersLeaderboard';

describe('TopPerformersLeaderboard', () => {
  // Aligned to BE getLeaderboard (#7): completionRate / focusScore / improvementLines / recoveryPct.
  // Distinct numbers per column so getByText is unambiguous.
  const mockPerformers = [
    {
      patientCode: 'PT001',
      patientName: 'Nguyễn Văn A',
      completionRate: 96,
      focusScore: 95,
      improvementLines: 5.2,
      recoveryPct: 100,
    },
    {
      patientCode: 'PT002',
      patientName: 'Trần Thị B',
      completionRate: 87,
      focusScore: 88,
      improvementLines: 4.8,
      recoveryPct: 80,
    },
    {
      patientCode: 'PT003',
      patientName: 'Lê Văn C',
      completionRate: 79,
      focusScore: 82,
      improvementLines: 3.5,
      recoveryPct: 40,
    },
  ];

  it('renders loading state', () => {
    render(<TopPerformersLeaderboard data={[]} loading />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders empty state when no data', () => {
    render(<TopPerformersLeaderboard data={[]} loading={false} />);
    expect(screen.getByText('Chưa có dữ liệu')).toBeInTheDocument();
  });

  it('renders the spec columns (HOÀN THÀNH / TẬP TRUNG / CẢI THIỆN / PHỤC HỒI)', () => {
    render(<TopPerformersLeaderboard data={mockPerformers} loading={false} />);
    expect(screen.getByText('Bảng Xếp Hạng')).toBeInTheDocument();
    expect(screen.getByText('HẠNG')).toBeInTheDocument();
    expect(screen.getByText('BỆNH NHÂN')).toBeInTheDocument();
    expect(screen.getByText('HOÀN THÀNH')).toBeInTheDocument();
    expect(screen.getByText('TẬP TRUNG')).toBeInTheDocument();
    expect(screen.getByText('CẢI THIỆN')).toBeInTheDocument();
    expect(screen.getByText('PHỤC HỒI')).toBeInTheDocument();
  });

  it('shows metric tooltips with meaning on column headers', async () => {
    const user = userEvent.setup();
    render(<TopPerformersLeaderboard data={mockPerformers} loading={false} />);

    await user.hover(screen.getByText('PHỤC HỒI'));

    expect(
      await screen.findByText(/Thị lực nhìn xa hiện tại so với chuẩn 20\/20/)
    ).toBeInTheDocument();
    expect(screen.queryByText(/Cách tính:/)).not.toBeInTheDocument();
  });

  it('displays names and codes', () => {
    render(<TopPerformersLeaderboard data={mockPerformers} loading={false} />);
    expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
    expect(screen.getByText('PT001')).toBeInTheDocument();
    expect(screen.getByText('Trần Thị B')).toBeInTheDocument();
  });

  it('shows HOÀN THÀNH % (completionRate)', () => {
    render(<TopPerformersLeaderboard data={mockPerformers} loading={false} />);
    expect(screen.getByText('96%')).toBeInTheDocument();
    expect(screen.getByText('87%')).toBeInTheDocument();
    expect(screen.getByText('79%')).toBeInTheDocument();
  });

  it('shows TẬP TRUNG % (focusScore)', () => {
    render(<TopPerformersLeaderboard data={mockPerformers} loading={false} />);
    expect(screen.getByText('95%')).toBeInTheDocument();
    expect(screen.getByText('88%')).toBeInTheDocument();
    expect(screen.getByText('82%')).toBeInTheDocument();
  });

  it('shows CẢI THIỆN with + prefix (improvementLines)', () => {
    render(<TopPerformersLeaderboard data={mockPerformers} loading={false} />);
    expect(screen.getByText('+5.2')).toBeInTheDocument();
    expect(screen.getByText('+4.8')).toBeInTheDocument();
    expect(screen.getByText('+3.5')).toBeInTheDocument();
  });

  it('shows PHỤC HỒI % (recoveryPct)', () => {
    render(<TopPerformersLeaderboard data={mockPerformers} loading={false} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
  });

  it('renders "-" for null recoveryPct', () => {
    render(
      <TopPerformersLeaderboard
        data={[
          {
            patientCode: 'PT9',
            patientName: 'No Recovery',
            completionRate: 50,
            focusScore: 70,
            improvementLines: 0,
            recoveryPct: null,
          },
        ]}
        loading={false}
      />,
    );
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('formats a NEGATIVE improvement without a double sign (declined patient)', () => {
    render(
      <TopPerformersLeaderboard
        data={[
          {
            patientCode: 'PT_DOWN',
            patientName: 'Declined',
            completionRate: 84,
            focusScore: 98,
            improvementLines: -2,
            recoveryPct: 32,
          },
        ]}
        loading={false}
      />,
    );
    expect(screen.getByText('-2.0')).toBeInTheDocument();
    expect(screen.queryByText('+-2.0')).not.toBeInTheDocument();
  });

  it('limits display to top 10', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      patientCode: `PT${i.toString().padStart(3, '0')}`,
      patientName: `Patient ${i}`,
      completionRate: 100 - i,
      focusScore: 90 - i,
      improvementLines: 5 - i * 0.1,
      recoveryPct: 100 - i,
    }));
    const { container } = render(<TopPerformersLeaderboard data={many} loading={false} />);
    expect(container.querySelectorAll('tbody tr').length).toBeLessThanOrEqual(10);
  });
});
