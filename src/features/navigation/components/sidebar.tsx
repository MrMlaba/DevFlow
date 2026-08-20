import Link from "next/link";
import { Workflow } from "lucide-react";

import { SidebarNav } from "@/features/navigation/components/sidebar-nav";
import type { Organization } from "@/services/organizations";

export function Sidebar({ organization }: { organization: Organization | null }) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-card md:flex">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Link href="/overview" className="flex items-center gap-2 font-semibold">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Workflow className="size-4" />
          </span>
          DevFlow
        </Link>
      </div>
      {organization && (
        <div className="border-b px-6 py-3">
          <p className="text-muted-foreground truncate text-xs">Organization</p>
          <p className="truncate text-sm font-medium">{organization.name}</p>
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <SidebarNav />
      </div>
    </aside>
  );
}
