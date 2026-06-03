'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, MapPin, Package, Save } from 'lucide-react';

interface ProductOption {
  id: string;
  name: string;
  unit?: string | null;
}

interface SupplierOption {
  id: string;
  name: string;
  province?: string | null;
}

interface PortalBatchCreateFormProps {
  products: ProductOption[];
  supplier: SupplierOption;
}

export function PortalBatchCreateForm({ products, supplier }: PortalBatchCreateFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    productId: '',
    quantity: '',
    unit: 'kg',
    harvestDate: '',
    expirationDate: '',
    originLocation: supplier.province ?? '',
    notes: '',
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const quantity = Number(form.quantity);
    if (!form.productId) {
      setError('Vui lòng chọn sản phẩm');
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError('Khối lượng phải lớn hơn 0');
      return;
    }
    if (form.harvestDate && form.expirationDate && form.expirationDate < form.harvestDate) {
      setError('Ngày hết hạn phải sau ngày thu hoạch');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: form.productId,
          supplierId: supplier.id,
          quantity,
          unit: form.unit.trim() || products.find((product) => product.id === form.productId)?.unit || 'kg',
          harvestDate: form.harvestDate || undefined,
          expirationDate: form.expirationDate || undefined,
          originLocation: form.originLocation.trim() || undefined,
          notes: form.notes.trim() || undefined,
        }),
      });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error?.message ?? 'Không thể tạo lô hàng');
        return;
      }

      router.push(`/portal/batches/${body.batchId}`);
      router.refresh();
    } catch {
      setError('Lỗi kết nối khi tạo lô hàng');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="portal-card portal-card-pad space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="text-sm font-semibold text-white">
          Sản phẩm *
          <select
            required
            value={form.productId}
            onChange={(event) => {
              const product = products.find((item) => item.id === event.target.value);
              setForm({ ...form, productId: event.target.value, unit: product?.unit ?? 'kg' });
            }}
            className="portal-input mt-1 w-full px-3 py-2 text-sm"
          >
            <option value="">-- Chọn sản phẩm --</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-semibold text-white">
          Nhà cung cấp
          <div className="portal-input mt-1 flex min-h-10 items-center gap-2 px-3 py-2 text-sm text-[#d4d4d4]">
            <Package size={16} className="text-emerald-400" />
            <span>{supplier.name}</span>
          </div>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold text-white">
          Khối lượng *
          <input
            type="number"
            min="0.01"
            step="0.01"
            required
            value={form.quantity}
            onChange={(event) => setForm({ ...form, quantity: event.target.value })}
            className="portal-input mt-1 w-full px-3 py-2 text-sm"
            placeholder="0.00"
          />
        </label>

        <label className="text-sm font-semibold text-white">
          Đơn vị *
          <input
            required
            value={form.unit}
            onChange={(event) => setForm({ ...form, unit: event.target.value })}
            className="portal-input mt-1 w-full px-3 py-2 text-sm"
            placeholder="kg"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold text-white">
          Ngày thu hoạch
          <div className="relative mt-1">
            <CalendarDays size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" />
            <input
              type="date"
              value={form.harvestDate}
              onChange={(event) => setForm({ ...form, harvestDate: event.target.value })}
              className="portal-input w-full px-3 py-2 pl-9 text-sm"
            />
          </div>
        </label>

        <label className="text-sm font-semibold text-white">
          Ngày hết hạn *
          <div className="relative mt-1">
            <CalendarDays size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" />
            <input
              type="date"
              required
              value={form.expirationDate}
              onChange={(event) => setForm({ ...form, expirationDate: event.target.value })}
              className="portal-input w-full px-3 py-2 pl-9 text-sm"
            />
          </div>
        </label>
      </div>

      <label className="text-sm font-semibold text-white">
        Địa điểm xuất xứ
        <div className="relative mt-1">
          <MapPin size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" />
          <input
            value={form.originLocation}
            onChange={(event) => setForm({ ...form, originLocation: event.target.value })}
            className="portal-input w-full px-3 py-2 pl-9 text-sm"
            placeholder="Vùng trồng, nông trại, tỉnh/thành..."
          />
        </div>
      </label>

      <label className="text-sm font-semibold text-white">
        Ghi chú
        <textarea
          rows={4}
          value={form.notes}
          onChange={(event) => setForm({ ...form, notes: event.target.value })}
          className="portal-input mt-1 w-full resize-none px-3 py-2 text-sm"
          placeholder="Tiêu chuẩn thu hoạch, điều kiện bảo quản, ghi chú đóng gói..."
        />
      </label>

      {error && (
        <p className="rounded-lg border border-[#ffb4ab]/25 bg-[#ffb4ab]/10 p-3 text-sm font-semibold text-[#ffb4ab]">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => router.push('/portal/batches')}
          className="portal-button-secondary justify-center"
        >
          Hủy bỏ
        </button>
        <button
          type="submit"
          disabled={submitting || products.length === 0}
          className="portal-button-primary justify-center"
        >
          <Save size={16} />
          {submitting ? 'Đang tạo...' : 'Tạo lô hàng'}
        </button>
      </div>
    </form>
  );
}
