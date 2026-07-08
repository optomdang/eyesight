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
const mockSetSession = vi.hoisted(() => vi.fn());
const mockGetData = vi.hoisted(() => vi.fn());

vi.mock('src/utils/Jwt', () => ({
  isValidToken: mockIsValidToken,
  setSession: mockSetSession,
}));
vi.mock('src/utils/request', () => ({
  getData: mockGetData,
  postData: vi.fn(),
  patchData: vi.fn(),
  deleteData: vi.fn(),
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

// setup.ts globally mocks window.localStorage.getItem to return null.
// Tests that need a token must override getItem for that specific key.
function mockStoredToken(token: string) {
  vi.mocked(window.localStorage.getItem).mockImplementation(
    (key: string) => key === 'accessToken' ? token : null
  );
}

describe('JwtContext - initialize()', () => {
  beforeEach(() => {
    // vi.clearAllMocks() is already called by setup.ts beforeEach
    mockIsValidToken.mockReturnValue(false);
    mockSetSession.mockImplementation(() => undefined);
  });

  it('sets isAuthenticated=false when no token is in localStorage', async () => {
    // getItem returns null by default (setup.ts), isValidToken returns false
    renderWithAuth();

    await waitFor(() =>
      expect(screen.getByTestId('initialized').textContent).toBe('true')
    );
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(mockGetData).not.toHaveBeenCalled();
  });

  it('sets isAuthenticated=true for an active user with valid token', async () => {
    mockStoredToken('valid-token');
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

  // BUG-08 regression: suspended users must be blocked even when their token is still valid
  it('BUG-08: isAuthenticated=false when /me returns user.active=false', async () => {
    mockStoredToken('still-valid-but-suspended');
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
    // JwtContext must clear local session so the token is invalidated
    expect(mockSetSession).toHaveBeenCalledWith(null);
  });

  it('sets isAuthenticated=false when /me throws (token revoked server-side)', async () => {
    mockStoredToken('expired-server-side');
    mockIsValidToken.mockReturnValue(true);
    mockGetData.mockRejectedValue(new Error('403 Forbidden'));

    renderWithAuth();

    await waitFor(() =>
      expect(screen.getByTestId('initialized').textContent).toBe('true')
    );
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    // catch block must clear session so the bad token is removed
    expect(mockSetSession).toHaveBeenCalledWith(null);
  });
});
