'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ProductImageUpload } from '@/components/product-image-upload';

const CATEGORIES = ['Rau xanh', 'Rau quả', 'Trái cây', 'Củ quả', 'Thủy sản', 'Thịt', 'Gia cầm', 'Khác'];

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data?.error?.message ?? 'Lỗi khi tạo'); return; }
      toast.success('Đã thêm sản phẩm');
      router.push('/products');
      router.refresh();
    } catch {
      toast.error('Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/products"
          className="admin-icon-button p-2"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="admin-page-title">Thêm sản phẩm</h1>
          <p className="admin-muted text-sm mt-0.5">Điền thông tin sản phẩm mới</p>
        </div>
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
            placeholder="Rau xa lách Romaine"
            className={inputCls}
          />
        )}

        <div className="grid grid-cols-2 gap-5">
          {field('Danh mục', true,
            <select required value={form.category} onChange={set('category')} className={selectCls}>
              <option value="">-- Chọn danh mục --</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          {field('Đơn vị', true,
            <input type="text" required value={form.unit} onChange={set('unit')} placeholder="kg" className={inputCls} />
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
            {loading ? 'Đang lưu...' : 'Thêm sản phẩm'}
          </button>
        </div>
      </form>
    </div>
  );
}
