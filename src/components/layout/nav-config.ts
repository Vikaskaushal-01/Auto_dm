import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  BarChart3,
  Zap,
  Inbox,
  Users,
  Workflow,
  Link2,
  Package,
  Settings,
  CreditCard,
} from "lucide-react";

export interface NavLeaf {
  label: string;
  href: string;
  locked?: boolean;
}

export interface NavSection {
  label: string;
  icon: LucideIcon;
  href?: string; // present when the section itself is a single link, not a group
  locked?: boolean;
  lockedReason?: string;
  children?: NavLeaf[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    label: "Analytics",
    icon: BarChart3,
    children: [
      { label: "Profile", href: "/analytics/profile" },
      { label: "Followers", href: "/analytics/followers" },
      { label: "Content", href: "/analytics/content" },
      { label: "AutoDM", href: "/analytics/autodm" },
      { label: "Links", href: "/analytics/links" },
      { label: "Compare", href: "/analytics/compare" },
    ],
  },
  {
    label: "Automations",
    icon: Zap,
    children: [
      { label: "All Automations", href: "/automations" },
      { label: "Create Automation", href: "/automations/new" },
    ],
  },
  {
    label: "Inbox",
    icon: Inbox,
    href: "/inbox",
  },
  {
    label: "Leads / CRM",
    icon: Users,
    href: "/crm",
  },
  {
    label: "Flow Builder",
    icon: Workflow,
    href: "/flow-builder",
  },
  {
    label: "Link-in-Bio",
    icon: Link2,
    href: "/link-in-bio",
  },
  {
    label: "Products",
    icon: Package,
    href: "/products",
  },
  {
    label: "Settings",
    icon: Settings,
    children: [
      { label: "Workspace", href: "/settings/workspace" },
      { label: "Team", href: "/settings/team" },
      { label: "Integrations", href: "/settings/integrations" },
    ],
  },
  {
    label: "Billing",
    icon: CreditCard,
    href: "/billing",
  },
];
