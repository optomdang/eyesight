/**
 * Utils Barrel Export
 * Centralized exports for all utility functions
 */

// Status utilities
export { getStatusColor, getStatusText, getStatusConfig } from './statusHelpers';

// Color scheme utilities
export { generateColorSchemeCSS, applyColorScheme } from './colorScheme';

// Error handling utilities
export { categorizeError, handleApiError } from './errorHandler';

// Vision calculation utilities
export {
  calculateVisualSettings,
  clinicalMmToLayoutPx,
  resolveDevicePixelRatio,
} from './visionUtils';

// Request utilities
export { getData, getDataTable, postData, patchData, deleteData } from './request';

// Query builder utilities
export { buildUrl } from './query-builder';

// Common utilities
export { generateCode, formatAmount, formatAddress, shouldShowFieldError } from './common';

// Re-export types
export type {
  StatusValue,
  StatusConfig,
  ColorScheme,
  CategorizedError,
  ErrorCategory,
  VisionCalculationInput,
  VisionCalculationOutput,
} from './types';
