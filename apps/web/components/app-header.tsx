'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, LogOut, Menu } from 'lucide-react';
import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { ThemeToggle } from './theme-toggle';

interface AppHeaderProps {
  userEmail?: string;
  userRole?: string;
  onMenuClick?: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  admin:       'Quản trị viên',
  supplier:    'Nhà cung cấp',
  transporter: 'Vận chuyển',
  store_staff: 'Nhân viên cửa hàng',
  viewer:      'Người xem',
};

function getInitials(email?: string) {
  if (!email) return 'U';
  const [local] = email.split('@');
  const parts = local.split(/[._-]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

export function AppHeader({ userEmail, userRole, onMenuClick }: AppHeaderProps) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const initials = getInitials(userEmail);

  return (
    <header
      className="h-12 px-4 flex items-center justify-between gap-3 flex-shrink-0"
      style={{
        background: 'var(--color-surface-1)',
        borderBottom: '1px solid var(--color-border)',
      }}
      data-theme-target
    >
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuClick}
        className="md:hidden p-2 rounded-lg hover:bg-line transition-colors flex-shrink-0"
        aria-label="Mở menu"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <Menu size={20} />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-1.5">
        <ThemeToggle />

        {userRole === 'admin' && (
          <Link
            href="/batches/new"
            className="flex items-center gap-1.5 px-3.5 h-9 rounded-[8px] text-sm font-semibold text-white transition-opacity hover:opacity-90 flex-shrink-0"
            style={{ background: 'var(--color-accent)' }}
          >
            <Plus size={14} strokeWidth={2.5} />
            <span className="hidden sm:inline">Tạo lô hàng</span>
          </Link>
        )}

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            aria-label="Menu người dùng"
            aria-expanded={showMenu}
            className="flex items-center gap-2 pl-1.5 pr-2.5 h-9 rounded-[8px] transition-colors hover:bg-line"
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: 'rgba(26,60,46,0.12)', color: 'var(--color-brand)' }}
              aria-hidden
            >
              {initials}
            </div>
            <span
              className="text-sm font-medium max-w-[110px] truncate hidden sm:block"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {userEmail ?? 'User'}
            </span>
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
                aria-hidden
              />
              <div
                className="absolute right-0 top-full mt-1.5 w-52 rounded-[12px] py-1 z-50"
                style={{
                  background: 'var(--color-surface-1)',
                  border: '1px solid var(--color-border)',
                  boxShadow: 'var(--shadow-dropdown)',
                }}
              >
                <div
                  className="px-3.5 py-2.5"
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                  <div className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {userEmail}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {ROLE_LABELS[userRole ?? ''] ?? userRole ?? 'Viewer'}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium transition-colors hover:bg-line"
                  style={{ color: '#c0392b' }}
                >
                  <LogOut size={14} />
                  Đăng xuất
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
