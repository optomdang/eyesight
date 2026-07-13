// Simple JWT decode function to replace react-jwt
const decodeToken = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
};

export const REMEMBER_ME_KEY = 'authRememberMe';
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';

export type AuthTokens = {
  access: { token: string };
  refresh: { token: string };
};

const isValidToken = (accessToken: string) => {
  if (!accessToken) {
    return false;
  }

  const decoded: any = decodeToken(accessToken);

  const currentTime = Date.now() / 1000;

  return decoded.exp > currentTime;
};

const getRememberMePreference = () => localStorage.getItem(REMEMBER_ME_KEY) === 'true';

const resolveActiveStorage = (): Storage => {
  if (sessionStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(REFRESH_TOKEN_KEY)) {
    return sessionStorage;
  }
  return localStorage;
};

const clearTokensFromAllStorages = () => {
  for (const storage of [sessionStorage, localStorage]) {
    storage.removeItem(ACCESS_TOKEN_KEY);
    storage.removeItem(REFRESH_TOKEN_KEY);
  }
};

const getAccessToken = (): string | null =>
  sessionStorage.getItem(ACCESS_TOKEN_KEY) ?? localStorage.getItem(ACCESS_TOKEN_KEY);

const getRefreshToken = (): string | null =>
  sessionStorage.getItem(REFRESH_TOKEN_KEY) ?? localStorage.getItem(REFRESH_TOKEN_KEY);

const setSession = (tokens: AuthTokens | null, rememberMe?: boolean) => {
  clearTokensFromAllStorages();

  if (!tokens) {
    localStorage.removeItem(USER_KEY);
    return;
  }

  if (rememberMe !== undefined) {
    localStorage.setItem(REMEMBER_ME_KEY, rememberMe ? 'true' : 'false');
  }

  const storage =
    rememberMe === true
      ? localStorage
      : rememberMe === false
        ? sessionStorage
        : resolveActiveStorage();

  storage.setItem(ACCESS_TOKEN_KEY, tokens.access.token);
  storage.setItem(REFRESH_TOKEN_KEY, tokens.refresh.token);
};

const clearSession = () => {
  clearTokensFromAllStorages();
  localStorage.removeItem(USER_KEY);
};

const getTokenExpiryMs = (token: string): number | null => {
  const decoded = decodeToken(token);
  return decoded?.exp ? decoded.exp * 1000 : null;
};

const sign = (payload: any, privateKey: string, header: any) => {
  const now = new Date();
  header.expiresIn = new Date(now.getTime() + header.expiresIn);
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  const signature = btoa(
    Array.from(encodedPayload)
      .map((item, key) =>
        String.fromCharCode(item.charCodeAt(0) ^ privateKey[key % privateKey.length].charCodeAt(0))
      )
      .join('')
  );

  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

const verify = (token: string, privateKey: string) => {
  const [encodedHeader, encodedPayload, signature] = token.split('.');
  const header = JSON.parse(atob(encodedHeader));
  const payload = JSON.parse(atob(encodedPayload));
  const now = new Date();

  if (now < header.expiresIn) {
    throw new Error('Expired token');
  }

  const verifiedSignature = btoa(
    Array.from(encodedPayload)
      .map((item, key) =>
        String.fromCharCode(item.charCodeAt(0) ^ privateKey[key % privateKey.length].charCodeAt(0))
      )
      .join('')
  );

  if (verifiedSignature !== signature) {
    throw new Error('Invalid signature');
  }

  return payload;
};

export {
  isValidToken,
  setSession,
  clearSession,
  getAccessToken,
  getRefreshToken,
  getRememberMePreference,
  getTokenExpiryMs,
  sign,
  verify,
};
