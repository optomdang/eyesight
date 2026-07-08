import React, { memo } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import {
  ADMIN_SETTINGS_PATH_PREFIX,
  resolveAdminSettingsTab,
  useAdminSettingsVisibleTabs,
} from './useAdminSettingsVisibleTabs';

const tabLinkSx = {
  minHeight: 40,
  py: 0.5,
  px: 1.5,
  fontSize: '0.875rem',
  textTransform: 'none',
  fontWeight: 600,
} as const;

const AdminSettingsHeaderTabs: React.FC = () => {
  const location = useLocation();
  const visibleTabs = useAdminSettingsVisibleTabs();
  const activeTab = resolveAdminSettingsTab(location.pathname, visibleTabs);

  if (visibleTabs.length === 0) return null;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
      <Tabs
        value={activeTab}
        aria-label="Settings"
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: 40,
          '& .MuiTabs-indicator': { height: 2 },
          '& .MuiTab-root': tabLinkSx,
        }}
      >
        {visibleTabs.map((tab) => (
          <Tab
            key={tab.id}
            label={tab.label}
            value={tab.id}
            component={Link}
            to={`${ADMIN_SETTINGS_PATH_PREFIX}/${tab.id}`}
            replace
          />
        ))}
      </Tabs>
    </Box>
  );
};

export default memo(AdminSettingsHeaderTabs);
