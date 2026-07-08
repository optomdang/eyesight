import { describe, expect, it } from 'vitest';
import {
  getZaloAppDeepLink,
  getZaloChatUrl,
  getZaloProfileUrl,
  getZaloWebChatUrl,
  toZaloMePhone,
} from '../zaloUtils';

describe('zaloUtils', () => {
  it('normalizes Vietnamese mobile numbers', () => {
    expect(toZaloMePhone('0988999666')).toBe('84988999666');
    expect(toZaloMePhone('84988999666')).toBe('84988999666');
  });

  it('returns null for invalid numbers', () => {
    expect(toZaloMePhone('')).toBeNull();
    expect(toZaloMePhone('123')).toBeNull();
  });

  it('builds zalo profile and chat urls', () => {
    expect(getZaloProfileUrl('0988999666')).toBe('https://zalo.me/84988999666');
    expect(getZaloChatUrl('0988999666')).toBe('https://zalo.me/84988999666');
    expect(getZaloWebChatUrl('0988999666')).toBe('https://chat.zalo.me/?phone=84988999666');
    expect(getZaloAppDeepLink('0988999666')).toBe('zalo://conversation?phone=84988999666');
  });
});
