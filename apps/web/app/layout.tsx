import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'BlueFood Traceability',
  description: 'Hệ thống quản lý chuỗi cung ứng thực phẩm sạch — ITPJ2604',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        {/* No-flicker theme script — runs before paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');document.documentElement.classList.toggle('dark',t!=='light')}catch(e){document.documentElement.classList.add('dark')}})()`,
          }}
        />
      </head>
      <body>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
