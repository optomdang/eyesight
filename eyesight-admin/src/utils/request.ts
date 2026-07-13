import axios, { AxiosRequestConfig } from 'axios';
import { isValidToken } from 'src/utils/Jwt.ts';
import { PaginatedResponse } from 'src/types/core';

export const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_BASE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 10000, // 10 seconds timeout
});

const BASE_NAME = import.meta.env.PUBLIC_URL || '';

const readBlobErrorMessage = async (blob: Blob): Promise<string> => {
  const text = await blob.text();
  try {
    const json = JSON.parse(text) as { message?: string };
    return json.message || text || 'Không tải được tệp';
  } catch {
    return text || 'Không tải được tệp';
  }
};

// Hàm refresh token
async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken || !isValidToken(refreshToken)) {
    // Clear tokens and redirect
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = `${BASE_NAME}/auth/login`;
    throw new Error('No valid refresh token available');
  }

  try {
    const response = await axiosClient.post(`auth/refresh-tokens`, { refreshToken });
    const { accessToken } = response.data;

    if (!accessToken) {
      throw new Error('No access token received from refresh');
    }

    localStorage.setItem('accessToken', accessToken);
    return accessToken;
  } catch (error) {
    // Clear tokens on refresh failure
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');

    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.message || 'Failed to refresh token';
      throw new Error(errorMessage);
    }

    throw new Error('Failed to refresh token');
  }
}

// Hàm xử lý Axios chung với auth - CHỈ RETRY KHI REFRESH TOKEN 401
async function requestWithAuth<T>(
  url: string,
  config: AxiosRequestConfig,
  isRetryingAuth: boolean = false
): Promise<T> {
  const accessToken = localStorage.getItem('accessToken');
  const headers = {
    ...config.headers,
    ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
  };

  try {
    const response = await axiosClient({
      url,
      ...config,
      headers,
    });
    return response.data as T;
  } catch (error) {
    if (!axios.isAxiosError(error)) {
      throw new Error('An unexpected error occurred');
    }

    // CHỈ XỬ LÝ 401 - Refresh token và retry 1 lần duy nhất
    if (error.response?.status === 401 && !isRetryingAuth) {
      try {
        const newAccessToken = await refreshAccessToken();
        // Retry với token mới (chỉ 1 lần)
        return requestWithAuth<T>(
          url,
          {
            ...config,
            headers: {
              ...config.headers,
              Authorization: `Bearer ${newAccessToken}`,
            },
          },
          true // Đánh dấu đang retry auth - không retry lần 2
        );
      } catch (refreshError) {
        // Refresh thất bại, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = `${BASE_NAME}/auth/login`;
        throw new Error('Authentication failed');
      }
    }

    // 401 lần 2 sau khi refresh hoặc các lỗi khác - KHÔNG RETRY, throw ngay
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = `${BASE_NAME}/auth/login`;
      throw new Error('Authentication required');
    }

    // Tất cả các lỗi khác (400, 403, 404, 500, network error...) - KHÔNG RETRY
    // Re-throw axios error gốc để giữ nguyên error.response cho các component catch
    throw error;
  }
}

// Data cho GET
async function getData<T>(url: string): Promise<T> {
  return requestWithAuth<T>(url, { method: 'GET' });
}

async function getDataTable<T>(url: string): Promise<PaginatedResponse<T>> {
  return requestWithAuth<PaginatedResponse<T>>(url, { method: 'GET' });
}

// Data cho POST với auth
async function postData<TResponse, TBody = unknown>(url: string, data: TBody): Promise<TResponse> {
  return requestWithAuth<TResponse>(url, {
    method: 'POST',
    data,
  });
}

// Data cho PUT
async function putData<TResponse, TBody = unknown>(url: string, data: TBody): Promise<TResponse> {
  return requestWithAuth<TResponse>(url, {
    method: 'PUT',
    data,
  });
}

// Data cho PATCH
async function patchData<TResponse, TBody = unknown>(url: string, data: TBody): Promise<TResponse> {
  return requestWithAuth<TResponse>(url, {
    method: 'PATCH',
    data,
  });
}

// Data cho DELETE
async function deleteData<TResponse, TBody = unknown>(
  url: string,
  data?: TBody
): Promise<TResponse> {
  return requestWithAuth<TResponse>(url, {
    method: 'DELETE',
    data,
  });
}

/** GET binary response (e.g. PDF download) */
async function getBlob(url: string, options?: { timeoutMs?: number }): Promise<Blob> {
  const accessToken = localStorage.getItem('accessToken');
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  const timeout = options?.timeoutMs ?? 10000;

  try {
    const response = await axiosClient({
      url,
      method: 'GET',
      responseType: 'blob',
      headers,
      timeout,
    });

    const contentType = String(response.headers['content-type'] || '');
    if (contentType.includes('application/json')) {
      throw new Error(await readBlobErrorMessage(response.data as Blob));
    }

    return response.data as Blob;
  } catch (error) {
    if (!axios.isAxiosError(error)) {
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = `${BASE_NAME}/auth/login`;
      throw new Error('Authentication required');
    }
    if (error.response?.data instanceof Blob) {
      throw new Error(await readBlobErrorMessage(error.response.data));
    }
    if (error.code === 'ECONNABORTED') {
      throw new Error('Hết thời gian chờ khi tải PDF. Vui lòng thử lại.');
    }
    throw error;
  }
}

export { getData, getDataTable, postData, putData, patchData, deleteData, getBlob };
