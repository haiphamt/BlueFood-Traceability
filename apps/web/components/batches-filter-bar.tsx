'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useRef, useTransition, useState } from 'react';
import { BATCH_STATUS_LABELS } from '@bluefood/shared';

const PERIOD_OPTIONS = [
  { value: '',      label: 'Tất cả thời gian' },
  { value: 'today', label: 'Hôm nay' },
  { value: '7d',    label: '7 ngày qua' },
  { value: '30d',   label: '30 ngày qua' },
  { value: '2026',  label: 'Năm 2026' },
];

const STATUS_CHIPS = [
  { value: '',               label: 'Tất cả' },
  { value: 'in_transit',     label: BATCH_STATUS_LABELS['in_transit'] },
  { value: 'received_at_store', label: BATCH_STATUS_LABELS['received_at_store'] },
  { value: 'sold',           label: BATCH_STATUS_LABELS['sold'] },
];

export function BatchesFilterBar() {
  const router = useRouter();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);
  const [showExtra, setShowExtra] = useState(false);

  const activeStatus = sp.get('status') ?? '';

  function update(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete('page');
    startTransition(() => router.push(`/batches?${params.toString()}`));
  }

  function onSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') update('q', (e.target as HTMLInputElement).value.trim());
  }

  function onSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.value) update('q', '');
  }

  return (
    <div className="admin-card p-5 flex flex-col gap-3">
      {/* Top row: search + filter toggle */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search size={15} className="admin-muted-strong absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            ref={searchRef}
            type="text"
            defaultValue={sp.get('q') ?? ''}
            onKeyDown={onSearchKeyDown}
            onChange={onSearchChange}
            placeholder="Tìm mã lô, tên sản phẩm, nhà cung cấp…"
            className="admin-input w-full pl-9 pr-4 h-9 text-[13px]"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowExtra((v) => !v)}
          className={`admin-chip flex items-center gap-1.5 h-9 px-3.5 whitespace-nowrap ${showExtra ? 'admin-chip-active' : ''}`}
        >
          <SlidersHorizontal size={14} />
          Lọc thêm
        </button>
      </div>

      {/* Bottom row: status chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="admin-muted-strong text-[11px] font-semibold uppercase tracking-wider mr-1">Trạng thái:</span>
        {STATUS_CHIPS.map((chip) => {
          const isActive = activeStatus === chip.value;
          return (
            <button
              key={chip.value}
              type="button"
              onClick={() => update('status', chip.value)}
              className={`admin-chip px-3 py-1 ${isActive ? 'admin-chip-active' : ''}`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Extra filters: time period (toggled) */}
      {showExtra && (
        <div className="flex items-center gap-3 pt-1 border-t border-line dark:border-[#2a2a2d]">
          <span className="admin-muted-strong text-[11px] font-semibold uppercase tracking-wider">Thời gian:</span>
          <div className="flex items-center gap-2 flex-wrap">
            {PERIOD_OPTIONS.map((o) => {
              const isActive = (sp.get('period') ?? '') === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => update('period', o.value)}
                  className={`admin-chip px-3 py-1 ${isActive ? 'admin-chip-active' : ''}`}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
