'use client';

import { useEffect } from 'react';

export function QrScanLogger({ batchCode }: { batchCode: string }) {
  useEffect(() => {
    fetch(`/api/public/trace/${batchCode}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'public_qr', userAgent: navigator.userAgent }),
    }).catch(() => {});
  }, [batchCode]);

  return null;
}
