import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getData, postData, patchData, deleteData, getDataTable } from '../request';

// vi.hoisted: create mock BEFORE module initialization so axiosClient = mockAxios
const mockAxios = vi.hoisted(() => {
  const fn = vi.fn() as any;
  fn.create = vi.fn(() => fn);
  fn.post = fn; // axiosClient.post() → same mock function
  fn.isAxiosError = (error: any) => Boolean(error?.isAxiosError);
  fn.defaults = { headers: { common: {} } };
  fn.interceptors = {
    request: { use: vi.fn(), eject: vi.fn() },
    response: { use: vi.fn(), eject: vi.fn() },
  };
  return fn;
});

const storageMock = vi.hoisted(() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
});

vi.mock('axios', () => ({
  default: mockAxios,
  isAxiosError: (error: any) => Boolean(error?.isAxiosError),
}));

vi.mock('src/utils/Jwt.ts', () => ({
  isValidToken: vi.fn(() => true),
  getAccessToken: vi.fn(() => storageMock.getItem('accessToken')),
  getRefreshToken: vi.fn(() => storageMock.getItem('refreshToken')),
  setSession: vi.fn((tokens: { access: { token: string }; refresh: { token: string } } | null) => {
    if (!tokens) {
      storageMock.clear();
      return;
    }
    storageMock.setItem('accessToken', tokens.access.token);
    storageMock.setItem('refreshToken', tokens.refresh.token);
  }),
  clearSession: vi.fn(() => storageMock.clear()),
}));

Object.defineProperty(window, 'localStorage', { value: storageMock });
Object.defineProperty(window, 'sessionStorage', { value: storageMock });

const ACCESS_TOKEN = 'mock-access-token';

describe('Request Utilities', () => {
  beforeEach(() => {
    vi.resetAllMocks(); // clears queued Once values between tests
    storageMock.clear();
    storageMock.setItem('accessToken', ACCESS_TOKEN);
    // Restore plain-function properties after reset
    mockAxios.isAxiosError = (error: any) => Boolean(error?.isAxiosError);
    mockAxios.post = mockAxios;
  });

  afterEach(() => {
    storageMock.clear();
  });

  describe('getData', () => {
    it('should fetch data successfully with authentication', async () => {
      mockAxios.mockResolvedValue({ data: { id: 1, name: 'Test Patient' } });

      const result = await getData('patients/1');

      expect(result).toEqual({ id: 1, name: 'Test Patient' });
      expect(mockAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'patients/1',
          headers: expect.objectContaining({ Authorization: `Bearer ${ACCESS_TOKEN}` }),
        })
      );
    });

    it('should handle 401 error and refresh token', async () => {
      const newToken = 'new-access-token';
      storageMock.setItem('refreshToken', 'mock-refresh-token');

      // Call 1: original request → 401
      mockAxios.mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } });
      // Call 2: axiosClient.post (=== mockAxios) for refresh → new token
      mockAxios.mockResolvedValueOnce({
        data: {
          access: { token: newToken },
          refresh: { token: 'rotated-refresh-token' },
        },
      });
      // Call 3: retry with new token → success
      mockAxios.mockResolvedValueOnce({ data: { id: 1, name: 'Test Patient' } });

      const result = await getData('patients/1');

      expect(result).toEqual({ id: 1, name: 'Test Patient' });
      expect(storageMock.getItem('accessToken')).toBe(newToken);
      expect(storageMock.getItem('refreshToken')).toBe('rotated-refresh-token');
      expect(mockAxios).toHaveBeenCalledTimes(3);
    });

    it('should re-throw non-401 axios errors', async () => {
      const axiosError = { isAxiosError: true, response: { status: 404, data: { message: 'Not found' } } };
      mockAxios.mockRejectedValue(axiosError);

      await expect(getData('patients/999')).rejects.toMatchObject({ response: { status: 404 } });
    });
  });

  describe('postData', () => {
    it('should post data successfully', async () => {
      const payload = { code: 'P001', name: 'New Patient' };
      mockAxios.mockResolvedValue({ data: { id: 1, ...payload } });

      const result = await postData('patients', payload);

      expect(result).toEqual({ id: 1, code: 'P001', name: 'New Patient' });
      expect(mockAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: 'patients', method: 'POST', data: payload })
      );
    });

    it('should re-throw axios validation errors', async () => {
      const axiosError = {
        isAxiosError: true,
        response: { status: 400, data: { message: 'Mã bệnh nhân đã tồn tại' } },
      };
      mockAxios.mockRejectedValue(axiosError);

      await expect(postData('patients', { code: 'P001' })).rejects.toMatchObject({
        response: { data: { message: 'Mã bệnh nhân đã tồn tại' } },
      });
    });
  });

  describe('patchData', () => {
    it('should update data successfully', async () => {
      const update = { name: 'Updated Name' };
      mockAxios.mockResolvedValue({ data: { id: 1, ...update } });

      const result = await patchData('patients/1', update);

      expect(result).toEqual({ id: 1, name: 'Updated Name' });
      expect(mockAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: 'patients/1', method: 'PATCH', data: update })
      );
    });
  });

  describe('deleteData', () => {
    it('should delete data successfully', async () => {
      mockAxios.mockResolvedValue({ data: {} });

      const result = await deleteData('patients/1');

      expect(result).toEqual({});
      expect(mockAxios).toHaveBeenCalledWith(
        expect.objectContaining({ url: 'patients/1', method: 'DELETE' })
      );
    });
  });

  describe('getDataTable', () => {
    it('should fetch paginated data successfully', async () => {
      const pages = { rows: [{ id: 1 }, { id: 2 }], count: 2, totalPages: 1, page: 1, limit: 10 };
      mockAxios.mockResolvedValue({ data: pages });

      const result = await getDataTable('patients?page=1&limit=10');

      expect(result).toEqual(pages);
      expect(result.rows).toHaveLength(2);
    });

    it('should handle empty results', async () => {
      mockAxios.mockResolvedValue({ data: { rows: [], count: 0, totalPages: 0, page: 1, limit: 10 } });

      const result = await getDataTable('patients?page=1');

      expect(result.rows).toHaveLength(0);
      expect(result.count).toBe(0);
    });
  });

  describe('Token Refresh Logic', () => {
    it('should clear tokens and redirect to login when refresh fails', async () => {
      storageMock.setItem('refreshToken', 'valid-refresh-token');
      delete (window as any).location;
      window.location = { href: '' } as any;

      // Call 1: original → 401
      mockAxios.mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } });
      // Call 2: refresh via .post → fails
      mockAxios.mockRejectedValueOnce({ isAxiosError: true, response: { status: 401, data: { message: 'Invalid refresh token' } } });

      await expect(getData('patients/1')).rejects.toThrow('Authentication failed');
      expect(storageMock.getItem('accessToken')).toBeNull();
      expect(storageMock.getItem('refreshToken')).toBeNull();
      expect(window.location.href).toContain('/auth/login');
    });

    it('should not retry more than once after token refresh', async () => {
      storageMock.setItem('refreshToken', 'mock-refresh-token');

      // Call 1: original → 401
      mockAxios.mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } });
      // Call 2: refresh succeeds
      mockAxios.mockResolvedValueOnce({
        data: {
          access: { token: 'new-token' },
          refresh: { token: 'new-refresh-token' },
        },
      });
      // Call 3: retry → 401 again (should NOT retry a 3rd time)
      mockAxios.mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } });

      await expect(getData('patients/1')).rejects.toThrow();
      expect(mockAxios).toHaveBeenCalledTimes(3);
    });
  });
});
