import type { Metadata } from 'next';
import { DoctorAdminPage } from '@/components/admin/DoctorAdminPage';

export const metadata: Metadata = {
  title: 'Quản lý Bác sĩ',
  robots: { index: false, follow: false },
};

export default function AdminDoctorsPage() {
  return <DoctorAdminPage />;
}
