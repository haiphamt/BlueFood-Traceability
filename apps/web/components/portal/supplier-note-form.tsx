'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function SupplierNoteForm({ batchId, canEdit }: { batchId: string; canEdit: boolean }) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    const res = await fetch(`/api/portal/batches/${batchId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.message ?? 'Không lưu được ghi chú');
      return;
    }
    setNote('');
    router.refresh();
  }

  return (
    <div className="portal-card portal-card-pad">
      <h2 className="portal-section-title">Ghi chú nhà cung cấp</h2>
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value.slice(0, 500))}
        disabled={!canEdit}
        rows={3}
        className="portal-input mt-3 w-full px-3 py-2 text-sm"
        placeholder="Thêm ghi chú tối đa 500 ký tự..."
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs portal-muted">{note.length}/500</span>
        <button onClick={submit} disabled={!canEdit || !note.trim()} className="portal-button-primary">
          Lưu ghi chú
        </button>
      </div>
      {error && <p className="mt-2 text-sm font-semibold text-[#ffb4ab]">{error}</p>}
    </div>
  );
}
