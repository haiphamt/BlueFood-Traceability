'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Clock } from 'lucide-react';
import { useRef, useTransition } from 'react';

const STATUS_CHIPS = [
  { value: '',           label: 'Tất cả' },
  { value: 'planned',    label: 'Đang chuẩn bị' },
  { value: 'in_transit', label: 'Đang vận chuyển' },
  { value: 'delivered',  label: 'Đã giao' },
];

export function ShipmentsFilterBar() {
  const router = useRouter();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);

  function update(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete('page');
    startTransition(() => router.push(`/shipments?${params.toString()}`));
  }

  function onSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') update('q', (e.target as HTMLInputElement).value.trim());
  }

  function onSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.value) update('q', '');
  }

  const activeStatus = sp.get('status') ?? '';
  const isLate = sp.get('late') === '1';

  return (
    <div className="admin-card p-4 flex flex-col gap-3">
      {/* Top row: search + late toggle */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search size={15} className="admin-muted-strong absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            ref={searchRef}
            type="text"
            defaultValue={sp.get('q') ?? ''}
            onKeyDown={onSearchKeyDown}
            onChange={onSearchChange}
            placeholder="Tìm biển số xe, mã lô, tên sản phẩm…"
            className="admin-input w-full pl-9 pr-4 h-9 text-[13px]"
          />
        </div>
        <button
          type="button"
          onClick={() => update('late', isLate ? '' : '1')}
          className={`admin-chip flex items-center gap-1.5 h-9 px-3.5 whitespace-nowrap ${isLate ? 'border-orange-400/40 bg-orange-50 text-orange-700 dark:border-[rgba(255,183,122,0.25)] dark:bg-[rgba(255,183,122,0.08)] dark:text-[#ffb77a]' : ''}`}
        >
          <Clock size={13} />
          Trễ ETA
        </button>
      </div>

      {/* Status chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="admin-muted-strong text-[11px] font-semibold uppercase tracking-wider mr-1">Trạng thái:</span>
        {STATUS_CHIPS.map((chip) => {
          const active = activeStatus === chip.value;
          return (
            <button
              key={chip.value}
              type="button"
              onClick={() => update('status', chip.value)}
              className={`admin-chip px-3 py-1 ${active ? 'admin-chip-active' : ''}`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
