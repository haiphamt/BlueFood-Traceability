'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';

const CERT_TYPES = ['VietGAP', 'GlobalGAP', 'HACCP', 'Organic', 'ISO 22000', 'Khác'];

interface BatchOption {
  id: string;
  batchCode: string;
  productName?: string | null;
}

interface Fields {
  issuer: string;
  certificateNumber: string;
  issuedAt: string;
  expiresAt: string;
}

export function CertificateWizard({ batches }: { batches: BatchOption[] }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [certType, setCertType] = useState(CERT_TYPES[0]);
  const [batchId, setBatchId] = useState('');
  const [fields, setFields] = useState<Fields>({ issuer: '', certificateNumber: '', issuedAt: '', expiresAt: '' });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedBatch = batches.find((batch) => batch.id === batchId) ?? null;

  function canProceedStep2() {
    return fields.issuer.trim() && fields.certificateNumber.trim() && fields.issuedAt && fields.expiresAt && file !== null;
  }

  async function submit() {
    if (!batchId) { setError('Chưa chọn lô hàng'); return; }
    if (!file) { setError('Chưa chọn file PDF'); return; }
    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.set('batch_id', batchId);
    formData.set('certificate_type', certType);
    formData.set('issuer', fields.issuer.trim());
    formData.set('certificate_number', fields.certificateNumber.trim());
    formData.set('issued_at', fields.issuedAt);
    formData.set('expires_at', fields.expiresAt);
    formData.set('file', file);

    const res = await fetch('/api/portal/certificates', { method: 'POST', body: formData });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.message ?? 'Không thể tải chứng chỉ');
      setSubmitting(false);
      return;
    }
    router.push('/portal/certificates');
    router.refresh();
  }

  return (
    <div className="portal-card p-5">
      <div className="mb-5 flex items-center gap-2 text-xs font-bold portal-muted">
        {[1, 2, 3].map((n) => (
          <span key={n} className={`rounded-full border px-3 py-1 ${step === n ? 'border-white/[0.24] bg-white/[0.10] text-white' : step > n ? 'border-white/[0.12] bg-white/[0.06] text-white' : 'border-white/[0.08] bg-[#111113] text-[#737373]'}`}>
            Bước {n}
          </span>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-black text-white">Chọn lô hàng và loại chứng chỉ</h2>
          <label className="block text-sm font-semibold text-white">
            Lô hàng *
            <select
              required
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              className="portal-input mt-1 w-full px-3 py-2 text-sm"
            >
              <option value="">-- Chọn lô hàng --</option>
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.batchCode}{batch.productName ? ` - ${batch.productName}` : ''}
                </option>
              ))}
            </select>
          </label>
          {batches.length === 0 && (
            <p className="rounded-lg border border-[#ffb77a]/25 bg-[#ffb77a]/10 p-3 text-sm font-semibold text-[#ffb77a]">
              Nhà cung cấp chưa có lô hàng nào để gắn chứng chỉ.
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            {CERT_TYPES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCertType(item)}
                className={`h-12 rounded-lg border text-sm font-bold transition-colors ${certType === item ? 'border-white/[0.24] bg-white/[0.10] text-white' : 'border-white/[0.08] bg-[#111113] text-[#9ca3af] hover:border-white/[0.18] hover:bg-[#1f1f22] hover:text-white'}`}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="flex justify-end">
            <button type="button" disabled={!batchId || batches.length === 0} onClick={() => setStep(2)} className="portal-button-primary disabled:opacity-50">
              Tiếp tục
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-black text-white">Nhập thông tin</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-white">
              Tổ chức cấp *
              <input
                value={fields.issuer}
                onChange={(e) => setFields({ ...fields, issuer: e.target.value })}
                required
                className="portal-input mt-1 w-full px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm font-semibold text-white">
              Số chứng chỉ *
              <input
                value={fields.certificateNumber}
                onChange={(e) => setFields({ ...fields, certificateNumber: e.target.value })}
                required
                className="portal-input mt-1 w-full px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm font-semibold text-white">
              Ngày hiệu lực *
              <input
                type="date"
                value={fields.issuedAt}
                onChange={(e) => setFields({ ...fields, issuedAt: e.target.value })}
                required
                className="portal-input mt-1 w-full px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm font-semibold text-white">
              Ngày hết hạn *
              <input
                type="date"
                value={fields.expiresAt}
                onChange={(e) => setFields({ ...fields, expiresAt: e.target.value })}
                required
                className="portal-input mt-1 w-full px-3 py-2 text-sm"
              />
            </label>
          </div>

          <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/[0.14] bg-[#111113] p-5 text-center text-sm font-semibold text-[#9ca3af] transition-colors hover:border-white/[0.24] hover:bg-[#1f1f22]">
            <UploadCloud size={24} className="text-emerald-400" />
            {file ? <span className="text-emerald-400">{file.name}</span> : <span>Click để chọn file PDF (tối đa 10MB)</span>}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              required
              className="sr-only"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(1)} className="portal-button-secondary">
              Quay lại
            </button>
            <button
              type="button"
              disabled={!canProceedStep2()}
              onClick={() => setStep(3)}
              className="portal-button-primary"
            >
              Xác nhận
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-black text-white">Xác nhận gửi duyệt</h2>

          <div className="space-y-2 rounded-lg border border-white/[0.08] bg-[#111113] p-4 text-sm">
            <div className="flex gap-2"><span className="font-bold w-28 shrink-0">Lô hàng:</span><span>{selectedBatch?.batchCode}</span></div>
            <div className="flex gap-2"><span className="font-bold w-28 shrink-0">Loại:</span><span>{certType}</span></div>
            <div className="flex gap-2"><span className="font-bold w-28 shrink-0">Tổ chức cấp:</span><span>{fields.issuer}</span></div>
            <div className="flex gap-2"><span className="font-bold w-28 shrink-0">Số chứng chỉ:</span><span>{fields.certificateNumber}</span></div>
            <div className="flex gap-2"><span className="font-bold w-28 shrink-0">Hiệu lực:</span><span>{fields.issuedAt} &rarr; {fields.expiresAt}</span></div>
            <div className="flex gap-2"><span className="font-bold w-28 shrink-0">File:</span><span>{file?.name}</span></div>
          </div>

          <p className="text-sm portal-muted">
            Chứng chỉ sẽ ở trạng thái <strong>chờ duyệt</strong> cho đến khi admin xác nhận.
          </p>

          {error && <p className="rounded-lg border border-[#ffb4ab]/25 bg-[#ffb4ab]/10 p-3 text-sm font-semibold text-[#ffb4ab]">{error}</p>}

          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(2)} className="portal-button-secondary">
              Quay lại
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={submit}
              className="portal-button-primary"
            >
              {submitting ? 'Đang gửi...' : 'Gửi chứng chỉ'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
