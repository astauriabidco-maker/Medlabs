type SameSiteOption = 'strict' | 'lax' | 'none';

function getSameSite(): SameSiteOption {
  const value = process.env.AUTH_COOKIE_SAMESITE?.toLowerCase();
  if (value === 'strict' || value === 'lax' || value === 'none') {
    return value;
  }
  return 'lax';
}

export function getAuthCookieOptions(maxAge = 12 * 60 * 60 * 1000, path = '/api') {
  const isProduction = process.env.NODE_ENV === 'production';
  const options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: SameSiteOption;
    path: string;
    maxAge: number;
    domain?: string;
  } = {
    httpOnly: true,
    secure: isProduction || process.env.AUTH_COOKIE_SECURE === 'true',
    sameSite: getSameSite(),
        path,
    maxAge,
  };

  if (process.env.AUTH_COOKIE_DOMAIN) {
    options.domain = process.env.AUTH_COOKIE_DOMAIN;
  }

  return options;
}
