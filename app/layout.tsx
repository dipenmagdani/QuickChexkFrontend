import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#FE7743",
};

export const metadata: Metadata = {
  title: "QuickChex - Attendance Automation",
  description: "Mark your attendance easily with QuickChex automation system",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "QuickChex",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/quikchex.png",
    apple: "/quikchex.png",
  },
  openGraph: {
    type: "website",
    title: "QuickChex - Attendance Automation",
    description: "Mark your attendance easily with QuickChex",
  },
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
        <link rel="apple-touch-icon" href="/quikchex.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="QuickChex" />
      </head>
      <body className={`${inter.className} bg-light text-secondary`}>
        {children}
      </body>
    </html>
  );
}
