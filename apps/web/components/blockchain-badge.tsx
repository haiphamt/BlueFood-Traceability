'use client';

import { useEffect, useState } from 'react';

export type BlockchainStatus = 'verified' | 'pending' | 'failed' | 'tampered' | 'not_anchored';

interface Props {
  batchEventId?: string;
  jobId?: string;
  txHash?: string;
  initialStatus?: BlockchainStatus;
  polygonscanBaseUrl?: string;
}

const LABELS: Record<BlockchainStatus, string> = {
  verified:     'Đã xác thực',
  pending:      'Đang xử lý',
  failed:       'Thất bại',
  tampered:     'Cảnh báo giả mạo',
  not_anchored: 'Chưa anchor',
};

const STYLES: Record<BlockchainStatus, string> = {
  verified:     'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-[rgba(34,197,94,0.10)] dark:text-[#22c55e] dark:border-[rgba(34,197,94,0.30)]',
  pending:      'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-[#ffb77a]/10 dark:text-[#ffb77a] dark:border-[#ffb77a]/30',
  failed:       'bg-red-50 text-red-700 border border-red-200 dark:bg-[#ffb4ab]/10 dark:text-[#ffb4ab] dark:border-[#ffb4ab]/30',
  tampered:     'bg-red-50 text-red-700 border border-red-200 dark:bg-[#ffb4ab]/15 dark:text-[#ffb4ab] dark:border-[#ffb4ab]/30',
  not_anchored: 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-[rgba(255,255,255,0.06)] dark:text-[#9ca3af] dark:border-[rgba(255,255,255,0.12)]',
};

const DOT: Record<BlockchainStatus, string> = {
  verified:     'bg-emerald-600 dark:bg-[#22c55e]',
  pending:      'bg-amber-500 dark:bg-[#ffb77a]',
  failed:       'bg-red-500 dark:bg-[#ffb4ab]',
  tampered:     'bg-red-500 dark:bg-[#ffb4ab]',
  not_anchored: 'bg-slate-500 dark:bg-[#737373]',
};

export function BlockchainBadge({
  jobId,
  txHash,
  initialStatus = 'not_anchored',
  polygonscanBaseUrl = 'https://polygonscan.com',
}: Props) {
  const [status, setStatus] = useState<BlockchainStatus>(initialStatus);
  const [explorerUrl, setExplorerUrl] = useState<string | null>(
    txHash && polygonscanBaseUrl ? `${polygonscanBaseUrl}/tx/${txHash}` : null
  );

  useEffect(() => {
    setStatus(initialStatus);
    setExplorerUrl(txHash && polygonscanBaseUrl ? `${polygonscanBaseUrl}/tx/${txHash}` : null);
  }, [initialStatus, polygonscanBaseUrl, txHash]);

  // Poll for pending status every 15 seconds
  useEffect(() => {
    if (status !== 'pending' || !jobId) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/blockchain/status/${jobId}`);
        if (!res.ok) return;
        const data = await res.json();
        setStatus(data.status as BlockchainStatus);
        if (data.explorerUrl) setExplorerUrl(data.explorerUrl);
      } catch {}
    };

    poll();
    const interval = setInterval(poll, 15_000);
    return () => clearInterval(interval);
  }, [status, jobId]);

  const badge = (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-xs font-medium leading-5 whitespace-nowrap ${STYLES[status]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${DOT[status]} ${status === 'pending' ? 'animate-pulse' : ''}`}
      />
      {LABELS[status]}
    </span>
  );

  if (explorerUrl && status === 'verified') {
    return (
      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{ textDecoration: 'none' }}
        title="Xem trên Polygonscan"
      >
        {badge}
      </a>
    );
  }

  return badge;
}
