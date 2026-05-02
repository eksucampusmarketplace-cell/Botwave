export function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  return 'http://localhost:3000';
}

export function getAuthCallbackUrl(): string {
  return `${getAppUrl()}/auth/callback`;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function getRedirectUrls(): string[] {
  const appUrl = getAppUrl();
  return [
    `${appUrl}/auth/callback`,
    `${appUrl}/login`,
    `${appUrl}/signup`,
    appUrl,
  ];
}