'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown } from 'lucide-react';

interface ProductsFilterProps {
  categories: string[];
}

export function ProductsFilter({ categories }: ProductsFilterProps) {
  const router = useRouter();
  const sp = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (!value || value === 'all' || value === 'newest') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete('page');
    router.push(`/products?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <select
          value={sp.get('category') ?? 'all'}
          onChange={(e) => update('category', e.target.value)}
          className="admin-select appearance-none pl-3 pr-8 h-8 text-[12px] cursor-pointer"
        >
          <option value="all">Tất cả danh mục</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <ChevronDown size={13} className="admin-muted-strong absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      <div className="relative">
        <select
          value={sp.get('sort') ?? 'newest'}
          onChange={(e) => update('sort', e.target.value)}
          className="admin-select appearance-none pl-3 pr-8 h-8 text-[12px] cursor-pointer"
        >
          <option value="newest">Mới nhất</option>
          <option value="name">Tên: A-Z</option>
        </select>
        <ChevronDown size={13} className="admin-muted-strong absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    </div>
  );
}
