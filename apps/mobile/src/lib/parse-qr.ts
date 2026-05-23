export function parseBatchCodeFromQr(data: string): string | null {
  try {
    // Handle full URL like http://localhost:3000/trace/LOT-2604-0182
    const url = new URL(data);
    const match = url.pathname.match(/\/trace\/([A-Z0-9-]+)/i);
    if (match) return match[1].toUpperCase();
  } catch {
    // Not a URL — check if it's a bare batch code
  }

  // Bare batch code pattern like LOT-2604-0182
  const bareMatch = data.trim().match(/^LOT-\d{4}-\d{3,6}$/i);
  if (bareMatch) return data.trim().toUpperCase();

  return null;
}
