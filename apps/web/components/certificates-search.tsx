'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { useTransition } from 'react';

export function CertificatesSearch() {
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
    startTransition(() => router.push(`/certificates?${params.toString()}`));
  }

  return (
    <div className="relative">
      <Search size={14} className="admin-muted-strong absolute left-3 top-1/2 -translate-y-1/2" />
      <input
        type="text"
        defaultValue={sp.get('q') ?? ''}
        onKeyDown={onKeyDown}
        placeholder="Tìm mã lô, số chứng chỉ..."
        className="admin-input pl-9 pr-4 h-8 text-[12px] w-56"
      />
    </div>
  );
}
