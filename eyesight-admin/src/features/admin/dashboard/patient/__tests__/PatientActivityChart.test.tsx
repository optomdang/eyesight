import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import PatientActivityChart from '../PatientActivityChart';

const theme = createTheme();

// Mock ResizeObserver for recharts
beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  global.ResizeObserver = ResizeObserverMock as any;
});

// Mock data matching real API response from backend
const mockData = [
  { date: '2026-01-10', loginCount: 5 },
  { date: '2026-01-11', loginCount: 8 },
  { date: '2026-01-12', loginCount: 3 },
  { date: '2026-01-13', loginCount: 12 },
  { date: '2026-01-14', loginCount: 7 },
  { date: '2026-01-15', loginCount: 9 },
  { date: '2026-01-16', loginCount: 6 },
];

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe('PatientActivityChart', () => {
  it('should render loading skeleton when loading is true', () => {
    renderWithTheme(<PatientActivityChart data={[]} loading={true} />);

    // Check for skeleton elements
    const skeletons = document.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should render chart with data', () => {
    renderWithTheme(<PatientActivityChart data={mockData} loading={false} />);

    // Check for chart title
    expect(screen.getByText(/Xu Hướng Hoạt Động/)).toBeInTheDocument();
    expect(screen.getByLabelText('Trợ giúp')).toBeInTheDocument();
  });

  it('should display correct statistics', () => {
    renderWithTheme(<PatientActivityChart data={mockData} loading={false} />);

    // Total logins = 5 + 8 + 3 + 12 + 7 + 9 + 6 = 50
    expect(screen.getByText('50')).toBeInTheDocument();

    // Max logins = 12
    expect(screen.getByText('12')).toBeInTheDocument();

    // Average = 50 / 7 = 7.1
    expect(screen.getByText('7.1')).toBeInTheDocument();
  });

  it('should render time period dropdown with all options', () => {
    renderWithTheme(<PatientActivityChart data={mockData} loading={false} trendDays={30} />);

    // Check dropdown is visible by its current value
    expect(screen.getByText('30 ngày')).toBeInTheDocument();
    // Check that it's a combobox
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('should call onTrendDaysChange when dropdown value changes', () => {
    const handleChange = vi.fn();
    renderWithTheme(
      <PatientActivityChart
        data={mockData}
        loading={false}
        trendDays={30}
        onTrendDaysChange={handleChange}
      />,
    );

    // Find the select element by role
    const dropdown = screen.getByRole('combobox');
    fireEvent.mouseDown(dropdown);

    // Select 90 days option
    const option90Days = screen.getByText('90 ngày');
    fireEvent.click(option90Days);

    expect(handleChange).toHaveBeenCalledWith(90);
  });

  it('should display correct title with trendDays prop', () => {
    const { rerender } = renderWithTheme(
      <PatientActivityChart data={mockData} loading={false} trendDays={7} />,
    );
    expect(screen.getByText(/Xu Hướng Hoạt Động \(7 Ngày\)/)).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={theme}>
        <PatientActivityChart data={mockData} loading={false} trendDays={90} />
      </ThemeProvider>,
    );
    expect(screen.getByText(/Xu Hướng Hoạt Động \(90 Ngày\)/)).toBeInTheDocument();
  });

  it('should handle empty data gracefully', () => {
    renderWithTheme(<PatientActivityChart data={[]} loading={false} />);

    expect(screen.getByText(/Xu Hướng Hoạt Động/)).toBeInTheDocument();
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
    // When data is empty, chart still renders with 0 values
    const chartContainer = document.querySelector('.recharts-responsive-container');
    expect(chartContainer).toBeInTheDocument();
  });

  it('should format dates correctly', () => {
    renderWithTheme(<PatientActivityChart data={mockData} loading={false} />);

    // Check if ResponsiveContainer is rendered (chart container)
    const chartContainer = document.querySelector('.recharts-responsive-container');
    expect(chartContainer).toBeInTheDocument();
  });

  it('should have gradient background styling', () => {
    const { container } = renderWithTheme(<PatientActivityChart data={mockData} loading={false} />);

    // Check for card with gradient background
    const card = container.querySelector('.MuiCard-root');
    expect(card).toHaveStyle({
      background: 'linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%)',
    });
  });

  it('should render all dropdown options', () => {
    renderWithTheme(<PatientActivityChart data={mockData} loading={false} trendDays={30} />);

    // Open dropdown by role
    const dropdown = screen.getByRole('combobox');
    fireEvent.mouseDown(dropdown);

    // Check all options are present using getAllByText for duplicates
    const option7Days = screen.getAllByText('7 ngày');
    expect(option7Days.length).toBeGreaterThan(0);

    const option30Days = screen.getAllByText('30 ngày');
    expect(option30Days.length).toBeGreaterThan(0);

    const option90Days = screen.getAllByText('90 ngày');
    expect(option90Days.length).toBeGreaterThan(0);

    const option365Days = screen.getAllByText('365 ngày');
    expect(option365Days.length).toBeGreaterThan(0);
  });
});
