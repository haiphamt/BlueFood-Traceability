'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ProductsPaginationProps {
  currentPage: number;
  totalPages: number;
}

export function ProductsPagination({ currentPage, totalPages }: ProductsPaginationProps) {
  const router = useRouter();
  const sp = useSearchParams();

  if (totalPages <= 1) return null;

  function navigate(p: number) {
    const params = new URLSearchParams(sp.toString());
    params.set('page', String(p));
    router.push(`/products?${params.toString()}`);
  }

  const pages: (number | 'ellipsis-start' | 'ellipsis-end')[] = [];
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('ellipsis-start');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push('ellipsis-end');
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => navigate(currentPage - 1)}
        disabled={currentPage <= 1}
        className="admin-icon-button p-1 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronLeft size={16} />
      </button>

      {pages.map((p) =>
        typeof p === 'string' ? (
          <span key={p} className="admin-muted-strong px-1 text-sm">…</span>
        ) : (
          <button
            key={p}
            onClick={() => navigate(p)}
            className={`w-7 h-7 rounded text-[12px] font-medium flex items-center justify-center transition-colors ${
              p === currentPage
                ? 'bg-accent text-[#003824]'
                : 'border border-line text-ink hover:bg-[var(--color-surface-2)] dark:border-[#2a2a2d] dark:text-[#f5f5f5] dark:hover:bg-[#1f1f22]'
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => navigate(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="admin-icon-button p-1 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
