/**
 * Query Builder Utility - Build URLs with query parameters
 *
 * Centralizes URL building logic to eliminate duplication across service files.
 * Provides a single, reusable function for constructing URLs with query strings.
 *
 * @module src/utils/query-builder
 */

import type { QueryParams } from 'src/services/types';

/**
 * Build URL with query string from parameters
 *
 * Constructs a complete URL by appending query parameters to a base path.
 * Handles null/undefined values by filtering them out.
 * Uses URLSearchParams for proper encoding of special characters.
 *
 * @param path - Base path (e.g., '/patients', '/me/assignments')
 * @param params - Query parameters object (optional)
 * @returns Complete URL with query string, or just path if no params
 *
 * @example
 * // With parameters
 * buildUrl('/patients', { page: 1, limit: 10 });
 * // Returns: '/patients?page=1&limit=10'
 *
 * @example
 * // Without parameters
 * buildUrl('/patients');
 * // Returns: '/patients'
 *
 * @example
 * // With null/undefined values (filtered out)
 * buildUrl('/patients', { page: 1, search: null, status: undefined });
 * // Returns: '/patients?page=1'
 */
export const buildUrl = (path: string, params?: QueryParams): string => {
  // If no params provided, return path as-is
  if (!params) return path;

  // Create URLSearchParams for proper URL encoding
  const searchParams = new URLSearchParams();

  // Add each parameter, skipping null/undefined/empty string values
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      searchParams.append(key, String(value));
    }
  });

  // Build final URL
  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
};

export default { buildUrl };
