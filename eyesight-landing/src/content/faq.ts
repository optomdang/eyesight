export interface FaqItem {
  question: string;
  answer: string;
}

export const faqItems: FaqItem[] = [
  {
    question: 'D-VisUp dành cho ai?',
    answer:
      'D-VisUp phục vụ phòng khám nhãn khoa (quản lý bệnh nhân, giao bài tập) và bệnh nhân cần tập thị lực tại nhà theo chỉ định Bác sĩ — đặc biệt hỗ trợ điều trị nhược thị và các rối loạn thị giác.',
  },
  {
    question: 'Tôi có cần Bác sĩ chỉ định không?',
    answer:
      'Có. Bài tập và gói điều trị được Bác sĩ cá nhân hóa. D-VisUp hỗ trợ thực hiện phác đồ, không thay thế khám và chẩn đoán y khoa.',
  },
  {
    question: 'Cần màn hình như thế nào?',
    answer:
      'Nên dùng màn hình máy tính hoặc laptop đủ lớn (tối thiểu ~15 inch), hiệu chuẩn khoảng cách và kích thước chữ theo hướng dẫn trong app.',
  },
  {
    question: 'Bài tập có an toàn cho trẻ em không?',
    answer:
      'Các bài tập được thiết kế theo nguyên tắc lâm sàng thị giác. Phụ huynh nên theo dõi và tuân thủ chỉ định của Bác sĩ điều trị.',
  },
  {
    question: 'Phòng khám triển khai mất bao lâu?',
    answer:
      'Rất nhanh, chỉ trong 10 phút, không tốn kém chi phí đầu tư.',
  },
  {
    question: 'Có thể tạm dừng bài tập không?',
    answer:
      'Có. Bệnh nhân có thể tạm dừng và tiếp tục sau — tiến độ được lưu tự động trên hệ thống.',
  },
  {
    question: 'Dữ liệu bệnh nhân có được bảo mật không?',
    answer:
      'Hệ thống tuân thủ phân quyền theo vai trò (Bác sĩ, bệnh nhân, admin). Dữ liệu lưu trên hạ tầng cloud bảo mật.',
  },
];

export const exercises = [
  {
    icon: '🌌',
    name: 'VT Quest',
    description: 'Bài tập thị giác game hóa — Gabor, Vernier, Crowding, Stereopsis với hệ thống thưởng.',
  },
  {
    icon: '👁️',
    name: 'Thị lực xa / gần',
    description: 'Khám và tập với optotype chuẩn Snellen, điều chỉnh độ khó thích ứng.',
  },
  {
    icon: '◐',
    name: 'Thị lực tương phản',
    description: 'Đo và luyện nhận biết tương phản — hỗ trợ đánh giá thị lực chức năng.',
  },
  {
    icon: '🔢',
    name: '2048 & ODETS',
    description: 'Bài tập tương tác hỗ trợ luyện tập thị giác theo mức độ khó khác nhau.',
  },
] as const;
