/** Chuẩn hóa số ĐT VN cho link Zalo (ưu tiên dạng 84xxxxxxxxx). */
export function toZaloMePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 9) return null;
  if (digits.startsWith('84') && digits.length >= 11) return digits;
  if (digits.startsWith('0') && digits.length >= 10) return `84${digits.slice(1)}`;
  return `84${digits}`;
}

/** Trang profile zalo.me (cần thêm bước bấm "Nhắn tin"). */
export function getZaloProfileUrl(phone: string): string | null {
  const normalized = toZaloMePhone(phone);
  return normalized ? `https://zalo.me/${normalized}` : null;
}

/** Web chat — ít bước hơn zalo.me, dùng khi không có app. */
export function getZaloWebChatUrl(phone: string): string | null {
  const normalized = toZaloMePhone(phone);
  return normalized ? `https://chat.zalo.me/?phone=${normalized}` : null;
}

/** Deep link mở thẳng Zalo desktop/mobile đã cài trên máy. */
export function getZaloAppDeepLink(phone: string): string | null {
  const normalized = toZaloMePhone(phone);
  return normalized ? `zalo://conversation?phone=${normalized}` : null;
}

/** @deprecated Dùng getZaloProfileUrl — giữ để tương thích test cũ. */
export function getZaloChatUrl(phone: string): string | null {
  return getZaloProfileUrl(phone);
}

const APP_OPEN_TIMEOUT_MS = 1600;

function triggerDeepLink(appUrl: string): void {
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.setAttribute('aria-hidden', 'true');
  iframe.src = appUrl;
  document.body.appendChild(iframe);

  const anchor = document.createElement('a');
  anchor.href = appUrl;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();

  window.setTimeout(() => {
    iframe.remove();
    anchor.remove();
  }, APP_OPEN_TIMEOUT_MS + 200);
}

/**
 * Ưu tiên mở app Zalo đã đăng nhập (zalo://).
 * Nếu app không mở được, fallback sang chat web.
 */
export function openZaloChat(phone: string): boolean {
  const appUrl = getZaloAppDeepLink(phone);
  const webUrl = getZaloWebChatUrl(phone);
  if (!appUrl || !webUrl) return false;

  let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
  let cleanedUp = false;

  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    if (fallbackTimer) window.clearTimeout(fallbackTimer);
    window.removeEventListener('blur', onAppLikelyOpened);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };

  const onAppLikelyOpened = () => {
    cleanup();
  };

  const onVisibilityChange = () => {
    if (document.hidden) cleanup();
  };

  window.addEventListener('blur', onAppLikelyOpened);
  document.addEventListener('visibilitychange', onVisibilityChange);

  fallbackTimer = window.setTimeout(() => {
    cleanup();
    window.open(webUrl, '_blank', 'noopener,noreferrer');
  }, APP_OPEN_TIMEOUT_MS);

  triggerDeepLink(appUrl);
  return true;
}
