'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Building2, FileCheck, LayoutDashboard, LogOut, Menu, Package, Users, X, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const navItems: {
  href: string;
  label: string;
  icon: LucideIcon;
  aliases?: string[];
}[] = [
  { href: '/portal/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/portal/batches', label: 'Lô hàng', icon: Package },
  { href: '/portal/certificates', label: 'Chứng chỉ', icon: FileCheck },
  { href: '/portal/company', label: 'Hồ sơ công ty', icon: Building2, aliases: ['/portal/profile'] },
  { href: '/portal/members', label: 'Thành viên', icon: Users, aliases: ['/portal/team'] },
  { href: '/portal/notifications', label: 'Thông báo', icon: Bell },
];

interface PortalShellProps {
  children: React.ReactNode;
  supplierName: string;
  supplierLogo?: string | null;
  userEmail?: string;
}

export function PortalShell({ children, supplierName, supplierLogo, userEmail }: PortalShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const sidebarExpanded = open;

  async function logout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="portal-root md:flex">
      {open && <button aria-label="Đóng menu" className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={[
          'portal-sidebar fixed inset-y-0 left-0 z-40 w-64 overflow-visible border-r',
          'transition-[transform,width] duration-200 ease-out',
          'md:sticky md:top-0 md:h-screen md:translate-x-0',
          sidebarExpanded ? 'translate-x-0 md:w-64' : '-translate-x-full md:w-[72px]',
        ].join(' ')}
      >
        <div className={`flex h-16 items-center border-b border-white/[0.08] ${sidebarExpanded ? 'justify-between px-4' : 'justify-center px-3'}`}>
          <Link href="/portal/dashboard" className={`flex min-w-0 items-center gap-3 ${sidebarExpanded ? '' : 'md:justify-center'}`}>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.10] bg-white/[0.04] text-sm font-black text-white">
              B
            </div>
            <div className={`min-w-0 ${sidebarExpanded ? '' : 'md:hidden'}`}>
              <p className="text-sm font-black text-white">BlueFood</p>
              <p className="text-xs font-medium text-[#9ca3af]">Cổng nhà cung cấp</p>
            </div>
          </Link>
          <button className="rounded-md p-1.5 text-[#9ca3af] hover:bg-white/[0.06] hover:text-white md:hidden" onClick={() => setOpen(false)} aria-label="Đóng menu">
            <X size={18} />
          </button>
        </div>

        <nav className="space-y-1 p-3">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`) ||
              item.aliases?.some((alias) => pathname === alias || pathname.startsWith(`${alias}/`));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={sidebarExpanded ? undefined : item.label}
                className={[
                  'portal-nav-item group relative',
                  sidebarExpanded ? '' : 'md:justify-center md:px-0',
                  active ? 'portal-nav-item-active' : '',
                ].join(' ')}
              >
                <Icon size={17} className="flex-shrink-0" />
                <span className={`truncate ${sidebarExpanded ? '' : 'md:hidden'}`}>{item.label}</span>
                {!sidebarExpanded && (
                  <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-md border border-white/[0.08] bg-[#1f1f22] px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 md:block">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="portal-header sticky top-0 z-20 flex h-16 items-center justify-between border-b px-4 backdrop-blur md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="rounded-md p-2 text-[#9ca3af] hover:bg-white/[0.06] hover:text-white"
              onClick={() => setOpen((value) => !value)}
              aria-label={open ? 'Thu gọn menu' : 'Mở menu'}
              aria-expanded={open}
            >
              <Menu size={20} />
            </button>
            <div className="hidden h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.04] md:flex">
              {supplierLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={supplierLogo} alt="" className="h-full w-full object-cover" />
              ) : (
                <Building2 size={18} className="text-emerald-400" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-white">{supplierName}</p>
              <p className="truncate text-xs text-[#9ca3af]">{userEmail}</p>
            </div>
          </div>

          <button onClick={logout} className="portal-button-danger h-9 px-3">
            <LogOut size={15} />
            <span className="hidden sm:inline">Đăng xuất</span>
          </button>
        </header>

        <main className="mx-auto max-w-7xl p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
