'use client';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

interface Props {
  href: string;
  className: string;
  children: ReactNode;
}

export function ClickableTableRow({ href, className, children }: Props) {
  const router = useRouter();
  return (
    <tr
      className={`${className} cursor-pointer`}
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          router.push(href);
        }
      }}
      tabIndex={0}
      role="link"
    >
      {children}
    </tr>
  );
}
