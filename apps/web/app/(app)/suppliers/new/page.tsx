'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NewSupplierPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', contact_email: '', phone: '', address: '', province: '', certification_summary: '',
  });

  const inputCls = 'admin-input w-full px-3.5 py-2.5 text-sm';
  const textareaCls = 'admin-textarea w-full px-3.5 py-2.5 text-sm';
  const field = (label: string, required: boolean, children: React.ReactNode) => (
    <div>
      <label className="admin-label block text-sm font-medium mb-1.5">
        {label}{required && <span className="admin-required ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data?.error?.message ?? 'Lỗi khi tạo'); return; }
      toast.success('Đã thêm nhà cung cấp');
      router.push('/suppliers');
      router.refresh();
    } catch {
      toast.error('Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/suppliers" className="admin-icon-button p-2">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="admin-page-title">Thêm nhà cung cấp</h1>
          <p className="admin-muted text-sm mt-0.5">Điền thông tin nhà cung cấp mới</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="admin-form-card p-6 space-y-5"
      >
        {field('Tên nhà cung cấp', true,
          <input type="text" required value={form.name} onChange={set('name')} placeholder="Công ty TNHH ABC" className={inputCls} />
        )}
        <div className="grid grid-cols-2 gap-5">
          {field('Email', false,
            <input type="email" value={form.contact_email} onChange={set('contact_email')} placeholder="contact@example.com" className={inputCls} />
          )}
          {field('Điện thoại', false,
            <input type="text" value={form.phone} onChange={set('phone')} placeholder="0901234567" className={inputCls} />
          )}
        </div>
        {field('Tỉnh / Vùng', false,
          <input type="text" value={form.province} onChange={set('province')} placeholder="Lâm Đồng" className={inputCls} />
        )}
        {field('Địa chỉ', false,
          <input type="text" value={form.address} onChange={set('address')} placeholder="123 Đường ABC, TP. Đà Lạt" className={inputCls} />
        )}
        {field('Chứng chỉ / Ghi chú', false,
          <textarea value={form.certification_summary} onChange={set('certification_summary')} rows={3} placeholder="VietGAP, GlobalGAP..." className={textareaCls + ' resize-none'} />
        )}

        <div className="flex gap-3 pt-2">
          <Link
            href="/suppliers"
            className="admin-secondary-button flex-1 py-2.5 text-sm font-medium"
          >
            Hủy
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="admin-primary-button flex-1 py-2.5 text-sm disabled:opacity-60"
          >
            {loading ? 'Đang lưu...' : 'Thêm nhà cung cấp'}
          </button>
        </div>
      </form>
    </div>
  );
}
