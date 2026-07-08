import { uniqueId } from 'lodash';
import {
  IconHome,
  IconHospital,
  IconUser,
  IconUsers,
  IconActivity,
  IconDashboard,
  IconFileSearch,
  IconSettings,
} from '@tabler/icons-react';

interface LegacyMenuitemsType {
  [x: string]: any;
  id?: string;
  navlabel?: boolean;
  subheader?: string;
  title?: string;
  icon?: any;
  href?: string;
  children?: LegacyMenuitemsType[];
  chip?: string;
  chipColor?: string;
  variant?: string;
  external?: boolean;
  permission?: string | string[];
  adminOnly?: boolean;
  /** Highlight when pathname starts with href (e.g. /admin/settings/*). */
  matchPrefix?: boolean;
}

const Menuitems: LegacyMenuitemsType[] = [
  {
    navlabel: true,
    subheader: 'Dashboard',
  },
  {
    id: uniqueId(),
    title: 'Dashboard',
    icon: IconDashboard,
    href: '/admin/dashboard',
    permission: 'readDashboard',
  },
  {
    navlabel: true,
    subheader: 'Administrator',
  },
  {
    id: uniqueId(),
    title: 'User',
    icon: IconUser,
    href: '/admin/users',
    permission: 'manageUsers',
  },
  {
    id: uniqueId(),
    title: 'Patient',
    icon: IconUsers,
    href: '/admin/patients',
    permission: 'getPatients',
  },
  {
    id: uniqueId(),
    title: 'Doctor',
    icon: IconUsers,
    href: '/admin/doctors',
    permission: 'manageDoctors',
  },
  {
    id: uniqueId(),
    title: 'Exercise',
    icon: IconActivity,
    href: '/admin/exercises',
    permission: 'getExercises',
    adminOnly: true,
  },
  {
    navlabel: true,
    subheader: 'Settings',
  },
  {
    id: uniqueId(),
    title: 'Settings',
    icon: IconSettings,
    href: '/admin/settings',
    matchPrefix: true,
  },
  {
    navlabel: true,
    subheader: 'System',
    permission: ['manageClinics', 'manageCenters'],
  },
  {
    id: uniqueId(),
    title: 'Clinic',
    icon: IconHospital,
    href: '/admin/clinics',
    permission: 'manageClinics',
  },
  {
    id: uniqueId(),
    title: 'Center',
    icon: IconHome,
    href: '/admin/centers',
    permission: 'manageCenters',
  },
  {
    id: uniqueId(),
    title: 'Audit Log',
    icon: IconFileSearch,
    href: '/admin/audit-logs',
    permission: 'getAuditLogs',
  },
];

export default Menuitems;
