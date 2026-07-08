export const ADMIN_SETTINGS_TABS = [
  'calibration',
  'audio',
  'notifications',
  'treatment-packages',
] as const;

export type AdminSettingsTabId = (typeof ADMIN_SETTINGS_TABS)[number];

export const DEFAULT_ADMIN_SETTINGS_TAB: AdminSettingsTabId = 'calibration';

export function isAdminSettingsTab(value: string | undefined): value is AdminSettingsTabId {
  return ADMIN_SETTINGS_TABS.includes(value as AdminSettingsTabId);
}
