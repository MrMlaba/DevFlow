import Link from "next/link";
import { ChevronsUpDown, Workflow } from "lucide-react";

import { SidebarNav } from "@/features/navigation/components/sidebar-nav";
import { initials } from "@/lib/utils";
import type { Organization } from "@/services/organizations";

export function Sidebar({ organization }: { organization: Organization | null }) {
  return (
    <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border hidden w-64 shrink-0 flex-col border-r md:flex">
      <div className="border-sidebar-border flex h-16 items-center gap-2 border-b px-6">
        <Link href="/overview" className="flex items-center gap-2 font-semibold">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Workflow className="size-4" />
          </span>
          DevFlow
        </Link>
      </div>
      {organization && (
        <div className="border-sidebar-border border-b p-3">
          <div className="hover:bg-sidebar-accent flex items-center gap-2.5 rounded-lg border border-sidebar-border/60 px-2.5 py-2 transition-colors">
            <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-semibold">
              {initials(organization.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{organization.name}</p>
              <p className="text-muted-foreground truncate text-xs">Organization</p>
            </div>
            <ChevronsUpDown className="text-muted-foreground size-3.5 shrink-0" />
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <SidebarNav />
      </div>
    </aside>
  );
}
