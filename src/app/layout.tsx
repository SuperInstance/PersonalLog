/**
 * Root Layout for SuperInstance Core App
 *
 * Provides the base HTML structure and metadata for all pages.
 * Uses Inter font for consistent typography.
 *
 * @module app/layout
 */

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PersonalLog - Your AI-Powered Personal Log",
  description: "Messenger-style journaling with AI contacts, knowledge management, and self-improving filtration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
