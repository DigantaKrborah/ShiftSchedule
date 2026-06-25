import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import LogoutButton from "./_components/LogoutButton";

export const metadata: Metadata = {
  title: "ShiftSchedule",
  description: "Refinery Shift Management",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <header className="bg-slate-800 text-white h-14 flex items-center px-6 shadow-md gap-4">
          <Link href="/" className="font-bold text-lg tracking-tight hover:text-slate-200 transition-colors mr-4">
            ShiftSchedule
          </Link>
          {session && (
            <>
              <Link href="/" className="text-sm text-slate-300 hover:text-white transition-colors">Dashboard</Link>
              {session.role === "ADMIN" && (
                <>
                  <Link href="/units/new" className="text-sm text-slate-300 hover:text-white transition-colors">+ New Unit</Link>
                  <Link href="/admin/users" className="text-sm text-slate-300 hover:text-white transition-colors">Users</Link>
                </>
              )}
              <div className="ml-auto flex items-center gap-3">
                <span className="text-sm text-slate-300">
                  <span className="text-slate-500 mr-1">●</span>
                  {session.username}
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${session.role === "ADMIN" ? "bg-purple-700 text-purple-200" : "bg-slate-600 text-slate-200"}`}>
                    {session.role === "ADMIN" ? "Admin" : "Unit User"}
                  </span>
                </span>
                <LogoutButton />
              </div>
            </>
          )}
        </header>
        <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">{children}</main>
      </body>
    </html>
  );
}
