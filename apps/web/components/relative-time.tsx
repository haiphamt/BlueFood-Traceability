'use client';

import { useEffect, useState } from 'react';

function relativeVietnamese(date: Date): string {
  const diff = Date.now() - date.getTime();
  const s = Math.floor(diff / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d >= 30) return date.toLocaleDateString('vi-VN');
  if (d > 0) return `${d} ngày trước`;
  if (h > 0) return `${h} giờ trước`;
  if (m > 0) return `${m} phút trước`;
  return 'Vừa xong';
}

export function RelativeTime({ date }: { date: string }) {
  const parsed = new Date(date);
  const [text, setText] = useState(() => relativeVietnamese(parsed));

  useEffect(() => {
    const id = setInterval(() => setText(relativeVietnamese(parsed)), 30_000);
    return () => clearInterval(id);
  }, [parsed]);

  return (
    <time
      dateTime={date}
      title={parsed.toLocaleString('vi-VN', { dateStyle: 'full', timeStyle: 'medium' })}
    >
      {text}
    </time>
  );
}
