import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import SignaturePad from '../SignaturePad';

const theme = createTheme();

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
});

describe('SignaturePad', () => {
  it('renders canvas and clear button', () => {
    render(
      <ThemeProvider theme={theme}>
        <SignaturePad />
      </ThemeProvider>
    );

    expect(screen.getByLabelText('Vùng ký tên')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Xóa chữ ký/i })).toBeInTheDocument();
  });

  it('reports empty state via ref', () => {
    const ref = { current: null as import('../SignaturePad').SignaturePadHandle | null };

    render(
      <ThemeProvider theme={theme}>
        <SignaturePad
          ref={(r) => {
            ref.current = r;
          }}
        />
      </ThemeProvider>
    );

    expect(ref.current?.isEmpty()).toBe(true);
    expect(ref.current?.toDataUrl()).toBeNull();
  });

  it('renders clear button as enabled by default', () => {
    render(
      <ThemeProvider theme={theme}>
        <SignaturePad />
      </ThemeProvider>
    );

    expect(screen.getByRole('button', { name: /Xóa chữ ký/i })).toBeEnabled();
  });
});
