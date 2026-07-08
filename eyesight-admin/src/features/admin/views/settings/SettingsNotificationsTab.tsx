import React, { useEffect, useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { DataTableProvider } from 'src/contexts/data-context/DataTableContext';
import { usePermission } from 'src/hooks/usePermission';
import NotificationPage from 'src/features/admin/views/manage/notification-page/NotificationPage';
import NotificationTemplatePage from 'src/features/admin/views/manage/notification-template-page';

const NOTIFICATION_PANELS = ['sent', 'templates'] as const;
type NotificationPanelId = (typeof NOTIFICATION_PANELS)[number];

const SettingsNotificationsTab: React.FC = () => {
  const { hasPermission } = usePermission();
  const canManageTemplates = hasPermission('getTemplates');
  const [searchParams, setSearchParams] = useSearchParams();
  const panelParam = searchParams.get('panel');
  const [panel, setPanel] = useState<NotificationPanelId>(
    panelParam === 'templates' && canManageTemplates ? 'templates' : 'sent'
  );

  useEffect(() => {
    if (panelParam === 'templates' && canManageTemplates) {
      setPanel('templates');
    } else if (panelParam === 'templates' && !canManageTemplates) {
      setPanel('sent');
    }
  }, [panelParam, canManageTemplates]);

  const handlePanelChange = (_: React.SyntheticEvent, value: NotificationPanelId) => {
    setPanel(value);
    const next = new URLSearchParams(searchParams);
    if (value === 'templates') {
      next.set('panel', 'templates');
    } else {
      next.delete('panel');
    }
    setSearchParams(next, { replace: true });
  };

  return (
    <Box>
      {canManageTemplates && (
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={panel} onChange={handlePanelChange} aria-label="Thông báo">
            <Tab label="Đã gửi" value="sent" />
            <Tab label="Mẫu" value="templates" />
          </Tabs>
        </Box>
      )}

      {panel === 'sent' || !canManageTemplates ? (
        <DataTableProvider endpoint="notifications">
          <NotificationPage embedded />
        </DataTableProvider>
      ) : (
        <DataTableProvider endpoint="notification-templates">
          <NotificationTemplatePage embedded />
        </DataTableProvider>
      )}
    </Box>
  );
};

export default SettingsNotificationsTab;
