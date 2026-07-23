/**
 * Screen calibration — local persist + device fingerprint helpers
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getDataMock, putDataMock } = vi.hoisted(() => ({
  getDataMock: vi.fn(),
  putDataMock: vi.fn(),
}));

vi.mock('src/utils/request', () => ({
  getData: getDataMock,
  putData: putDataMock,
}));

vi.mock('src/services/deviceProfile.service', () => ({
  getLastScreenConfig: () => null,
  DEFAULT_SCREEN_CONFIG: { screenWidth: 1920, screenHeight: 1080, diagonalInch: 15.6 },
}));

import {
  buildAndSaveCalibration,
  buildDeviceFingerprint,
  clearCalibration,
  hydrateCalibrationFromServer,
  isCalibrated,
  loadCalibration,
} from '../screenCalibration.service';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('screenCalibration.service', () => {
  beforeEach(() => {
    localStorageMock.clear();
    getDataMock.mockReset();
    putDataMock.mockReset();
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 2 });
    Object.defineProperty(window.screen, 'width', { configurable: true, value: 960 });
    Object.defineProperty(window.screen, 'height', { configurable: true, value: 540 });
  });

  afterEach(() => {
    clearCalibration();
  });

  it('builds orientation-stable fingerprint from detected screen', () => {
    expect(buildDeviceFingerprint()).toBe('1080x1920@2');
    expect(buildDeviceFingerprint(1920, 1080, 2)).toBe('1080x1920@2');
    expect(buildDeviceFingerprint(1080, 1920, 2)).toBe('1080x1920@2');
  });

  it('saves locally and syncs to server with fingerprint', async () => {
    putDataMock.mockResolvedValue({ calibration: {} });
    const cal = buildAndSaveCalibration(120, 'card', 1920, 1080, 15.6);
    expect(isCalibrated()).toBe(true);
    expect(loadCalibration()?.ppi).toBe(120);
    expect(cal.method).toBe('card');

    await vi.waitFor(() => expect(putDataMock).toHaveBeenCalled());
    expect(putDataMock).toHaveBeenCalledWith(
      '/me/screen-calibration',
      expect.objectContaining({
        deviceFingerprint: '1080x1920@2',
        ppi: 120,
        nativeScreenWidth: 1920,
        nativeScreenHeight: 1080,
        diagonalInch: 15.6,
        method: 'card',
      })
    );
  });

  it('hydrates from server when local calibration is missing', async () => {
    getDataMock.mockResolvedValue({
      calibration: {
        deviceFingerprint: '1080x1920@2',
        ppi: 210,
        nativeScreenWidth: 1920,
        nativeScreenHeight: 1080,
        diagonalInch: 15.6,
        calibratedDiagonalInch: 15.5,
        method: 'ruler',
        calibratedAt: '2026-07-01T00:00:00.000Z',
      },
    });

    expect(isCalibrated()).toBe(false);
    const ok = await hydrateCalibrationFromServer();
    expect(ok).toBe(true);
    expect(isCalibrated()).toBe(true);
    expect(loadCalibration()?.method).toBe('ruler');
    expect(getDataMock).toHaveBeenCalledWith(
      '/me/screen-calibration?deviceFingerprint=1080x1920%402'
    );
  });

  it('does not hydrate when server has no match for this device', async () => {
    getDataMock.mockResolvedValue({ calibration: null });
    const ok = await hydrateCalibrationFromServer();
    expect(ok).toBe(false);
    expect(isCalibrated()).toBe(false);
  });
});
