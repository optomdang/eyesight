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

// @ts-ignore

const isValidToken = (accessToken: string) => {
  if (!accessToken) {
    return false;
  }

  const decoded: any = decodeToken(accessToken);

  const currentTime = Date.now() / 1000;

  return decoded.exp > currentTime;
};

const setSession = (tokens) => {
  if (tokens) {
    localStorage.setItem('accessToken', tokens.access.token);
    localStorage.setItem('refreshToken', tokens.refresh.token);
  } else {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
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

export { isValidToken, setSession, sign, verify };
