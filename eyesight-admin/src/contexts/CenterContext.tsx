import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getData, patchData } from 'src/utils/request';
import useSnackbar from 'src/contexts/UseSnackbar';
import { Center, User } from 'src/types/core';
import useAuth from 'src/contexts/authGuard/useAuth';
import { UserType } from 'src/features/admin/views/manage/user-page/forms/user-form.types';

interface CenterContextProps {
  centers: Center[];
  currentCenter: Center | null;
  setCurrentCenter: (center: Center) => void;
  refreshCenters: () => void;
  changeCenter: (center: Center) => void;
}

const CenterContext = createContext<CenterContextProps | undefined>(undefined);

export const CenterProvider = ({ children }: { children: ReactNode }) => {
  const [centers, setCenters] = useState<Center[]>([]);
  const [currentCenter, setCurrentCenter] = useState<Center | null>(null);
  const { user, isAuthenticated, isInitialized } = useAuth();

  const refreshCenters = async () => {
    const res = await getData<{ rows: Center[] }>('/centers?limit=1000');
    setCenters(res.rows);
    if (!currentCenter && res.rows.length > 0) {
      setCurrentCenter(res.rows[0]);
    }
  };

  // Đổi center cho user
  const { showSnackbar } = useSnackbar();

  const changeCenter = async (center: Center) => {
    if (!user?.id) return;
    const data = {
      id: user.id,
      roleId: user.roleId,
      centerId: center.id,
    };
    try {
      // Use safe endpoint to change current user's center (admin-only)
      await patchData<User>(`/me/center`, { centerId: center.id });
      window.location.reload();
    } catch {
      showSnackbar('Chuyển trung tâm thất bại', 'error');
    }
  };

  useEffect(() => {
    if (isInitialized && isAuthenticated && user?.id && user?.userType === UserType.ADMIN) {
      refreshCenters();
    }
    // eslint-disable-next-line
  }, [user, isAuthenticated, isInitialized]);

  return (
    <CenterContext.Provider
      value={{ centers, currentCenter, setCurrentCenter, refreshCenters, changeCenter }}
    >
      {children}
    </CenterContext.Provider>
  );
};

export const useCenter = () => {
  const ctx = useContext(CenterContext);
  if (!ctx) throw new Error('useCenter must be used within CenterProvider');
  return ctx;
};
