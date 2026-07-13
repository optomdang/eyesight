/**
 * BUG-08 regression tests: JwtContext initialize() must reject suspended users.
 * user.active=false returned from /me must result in isAuthenticated=false,
 * even when the access token is still locally valid (not expired).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

// vi.hoisted ensures mock values are available before module imports are hoisted
const mockIsValidToken = vi.hoisted(() => vi.fn());
const mockClearSession = vi.hoisted(() => vi.fn());
const mockGetAccessToken = vi.hoisted(() => vi.fn());
const mockGetRefreshToken = vi.hoisted(() => vi.fn());
const mockGetData = vi.hoisted(() => vi.fn());
const mockRefreshAccessToken = vi.hoisted(() => vi.fn());

vi.mock('src/utils/Jwt', () => ({
  isValidToken: mockIsValidToken,
  clearSession: mockClearSession,
  getAccessToken: mockGetAccessToken,
  getRefreshToken: mockGetRefreshToken,
  getTokenExpiryMs: vi.fn(() => Date.now() + 60_000),
  setSession: vi.fn(),
}));
vi.mock('src/utils/request', () => ({
  getData: mockGetData,
  postData: vi.fn(),
  patchData: vi.fn(),
  deleteData: vi.fn(),
  refreshAccessToken: mockRefreshAccessToken,
  axiosClient: { post: vi.fn() },
}));
vi.mock('src/utils/firebase', () => ({
  deleteFCMToken: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('src/contexts/UseSnackbar', () => ({
  default: () => ({ showSnackbar: vi.fn() }),
}));

import { AuthProvider } from '../JwtContext';
import useAuth from '../useAuth';

function AuthStateInspector() {
  const state = useAuth();
  return (
    <div>
      <span data-testid="authenticated">{String(state.isAuthenticated)}</span>
      <span data-testid="initialized">{String((state as any).isInitialized ?? false)}</span>
      <span data-testid="userId">{String(state.user?.id ?? 'none')}</span>
    </div>
  );
}

function renderWithAuth() {
  return render(
    <AuthProvider>
      <AuthStateInspector />
    </AuthProvider>
  );
}

describe('JwtContext - initialize()', () => {
  beforeEach(() => {
    mockIsValidToken.mockReturnValue(false);
    mockGetAccessToken.mockReturnValue(null);
    mockGetRefreshToken.mockReturnValue(null);
    mockClearSession.mockImplementation(() => undefined);
    mockRefreshAccessToken.mockReset();
  });

  it('sets isAuthenticated=false when no token is in storage', async () => {
    renderWithAuth();

    await waitFor(() =>
      expect(screen.getByTestId('initialized').textContent).toBe('true')
    );
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(mockGetData).not.toHaveBeenCalled();
  });

  it('sets isAuthenticated=true for an active user with valid token', async () => {
    mockGetAccessToken.mockReturnValue('valid-token');
    mockIsValidToken.mockReturnValue(true);
    mockGetData.mockResolvedValue({
      id: 1,
      email: 'doctor@test.com',
      userType: 'doctor',
      active: true,
    });

    renderWithAuth();

    await waitFor(() =>
      expect(screen.getByTestId('initialized').textContent).toBe('true')
    );
    expect(screen.getByTestId('authenticated').textContent).toBe('true');
    expect(screen.getByTestId('userId').textContent).toBe('1');
  });

  it('refreshes access token on init when access is expired but refresh is valid', async () => {
    mockGetAccessToken.mockReturnValue('expired-token');
    mockGetRefreshToken.mockReturnValue('valid-refresh-token');
    mockIsValidToken.mockImplementation((token: string) => token === 'valid-refresh-token');
    mockRefreshAccessToken.mockResolvedValue('fresh-access-token');
    mockGetData.mockResolvedValue({
      id: 2,
      email: 'patient@test.com',
      userType: 'patient',
      active: true,
    });

    renderWithAuth();

    await waitFor(() =>
      expect(screen.getByTestId('authenticated').textContent).toBe('true')
    );
    expect(mockRefreshAccessToken).toHaveBeenCalledTimes(1);
    expect(mockGetData).toHaveBeenCalledWith('/me');
  });

  // BUG-08 regression: suspended users must be blocked even when their token is still valid
  it('BUG-08: isAuthenticated=false when /me returns user.active=false', async () => {
    mockGetAccessToken.mockReturnValue('still-valid-but-suspended');
    mockIsValidToken.mockReturnValue(true);
    mockGetData.mockResolvedValue({
      id: 42,
      email: 'suspended@test.com',
      userType: 'patient',
      active: false,
    });

    renderWithAuth();

    await waitFor(() =>
      expect(screen.getByTestId('initialized').textContent).toBe('true')
    );
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(screen.getByTestId('userId').textContent).toBe('none');
    expect(mockClearSession).toHaveBeenCalled();
  });

  it('sets isAuthenticated=false when /me throws (token revoked server-side)', async () => {
    mockGetAccessToken.mockReturnValue('expired-server-side');
    mockIsValidToken.mockReturnValue(true);
    mockGetData.mockRejectedValue(new Error('403 Forbidden'));

    renderWithAuth();

    await waitFor(() =>
      expect(screen.getByTestId('initialized').textContent).toBe('true')
    );
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(mockClearSession).toHaveBeenCalled();
  });
});
