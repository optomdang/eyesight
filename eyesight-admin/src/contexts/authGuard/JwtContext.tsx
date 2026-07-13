import React, { createContext, useEffect, useReducer, useRef } from 'react';
import axios from 'axios';
import { User, ApiResponse } from 'src/types/core';
import {
  isValidToken,
  setSession,
  clearSession,
  getAccessToken,
  getRefreshToken,
  getTokenExpiryMs,
} from 'src/utils/Jwt';
import { axiosClient, getData, postData, refreshAccessToken } from 'src/utils/request';
import { deleteFCMToken } from 'src/utils/firebase';
import useSnackbar from '../UseSnackbar';

const formatLoginError = (err: unknown): string => {
  if (axios.isAxiosError(err)) {
    if (err.code === 'ECONNABORTED' || /timeout/i.test(err.message)) {
      return 'Máy chủ đang khởi động (có thể mất đến 1 phút). Vui lòng đợi vài giây rồi thử đăng nhập lại.';
    }
    const message = (err.response?.data as { message?: string })?.message;
    return message || err.message || 'Đăng nhập thất bại';
  }
  return err instanceof Error ? err.message : 'Đăng nhập thất bại';
};

// Định nghĩa kiểu cho state
export interface InitialStateType {
  isAuthenticated: boolean;
  isInitialized?: boolean;
  user?: User;
}

const initialState: InitialStateType = {
  isAuthenticated: false,
  isInitialized: false,
  user: undefined,
};

// Các handler cho reducer
const handlers: any = {
  INITIALIZE: (state: InitialStateType, action: any) => {
    const { isAuthenticated, user } = action.payload;
    return {
      ...state,
      isAuthenticated,
      isInitialized: true,
      user,
    };
  },
  LOGIN: (state: InitialStateType, action: any) => {
    const { user } = action.payload;
    return {
      ...state,
      isAuthenticated: true,
      user,
    };
  },
  LOGOUT: (state: InitialStateType) => ({
    ...state,
    isAuthenticated: false,
    user: undefined,
  }),
  REGISTER: (state: InitialStateType, action: any) => {
    const { user } = action.payload;
    return {
      ...state,
      isAuthenticated: true,
      user,
    };
  },
};

// Reducer để xử lý state
const reducer = (state: InitialStateType, action: { type: string; payload?: any }) =>
  handlers[action.type] ? handlers[action.type](state, action) : state;

// Tạo AuthContext
interface AuthContextType extends InitialStateType {
  platform: 'JWT';
  signup: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  ...initialState,
  platform: 'JWT' as const,
  signup: (email: string, password: string, firstName: string, lastName: string) =>
    Promise.resolve(),
  login: (email: string, password: string, rememberMe?: boolean) => Promise.resolve(),
  logout: () => Promise.resolve(),
});

const PROACTIVE_REFRESH_BUFFER_MS = 5 * 60 * 1000;

// AuthProvider component
function AuthProvider({ children }: { children: React.ReactElement }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { showSnackbar } = useSnackbar();
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleProactiveRefresh = () => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    const accessToken = getAccessToken();
    const refreshToken = getRefreshToken();
    if (!accessToken || !refreshToken) return;

    const expiryMs = getTokenExpiryMs(accessToken);
    if (!expiryMs) return;

    const refreshIn = Math.max(0, expiryMs - Date.now() - PROACTIVE_REFRESH_BUFFER_MS);
    refreshTimerRef.current = setTimeout(() => {
      void refreshAccessToken()
        .then(() => scheduleProactiveRefresh())
        .catch(() => {
          // Next API call will handle invalid refresh.
        });
    }, refreshIn);
  };

  // Khởi tạo state khi component mount
  useEffect(() => {
    const initialize = async () => {
      try {
        let accessToken = getAccessToken();
        const refreshToken = getRefreshToken();

        if (!accessToken || !isValidToken(accessToken)) {
          if (refreshToken && isValidToken(refreshToken)) {
            try {
              accessToken = await refreshAccessToken();
            } catch {
              clearSession();
              dispatch({
                type: 'INITIALIZE',
                payload: {
                  isAuthenticated: false,
                  user: undefined,
                },
              });
              return;
            }
          } else {
            clearSession();
            dispatch({
              type: 'INITIALIZE',
              payload: {
                isAuthenticated: false,
                user: undefined,
              },
            });
            return;
          }
        }

        const user = await getData<User>(`/me`);
        // BUG-08 fix: reject suspended users even when their token is still valid
        if (user.active === false) {
          clearSession();
          dispatch({
            type: 'INITIALIZE',
            payload: {
              isAuthenticated: false,
              user: undefined,
            },
          });
          return;
        }
        dispatch({
          type: 'INITIALIZE',
          payload: {
            isAuthenticated: true,
            user,
          },
        });
      } catch (err) {
        console.error('Initialize error:', err);
        clearSession();
        dispatch({
          type: 'INITIALIZE',
          payload: {
            isAuthenticated: false,
            user: undefined,
          },
        });
      }
    };

    void initialize();
  }, []);

  useEffect(() => {
    if (!state.isAuthenticated) {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      return;
    }

    scheduleProactiveRefresh();

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [state.isAuthenticated]);

  // Hàm đăng nhập sử dụng Axios
  const login = async (email: string, password: string, rememberMe = false) => {
    try {
      // Public endpoint — must not go through requestWithAuth (401 would trigger refresh → "Authentication failed")
      const response = await axiosClient.post(
        'auth/login',
        { email, password },
        { timeout: 90000 },
      );
      const { tokens, user } = response.data;

      setSession(tokens, rememberMe);
      localStorage.setItem('user', JSON.stringify(user));
      dispatch({
        type: 'LOGIN',
        payload: {
          user,
        },
      });
    } catch (err) {
      console.error('Login failed:', err);
      throw new Error(formatLoginError(err));
    }
  };

  // Hàm đăng ký sử dụng Axios
  const signup = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      const res = await postData<ApiResponse<User>>('/api/account/register', {
        email,
        password,
        firstName,
        lastName,
      });
      const { accessToken, user } = res;

      setSession(
        {
          access: { token: accessToken },
          refresh: { token: '' },
        },
        true
      );
      localStorage.setItem('user', JSON.stringify(user));
      dispatch({
        type: 'REGISTER',
        payload: {
          user,
        },
      });
    } catch (err) {
      console.error('Signup failed:', err);
      throw err;
    }
  };

  // Hàm đăng xuất
  const logout = async () => {
    try {
      await deleteFCMToken();
    } catch (error) {
      console.error('Failed to delete FCM token:', error);
    }

    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await axiosClient.post('auth/logout', { refreshToken });
      } catch (error) {
        console.error('Failed to revoke refresh token:', error);
      }
    }

    clearSession();
    dispatch({ type: 'LOGOUT' });
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        method: 'jwt',
        login,
        logout,
        signup,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext, AuthProvider };
