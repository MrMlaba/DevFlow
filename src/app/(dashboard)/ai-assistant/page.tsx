import type { Metadata } from "next";
import { Bot } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "AI Assistant" };

const EXAMPLE_QUESTIONS = [
  "What happened in this project this week?",
  "Why did the latest pipeline fail?",
  "Who is currently blocked?",
  "Which tasks are overdue?",
  "Is the project on track?",
  "Summarize the latest deployment.",
];

export default function AiAssistantPage() {
  return (
    <div>
      <PageHeader
        title="AI Assistant"
        description="Ask questions about your projects, tasks, and DevOps activity."
      />
      <EmptyState
        icon={Bot}
        title="Arriving in Phase 18"
        description="The AI assistant will use the OpenAI API to analyze real DevFlow data - tasks, GitHub activity, pipelines, deployments, and incidents - and will always separate actual system data from AI-generated interpretation."
      />
      <Card className="mt-6">
        <CardContent className="pt-6">
          <p className="mb-3 text-sm font-medium">Questions it will be able to answer</p>
          <ul className="text-muted-foreground grid gap-2 text-sm sm:grid-cols-2">
            {EXAMPLE_QUESTIONS.map((q) => (
              <li key={q} className="rounded-md border bg-muted/40 px-3 py-2">
                &ldquo;{q}&rdquo;
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
