import { FlaskConical } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function PreviewDataBanner({ phase }: { phase: string }) {
  return (
    <Alert className="mb-6">
      <FlaskConical className="size-4" />
      <AlertTitle>Preview data</AlertTitle>
      <AlertDescription>
        This page shows realistic mock data so the workflow is easy to see
        end-to-end. It becomes live in {phase} - see docs/devops-roadmap.md.
      </AlertDescription>
    </Alert>
  );
}
