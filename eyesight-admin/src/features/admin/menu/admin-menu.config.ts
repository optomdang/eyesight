import { MenuItem, MenuSection, FeatureModule } from 'src/types/core';

import {
  IconUser,
  IconUsersGroup,
  IconActivity,
  IconFileText,
  IconSettings,
  IconDashboard,
  IconBell,
  IconBuilding,
  IconStethoscope,
  IconFileSearch,
} from '@tabler/icons-react';

// Admin Management Feature Module
const FEATURE: FeatureModule = 'admin';

// Admin Dashboard Menu Items
const dashboardItems: MenuItem[] = [
  // Dashboard removed - no corresponding backend permission
  // Notifications test removed - no permission
];

// User Management Menu Items
const userManagementItems: MenuItem[] = [
  {
    id: 'admin-users',
    type: 'link',
    title: 'Quản lý người dùng',
    titleKey: 'menu.admin.users',
    icon: IconUser,
    href: '/admin/users',
    feature: FEATURE,
    permission: 'manageUsers',
    metadata: {
      description: 'Quản lý tài khoản người dùng hệ thống',
      order: 1,
    },
  },
  {
    id: 'admin-roles',
    type: 'link',
    title: 'Quản lý vai trò',
    titleKey: 'menu.admin.roles',
    icon: IconUsersGroup,
    href: '/admin/roles',
    feature: FEATURE,
    permission: 'manageRoles',
    metadata: {
      description: 'Quản lý vai trò và phân quyền',
      order: 2,
    },
  },
  {
    id: 'admin-notifications',
    type: 'link',
    title: 'Quản lý thông báo',
    titleKey: 'menu.admin.notifications',
    icon: IconBell,
    href: '/admin/notifications',
    feature: FEATURE,
    permission: 'getNotifications',
    metadata: {
      description: 'Quản lý và giám sát hệ thống thông báo',
      order: 3,
    },
  },
  {
    id: 'admin-notification-templates',
    type: 'link',
    title: 'Quản lý mẫu thông báo',
    titleKey: 'menu.admin.notification_templates',
    icon: IconBell,
    href: '/admin/notification-templates',
    feature: FEATURE,
    permission: 'getTemplates',
    metadata: {
      description: 'Quản lý mẫu nội dung thông báo',
      order: 4,
    },
  },
];

// Patient Management Menu Items
const patientManagementItems: MenuItem[] = [
  {
    id: 'admin-patients',
    type: 'link',
    title: 'Quản lý bệnh nhân',
    titleKey: 'menu.admin.patients',
    icon: IconUser,
    href: '/admin/patients',
    feature: FEATURE,
    permission: 'getPatients',
    metadata: {
      description: 'Quản lý thông tin bệnh nhân',
      order: 1,
    },
  },
  {
    id: 'admin-patient-records',
    type: 'link',
    title: 'Hồ sơ bệnh án',
    titleKey: 'menu.admin.patient_records',
    icon: IconFileText,
    href: '/admin/patient-records',
    feature: FEATURE,
    permission: 'getPatients',
    metadata: {
      description: 'Xem và quản lý hồ sơ bệnh án',
      order: 2,
    },
  },
];

// PatientExerciseDetail Management Menu Items
const exerciseManagementItems: MenuItem[] = [
    {
      id: 'admin-exercises',
      type: 'link',
      title: 'Quản lý bài tập',
      titleKey: 'menu.admin.exercises',
      icon: IconActivity,
      href: '/admin/exercises',
      feature: FEATURE,
      permission: 'getExercises',
      metadata: {
        description: 'Quản lý chế độ tập và game bài tập gốc',
        order: 1,
      },
    },
    {
      id: 'admin-progress-reports',
    type: 'link',
    title: 'Báo cáo tiến độ',
    titleKey: 'menu.admin.progress_reports',
    icon: IconFileText,
    href: '/admin/progress-reports',
    feature: FEATURE,
    permission: 'readReport',
    metadata: {
      description: 'Báo cáo tiến độ luyện tập của bệnh nhân',
      order: 3,
    },
  },
];

