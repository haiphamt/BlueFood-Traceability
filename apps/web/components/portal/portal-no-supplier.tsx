'use client';

import { useRouter } from 'next/navigation';
import { Building2, LogOut } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface Props {
  userEmail?: string;
}

export function PortalNoSupplier({ userEmail }: Props) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="portal-root flex flex-col items-center justify-center p-6 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.10] bg-[#171717]">
        <Building2 size={32} className="text-emerald-400" />
      </div>

      <h1 className="mb-2 text-2xl font-black text-white">
        Chưa có nhà cung cấp được liên kết
      </h1>
      <p className="mb-1 max-w-sm portal-muted">
        Tài khoản <span className="font-semibold text-white">{userEmail}</span> chưa được gán vào hồ sơ nhà cung cấp nào.
      </p>
      <p className="mb-8 max-w-sm text-sm portal-muted">
        Vui lòng liên hệ quản trị viên BlueFood để được thêm vào nhà cung cấp của bạn.
      </p>

      <button
        onClick={handleLogout}
        className="portal-button-danger px-5 py-2.5"
      >
        <LogOut size={15} />
        Đăng xuất
      </button>
    </div>
  );
}
