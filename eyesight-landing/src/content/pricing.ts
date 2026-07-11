export interface PricingHighlight {
  text: string;
  bold?: boolean;
}

export interface PricingPlan {
  code: string;
  name: string;
  durationDays: number;
  exerciseCount: number;
  pricePerYear: number;
  highlights: PricingHighlight[];
  specialNote?: string;
  popular?: boolean;
  recommended?: boolean;
  zaloHint: string;
}

export const pricingPlans: PricingPlan[] = [
  {
    code: 'AMBLYOPIA_STANDARD',
    name: 'Amblyopia Standard',
    durationDays: 365,
    exerciseCount: 5,
    pricePerYear: 5_990_000,
    highlights: [
      { text: 'Độc lập sử dụng' },
      { text: 'Tập tại nhà' },
      { text: 'Đa dạng thiết bị' },
      { text: 'Nhược thị nhẹ, trung bình' },
      { text: 'Tự đăng ký được' },
    ],
    zaloHint: 'Tôi muốn tư vấn gói Amblyopia Standard',
  },
  {
    code: 'AMBLYOPIA_PRO',
    name: 'Amblyopia Pro',
    durationDays: 365,
    exerciseCount: 8,
    pricePerYear: 9_990_000,
    highlights: [
      { text: '8 Chế độ tập' },
      { text: 'Tập tại nhà' },
      { text: 'Đa dạng thiết bị' },
      { text: 'Nhược thị trung bình' },
      { text: 'Cần Bác sĩ/Chuyên gia đồng hành' },
      { text: 'Được hỗ trợ chuyên môn' },
      { text: 'Hiệu quả cải thiện cao' },
    ],
    zaloHint: 'Tôi muốn tư vấn gói Amblyopia Pro',
  },
  {
    code: 'AMBLYOPIA_ULTRA',
    name: 'Amblyopia Ultra',
    durationDays: 365,
    exerciseCount: 11,
    pricePerYear: 19_990_000,
    highlights: [
      { text: '11 Chế độ tập' },
      { text: 'Tập tại nhà' },
      { text: 'Đa dạng thiết bị' },
      { text: 'Nhược thị nặng' },
      { text: 'Cần Bác sĩ/Chuyên gia đồng hành' },
      { text: 'Được hỗ trợ chuyên môn' },
      { text: 'Hiệu quả cải thiện cao' },
    ],
    specialNote: 'Hoàn tiền nếu không cải thiện',
    popular: true,
    zaloHint: 'Tôi muốn tư vấn gói Amblyopia Ultra',
  },
  {
    code: 'AMBLYOPIA_ULTIMATE',
    name: 'Amblyopia Ultimate',
    durationDays: 365,
    exerciseCount: 15,
    pricePerYear: 29_990_000,
    highlights: [
      { text: '15 Chế độ tập' },
      { text: 'Tập tại nhà' },
      { text: 'Đa dạng thiết bị' },
      { text: 'Đã điều trị lâu không cải thiện' },
      { text: 'Đã thử nhiều phương pháp' },
      { text: 'Nói chung ĐÃ HẾT CÁCH', bold: true },
      { text: 'Cần Bác sĩ/Chuyên gia đồng hành' },
      { text: 'Được hỗ trợ chuyên môn' },
      { text: 'Hiệu quả cải thiện cao' },
    ],
    specialNote: 'Hoàn tiền nếu không cải thiện',
    recommended: true,
    zaloHint: 'Tôi muốn tư vấn gói Amblyopia Ultimate',
  },
];
