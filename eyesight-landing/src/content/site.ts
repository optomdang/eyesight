export type Audience = 'clinic' | 'patient';

export const site = {
  name: 'Nhuoc Thi',
  productName: 'D-VisUp',
  tagline: 'Nền tảng khám và điều trị thị lực thông minh',
  description:
    'Hệ thống hỗ trợ phòng khám nhãn khoa và bệnh nhân tập thị lực tại nhà — khám chính xác, bài tập lâm sàng, theo dõi tiến độ.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nhuocthi.vn',
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.nhuocthi.vn',
  email: 'contact@nhuocthi.vn',
  phone: process.env.NEXT_PUBLIC_ZALO_PHONE ?? '',
} as const;

export const navLinks = [
  { label: 'Tính năng', href: '/#features' },
  { label: 'Cách hoạt động', href: '/#how-it-works' },
  { label: 'Bài tập', href: '/#exercises' },
  { label: 'Gói điều trị', href: '/#pricing' },
  { label: 'Bảo hành', href: '/bao-hanh' },
  { label: 'FAQ', href: '/#faq' },
] as const;

export const heroContent = {
  clinic: {
    headline: 'Quản lý & điều trị thị lực trên một nền tảng',
    subheadline:
      'Số hóa quy trình khám, giao bài tập và theo dõi tuân thủ điều trị — giúp phòng khám tăng hiệu quả, bệnh nhân tập đúng protocol.',
    ctaLabel: 'Tư vấn triển khai cho phòng khám',
    ctaHint: 'Tôi muốn tư vấn triển khai D-VisUp cho phòng khám',
  },
  patient: {
    headline: 'Tập thị lực tại nhà theo chỉ định Bác sĩ',
    subheadline:
      'Bài tập được game hóa, tiến độ rõ ràng — hỗ trợ điều trị nhược thị và các rối loạn thị giác theo phác đồ chuyên môn.',
    ctaLabel: 'Tư vấn gói tập tại nhà',
    ctaHint: 'Tôi muốn tư vấn gói tập thị lực tại nhà',
  },
} as const;

export const trustStats = [
  { value: '15+', label: 'Loại bài tập lâm sàng' },
  { value: '4', label: 'Gói điều trị linh hoạt' },
  { value: '100%', label: 'Hỗ trợ hiệu chuẩn màn hình' },
  { value: '24/7', label: 'Tập tại nhà mọi lúc' },
] as const;
