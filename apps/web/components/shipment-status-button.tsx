'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, CheckCircle2, Loader2, X } from 'lucide-react';

interface Props {
  shipmentId: string;
  status: string;
  canDispatch: boolean;
  canConfirmReceipt: boolean;
}

export function ShipmentStatusButton({ shipmentId, status, canDispatch, canConfirmReceipt }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  if (status !== 'planned' && status !== 'in_transit') return null;

  async function advance() {
    setLoading(true);
    setError(null);
    setConfirming(false);
    try {
      const res = await fetch(`/api/shipments/${shipmentId}`, { method: 'PATCH' });
      if (res.ok) {
        router.refresh();
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body?.error?.message ?? body.message ?? 'Cập nhật thất bại');
      }
    } catch {
      setError('Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  }

  if (status === 'planned') {
    if (!canDispatch) return null;

    return (
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={advance}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-[#424843] hover:bg-[#121c28] disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Truck size={13} />}
          Xuất hành
        </button>
        {error && <p className="text-[10px] text-[#ba1a1a]">{error}</p>}
      </div>
    );
  }

  // in_transit — confirm before advancing to delivered
  if (!canConfirmReceipt) return null;

  if (confirming) {
    return (
      <div className="flex flex-col items-end gap-2">
        <p className="text-[11px] text-[#121c28] font-semibold text-right max-w-[200px] leading-tight">
          Xác nhận lô hàng đã được nhận tại cửa hàng?
        </p>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setConfirming(false)}
            disabled={loading}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#424843] bg-[#f0f1ec] hover:bg-[#d9e3f4] disabled:opacity-50 transition-colors"
          >
            <X size={11} />
            Hủy
          </button>
          <button
            onClick={advance}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold text-white bg-[#286b3f] hover:bg-[#2f7144] disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {loading ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
            Xác nhận
          </button>
        </div>
        {error && <p className="text-[10px] text-[#ba1a1a]">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-[#286b3f] hover:bg-[#2f7144] transition-colors whitespace-nowrap"
      >
        <CheckCircle2 size={13} />
        Xác nhận nhận hàng
      </button>
      {error && <p className="text-[10px] text-[#ba1a1a]">{error}</p>}
    </div>
  );
}
