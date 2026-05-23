'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { LogOut, ChevronDown, Menu, X, Sun, Moon } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const ALL_NAV = [
  { href: '/dashboard',    label: 'Tổng quan' },
  { href: '/batches',      label: 'Lô hàng' },
  { href: '/products',     label: 'Sản phẩm',     adminOnly: true },
  { href: '/suppliers',    label: 'Nhà cung cấp',  adminOnly: true },
  { href: '/shipments',    label: 'Vận chuyển' },
  { href: '/certificates', label: 'Chứng chỉ' },
  { href: '/audit-logs',   label: 'Audit Logs',    adminOnly: true },
  { href: '/reports',      label: 'Báo cáo',       adminOnly: true },
  { href: '/settings',     label: 'Cài đặt',       adminOnly: true },
];

const ROLE_LABELS: Record<string, string> = {
  admin:       'Quản trị viên',
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

interface TopNavProps {
  userEmail?: string;
  userRole?: string;
}

export function TopNav({ userEmail, userRole }: TopNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setIsDark(localStorage.getItem('theme') !== 'light');
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  }

  const visibleNav = ALL_NAV.filter((item) => {
    if (item.adminOnly && userRole !== 'admin') return false;
    return true;
  });

  function isActive(href: string) {
    return pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'));
  }

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const initials = getInitials(userEmail);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 h-14 flex items-center border-b border-line bg-panel/95 px-4 shadow-sm backdrop-blur-md md:px-6 dark:bg-[#101011] dark:border-[#2a2a2d] dark:shadow-none">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-1.5 flex-shrink-0 mr-6">
          <span className="text-base font-black text-brand dark:text-[#f5f5f5]">BlueFood</span>
          <span className="text-[11px] font-semibold uppercase tracking-widest hidden sm:block text-muted dark:text-[#737373]">
            Traceability
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-0.5 flex-1">
          {visibleNav.map(({ href, label }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={`relative px-3 py-1.5 text-[13px] font-medium rounded transition-colors hover:bg-[var(--color-surface-2)] dark:hover:bg-[#1f1f22] ${
                  active
                    ? 'text-brand dark:text-[#f5f5f5]'
                    : 'text-muted hover:text-ink dark:text-[#9ca3af] dark:hover:text-[#f5f5f5]'
                }`}
              >
                {label}
                {active && (
                  <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-brand dark:bg-[#22c55e]" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 ml-auto">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            aria-label={isDark ? 'Chuyển sang light mode' : 'Chuyển sang dark mode'}
            className="p-1.5 rounded-lg text-muted transition-colors hover:bg-[var(--color-surface-2)] hover:text-ink dark:text-[#737373] dark:hover:bg-[#1f1f22] dark:hover:text-[#f5f5f5]"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu((v) => !v)}
              aria-label="Menu người dùng"
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-ink transition-colors hover:bg-[var(--color-surface-2)] dark:text-[#f5f5f5] dark:hover:bg-[#1f1f22]"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center bg-emerald-50 text-xs font-bold text-brand flex-shrink-0 dark:bg-[#2a2a2d] dark:text-[#f5f5f5]"
              >
                {initials}
              </div>
              <span className="text-[13px] font-medium hidden sm:block max-w-[120px] truncate text-ink dark:text-[#f5f5f5]">
                {userEmail ?? 'User'}
              </span>
              <ChevronDown size={14} className="text-muted dark:text-[#737373]" />
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg text-muted transition-colors hover:bg-[var(--color-surface-2)] hover:text-ink dark:text-[#9ca3af] dark:hover:bg-[#1f1f22] dark:hover:text-[#f5f5f5]"
            aria-label="Mở menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* User dropdown — rendered outside header to avoid z-index stacking context issues */}
      {showUserMenu && (
        <>
          <div className="fixed inset-0 z-[50]" onClick={() => setShowUserMenu(false)} aria-hidden />
          <div className="fixed right-4 md:right-6 top-14 mt-0.5 w-52 rounded-lg border border-line bg-panel py-1 z-[60] shadow-dropdown dark:bg-[#171717] dark:border-[#2a2a2d] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <div className="px-3.5 py-2.5 border-b border-line dark:border-[#2a2a2d]">
              <div className="text-sm font-semibold truncate text-ink dark:text-[#f5f5f5]">
                {userEmail}
              </div>
              <div className="text-xs mt-0.5 text-muted dark:text-[#737373]">
                {ROLE_LABELS[userRole ?? ''] ?? userRole ?? 'Viewer'}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 dark:text-[#ffb4ab] dark:hover:bg-[#1f1f22]"
            >
              <LogOut size={14} />
              Đăng xuất
            </button>
          </div>
        </>
      )}

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/60 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed top-14 left-0 right-0 z-30 border-b border-line bg-panel py-2 shadow-md md:hidden dark:bg-[#101011] dark:border-[#2a2a2d] dark:shadow-none">
            {visibleNav.map(({ href, label }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center px-5 py-3 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-emerald-50 text-brand dark:bg-[#1f1f22] dark:text-[#f5f5f5]'
                      : 'text-muted hover:bg-[var(--color-surface-2)] hover:text-ink dark:text-[#9ca3af] dark:hover:bg-[#1f1f22] dark:hover:text-[#f5f5f5]'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