// System Management Menu Items
const centerClinicManagementItems: MenuItem[] = [
  {
    id: 'admin-centers',
    type: 'link',
    title: 'Quản lý trung tâm',
    titleKey: 'menu.admin.centers',
    icon: IconBuilding,
    href: '/admin/centers',
    feature: FEATURE,
    permission: 'manageCenters',
    metadata: {
      description: 'Quản lý các trung tâm y tế',
      order: 1,
    },
  },
  {
    id: 'admin-clinics',
    type: 'link',
    title: 'Quản lý phòng khám',
    titleKey: 'menu.admin.clinics',
    icon: IconBuilding,
    href: '/admin/clinics',
    feature: FEATURE,
    permission: 'manageClinics',
    metadata: {
      description: 'Quản lý phòng khám và cơ sở',
      order: 2,
    },
  },
  {
    id: 'admin-doctors',
    type: 'link',
    title: 'Quản lý bác sĩ',
    titleKey: 'menu.admin.doctors',
    icon: IconStethoscope,
    href: '/admin/doctors',
    feature: FEATURE,
    permission: 'manageDoctors',
    metadata: {
      description: 'Quản lý thông tin bác sĩ',
      order: 3,
    },
  },
];

// System Management Menu Items
const systemManagementItems: MenuItem[] = [
  {
    id: 'admin-settings',
    type: 'link',
    title: 'Cài đặt hệ thống',
    titleKey: 'menu.admin.settings',
    icon: IconSettings,
    href: '/admin/settings',
    feature: FEATURE,
    permission: 'manageSettings',
    metadata: {
      description: 'Cấu hình toàn hệ thống',
      order: 1,
    },
  },
  {
    id: 'admin-audit-logs',
    type: 'link',
    title: 'Nhật ký hệ thống',
    titleKey: 'menu.admin.audit_logs',
    icon: IconFileSearch,
    href: '/admin/audit-logs',
    feature: FEATURE,
    permission: 'getAuditLogs',
    metadata: {
      description: 'Theo dõi lịch sử thao tác và truy cập hệ thống',
      order: 2,
    },
  },
];

// Menu sections for admin management
const adminSections: MenuSection[] = [
  // Dashboard section removed - no items
  {
    id: 'admin-user-section',
    label: 'Quản lý người dùng',
    labelKey: 'menu.section.user_management',
    feature: FEATURE,
    order: 2,
    items: userManagementItems,
    permission: 'manageUsers',
  },
  {
    id: 'admin-center-clinic-section',
    label: 'Quản lý cơ sở',
    labelKey: 'menu.section.center_clinic_management',
    feature: FEATURE,
    order: 3,
    items: centerClinicManagementItems,
    permission: ['manageCenters', 'manageClinics'],
  },
  {
    id: 'admin-patient-section',
    label: 'Quản lý bệnh nhân',
    labelKey: 'menu.section.patient_management',
    feature: FEATURE,
    order: 4,
    items: patientManagementItems,
    permission: 'getPatients',
  },
  {
    id: 'admin-exercise-section',
    label: 'Quản lý bài tập',
    labelKey: 'menu.section.exercise_management',
    feature: FEATURE,
    order: 5,
    items: exerciseManagementItems,
    permission: 'getExercises',
  },
  {
    id: 'admin-system-section',
    label: 'Hệ thống',
    labelKey: 'menu.section.system_management',
    feature: FEATURE,
    order: 6,
    items: systemManagementItems,
    permission: 'manageSettings',
  },
];

// Export individual item collections for flexibility
export {
  dashboardItems,
  userManagementItems,
  centerClinicManagementItems,
  patientManagementItems,
  exerciseManagementItems,
  systemManagementItems,
  adminSections,
};
