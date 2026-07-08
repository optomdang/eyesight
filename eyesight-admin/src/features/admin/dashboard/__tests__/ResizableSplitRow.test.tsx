import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ResizableSplitRow from '../ResizableSplitRow';

const theme = createTheme();

const mockMatchMedia = (matches: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

const renderSplit = () =>
  render(
    <ThemeProvider theme={theme}>
      <ResizableSplitRow
        storageKey="test-split-ratio"
        left={<div>Chart panel</div>}
        right={<div>Leaderboard panel</div>}
      />
    </ThemeProvider>,
  );

describe('ResizableSplitRow', () => {
  beforeEach(() => {
    mockMatchMedia(true);
    window.localStorage.clear();
  });

  it('renders both panels side by side on large screens', () => {
    renderSplit();
    expect(screen.getByText('Chart panel')).toBeInTheDocument();
    expect(screen.getByText('Leaderboard panel')).toBeInTheDocument();
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('stacks panels vertically on small screens', () => {
    mockMatchMedia(false);
    renderSplit();
    expect(screen.getByText('Chart panel')).toBeInTheDocument();
    expect(screen.getByText('Leaderboard panel')).toBeInTheDocument();
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });

  it('updates split ratio when dragging the handle', () => {
    renderSplit();

    const separator = screen.getByRole('separator');
    const container = separator.parentElement;
    expect(container).toBeTruthy();
    Object.defineProperty(container, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 1000,
        bottom: 400,
        width: 1000,
        height: 400,
        toJSON: () => ({}),
      }),
    });

    fireEvent.mouseDown(separator, { clientX: 500 });
    fireEvent.mouseMove(window, { clientX: 700 });
    fireEvent.mouseUp(window);

    expect(window.localStorage.getItem('test-split-ratio')).not.toBe('0.5');
  });
});
