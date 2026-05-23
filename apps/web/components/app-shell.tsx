'use client';

import { TopNav } from './top-nav';

interface AppShellProps {
  children: React.ReactNode;
  userEmail?: string;
  userRole?: string;
}

export function AppShell({ children, userEmail, userRole }: AppShellProps) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-surface-0)' }}>
      <TopNav userEmail={userEmail} userRole={userRole} />
      <main className="pt-14 min-h-screen">
        <div className="px-4 xl:px-6 py-5">
          {children}
        </div>
      </main>
    </div>
  );
}
