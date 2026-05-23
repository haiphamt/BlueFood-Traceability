'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { ArrowLeft, Home } from 'lucide-react';

const CERT_TYPES = ['VietGAP', 'GlobalGAP', 'Organic', 'HACCP', 'ISO 22000', 'FDA', 'Halal', 'Khác'];

export default function EditCertificatePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [batches, setBatches] = useState<{ id: string; batchCode: string; productName?: string | null }[]>([]);
  const [form, setForm] = useState({
    batch_id: '',
    certificate_type: '',
    issuer: '',
    certificate_number: '',
    issued_at: '',
    expires_at: '',
    file_url: '',
  });

  const inputCls = 'admin-input w-full px-3.5 py-2.5 text-sm';
  const selectCls = 'admin-select w-full px-3.5 py-2.5 text-sm';

  const field = (label: string, required: boolean, children: React.ReactNode) => (
    <div>
      <label className="admin-label block text-sm font-medium mb-1.5">
        {label}{required && <span className="admin-required ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );

  useEffect(() => {
    Promise.all([
      fetch(`/api/certificates/${id}`).then((r) => r.json()),
      fetch('/api/batches/options', { cache: 'no-store' }).then((r) => r.json()),
    ]).then(([cert, batchData]) => {
      setForm({
        batch_id: cert.batch_id ?? '',
        certificate_type: cert.certificate_type ?? '',
        issuer: cert.issuer ?? '',
        certificate_number: cert.certificate_number ?? '',
        issued_at: cert.issued_at ?? '',
        expires_at: cert.expires_at ?? '',
        file_url: cert.file_url ?? '',
      });
      setBatches(batchData?.batches ?? batchData?.items ?? []);
    }).finally(() => setFetching(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/certificates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data?.error?.message ?? 'Lỗi khi cập nhật'); return; }
      toast.success('Đã cập nhật chứng chỉ');
      router.push('/certificates');
      router.refresh();
    } catch {
      toast.error('Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  if (fetching) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="admin-muted text-sm">Đang tải...</p>
      </div>
    );
  }

  const expiryExpired = form.expires_at ? new Date(form.expires_at) < new Date() : false;
  const expiryFormatted = form.expires_at
    ? new Date(form.expires_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null;

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6">
      {/* Breadcrumb */}
      <div className="admin-breadcrumb">
        <Home size={13} />
        <span>/</span>
        <Link href="/certificates" className="hover:underline">Chứng chỉ</Link>
        <span>/</span>
        <span className="admin-breadcrumb-current">Chỉnh sửa</span>
      </div>

      <div className="flex items-center gap-3">
        <Link href="/certificates" className="admin-icon-button p-2">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="admin-page-title">Chỉnh sửa chứng chỉ</h1>
        </div>
      </div>

      {/* Summary strip */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 dark:border-[#2a2a2d] dark:bg-[#171717]">
        {form.certificate_type && (
          <span className="text-[11px] px-2 py-0.5 rounded-md border border-slate-200 bg-white text-slate-600 font-medium dark:border-[#2a2a2d] dark:bg-[#1f1f22] dark:text-[#d4d4d4]">
            {form.certificate_type}
          </span>
        )}
        {form.certificate_number && (
          <span className="text-sm font-mono font-semibold text-slate-700 dark:text-[#f5f5f5]">{form.certificate_number}</span>
        )}
        {form.issuer && (
          <span className="text-xs text-slate-500 dark:text-[#9ca3af]">· {form.issuer}</span>
        )}
        {expiryFormatted && (
          <span className={`text-xs ml-auto ${expiryExpired ? 'text-red-600 dark:text-[#ffb4ab]' : 'text-slate-400 dark:text-[#737373]'}`}>
            {expiryExpired ? `Đã hết hạn ${expiryFormatted}` : `HH: ${expiryFormatted}`}
          </span>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="admin-form-card p-6 space-y-5"
      >
        {field('Lô hàng', true,
          <select required value={form.batch_id} onChange={set('batch_id')} className={selectCls}>
            <option value="">-- Chọn lô hàng --</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.productName ? `${b.batchCode} - ${b.productName}` : b.batchCode}
              </option>
            ))}
          </select>
        )}

        <div className="grid grid-cols-2 gap-5">
          {field('Loại chứng chỉ', true,
            <select required value={form.certificate_type} onChange={set('certificate_type')} className={selectCls}>
              <option value="">-- Chọn loại --</option>
              {CERT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}
          {field('Số chứng chỉ', false,
            <input type="text" value={form.certificate_number} onChange={set('certificate_number')} className={inputCls} />
          )}
        </div>

        {field('Tổ chức cấp', false,
          <input type="text" value={form.issuer} onChange={set('issuer')} className={inputCls} />
        )}

        <div className="grid grid-cols-2 gap-5">
          {field('Ngày cấp', false,
            <input type="date" value={form.issued_at} onChange={set('issued_at')} className={inputCls} />
          )}
          {field('Ngày hết hạn', false,
            <input type="date" value={form.expires_at} onChange={set('expires_at')} className={inputCls} />
          )}
        </div>

        {field('Link file / URL', false,
          <input type="url" value={form.file_url} onChange={set('file_url')} className={inputCls} />
        )}

        <div className="flex gap-3 pt-2">
          <Link
            href="/certificates"
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
