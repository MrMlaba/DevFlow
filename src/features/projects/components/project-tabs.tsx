"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;
  const tabs = [
    { label: "Overview", href: base },
    { label: "Tasks", href: `${base}/tasks` },
    { label: "Issues", href: `${base}/issues` },
    { label: "Members", href: `${base}/members` },
    { label: "Settings", href: `${base}/settings` },
  ];

  return (
    <div className="border-b">
      <nav className="-mb-px flex gap-6 overflow-x-auto">
        {tabs.map((tab) => {
          const active =
            tab.href === base ? pathname === base : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "shrink-0 border-b-2 px-1 pb-3 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
