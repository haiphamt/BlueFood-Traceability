'use client';

import { useEffect } from 'react';

export function QrScanLogger({ lotId }: { lotId: string }) {
  useEffect(() => {
    fetch(`/api/public/trace/${lotId}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'public_qr', userAgent: navigator.userAgent }),
      keepalive: true,
    }).catch(() => {});
  }, [lotId]);

  return null;
}
