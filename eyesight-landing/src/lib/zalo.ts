import { site } from '@/content/site';

/**
 * Build Zalo chat link. Zalo does not support pre-filled message via URL —
 * callers should show `hint` in UI for user to copy before opening.
 */
export function zaloLink(): string {
  const phone = process.env.NEXT_PUBLIC_ZALO_PHONE?.replace(/\D/g, '');
  if (phone) {
    return `https://zalo.me/${phone}`;
  }
  const oaId = process.env.NEXT_PUBLIC_ZALO_OA_ID;
  if (oaId) {
    return `https://zalo.me/${oaId}`;
  }
  // Fallback — contact page or placeholder
  return `mailto:${site.email}`;
}

export function zaloHintMessage(context: string): string {
  return context;
}
