import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-semibold">That link didn&apos;t work</h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        This confirmation or reset link is invalid or has expired. Request a
        new one and try again.
      </p>
      <Button render={<Link href="/login" />}>Back to sign in</Button>
    </div>
  );
}
