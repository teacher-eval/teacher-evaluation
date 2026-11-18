import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";

import { APP_NAME } from "@/lib/env";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s - ${APP_NAME}`,
  },
  description:
    "Online teacher evaluation system for the TVET Department of Andres Soriano Colleges of Bislig.",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  applicationName: APP_NAME,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

/**
 * Applied before first paint so a collapsed sidebar never flashes open.
 * Mirrors the legacy sidebar.js behaviour (localStorage key `sidebarCollapsed`).
 */
const SIDEBAR_PREPAINT = `try{if(localStorage.getItem('sidebarCollapsed')==='1'){document.documentElement.classList.add('sidebar-collapsed')}}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SIDEBAR_PREPAINT }} />
      </head>
      <body className="bg-surface font-sans text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
