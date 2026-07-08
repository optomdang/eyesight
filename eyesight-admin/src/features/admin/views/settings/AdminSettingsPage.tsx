import React, { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageContainer from 'src/components/container/PageContainer';
import { DataTableProvider } from 'src/contexts/data-context/DataTableContext';
import ScreenCalibrationPage from 'src/features/portal/views/settings/ScreenCalibrationPage';
import SettingsAudioTab from './SettingsAudioTab';
import SettingsNotificationsTab from './SettingsNotificationsTab';
import TreatmentPackagesTab from './treatment-packages/TreatmentPackagesTab';
import {
  DEFAULT_ADMIN_SETTINGS_TAB,
  isAdminSettingsTab,
  type AdminSettingsTabId,
} from './adminSettingsTabs';
import {
  resolveAdminSettingsTab,
  useAdminSettingsVisibleTabs,
} from './useAdminSettingsVisibleTabs';

const AdminSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { tab: tabParam } = useParams<{ tab?: string }>();
  const visibleTabs = useAdminSettingsVisibleTabs();

  const activeTab: AdminSettingsTabId = useMemo(() => {
    if (tabParam) {
      return resolveAdminSettingsTab(`/admin/settings/${tabParam}`, visibleTabs);
    }
    return visibleTabs[0]?.id ?? DEFAULT_ADMIN_SETTINGS_TAB;
  }, [tabParam, visibleTabs]);

  useEffect(() => {
    if (!tabParam) return;
    const invalid =
      !isAdminSettingsTab(tabParam) || !visibleTabs.some((tab) => tab.id === tabParam);
    if (invalid) {
      navigate(`/admin/settings/${visibleTabs[0]?.id ?? DEFAULT_ADMIN_SETTINGS_TAB}`, {
        replace: true,
      });
    }
  }, [tabParam, visibleTabs, navigate]);

  return (
    <PageContainer title="Settings" description="Cấu hình hiệu chuẩn, âm thanh, thông báo và gói điều trị">
      {activeTab === 'calibration' && <ScreenCalibrationPage compact />}
      {activeTab === 'audio' && <SettingsAudioTab />}
      {activeTab === 'notifications' && <SettingsNotificationsTab />}
      {activeTab === 'treatment-packages' && (
        <DataTableProvider endpoint="treatment-packages">
          <TreatmentPackagesTab />
        </DataTableProvider>
      )}
    </PageContainer>
  );
};

export default AdminSettingsPage;
