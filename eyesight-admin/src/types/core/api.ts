/**
 * API TYPES - Single source of truth for API responses
 */

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: number;
}

/**
 * Paginated API response - matches backend response structure
 * Backend returns: { rows, count, limit, page, totalPages }
 */
export interface PaginatedResponse<T> {
  rows: T[];
  count: number;
  limit: number;
  page: number;
  totalPages: number;
}

/**
 * Standard request configuration
 */
export interface RequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, any>;
  timeout?: number;
}

/**
 * Standard error response
 */
export interface ErrorResponse {
  message: string;
  code?: string | number;
  status?: number;
  details?: Record<string, any>;
}

/**
 * Common query parameters for list endpoints
 */
export interface QueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  status?: string;
  [key: string]: unknown;
}
