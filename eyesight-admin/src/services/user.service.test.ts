import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as userService from './user.service';
import * as request from 'src/utils/request';

// Mock request utilities
vi.mock('src/utils/request', () => ({
  getDataTable: vi.fn(),
  getData: vi.fn(),
  postData: vi.fn(),
  patchData: vi.fn(),
  deleteData: vi.fn(),
}));

describe('user.service - getDoctors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call getDataTable with correct URL when name param is provided', async () => {
    const mockResponse = {
      rows: [
        {
          id: 1,
          code: 'DT001',
          user: { name: 'Lê Trọng Đại' },
        },
      ],
      count: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    };

    vi.mocked(request.getDataTable).mockResolvedValue(mockResponse);

    const result = await userService.getDoctors({ name: 'dai', limit: 20 });

    // Check if getDataTable was called with correct URL
    expect(request.getDataTable).toHaveBeenCalledWith('/doctors?name=dai&limit=20');
    expect(result).toEqual(mockResponse);
    expect(result.rows).toHaveLength(1);
  });

  it('should not include empty string in URL', async () => {
    const mockResponse = {
      rows: [],
      count: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    };

    vi.mocked(request.getDataTable).mockResolvedValue(mockResponse);

    // Call with empty name - should not include name in params
    await userService.getDoctors({ limit: 20 });

    // Should not include name param in URL
    expect(request.getDataTable).toHaveBeenCalledWith('/doctors?limit=20');
  });

  it('should handle undefined name param', async () => {
    const mockResponse = {
      rows: [],
      count: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    };

    vi.mocked(request.getDataTable).mockResolvedValue(mockResponse);

    // Call with undefined name
    await userService.getDoctors({ name: undefined, limit: 20 });

    // Should not include name param in URL
    expect(request.getDataTable).toHaveBeenCalledWith('/doctors?limit=20');
  });

  it('should handle API errors', async () => {
    const error = new Error('Network error');
    vi.mocked(request.getDataTable).mockRejectedValue(error);

    await expect(userService.getDoctors({ name: 'test' })).rejects.toThrow('Network error');
  });

  it('should work without any params', async () => {
    const mockResponse = {
      rows: [],
      count: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    };

    vi.mocked(request.getDataTable).mockResolvedValue(mockResponse);

    await userService.getDoctors();

    expect(request.getDataTable).toHaveBeenCalledWith('/doctors');
  });
});
