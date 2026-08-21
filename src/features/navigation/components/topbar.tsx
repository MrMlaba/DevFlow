import Link from "next/link";
import { Bell } from "lucide-react";

import { MobileNav } from "@/features/navigation/components/mobile-nav";
import { UserMenu } from "@/features/auth/components/user-menu";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/services/auth";

export function Topbar({ profile }: { profile: Profile }) {
  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b bg-card px-4 md:px-6">
      <MobileNav />
      <div className="flex-1" />
      <Button
        variant="ghost"
        size="icon"
        aria-label="Notifications"
        nativeButton={false}
        render={<Link href="/notifications" />}
      >
        <Bell className="size-4.5" />
      </Button>
      <UserMenu profile={profile} />
    </header>
  );
}
