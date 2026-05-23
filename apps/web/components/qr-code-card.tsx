'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Copy, Check } from 'lucide-react';

interface QrCodeCardProps {
  batchCode: string;
  traceUrl: string;
}

export function QrCodeCard({ batchCode, traceUrl }: QrCodeCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generated, setGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const updateTheme = () => setIsDark(document.documentElement.classList.contains('dark'));
    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (canvasRef.current) {
      const rootStyle = getComputedStyle(document.documentElement);
      const qrDark = rootStyle.getPropertyValue('--color-text-primary').trim();
      const qrLight = rootStyle.getPropertyValue('--color-surface-1').trim();

      QRCode.toCanvas(canvasRef.current, traceUrl, {
        width: 160,
        margin: 2,
        color: { dark: qrDark, light: qrLight },
      });
      setGenerated(true);
    }
  }, [traceUrl, isDark]);

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${batchCode}-qr.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(traceUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="admin-form-card rounded-xl overflow-hidden flex flex-col items-center text-center relative"
    >
      {/* Top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-accent" />

      <div className="px-5 pt-6 pb-5 flex flex-col items-center w-full">
        <h3 className="admin-ink text-base font-semibold mb-1 mt-1">Mã QR Truy xuất</h3>
        <p className="admin-muted-strong text-xs mb-4">
          Quét để xem trang thông tin công khai dành cho người tiêu dùng.
        </p>

        {/* QR canvas */}
        <div
          className="p-3 rounded-xl mb-4 bg-white border border-slate-200 shadow-sm dark:bg-[#111113] dark:border-[#2a2a2d] dark:shadow-none"
        >
          <canvas ref={canvasRef} className="rounded block" />
        </div>

        {/* URL copy row */}
        <div className="w-full mb-4">
          <label className="admin-muted-strong text-[11px] font-semibold uppercase tracking-wide text-left block mb-1">
            URL Công khai
          </label>
          <div className="flex items-center">
            <input
              readOnly
              type="text"
              value={traceUrl}
              className="admin-readonly-field flex-1 min-w-0 rounded-l-lg py-2 px-3 text-xs font-mono outline-none truncate border-r-0"
            />
            <button
              onClick={handleCopy}
              className="admin-secondary-button rounded-l-none rounded-r-lg px-3 py-2 flex-shrink-0"
              aria-label="Sao chép URL"
            >
              {copied ? <Check size={16} className="text-accent" /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        {/* Download button */}
        {generated && (
          <button
            onClick={handleDownload}
            className="admin-primary-button w-full py-2 rounded-lg text-sm font-medium"
          >
            <Download size={16} />
            Tải mã QR
          </button>
        )}
      </div>
    </div>
  );
}
