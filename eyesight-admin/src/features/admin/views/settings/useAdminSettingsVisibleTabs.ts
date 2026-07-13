import { useMemo } from 'react';
import { usePermission } from 'src/hooks/usePermission';
import useAuth from 'src/contexts/authGuard/useAuth';
import {
  DEFAULT_ADMIN_SETTINGS_TAB,
  isAdminSettingsTab,
  type AdminSettingsTabId,
} from './adminSettingsTabs';

export interface AdminSettingsTabDef {
  id: AdminSettingsTabId;
  label: string;
}

export function useAdminSettingsVisibleTabs(): AdminSettingsTabDef[] {
  const { hasPermission } = usePermission();
  const { user } = useAuth();

  return useMemo<AdminSettingsTabDef[]>(() => {
    const tabs: AdminSettingsTabDef[] = [
      { id: 'calibration', label: 'Hiệu chuẩn màn hình' },
      { id: 'audio', label: 'Âm thanh' },
    ];
    if (hasPermission('getNotifications')) {
      tabs.push({ id: 'notifications', label: 'Thông báo' });
    }
    if (hasPermission('getExercises')) {
      tabs.push({ id: 'treatment-packages', label: 'Gói điều trị' });
    }
    return tabs;
  }, [user?.id, user?.userType, user?.roleId]);
}

export function resolveAdminSettingsTab(
  pathname: string,
  visibleTabs: AdminSettingsTabDef[]
): AdminSettingsTabId {
  const match = pathname.match(/\/admin\/settings\/([^/?]+)/);
  const tabParam = match?.[1];
  if (isAdminSettingsTab(tabParam) && visibleTabs.some((tab) => tab.id === tabParam)) {
    return tabParam;
  }
  return visibleTabs[0]?.id ?? DEFAULT_ADMIN_SETTINGS_TAB;
}

export const ADMIN_SETTINGS_PATH_PREFIX = '/admin/settings';
