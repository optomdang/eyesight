import type { Audience } from './site';

export interface Feature {
  icon: string;
  title: string;
  description: string;
}

export const featuresByAudience: Record<Audience, Feature[]> = {
  clinic: [
    {
      icon: '📋',
      title: 'Hồ sơ bệnh nhân tập trung',
      description: 'Quản lý thông tin, kết quả khám và lịch sử điều trị trên một hệ thống.',
    },
    {
      icon: '🎯',
      title: 'Giao bài tập theo phác đồ',
      description: 'Gán bài tập và gói điều trị phù hợp từng bệnh nhân, từng mắt.',
    },
    {
      icon: '📊',
      title: 'Theo dõi tuân thủ',
      description: 'Dashboard compliance — biết bệnh nhân nào tập đủ, ai cần nhắc nhở.',
    },
    {
      icon: '🔬',
      title: 'Khám thị lực chuẩn',
      description: 'Thị lực xa, gần, tương phản với hiệu chuẩn màn hình chính xác.',
    },
    {
      icon: '📦',
      title: 'Gói điều trị sẵn có',
      description: '4 tier Amblyopia (Standard → Ultimate) — cấu hình nhanh, triển khai ngay.',
    },
    {
      icon: '🔔',
      title: 'Thông báo & nhắc tập',
      description: 'Nhắc bệnh nhân tập đúng lịch, giảm bỏ cuộc giữa chừng.',
    },
  ],
  patient: [
    {
      icon: '🏠',
      title: 'Tập tại nhà tiện lợi',
      description: 'Không cần đến phòng khám mỗi ngày — tập đúng giờ, đúng bài được giao.',
    },
    {
      icon: '🎮',
      title: 'Bài tập game hóa',
      description: 'VT Quest với Gabor, Vernier, Crowding, Stereopsis — vừa tập vừa hứng thú.',
    },
    {
      icon: '📈',
      title: 'Tiến độ rõ ràng',
      description: 'Xem kết quả, điểm số và mức độ cải thiện sau mỗi phiên tập.',
    },
    {
      icon: '👁️',
      title: 'Theo chỉ định Bác sĩ',
      description: 'Bài tập và độ khó được Bác sĩ cá nhân hóa — an toàn, đúng protocol.',
    },
    {
      icon: '⏸️',
      title: 'Tạm dừng & tiếp tục',
      description: 'Lưu tiến độ, tạm dừng khi bận và tiếp tục đúng chỗ đã dừng.',
    },
    {
      icon: '📱',
      title: 'Dùng màn hình có sẵn',
      description: 'Hỗ trợ hiệu chuẩn màn hình để kích thước chữ và khoảng cách chính xác.',
    },
  ],
};

export const howItWorksByAudience: Record<
  Audience,
  { step: number; title: string; description: string }[]
> = {
  clinic: [
    {
      step: 1,
      title: 'Khám & đánh giá',
      description: 'Thực hiện khám thị lực xa, gần, tương phản trên hệ thống với hiệu chuẩn màn hình.',
    },
    {
      step: 2,
      title: 'Giao bài & gói điều trị',
      description: 'Chọn gói Amblyopia phù hợp, gán bài tập và lịch tập cho từng bệnh nhân.',
    },
    {
      step: 3,
      title: 'Theo dõi & điều chỉnh',
      description: 'Xem compliance, kết quả tập luyện và điều chỉnh phác đồ khi cần.',
    },
  ],
  patient: [
    {
      step: 1,
      title: 'Nhận gói từ Bác sĩ',
      description: 'Bác sĩ kê gói điều trị và bài tập phù hợp tình trạng thị lực của bạn.',
    },
    {
      step: 2,
      title: 'Tập theo lịch',
      description: 'Đăng nhập portal, làm bài tập game hóa đúng thời gian được giao.',
    },
    {
      step: 3,
      title: 'Báo cáo tiến độ',
      description: 'Kết quả tự động gửi về phòng khám — Bác sĩ theo dõi và hướng dẫn tiếp.',
    },
  ],
};
