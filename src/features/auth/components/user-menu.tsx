import Link from "next/link";
import { LogOut, Settings, User } from "lucide-react";

import { signOut } from "@/features/auth/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/services/auth";
import { initials } from "@/lib/utils";

export function UserMenu({ profile }: { profile: Profile }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="relative h-9 w-9 rounded-full"
            aria-label="Account menu"
          />
        }
      >
        <Avatar className="h-9 w-9">
          <AvatarImage src={profile.avatar_url ?? undefined} alt="" />
          <AvatarFallback>
            {initials(profile.full_name ?? profile.email)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate font-medium">
            {profile.full_name ?? "Unnamed user"}
          </span>
          <span className="text-muted-foreground truncate text-xs font-normal">
            {profile.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/settings" />}>
          <User />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/settings" />}>
          <Settings />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          render={<button type="submit" form="sign-out-form" className="w-full" />}
        >
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
      {/* Lives outside the menu content so it isn't unmounted before the
          submit fires when the menu closes on click. */}
      <form id="sign-out-form" action={signOut} />
    </DropdownMenu>
  );
}
