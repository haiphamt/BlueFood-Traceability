'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { ArrowLeft, Home } from 'lucide-react';
import { ProductImageUpload } from '@/components/product-image-upload';

const CATEGORIES = ['Rau xanh', 'Rau quả', 'Trái cây', 'Củ quả', 'Thủy sản', 'Thịt', 'Gia cầm', 'Khác'];

export default function EditProductPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [form, setForm] = useState({
    name: '',
    category: '',
    unit: 'kg',
    shelf_life_days: '',
    image_url: '',
  });

  const inputCls = 'admin-input w-full px-3.5 py-2.5 text-sm';
  const selectCls = 'admin-select w-full px-3.5 py-2.5 text-sm';

  function field(label: string, required: boolean, children: React.ReactNode) {
    return (
      <div>
        <label className="admin-label block text-sm font-medium mb-1.5">
          {label}
          {required && <span className="admin-required ml-0.5">*</span>}
        </label>
        {children}
      </div>
    );
  }

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm({ ...form, [k]: e.target.value });

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setForm({
          name: data.name ?? '',
          category: data.category ?? '',
          unit: data.unit ?? 'kg',
          shelf_life_days: data.shelf_life_days?.toString() ?? '',
          image_url: data.image_url ?? '',
        });
      })
      .finally(() => setFetching(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data?.error?.message ?? 'Lỗi khi cập nhật'); return; }
      toast.success('Đã cập nhật sản phẩm');
      router.push('/products');
      router.refresh();
    } catch {
      toast.error('Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="admin-muted text-sm">Đang tải...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6">
      {/* Breadcrumb */}
      <div className="admin-breadcrumb">
        <Home size={13} />
        <span>/</span>
        <Link href="/products" className="hover:underline">Sản phẩm</Link>
        <span>/</span>
        <span className="admin-breadcrumb-current">Chỉnh sửa</span>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/products"
          className="admin-icon-button p-2"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="admin-page-title">Chỉnh sửa sản phẩm</h1>
        </div>
      </div>

      {/* Summary strip */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 dark:border-[#2a2a2d] dark:bg-[#171717]">
        <span className="font-semibold text-sm text-slate-800 dark:text-[#f5f5f5]">{form.name || '—'}</span>
        {form.category && (
          <span className="text-[11px] px-2 py-0.5 rounded-md border border-slate-200 bg-white text-slate-500 dark:border-[#2a2a2d] dark:bg-[#1f1f22] dark:text-[#9ca3af]">
            {form.category}
          </span>
        )}
        {form.unit && (
          <span className="text-xs text-slate-500 dark:text-[#9ca3af]">· {form.unit}</span>
        )}
        {form.shelf_life_days && (
          <span className="text-xs text-slate-400 dark:text-[#737373] ml-auto">HSD {form.shelf_life_days} ngày</span>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="admin-form-card p-6 space-y-5"
      >
        {field('Ảnh sản phẩm', false,
          <ProductImageUpload
            value={form.image_url}
            onChange={(url) => setForm({ ...form, image_url: url })}
          />
        )}

        {field('Tên sản phẩm', true,
          <input
            type="text"
            required
            value={form.name}
            onChange={set('name')}
            className={inputCls}
          />
        )}

        <div className="grid grid-cols-2 gap-5">
          {field('Danh mục', true,
            <select
              required
              value={form.category}
              onChange={set('category')}
              className={selectCls}
            >
              <option value="">-- Chọn danh mục --</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
          {field('Đơn vị', true,
            <input
              type="text"
              required
              value={form.unit}
              onChange={set('unit')}
              placeholder="kg"
              className={inputCls}
            />
          )}
        </div>

        {field('Hạn sử dụng mặc định (ngày)', false,
          <input
            type="number"
            min="1"
            value={form.shelf_life_days}
            onChange={set('shelf_life_days')}
            placeholder="7"
            className={inputCls}
          />
        )}

        <div className="flex gap-3 pt-2">
          <Link
            href="/products"
            className="admin-secondary-button flex-1 py-2.5 text-sm font-medium"
          >
            Hủy
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="admin-primary-button flex-1 py-2.5 text-sm disabled:opacity-60"
          >
            {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </form>
    </div>
  );
}
