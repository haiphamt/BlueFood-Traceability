'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  ChevronRight, ChevronDown, ClipboardList, MapPin,
  CheckCircle2, XCircle, Clock, Save, QrCode,
} from 'lucide-react';
import { ProductImageUpload } from '@/components/product-image-upload';

export default function NewBatchPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; unit: string }[]>([]);
  const [form, setForm] = useState({
    productId: '',
    supplierId: '',
    quantity: '',
    unit: 'kg',
    harvestDate: '',
    expirationDate: '',
    originLocation: '',
    notes: '',
    imageUrl: '',
  });

  useEffect(() => {
    let active = true;

    async function loadOptions() {
      try {
        const res = await fetch('/api/batches/options', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data?.error?.message ?? 'KhÃ´ng táº£i Ä‘Æ°á»£c danh má»¥c');
          return;
        }
        if (!active) return;
        setSuppliers(data.suppliers ?? []);
        setProducts(data.products ?? []);
      } catch {
        toast.error('KhÃ´ng táº£i Ä‘Æ°á»£c sáº£n pháº©m vÃ  nhÃ  cung cáº¥p');
      }
    }

    loadOptions();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.productId || !form.supplierId) {
      toast.error('Vui lòng chọn sản phẩm và nhà cung cấp');
      return;
    }
    const qty = parseFloat(form.quantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Khối lượng phải lớn hơn 0');
      return;
    }
    if (form.harvestDate && form.expirationDate && form.expirationDate < form.harvestDate) {
      toast.error('Ngày hết hạn phải sau ngày thu hoạch');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: form.productId,
          supplierId: form.supplierId,
          quantity: qty,
          unit: form.unit,
          harvestDate: form.harvestDate || undefined,
          expirationDate: form.expirationDate || undefined,
          originLocation: form.originLocation || undefined,
          notes: form.notes || undefined,
          imageUrl: form.imageUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data?.error?.message ?? 'Lỗi khi tạo lô hàng'); return; }
      toast.success(`Đã tạo lô hàng ${data.batchCode}`);
      router.push(`/batches/${data.batchCode}`);
    } catch {
      toast.error('Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = 'admin-input w-full px-4 py-2.5 text-sm';
  const selectCls = 'admin-select w-full appearance-none px-4 py-2.5 pr-10 text-sm';
  const textareaCls = 'admin-textarea w-full px-4 py-2.5 text-sm';
  const labelCls = 'admin-label block text-[11px] font-bold uppercase tracking-wider mb-1.5';

  const qty = parseFloat(form.quantity);
  const checks = [
    { ok: !!form.productId,      label: 'Sản phẩm đã chọn' },
    { ok: !!form.supplierId,     label: 'Nhà cung cấp đã chọn' },
    { ok: !isNaN(qty) && qty > 0, label: 'Khối lượng hợp lệ' },
    { ok: !!form.expirationDate, pending: !form.expirationDate, label: 'Ngày hết hạn đã nhập' },
  ];

  return (
    <div className="max-w-[1100px] mx-auto space-y-5">
      {/* ── Breadcrumb ── */}
      <div className="admin-breadcrumb text-sm">
        <Link href="/batches" className="admin-link transition-colors">Lô hàng</Link>
        <ChevronRight size={14} />
        <span className="admin-breadcrumb-current font-medium">Tạo mới</span>
      </div>

      {/* ── Page header ── */}
      <div>
        <h1 className="admin-page-title">Tạo Lô Hàng Mới</h1>
        <p className="admin-muted mt-1 text-sm">
          Nhập thông tin truy xuất nguồn gốc cho lô hàng chuẩn bị xuất kho.
        </p>
      </div>

      {/* ── Grid layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

        {/* ── Left: Main form (2/3) ── */}
        <div className="admin-form-card lg:col-span-2 p-6">
          {/* Section header */}
          <div className="admin-section-divider flex items-center gap-3 mb-5 pb-4 border-b">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300"
            >
              <ClipboardList size={16} />
            </div>
            <h2 className="admin-ink text-lg font-semibold">Thông tin cơ bản</h2>
          </div>

          <form id="create-batch-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Product & Supplier */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>
                  Sản phẩm <span className="admin-required">*</span>
                </label>
                <div className="relative">
                  <select
                    required
                    value={form.productId}
                    onChange={(e) => {
                      const p = products.find((x) => x.id === e.target.value);
                      setForm({ ...form, productId: e.target.value, unit: p?.unit ?? 'kg' });
                    }}
                    className={selectCls}
                  >
                    <option value="">Chọn sản phẩm</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="admin-muted-strong absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className={labelCls}>
                  Nhà cung cấp <span className="admin-required">*</span>
                </label>
                <div className="relative">
                  <select
                    required
                    value={form.supplierId}
                    onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                    className={selectCls}
                  >
                    <option value="">Chọn nhà cung cấp</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="admin-muted-strong absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Quantity & Unit */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>
                  Khối lượng <span className="admin-required">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  placeholder="0.00"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>
                  Đơn vị <span className="admin-required">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  placeholder="kg"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Ngày thu hoạch</label>
                <input
                  type="date"
                  value={form.harvestDate}
                  onChange={(e) => setForm({ ...form, harvestDate: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>
                  Ngày hết hạn <span className="admin-required">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={form.expirationDate}
                  onChange={(e) => setForm({ ...form, expirationDate: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Origin */}
            <div>
              <label className={labelCls}>Địa điểm xuất xứ</label>
              <div className="relative">
                <MapPin size={15} className="admin-muted-strong absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={form.originLocation}
                  onChange={(e) => setForm({ ...form, originLocation: e.target.value })}
                  placeholder="Vùng đánh bắt, tọa độ hoặc địa chỉ cơ sở..."
                  className={inputCls + ' pl-9'}
                />
              </div>
            </div>

            {/* Batch image */}
            <div>
              <label className={labelCls}>Hình ảnh lô hàng (Tùy chọn)</label>
              <ProductImageUpload
                value={form.imageUrl}
                onChange={(url) => setForm({ ...form, imageUrl: url })}
                endpoint="/api/batches/upload-image"
              />
              <p className="admin-muted text-xs mt-1">Ảnh hiển thị trên trang truy xuất nguồn gốc. Tối đa 5 MB.</p>
            </div>

            {/* Notes */}
            <div>
              <label className={labelCls}>Ghi chú (Tùy chọn)</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                placeholder="Thêm thông tin vận chuyển, nhiệt độ bảo quản yêu cầu..."
                className={textareaCls + ' resize-none'}
              />
            </div>
          </form>
        </div>

        {/* ── Right: Preview + Actions (1/3) ── */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-24">
          {/* Preview card */}
          <div className="admin-form-card overflow-hidden">
            {/* Top accent */}
            <div className="h-1 bg-gradient-to-r from-emerald-400 to-green-300" />

            <div className="p-5">
              <p className="admin-label text-[11px] font-bold uppercase tracking-wider mb-3">
                Mã lô hàng dự kiến
              </p>
              <div
                className="admin-readonly-field font-mono text-lg font-bold tracking-widest px-3 py-2 inline-block mb-5"
              >
                BF-<span className="admin-muted-strong">????-????</span>
              </div>

              {/* QR placeholder */}
              <div className="flex justify-center mb-3">
                <div
                  className="admin-readonly-field w-28 h-28 flex items-center justify-center"
                >
                  <div
                    className="admin-section-divider w-20 h-20 border-2 border-dashed rounded-lg flex items-center justify-center"
                  >
                    <QrCode size={30} className="admin-muted-strong" />
                  </div>
                </div>
              </div>
              <p className="admin-muted text-xs text-center mb-5">
                QR Code sẽ được tạo tự động sau khi lưu.
              </p>

              {/* Dynamic checklist */}
              <div className="admin-readonly-field p-3">
                <p className="admin-ink text-xs font-bold mb-2">Trạng thái dữ liệu</p>
                <ul className="space-y-2">
                  {checks.map(({ ok, pending, label }) => (
                    <li key={label} className="flex items-center gap-2">
                      {ok ? (
                        <CheckCircle2 size={15} className="text-emerald-500 dark:text-emerald-300 flex-shrink-0" />
                      ) : pending ? (
                        <Clock size={15} className="admin-muted-strong flex-shrink-0" />
                      ) : (
                        <XCircle size={15} className="text-red-500 dark:text-red-300 flex-shrink-0" />
                      )}
                      <span className="admin-muted text-xs">{label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <button
              form="create-batch-form"
              type="submit"
              disabled={loading}
              className="admin-primary-button w-full py-3 text-sm disabled:opacity-60"
            >
              <Save size={17} />
              {loading ? 'Đang tạo...' : 'Tạo lô hàng'}
            </button>
            <Link
              href="/batches"
              className="admin-secondary-button w-full py-3 text-sm font-medium"
            >
              Hủy bỏ
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
