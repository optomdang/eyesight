import { useNavigate } from 'react-router-dom';
import useAuth from './useAuth';
import { useEffect, ReactNode } from 'react';

interface PatientGuardProps {
  children: ReactNode;
}

const PatientGuard = ({ children }: PatientGuardProps) => {
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

    // Kiểm tra user có phải là patient không
    if (user && user.userType !== 'patient') {
      // Nếu user là admin hoặc doctor, chuyển hướng về admin
      if (['admin', 'doctor'].includes(user.userType)) {
        navigate('/admin', { replace: true });
      } else {
        // Nếu không có quyền, hiển thị trang 403
        navigate('/auth/403', { replace: true });
      }
      return;
    }
  }, [isAuthenticated, user, isInitialized, navigate]);

  // Chỉ render children nếu user đã xác thực và là patient
  if (!isInitialized || !isAuthenticated || !user || user.userType !== 'patient') {
    return null;
  }

  return <>{children}</>;
};

export default PatientGuard;
