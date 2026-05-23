'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface Props {
  id: string;
  name: string;
  resource: 'suppliers' | 'products' | 'certificates';
}

export function DeleteButton({ id, name, resource }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(`Xóa "${name}"? Hành động này không thể hoàn tác.`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/${resource}/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error?.message ?? 'Không thể xóa');
        return;
      }
      toast.success('Đã xóa thành công');
      router.refresh();
    } catch {
      toast.error('Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="p-1.5 rounded hover:bg-red-50 text-muted hover:text-red-600 transition-colors disabled:opacity-50"
      title="Xóa"
    >
      <Trash2 size={14} />
    </button>
  );
}
