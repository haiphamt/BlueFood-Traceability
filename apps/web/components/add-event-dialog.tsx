'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EVENT_TYPE_LABELS } from '@bluefood/shared';
import type { BatchEventType } from '@bluefood/shared';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';

interface AddEventDialogProps {
  batchCode: string;
}

const inputCls = [
  'admin-input w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none',
  'focus:ring-1 focus:ring-accent/30 focus:border-accent',
].join(' ');

const MANUAL_EVENT_TYPES: BatchEventType[] = [
  'harvested',
  'packed',
  'quality_checked',
  'pickup',
  'in_transit',
  'delivered',
];

export function AddEventDialog({ batchCode }: AddEventDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    eventType: 'harvested',
    locationName: '',
    occurredAt: new Date().toISOString().slice(0, 16),
    temperatureC: '',
    note: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/batches/${batchCode}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: form.eventType,
          occurredAt: new Date(form.occurredAt).toISOString(),
          locationName: form.locationName || undefined,
          temperatureC: form.temperatureC ? parseFloat(form.temperatureC) : undefined,
          note: form.note || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error?.message ?? 'Lỗi khi thêm sự kiện');
        return;
      }

      toast.success('Đã thêm sự kiện thành công');
      setOpen(false);
      router.refresh();
    } catch {
      toast.error('Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="admin-primary-button flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold"
      >
        <Plus size={15} />
        Thêm sự kiện
      </button>

      {open && (
        <div className="admin-dialog-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="admin-dialog rounded-2xl w-full max-w-md"
          >
            <div
              className="admin-dialog-header flex items-center justify-between px-6 py-4 border-b"
            >
              <h2 className="admin-ink font-bold">Thêm sự kiện chuỗi cung ứng</h2>
              <button
                onClick={() => setOpen(false)}
                className="admin-icon-button p-1 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="admin-label block text-sm font-medium mb-1.5">Loại sự kiện *</label>
                <select
                  required
                  value={form.eventType}
                  onChange={(e) => setForm({ ...form, eventType: e.target.value })}
                  className={inputCls}
                >
                  {MANUAL_EVENT_TYPES.map((t) => (
                    <option key={t} value={t}>{EVENT_TYPE_LABELS[t] ?? t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="admin-label block text-sm font-medium mb-1.5">Thời gian xảy ra *</label>
                <input
                  type="datetime-local"
                  required
                  value={form.occurredAt}
                  onChange={(e) => setForm({ ...form, occurredAt: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="admin-label block text-sm font-medium mb-1.5">Địa điểm</label>
                <input
                  type="text"
                  value={form.locationName}
                  onChange={(e) => setForm({ ...form, locationName: e.target.value })}
                  placeholder="Ví dụ: Da Lat Farm, BlueFood Quan 7..."
                  className={inputCls}
                />
              </div>

              <div>
                <label className="admin-label block text-sm font-medium mb-1.5">Nhiệt độ (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.temperatureC}
                  onChange={(e) => setForm({ ...form, temperatureC: e.target.value })}
                  placeholder="Ví dụ: 6.5"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="admin-label block text-sm font-medium mb-1.5">Ghi chú</label>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  rows={3}
                  placeholder="Ghi chú thêm..."
                  className={inputCls + ' resize-none'}
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="admin-secondary-button flex-1 py-2.5 rounded-lg text-sm font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="admin-primary-button flex-1 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60"
                >
                  {loading ? 'Đang lưu...' : 'Thêm sự kiện'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
