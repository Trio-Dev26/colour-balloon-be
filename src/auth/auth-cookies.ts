import type { Response } from 'express';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';
// path '/' so the dashboard's proxy can see the session cookie on page routes
const REFRESH_PATH = '/';

// cookie lifetime = the JWT's own exp, so the two can't drift apart
const expiry = (jwt: string) => {
  const { exp } = JSON.parse(
    Buffer.from(jwt.split('.')[1], 'base64url').toString(),
  ) as { exp: number };
  return new Date(exp * 1000);
};

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
  secure: boolean,
) {
  const base = { httpOnly: true, secure, sameSite: 'lax' as const };
  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...base,
    path: '/',
    expires: expiry(tokens.accessToken),
  });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...base,
    path: REFRESH_PATH,
    expires: expiry(tokens.refreshToken),
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_COOKIE, { path: REFRESH_PATH });
}
