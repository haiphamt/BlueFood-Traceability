'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

export function SupplierInviteForm({ supplierId }: { supplierId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [manualLink, setManualLink] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setMessage(null);
    setManualLink(null);
    const res = await fetch(`/api/admin/suppliers/${supplierId}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: formData.get('email') }),
    });
    const body = await res.json().catch(() => null);
    setManualLink(body?.manualLink ?? null);
    setMessage(
      res.ok
        ? body?.emailSent
          ? 'Đã gửi lời mời. Nếu email không tới, dùng link thủ công bên dưới.'
          : `Không gửi được email${body?.inviteError ? `: ${body.inviteError}` : ''}. Dùng link thủ công bên dưới.`
        : body?.error?.message ?? 'Không gửi được lời mời'
    );
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <h2 className="font-bold text-ink">Tạo tài khoản nhà cung cấp</h2>
      <div className="mt-3 flex gap-2">
        <input name="email" type="email" required placeholder="owner@company.vn" className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-sm" />
        <button className="rounded-lg bg-[#1a3c2e] px-4 py-2 text-sm font-bold text-white">Gửi mời</button>
      </div>
      {message && <p className="mt-2 text-sm text-muted">{message}</p>}
      {manualLink && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-bold text-amber-900">Manual invite link</p>
          <input readOnly value={manualLink} className="mt-2 w-full rounded border border-amber-200 bg-white px-2 py-1 text-xs" />
        </div>
      )}
    </form>
  );
}

export function SupplierApprovalActions({ supplierId, pendingProfile }: { supplierId: string; pendingProfile: boolean }) {
  const router = useRouter();

  async function post(path: string, body: Record<string, unknown>) {
    await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <h2 className="font-bold text-ink">Quản trị truy cập</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        <button disabled={!pendingProfile} onClick={() => post(`/api/admin/suppliers/${supplierId}/approve-profile`, { approved: true })} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-40">
          Duyệt hồ sơ
        </button>
        <button disabled={!pendingProfile} onClick={() => post(`/api/admin/suppliers/${supplierId}/approve-profile`, { approved: false })} className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-40">
          Từ chối hồ sơ
        </button>
        <button onClick={() => post(`/api/admin/suppliers/${supplierId}/suspend`, { suspended: true })} className="rounded-lg bg-red-700 px-3 py-2 text-sm font-bold text-white">
          Tạm khóa portal
        </button>
        <button onClick={() => post(`/api/admin/suppliers/${supplierId}/suspend`, { suspended: false })} className="rounded-lg border border-line px-3 py-2 text-sm font-bold">
          Mở lại
        </button>
      </div>
    </div>
  );
}

export function CertificateApprovalButton({ supplierId, certificateId, approved }: { supplierId: string; certificateId: string; approved: boolean }) {
  const router = useRouter();

  async function click() {
    await fetch(`/api/admin/suppliers/${supplierId}/approve-certificate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ certificateId, approved }),
    });
    router.refresh();
  }

  return (
    <button onClick={click} className={`rounded px-2 py-1 text-xs font-bold text-white ${approved ? 'bg-emerald-600' : 'bg-red-700'}`}>
      {approved ? 'Duyệt' : 'Từ chối'}
    </button>
  );
}
