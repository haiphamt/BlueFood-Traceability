'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

const PERIODS = [
  { value: '',      label: 'Tất cả' },
  { value: '7d',    label: '7 ngày' },
  { value: '30d',   label: '30 ngày' },
  { value: '2026',  label: 'Năm 2026' },
];

export function ReportsPeriodBar() {
  const router = useRouter();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();

  const current = sp.get('period') ?? '';

  function setPeriod(value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set('period', value);
    else params.delete('period');
    startTransition(() => router.push(`/reports?${params.toString()}`));
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {PERIODS.map(({ value, label }) => {
        const active = current === value;
        return (
          <button
            key={value}
            onClick={() => setPeriod(value)}
            className={`admin-chip px-3.5 py-1 text-[12px] ${active ? 'admin-chip-active' : ''}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
