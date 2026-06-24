import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ShiftSchedule",
  description: "Shift scheduling management system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <header className="bg-slate-800 text-white h-14 flex items-center px-6 shadow-md">
          <Link href="/" className="font-bold text-lg tracking-tight hover:text-slate-200 transition-colors">
            ShiftSchedule
          </Link>
        </header>
        <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">{children}</main>
      </body>
    </html>
  );
}
