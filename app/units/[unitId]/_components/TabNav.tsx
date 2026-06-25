"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function TabNav({ unitId }: { unitId: string }) {
  const pathname = usePathname();
  const tabs = [
    { href: `/units/${unitId}/schedule`, label: "Schedule" },
    { href: `/units/${unitId}/employees`, label: "Employees" },
    { href: `/units/${unitId}/leaves`, label: "Leaves" },
    { href: `/units/${unitId}/reports`, label: "Reports" },
    { href: `/units/${unitId}/settings`, label: "Settings" },
  ];

  return (
    <nav className="flex border-b border-gray-200 mb-6 gap-0.5">
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              active
                ? "border-slate-800 text-slate-900"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
