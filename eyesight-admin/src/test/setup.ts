/**
 * Test Setup File
 * Configures testing environment for Vitest
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock window.alert
window.alert = vi.fn();

// Mock window.GameManager (for 2048 game)
Object.defineProperty(window, 'GameManager', {
  value: undefined,
  writable: true,
});

// Mock document.documentElement.style.setProperty
const originalSetProperty = document.documentElement.style.setProperty;
document.documentElement.style.setProperty = vi.fn(originalSetProperty);

// Mock document.documentElement.style.removeProperty
const originalRemoveProperty = document.documentElement.style.removeProperty;
document.documentElement.style.removeProperty = vi.fn(originalRemoveProperty);

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.getItem.mockReturnValue(null);
});
