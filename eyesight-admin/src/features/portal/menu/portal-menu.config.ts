import { MenuItem, MenuSection, FeatureModule } from 'src/types/core';

import { IconEye, IconActivity, IconChartLine, IconHome } from '@tabler/icons-react';

// Portal Feature Module
const FEATURE: FeatureModule = 'portal';

// Simplified Menu Items - No more sub-menus
const portalMenuItems: MenuItem[] = [
  {
    id: 'portal-home',
    type: 'link',
    title: 'Trang chủ',
    titleKey: 'menu.portal.home',
    icon: IconHome,
    href: '/portal/home',
    feature: FEATURE,
    permissions: {
      roles: ['patient', 'doctor'],
    },
    metadata: {
      description: 'Trang chủ portal bệnh nhân',
      order: 1,
    },
  },
  {
    id: 'portal-exercises',
    type: 'link',
    title: 'Bài tập của tôi',
    titleKey: 'menu.portal.my_exercises',
    icon: IconEye,
    href: '/portal/exercises',
    feature: FEATURE,
    permissions: {
      permissions: ['exercises.access'],
      roles: ['patient'],
    },
    metadata: {
      description: 'Danh sách bài tập được bác sĩ giao cho tôi',
      order: 2,
    },
  },
  {
    id: 'portal-progress',
    type: 'link',
    title: 'Tiến độ của tôi',
    titleKey: 'menu.portal.my_progress',
    icon: IconChartLine,
    href: '/portal/progress',
    feature: FEATURE,
    permissions: {
      permissions: ['progress.read'],
      roles: ['patient'],
    },
    metadata: {
      description: 'Xem tiến độ luyện tập cá nhân',
      order: 3,
    },
  },
  {
    id: 'portal-history',
    type: 'link',
    title: 'Lịch sử',
    titleKey: 'menu.portal.history',
    icon: IconActivity,
    href: '/portal/history',
    feature: FEATURE,
    permissions: {
      permissions: ['activity.read'],
      roles: ['patient'],
    },
    metadata: {
      description: 'Lịch sử các phiên luyện tập',
      order: 4,
    },
  },
];

// Single menu section - no complex grouping
export const portalSections: MenuSection[] = [
  {
    id: 'portal-main-section',
    label: 'PORTAL BỆNH NHÂN',
    labelKey: 'menu.section.portal_main',
    feature: FEATURE,
    order: 1,
    items: portalMenuItems,
    permissions: {
      roles: ['patient'],
    },
  },
];
