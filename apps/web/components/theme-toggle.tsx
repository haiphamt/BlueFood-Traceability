'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('theme', next ? 'dark' : 'light'); } catch {}
  }

  if (!mounted) return <div className="w-8 h-8" />;

  return (
    <button
      onClick={toggle}
      aria-label={dark ? 'Chuyển sang sáng' : 'Chuyển sang tối'}
      className="w-8 h-8 rounded-md flex items-center justify-center transition-colors hover:bg-line"
      style={{ color: 'var(--color-text-muted)' }}
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
