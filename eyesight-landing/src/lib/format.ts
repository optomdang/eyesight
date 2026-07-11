export function formatVnd(amount: number): string {
  return amount.toLocaleString('vi-VN');
}

export function getDailyPrice(pricePerYear: number, durationDays: number): number {
  return Math.round(pricePerYear / durationDays);
}
