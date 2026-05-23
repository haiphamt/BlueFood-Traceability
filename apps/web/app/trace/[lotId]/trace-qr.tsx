'use client';

import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

export function TraceQr({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 140,
        margin: 2,
        color: { dark: '#17211b', light: '#ffffff' },
      });
    }
  }, [url]);

  return <canvas ref={canvasRef} className="rounded-xl" />;
}
