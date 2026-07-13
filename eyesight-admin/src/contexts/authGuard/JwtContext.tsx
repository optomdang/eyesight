import React, { createContext, useEffect, useReducer } from 'react';
import axios from 'axios';
import { User, ApiResponse } from 'src/types/core';
import { isValidToken, setSession } from 'src/utils/Jwt';
import { axiosClient, getData, postData } from 'src/utils/request';
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
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  ...initialState,
  platform: 'JWT' as const,
  signup: (email: string, password: string, firstName: string, lastName: string) =>
    Promise.resolve(),
  login: (email: string, password: string) => Promise.resolve(),
  logout: () => Promise.resolve(),
});

// AuthProvider component
function AuthProvider({ children }: { children: React.ReactElement }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { showSnackbar } = useSnackbar();

  // Khởi tạo state khi component mount
  useEffect(() => {
    const initialize = async () => {
      try {
        const accessToken = localStorage.getItem('accessToken');
        // Kiểm tra token có hợp lệ không
        if (accessToken && isValidToken(accessToken)) {
          const user = await getData<User>(`/me`);
          // BUG-08 fix: reject suspended users even when their token is still valid
          if (user.active === false) {
            setSession(null);
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
        } else {
          // Token invalid or not exist
          dispatch({
            type: 'INITIALIZE',
            payload: {
              isAuthenticated: false,
              user: undefined,
            },
          });
        }
      } catch (err) {
        console.error('Initialize error:', err);
        // Clear session on error
        setSession(null);
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

  // Hàm đăng nhập sử dụng Axios
  const login = async (email: string, password: string) => {
    try {
      // Public endpoint — must not go through requestWithAuth (401 would trigger refresh → "Authentication failed")
      const response = await axiosClient.post(
        'auth/login',
        { email, password },
        { timeout: 90000 },
      );
      const { tokens, user } = response.data;

      setSession(tokens);
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

      window.localStorage.setItem('accessToken', accessToken);
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
      // Delete FCM token from backend before logout
      await deleteFCMToken();
    } catch (error) {
      console.error('Failed to delete FCM token:', error);
      // Continue with logout even if FCM deletion fails
    }

    setSession(null);
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
