"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Workflow } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarNav } from "@/features/navigation/components/sidebar-nav";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu" />
        }
      >
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b">
          <SheetTitle
            render={
              <Link
                href="/overview"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 font-semibold"
              />
            }
          >
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Workflow className="size-4" />
            </span>
            DevFlow
          </SheetTitle>
        </SheetHeader>
        <div className="px-3 py-4">
          <SidebarNav onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
