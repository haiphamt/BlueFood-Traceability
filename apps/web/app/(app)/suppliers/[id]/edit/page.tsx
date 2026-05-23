'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { ArrowLeft, Home } from 'lucide-react';

export default function EditSupplierPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
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

  useEffect(() => {
    fetch(`/api/suppliers/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setForm({
          name: data.name ?? '',
          contact_email: data.contact_email ?? '',
          phone: data.phone ?? '',
          address: data.address ?? '',
          province: data.province ?? '',
          certification_summary: data.certification_summary ?? '',
        });
      })
      .finally(() => setFetching(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/suppliers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data?.error?.message ?? 'Lỗi khi cập nhật'); return; }
      toast.success('Đã cập nhật nhà cung cấp');
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
        <Link href="/suppliers" className="hover:underline">Nhà cung cấp</Link>
        <span>/</span>
        <span className="admin-breadcrumb-current">Chỉnh sửa</span>
      </div>

      <div className="flex items-center gap-3">
        <Link href="/suppliers" className="admin-icon-button p-2">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="admin-page-title">Chỉnh sửa nhà cung cấp</h1>
        </div>
      </div>

      {/* Summary strip */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 dark:border-[#2a2a2d] dark:bg-[#171717]">
        <span className="font-semibold text-sm text-slate-800 dark:text-[#f5f5f5]">{form.name || '—'}</span>
        {form.province && (
          <span className="text-xs text-slate-500 dark:text-[#9ca3af]">{form.province}</span>
        )}
        {form.phone && (
          <span className="text-xs text-slate-400 dark:text-[#737373]">· {form.phone}</span>
        )}
        {form.contact_email && (
          <span className="text-xs font-mono text-slate-400 dark:text-[#737373] ml-auto">{form.contact_email}</span>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="admin-form-card p-6 space-y-5"
      >
        {field('Tên nhà cung cấp', true,
          <input type="text" required value={form.name} onChange={set('name')} className={inputCls} />
        )}
        <div className="grid grid-cols-2 gap-5">
          {field('Email', false,
            <input type="email" value={form.contact_email} onChange={set('contact_email')} className={inputCls} />
          )}
          {field('Điện thoại', false,
            <input type="text" value={form.phone} onChange={set('phone')} className={inputCls} />
          )}
        </div>
        {field('Tỉnh / Vùng', false,
          <input type="text" value={form.province} onChange={set('province')} className={inputCls} />
        )}
        {field('Địa chỉ', false,
          <input type="text" value={form.address} onChange={set('address')} className={inputCls} />
        )}
        {field('Chứng chỉ / Ghi chú', false,
          <textarea
            value={form.certification_summary}
            onChange={set('certification_summary')}
            rows={3}
            className={textareaCls + ' resize-none'}
          />
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
            {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </form>
    </div>
  );
}
