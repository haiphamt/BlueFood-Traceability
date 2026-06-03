'use client';

import { useState } from 'react';
import { Ban, RotateCcw, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface SupplierLifecycleActionsProps {
  id: string;
  name: string;
  portalStatus?: string | null;
}

type Action = 'suspend' | 'activate' | 'delete';

async function readErrorMessage(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return body?.error?.message ?? fallback;
}

export function SupplierLifecycleActions({ id, name, portalStatus }: SupplierLifecycleActionsProps) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<Action | null>(null);
  const isSuspended = portalStatus === 'suspended';

  async function updateSuspension(suspended: boolean) {
    const action: Action = suspended ? 'suspend' : 'activate';
    const message = suspended
      ? `Tạm ngưng "${name}"? Nhà cung cấp sẽ không truy cập được portal, dữ liệu truy xuất vẫn được giữ lại.`
      : `Mở lại "${name}"? Nhà cung cấp sẽ truy cập portal trở lại.`;

    if (!confirm(message)) return;

    setLoadingAction(action);
    try {
      const response = await fetch(`/api/admin/suppliers/${id}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspended }),
      });

      if (!response.ok) {
        toast.error(await readErrorMessage(response, 'Không thể cập nhật trạng thái nhà cung cấp'));
        return;
      }

      toast.success(suspended ? 'Đã tạm ngưng nhà cung cấp' : 'Đã mở lại nhà cung cấp');
      router.refresh();
    } catch {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setLoadingAction(null);
    }
  }

  async function deleteSupplier() {
    if (!confirm(`Xóa cứng "${name}"? Chỉ nên dùng khi nhà cung cấp chưa có dữ liệu nghiệp vụ. Hành động này không thể hoàn tác.`)) return;

    setLoadingAction('delete');
    try {
      const response = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });

      if (!response.ok) {
        toast.error(await readErrorMessage(response, 'Không thể xóa nhà cung cấp'));
        return;
      }

      toast.success('Đã xóa nhà cung cấp');
      router.refresh();
    } catch {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setLoadingAction(null);
    }
  }

  const disabled = loadingAction !== null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {isSuspended ? (
        <button
          type="button"
          onClick={() => updateSuspension(false)}
          disabled={disabled}
          className="admin-secondary-button !px-2.5 !py-1.5 text-[11px] disabled:opacity-50"
          title="Mở lại portal nhà cung cấp"
        >
          <RotateCcw size={12} />
          Mở lại
        </button>
      ) : (
        <button
          type="button"
          onClick={() => updateSuspension(true)}
          disabled={disabled}
          className="admin-secondary-button !px-2.5 !py-1.5 text-[11px] disabled:opacity-50"
          title="Tạm ngưng portal nhà cung cấp"
        >
          <Ban size={12} />
          Tạm ngưng
        </button>
      )}
      <button
        type="button"
        onClick={deleteSupplier}
        disabled={disabled}
        className="admin-secondary-button !px-2.5 !py-1.5 text-[11px] !text-red-700 hover:!text-red-700 disabled:opacity-50"
        title="Xóa cứng nhà cung cấp"
      >
        <Trash2 size={12} />
        Xóa
      </button>
    </div>
  );
}
