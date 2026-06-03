'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { BarChart3, CalendarDays } from 'lucide-react';
import type { ReportGranularity } from '@/lib/reports';

const PERIODS = [
  { value: '', label: 'Tất cả' },
  { value: '7d', label: '7 ngày' },
  { value: '30d', label: '30 ngày' },
  { value: '2026', label: 'Năm 2026' },
];

const GRANULARITIES: { value: ReportGranularity; label: string }[] = [
  { value: 'week', label: 'Theo tuần' },
  { value: 'month', label: 'Theo tháng' },
  { value: 'year', label: 'Theo năm' },
];

export function ReportsPeriodBar() {
  const router = useRouter();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();
  const [from, setFrom] = useState(sp.get('from') ?? '');
  const [to, setTo] = useState(sp.get('to') ?? '');

  const current = sp.get('period') ?? '';
  const currentGranularity = (sp.get('granularity') as ReportGranularity | null) ?? 'month';

  useEffect(() => {
    setFrom(sp.get('from') ?? '');
    setTo(sp.get('to') ?? '');
  }, [sp]);

  function push(params: URLSearchParams) {
    const query = params.toString();
    startTransition(() => router.push(`/reports${query ? `?${query}` : ''}`));
  }

  function setPeriod(value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set('period', value);
    else params.delete('period');
    params.delete('from');
    params.delete('to');
    params.set('granularity', currentGranularity);
    push(params);
  }

  function setGranularity(value: ReportGranularity) {
    const params = new URLSearchParams(sp.toString());
    params.set('granularity', value);
    push(params);
  }

  function applyCustomRange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams(sp.toString());
    params.delete('period');
    if (from) params.set('from', from);
    else params.delete('from');
    if (to) params.set('to', to);
    else params.delete('to');
    params.set('granularity', currentGranularity);
    push(params);
  }

  return (
    <div className="admin-card px-4 py-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {PERIODS.map(({ value, label }) => {
            const active = current === value && !sp.get('from') && !sp.get('to');
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

        <form onSubmit={applyCustomRange} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex items-center gap-2">
            <CalendarDays size={15} className="admin-muted-strong" />
            <label className="admin-label text-[11px] font-semibold uppercase tracking-wider">
              Từ
              <input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="admin-input ml-2 h-9 px-3 text-[12px]"
              />
            </label>
          </div>
          <label className="admin-label text-[11px] font-semibold uppercase tracking-wider">
            Đến
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="admin-input ml-2 h-9 px-3 text-[12px]"
            />
          </label>
          <button type="submit" className="admin-secondary-button h-9 px-3 !py-0">
            Áp dụng
          </button>
        </form>

        <div className="flex items-center gap-2">
          <BarChart3 size={15} className="admin-muted-strong" />
          <select
            value={currentGranularity}
            onChange={(event) => setGranularity(event.target.value as ReportGranularity)}
            className="admin-select h-9 px-3 text-[12px]"
          >
            {GRANULARITIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
