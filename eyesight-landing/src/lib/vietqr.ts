function removeVietnameseDiacritics(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export function buildTransferNote(fullName: string, phone: string): string {
  const normalizedPhone = phone.replace(/\D/g, '');
  const normalizedName = removeVietnameseDiacritics(fullName.trim());
  return `${normalizedName}_${normalizedPhone}`;
}

export function buildVietQrUrl(amount: number, transferNote: string): string | null {
  const bankId = process.env.NEXT_PUBLIC_PAYMENT_BANK_ID;
  const account = process.env.NEXT_PUBLIC_PAYMENT_ACCOUNT;
  const accountName = process.env.NEXT_PUBLIC_PAYMENT_ACCOUNT_NAME;

  if (!bankId || !account) {
    return null;
  }

  const params = new URLSearchParams({
    amount: String(amount),
    addInfo: transferNote,
  });

  if (accountName) {
    params.set('accountName', accountName);
  }

  return `https://img.vietqr.io/image/${bankId}-${account}-compact2.png?${params.toString()}`;
}
