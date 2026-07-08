import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from 'src/contexts/authGuard/useAuth';

const RoleBasedRedirect = () => {
  const { isAuthenticated, user, isInitialized } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Chờ authentication được initialize xong
    if (!isInitialized) {
      return;
    }

    if (!isAuthenticated) {
      // Nếu chưa đăng nhập, chuyển về login
      navigate('/auth/login', { replace: true });
      return;
    }

    if (user) {
      switch (user.userType) {
        case 'patient':
          navigate('/portal', { replace: true });
          break;
        case 'admin':
        case 'doctor':
          navigate('/admin', { replace: true });
          break;
        default:
          navigate('/auth/404', { replace: true });
          break;
      }
    }
  }, [isAuthenticated, user, isInitialized, navigate]);

  return null; // Component này không render gì
};

export default RoleBasedRedirect;
