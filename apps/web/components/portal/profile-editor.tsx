'use client';

import { useEffect, useRef, useState } from 'react';
import { VIETNAM_PROVINCES } from '@/lib/vietnam-provinces';

interface ProfileEditorProps {
  supplier: Record<string, any>;
  canEdit: boolean;
}

export function ProfileEditor({ supplier, canEdit }: ProfileEditorProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState('Đã tải hồ sơ');

  async function save(submitForReview = false) {
    if (!formRef.current || !canEdit) return;
    const formData = new FormData(formRef.current);
    const payload = Object.fromEntries(formData.entries());
    setStatus('Đang lưu...');
    const res = await fetch('/api/portal/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, submitForReview }),
    });
    setStatus(res.ok ? (submitForReview ? 'Đã gửi admin duyệt' : 'Đã lưu nháp') : 'Không lưu được');
  }

  async function uploadLogo(file: File | null) {
    if (!file || !canEdit) return;
    const formData = new FormData();
    formData.set('file', file);
    setStatus('Đang tải logo...');
    const res = await fetch('/api/portal/profile/logo', { method: 'POST', body: formData });
    setStatus(res.ok ? 'Đã tải logo' : 'Không tải được logo');
  }

  useEffect(() => {
    const timer = window.setInterval(() => save(false), 30_000);
    return () => window.clearInterval(timer);
  });

  return (
    <form ref={formRef} className="portal-card space-y-5 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-white">Thông tin công ty</h2>
          <p className="text-sm portal-muted">{status}</p>
        </div>
        <button type="button" disabled={!canEdit} onClick={() => save(true)} className="portal-button-primary">
          Gửi duyệt
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold text-white">
          Tên công ty
          <input name="name" defaultValue={supplier.name ?? ''} disabled={!canEdit} className="portal-input mt-1 w-full px-3 py-2" />
        </label>
        <label className="text-sm font-semibold text-white">
          Tỉnh/thành
          <select name="province" defaultValue={supplier.province ?? ''} disabled={!canEdit} className="portal-input mt-1 w-full px-3 py-2">
            <option value="">Chọn tỉnh/thành</option>
            {VIETNAM_PROVINCES.map((province) => <option key={province}>{province}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-white md:col-span-2">
          Mô tả
          <textarea name="description" defaultValue={supplier.description ?? ''} disabled={!canEdit} rows={4} className="portal-input mt-1 w-full px-3 py-2" />
        </label>
        <label className="text-sm font-semibold text-white">
          Địa chỉ
          <input name="address" defaultValue={supplier.address ?? ''} disabled={!canEdit} className="portal-input mt-1 w-full px-3 py-2" />
        </label>
        <label className="text-sm font-semibold text-white">
          Số điện thoại
          <input name="phone" defaultValue={supplier.phone ?? ''} disabled={!canEdit} className="portal-input mt-1 w-full px-3 py-2" />
        </label>
        <label className="text-sm font-semibold text-white">
          Email liên hệ
          <input name="contact_email" type="email" defaultValue={supplier.contact_email ?? ''} disabled={!canEdit} className="portal-input mt-1 w-full px-3 py-2" />
        </label>
        <label className="text-sm font-semibold text-white">
          Website
          <input name="website" defaultValue={supplier.website ?? ''} disabled={!canEdit} className="portal-input mt-1 w-full px-3 py-2" />
        </label>
        <label className="text-sm font-semibold text-white">
          Latitude
          <input name="latitude" type="number" step="0.0000001" defaultValue={supplier.latitude ?? ''} disabled={!canEdit} className="portal-input mt-1 w-full px-3 py-2" />
        </label>
        <label className="text-sm font-semibold text-white">
          Longitude
          <input name="longitude" type="number" step="0.0000001" defaultValue={supplier.longitude ?? ''} disabled={!canEdit} className="portal-input mt-1 w-full px-3 py-2" />
        </label>
      </div>

      <label className="block text-sm font-semibold text-white">
        Logo JPG/PNG tối đa 2MB
        <input type="file" accept="image/png,image/jpeg" disabled={!canEdit} onChange={(event) => uploadLogo(event.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm portal-muted file:mr-3 file:rounded-md file:border-0 file:bg-[#1f1f22] file:px-3 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-[#2a2a2d]" />
      </label>
    </form>
  );
}
