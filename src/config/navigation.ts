import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Activity as ActivityIcon,
  Bell,
  Bot,
  Boxes,
  GitPullRequest,
  Kanban,
  LayoutDashboard,
  LineChart,
  Rocket,
  Settings,
  ShieldAlert,
  Ticket,
  Users,
  Workflow,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  /**
   * Phase 1 ships real, database-backed data for these sections. Everything
   * else renders realistic mock data until its dedicated phase (see
   * docs/devops-roadmap.md) lands - the UI marks those pages "Preview data"
   * so it's never ambiguous what's real.
   */
  live: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { title: "Overview", href: "/overview", icon: LayoutDashboard, live: true },
  { title: "Projects", href: "/projects", icon: Boxes, live: true },
  { title: "Tasks", href: "/tasks", icon: Kanban, live: true },
  { title: "Issues", href: "/issues", icon: Ticket, live: true },
  {
    title: "Pull Requests",
    href: "/pull-requests",
    icon: GitPullRequest,
    live: true,
  },
  { title: "Pipelines", href: "/pipelines", icon: Workflow, live: true },
  { title: "Security", href: "/security", icon: ShieldAlert, live: true },
  { title: "Deployments", href: "/deployments", icon: Rocket, live: true },
  { title: "Environments", href: "/environments", icon: Boxes, live: true },
  { title: "Monitoring", href: "/monitoring", icon: LineChart, live: true },
  {
    title: "Incidents",
    href: "/incidents",
    icon: AlertTriangle,
    live: true,
  },
  { title: "Team", href: "/team", icon: Users, live: true },
  { title: "Activity", href: "/activity", icon: ActivityIcon, live: true },
  { title: "AI Assistant", href: "/ai-assistant", icon: Bot, live: false },
  { title: "Notifications", href: "/notifications", icon: Bell, live: true },
  { title: "Settings", href: "/settings", icon: Settings, live: true },
];
