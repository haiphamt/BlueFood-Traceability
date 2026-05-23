export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export const API_HEALTH_PATH = process.env.EXPO_PUBLIC_API_HEALTH_PATH ?? '/api/health';

export function buildApiUrl(path: string) {
  const base = API_URL.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
