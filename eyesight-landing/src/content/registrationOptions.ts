export const currentAgeOptions = [
  { value: 'under-3', label: '< 3 tuổi' },
  { value: '3-under-6', label: '3 đến < 6 tuổi' },
  { value: '6-under-9', label: '6 đến < 9 tuổi' },
  { value: '9-under-13', label: '9 đến < 13 tuổi' },
  { value: 'over-13', label: '> 13 tuổi' },
] as const;

export const glassesStartAgeOptions = [
  { value: 'none', label: 'Chưa đeo kính' },
  { value: 'under-3', label: '< 3 tuổi' },
  { value: '3-under-6', label: '3 đến < 6 tuổi' },
  { value: '6-under-9', label: '6 đến < 9 tuổi' },
  { value: '9-under-13', label: '9 đến < 13 tuổi' },
  { value: 'over-13', label: '> 13 tuổi' },
] as const;

export const refractiveErrorOptions = [
  { value: 'under-2.5', label: '< 2.50D' },
  { value: '2.5-5', label: '2.50D – 5.00D' },
  { value: 'over-5', label: '> 5.00D' },
] as const;

export const visualAcuityOptions = Array.from({ length: 10 }, (_, i) => {
  const value = String(i + 1);
  return { value, label: `${value}/10` };
});

export const treatmentDurationOptions = [
  { value: 'none', label: 'Chưa điều trị' },
  { value: 'under-1', label: 'Dưới 1 năm' },
  { value: '1-2', label: '1–2 năm' },
  { value: '3-5', label: '3–5 năm' },
  { value: '5-10', label: '5–10 năm' },
  { value: 'over-10', label: 'Trên 10 năm' },
] as const;

export const yesNoOptions = [
  { value: 'yes', label: 'Có' },
  { value: 'no', label: 'Không' },
] as const;

export const eyeConditionFields = [
  { key: 'myopia' as const, label: 'Cận thị' },
  { key: 'hyperopia' as const, label: 'Viễn thị' },
  { key: 'astigmatism' as const, label: 'Loạn thị' },
  { key: 'strabismus' as const, label: 'Lác' },
  { key: 'cataract' as const, label: 'Đục thể thủy tinh' },
  { key: 'nystagmus' as const, label: 'Rung giật nhãn cầu' },
];

export const registrationSteps = [
  { id: 1, label: 'Thông tin cá nhân' },
  { id: 2, label: 'Bệnh sử' },
  { id: 3, label: 'Gói điều trị' },
  { id: 4, label: 'Bác sĩ/Chuyên gia' },
  { id: 5, label: 'Thanh toán' },
] as const;
