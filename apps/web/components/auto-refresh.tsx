'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AutoRefreshProps {
  intervalMs?: number;
}

export function AutoRefresh({ intervalMs = 5000 }: AutoRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    function isEditing() {
      const active = document.activeElement;
      return (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement ||
        (active instanceof HTMLElement && active.isContentEditable)
      );
    }

    function refreshIfVisible() {
      if (document.visibilityState === 'visible' && !isEditing()) {
        router.refresh();
      }
    }

    const interval = window.setInterval(refreshIfVisible, intervalMs);
    document.addEventListener('visibilitychange', refreshIfVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [intervalMs, router]);

  return null;
}
