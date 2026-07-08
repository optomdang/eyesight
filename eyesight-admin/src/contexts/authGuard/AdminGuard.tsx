import { useNavigate } from 'react-router-dom';
import useAuth from './useAuth';
import { useEffect, ReactNode } from 'react';
import { UserType } from 'src/types';

interface AdminGuardProps {
  children: ReactNode;
}

const AdminGuard = ({ children }: AdminGuardProps) => {
  const { isAuthenticated, user, isInitialized } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Chờ authentication được initialize xong
    if (!isInitialized) {
      return;
    }

    if (!isAuthenticated) {
      navigate('/auth/login', { replace: true });
      return;
    }

    // Kiểm tra user có phải là admin hoặc doctor không
    const allowedTypes: UserType[] = ['admin', 'doctor'];
    if (user && !allowedTypes.includes(user.userType)) {
      // Nếu user là patient, chuyển hướng về portal
      if (user.userType === 'patient') {
        navigate('/portal', { replace: true });
      } else {
        // Nếu không có quyền, hiển thị trang 403
        navigate('/auth/404', { replace: true });
      }
      return;
    }
  }, [isAuthenticated, user, isInitialized, navigate]);

  // Chỉ render children nếu user đã xác thực và có quyền truy cập admin
  if (!isInitialized || !isAuthenticated || !user || !['admin', 'doctor'].includes(user.userType)) {
    return null;
  }

  return <>{children}</>;
};

export default AdminGuard;
