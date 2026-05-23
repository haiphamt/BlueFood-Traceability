'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const CERT_TYPES = ['VietGAP', 'GlobalGAP', 'Organic', 'HACCP', 'ISO 22000', 'FDA', 'Halal', 'Khác'];

export default function NewCertificatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialBatchId = searchParams.get('batch_id') ?? '';
  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState<{ id: string; batchCode: string; productName?: string | null }[]>([]);
  const [form, setForm] = useState({
    batch_id: initialBatchId,
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
    fetch('/api/batches/options', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => setBatches(data?.batches ?? data?.items ?? []));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data?.error?.message ?? 'Lỗi khi tạo'); return; }
      toast.success('Đã thêm chứng chỉ');
      if (data?.batchCode && initialBatchId) {
        router.push(`/batches/${data.batchCode}`);
      } else {
        router.push('/certificates');
      }
      router.refresh();
    } catch {
      toast.error('Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });
  const selectedBatch = batches.find((batch) => batch.id === form.batch_id);
  const backHref = initialBatchId && selectedBatch?.batchCode
    ? `/batches/${selectedBatch.batchCode}`
    : '/certificates';

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6">
      <div className="flex items-center gap-3">
        <Link href={backHref} className="admin-icon-button p-2">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="admin-page-title">Thêm chứng chỉ</h1>
          <p className="admin-muted text-sm mt-0.5">Gắn chứng chỉ cho một lô hàng</p>
        </div>
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
              {CERT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
          {field('Số chứng chỉ', false,
            <input type="text" value={form.certificate_number} onChange={set('certificate_number')} placeholder="VGP-2026-001" className={inputCls} />
          )}
        </div>

        {field('Tổ chức cấp', false,
          <input type="text" value={form.issuer} onChange={set('issuer')} placeholder="Cục Bảo vệ thực vật" className={inputCls} />
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
          <input type="url" value={form.file_url} onChange={set('file_url')} placeholder="https://..." className={inputCls} />
        )}

        <div className="flex gap-3 pt-2">
          <Link
            href={backHref}
            className="admin-secondary-button flex-1 py-2.5 text-sm font-medium"
          >
            Hủy
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="admin-primary-button flex-1 py-2.5 text-sm disabled:opacity-60"
          >
            {loading ? 'Đang lưu...' : 'Thêm chứng chỉ'}
          </button>
        </div>
      </form>
    </div>
  );
}
