import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import useAuth from './useAuth';

const GuestGuard = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Danh sách các path công khai hợp lệ
    const publicPaths = ['/auth/login', '/auth/forgot-password'];
    // Nếu đã đăng nhập và đang ở một path công khai, redirect về '/'
    if (isAuthenticated && publicPaths.includes(location.pathname)) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  return children;
};

export default GuestGuard;
