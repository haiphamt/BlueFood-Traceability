'use client';

import { useRef, useState } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';

interface ProductImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  endpoint?: string;
}

export function ProductImageUpload({ value, onChange, endpoint = '/api/products/upload-image' }: ProductImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Chỉ chấp nhận file ảnh (JPG, PNG, WEBP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File phải nhỏ hơn 5 MB');
      return;
    }

    setError('');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(endpoint, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Upload thất bại');
      onChange(data.url);
    } catch (e: any) {
      setError(e.message ?? 'Upload thất bại');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      {value ? (
        <div className="relative w-28 h-28 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 group shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Ảnh sản phẩm" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center transition-opacity"
            aria-label="Xóa ảnh"
          >
            <X size={22} className="text-white" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-28 h-28 rounded-xl border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-emerald-700 hover:bg-emerald-50 transition-colors disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-950 dark:hover:border-emerald-300 dark:hover:bg-slate-800"
        >
          {uploading ? (
            <Loader2 size={22} className="text-emerald-700 dark:text-emerald-300 animate-spin" />
          ) : (
            <>
              <Upload size={20} className="text-slate-500 dark:text-slate-400" />
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Tải ảnh lên</span>
            </>
          )}
        </button>
      )}

      {/* Also allow replacing by clicking the preview */}
      {value && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-xs text-emerald-700 hover:underline self-start dark:text-emerald-300"
        >
          {uploading ? 'Đang tải...' : 'Đổi ảnh'}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
