'use client';

import { useState } from 'react';
import { DownloadIcon, ExternalIcon, ShareIcon } from './icons';

interface StickyFooterProps {
  lotId: string;
  productName: string;
  polygonscanUrl?: string | null;
  pdfHref: string;
  shareUrl: string;
}

export function StickyFooter({ lotId, productName, polygonscanUrl, pdfHref, shareUrl }: StickyFooterProps) {
  const [shared, setShared] = useState(false);

  async function handleShare() {
    const title = `${productName} - ${lotId} | BlueFood`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url: shareUrl });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setShared(true);
        window.setTimeout(() => setShared(false), 1800);
      }
    } catch {
      setShared(false);
    }
  }

  return (
    <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-trace-line bg-white/96 px-3 py-2 shadow-[0_-8px_24px_rgba(20,34,26,0.08)] backdrop-blur md:static md:mt-6 md:border md:shadow-card">
      <div className="mx-auto grid max-w-2xl grid-cols-3 gap-2">
        <a
          href={polygonscanUrl ?? '#'}
          target={polygonscanUrl ? '_blank' : undefined}
          rel={polygonscanUrl ? 'noopener noreferrer' : undefined}
          aria-disabled={!polygonscanUrl}
          className="flex h-11 items-center justify-center gap-1.5 rounded-md border border-trace-line px-2 text-xs font-bold text-trace-forest disabled:pointer-events-none aria-disabled:pointer-events-none aria-disabled:opacity-45"
        >
          <ExternalIcon className="h-4 w-4" />
          Polygonscan
        </a>
        <a
          href={pdfHref}
          className="flex h-11 items-center justify-center gap-1.5 rounded-md border border-trace-line px-2 text-xs font-bold text-trace-forest"
        >
          <DownloadIcon className="h-4 w-4" />
          PDF
        </a>
        <button
          type="button"
          onClick={handleShare}
          className="flex h-11 items-center justify-center gap-1.5 rounded-md bg-trace-forest px-2 text-xs font-bold text-white"
        >
          <ShareIcon className="h-4 w-4" />
          {shared ? 'Đã chép' : 'Chia sẻ'}
        </button>
      </div>
    </footer>
  );
}
