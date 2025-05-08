import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'QuickChex - Attendance System',
  description: 'Mark your attendance easily with QuickChex',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head> 
        <link rel="icon" href="/quikchex.png" sizes="32x32" />
      </head>
      <body className={`${inter.className} bg-light text-secondary`}>{children}</body>
    </html>
  );
} 