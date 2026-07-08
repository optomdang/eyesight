import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PatientKPICards from '../PatientKPICards';
import type { PatientKPIData } from 'src/types/admin/dashboard';

describe('PatientKPICards', () => {
  const mockData: PatientKPIData = {
    totalPatients: 50,
    activePatients: 45,
    improvementRate: 73,
    avgImprovementLevel: 7.3,
    minAge: 12,
    maxAge: 45,
    avgAge: 28.5,
  };

  it('renders loading skeleton when loading is true', () => {
    const { container } = render(<PatientKPICards data={null} loading={true} />);
    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders null when no data and not loading', () => {
    const { container } = render(<PatientKPICards data={null} loading={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders all 5 KPI cards with correct data', () => {
    render(<PatientKPICards data={mockData} loading={false} />);

    expect(screen.getByText('BỆNH NHÂN')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();

    expect(screen.getByText('ĐANG ĐIỀU TRỊ')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();

    expect(screen.getByText('TỶ LỆ CẢI THIỆN')).toBeInTheDocument();
    expect(screen.getByText('73%')).toBeInTheDocument();

    expect(screen.getByText('MỨC ĐỘ CẢI THIỆN')).toBeInTheDocument();
    expect(screen.getByText('+7.3')).toBeInTheDocument();
    expect(
      screen.getByText('Số dòng thị lực xa cải thiện trung bình (chỉ BN đã cải thiện)'),
    ).toBeInTheDocument();

    expect(screen.getByText('ĐỘ TUỔI')).toBeInTheDocument();
    expect(screen.getByText('Min: 12')).toBeInTheDocument();
    expect(screen.getByText('Max: 45')).toBeInTheDocument();
    expect(screen.getByText('Avg: 28.5')).toBeInTheDocument();
  });

  it('handles zero values correctly', () => {
    const zeroData: PatientKPIData = {
      totalPatients: 0,
      activePatients: 0,
      improvementRate: 0,
      avgImprovementLevel: 0,
      minAge: 0,
      maxAge: 0,
      avgAge: 0,
    };

    render(<PatientKPICards data={zeroData} loading={false} />);

    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('+0.0')).toBeInTheDocument();
    expect(screen.getByText('Min: 0')).toBeInTheDocument();
    expect(screen.getByText('Max: 0')).toBeInTheDocument();
    expect(screen.getByText('Avg: 0.0')).toBeInTheDocument();
  });

  it('handles undefined values with fallback to 0', () => {
    const partialData: PatientKPIData = {};

    render(<PatientKPICards data={partialData} loading={false} />);

    expect(screen.getByText('BỆNH NHÂN')).toBeInTheDocument();
    const zeroElements = screen.getAllByText('0');
    expect(zeroElements.length).toBeGreaterThan(0);
  });

  it('formats large numbers correctly', () => {
    const largeData: PatientKPIData = {
      totalPatients: 10000,
      activePatients: 8500,
      improvementRate: 95,
      avgImprovementLevel: 12.8,
      minAge: 8,
      maxAge: 72,
      avgAge: 34.2,
    };

    render(<PatientKPICards data={largeData} loading={false} />);

    expect(screen.getByText(/10[,.]?000/)).toBeInTheDocument();
    expect(screen.getByText(/8[,.]?500/)).toBeInTheDocument();
  });

  it('applies hover effect styles', () => {
    const { container } = render(<PatientKPICards data={mockData} loading={false} />);
    const cards = container.querySelectorAll('.MuiCard-root');

    expect(cards.length).toBe(5);

    cards.forEach((card) => {
      expect(card).toHaveStyle({ height: '100%' });
    });
  });

  it('renders with correct grid layout (2.4 columns each)', () => {
    const { container } = render(<PatientKPICards data={mockData} loading={false} />);
    const gridItems = container.querySelectorAll('[class*="MuiGrid-root"]');

    expect(gridItems.length).toBeGreaterThanOrEqual(5);
  });
});
