'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Truck,
  FileCheck,
  History,
  BarChart3,
  Settings,
  Building2,
  ShoppingBasket,
  X,
} from 'lucide-react';

const mainNav = [
  { href: '/dashboard',    label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/batches',      label: 'Lô hàng',       icon: Package },
  { href: '/suppliers',    label: 'Nhà cung cấp',  icon: Building2 },
  { href: '/products',     label: 'Sản phẩm',      icon: ShoppingBasket },
  { href: '/shipments',    label: 'Vận chuyển',     icon: Truck },
  { href: '/certificates', label: 'Chứng chỉ',     icon: FileCheck },
  { href: '/audit-logs',   label: 'Audit Logs',    icon: History },
  { href: '/reports',      label: 'Báo cáo',       icon: BarChart3 },
];

// Routes visible per role. Admin sees everything; store_staff sees operational
// pages only (no supplier/product management).
const ROLE_NAV: Record<string, Set<string>> = {
  admin: new Set(['/dashboard', '/batches', '/suppliers', '/products', '/shipments', '/certificates', '/audit-logs', '/reports']),
  store_staff: new Set(['/dashboard', '/batches', '/shipments', '/certificates', '/audit-logs']),
};

function visibleNav(userRole?: string) {
  const allowed = ROLE_NAV[userRole ?? ''] ?? ROLE_NAV.store_staff;
  return mainNav.filter(({ href }) => allowed.has(href));
}

interface AppSidebarProps {
  onClose?: () => void;
  userRole?: string;
}

export function AppSidebar({ onClose, userRole }: AppSidebarProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'));
  }

  function navLink(href: string, label: string, Icon: React.ElementType) {
    const active = isActive(href);
    return (
      <li key={href}>
        <Link
          href={href}
          aria-current={active ? 'page' : undefined}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors active:scale-[0.98] ${
            active
              ? 'bg-[#acf3bb]/20 text-[#286b3f] font-bold'
              : 'text-[#424843] hover:bg-[#acf3bb]/10'
          }`}
        >
          <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
          {label}
        </Link>
      </li>
    );
  }

  return (
    <aside className="w-[220px] xl:w-[240px] flex-shrink-0 flex flex-col h-full min-h-screen bg-white border-r border-[#c2c8c1] shadow-sm">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-[#c2c8c1] flex items-start justify-between">
        <div>
          <h1 className="text-lg font-black text-[#286b3f] leading-tight">BlueFood</h1>
          <span className="text-[11px] font-semibold text-[#424843] uppercase tracking-widest mt-0.5 block">
            Traceability
          </span>
        </div>
        {onClose && (
          <button onClick={onClose} className="md:hidden p-1 rounded hover:bg-gray-100" aria-label="Đóng menu">
            <X size={18} className="text-[#424843]" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2" aria-label="Main navigation">
        <ul className="flex flex-col gap-0.5 px-2">
          {visibleNav(userRole).map(({ href, label, icon: Icon }) => navLink(href, label, Icon))}

          {/* Settings — admin only */}
          {userRole === 'admin' && (
            <li className="mt-4 pt-4 border-t border-[#c2c8c1]">
              <Link
                href="/settings"
                aria-current={isActive('/settings') ? 'page' : undefined}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors active:scale-[0.98] ${
                  isActive('/settings')
                    ? 'bg-[#acf3bb]/20 text-[#286b3f] font-bold'
                    : 'text-[#424843] hover:bg-[#acf3bb]/10'
                }`}
              >
                <Settings size={18} strokeWidth={isActive('/settings') ? 2.2 : 1.8} />
                Cài đặt
              </Link>
            </li>
          )}
        </ul>
      </nav>
    </aside>
  );
}
