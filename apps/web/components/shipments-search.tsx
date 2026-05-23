'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { useTransition } from 'react';

export function ShipmentsSearch() {
  const router = useRouter();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    const val = (e.target as HTMLInputElement).value.trim();
    const params = new URLSearchParams(sp.toString());
    if (val) params.set('q', val);
    else params.delete('q');
    params.delete('page');
    startTransition(() => router.push(`/shipments?${params.toString()}`));
  }

  return (
    <div className="relative">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#727973]" />
      <input
        type="text"
        defaultValue={sp.get('q') ?? ''}
        onKeyDown={onKeyDown}
        placeholder="Tìm biển số xe..."
        className="bg-white border border-[#c2c8c1]/50 rounded-md py-1.5 pl-9 pr-3 text-[#121c28] text-sm focus:border-[#286b3f] focus:ring-1 focus:ring-[#286b3f]/30 outline-none w-48 transition-colors"
      />
    </div>
  );
}
