'use client';

import { useState } from 'react';
import { Check, Share2 } from 'lucide-react';

interface ShareButtonProps {
  url: string;
  title: string;
}

export function ShareButton({ url, title }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {}
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleShare}
      className={`inline-flex items-center justify-center gap-2.5 rounded-xl border px-7 py-3.5 text-sm font-bold shadow-sm transition-colors ${
        copied
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
          : 'border-line bg-panel text-ink hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800'
      }`}
    >
      {copied ? <Check size={18} /> : <Share2 size={18} />}
      {copied ? 'Đã copy link' : 'Chia sẻ trang này'}
    </button>
  );
}
