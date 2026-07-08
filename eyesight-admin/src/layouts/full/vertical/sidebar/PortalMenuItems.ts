import { IconEye, IconActivity, IconUser, IconHome, IconAdjustments, IconVolume } from '@tabler/icons-react';

// Simple ID generator to replace lodash uniqueId
let idCounter = 0;
const uniqueId = (prefix?: string) => {
  const id = ++idCounter;
  return prefix ? `${prefix}${id}` : `${id}`;
};

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
}

const PortalMenuItems: LegacyMenuitemsType[] = [
  {
    navlabel: true,
    subheader: 'PORTAL BỆNH NHÂN',
  },
  {
    id: uniqueId(),
    title: 'Trang chủ',
    icon: IconHome,
    href: '/portal/home',
  },
  {
    id: uniqueId(),
    title: 'Bài tập của tôi',
    icon: IconActivity,
    href: '/portal/exercises',
  },
  {
    id: uniqueId(),
    title: 'Kiểm tra thị lực',
    icon: IconEye,
    href: '/portal/exam',
  },
  {
    id: uniqueId(),
    title: 'Lịch sử',
    icon: IconUser,
    href: '/portal/history',
  },
  {
    navlabel: true,
    subheader: 'CÀI ĐẶT',
  },
  {
    id: uniqueId(),
    title: 'Hiệu chuẩn màn hình',
    icon: IconAdjustments,
    href: '/portal/settings/calibration',
  },
  {
    id: uniqueId(),
    title: 'Giọng đọc hướng dẫn',
    icon: IconVolume,
    href: '/portal/settings/voice',
  },
];

export default PortalMenuItems;
