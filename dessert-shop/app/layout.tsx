import type { Metadata, Viewport } from 'next';
import { Noto_Sans_TC } from 'next/font/google';
import './globals.css';

const noto = Noto_Sans_TC({ weight: ['400', '500', '700'], subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'Wu.D dessert 線上訂購',
  description: 'Wu.D dessert 甜點線上訂購・宜蘭工作室自取',
};

export const viewport: Viewport = { themeColor: '#b23a48' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body className={`${noto.className} min-h-dvh`}>{children}</body>
    </html>
  );
}
