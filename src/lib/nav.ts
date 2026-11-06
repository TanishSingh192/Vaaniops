import {
  LayoutDashboard, Radio, AudioLines, Bot, Workflow, Wrench, ArrowLeftRight, Scale, Users,
  MessagesSquare, BarChart3, ScrollText, Plug, ShieldAlert, Settings, Sparkles, Inbox, Gauge, UserCog,
} from "lucide-react";

export const NAV = [
  { to: "/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/my-queue", label: "My Queue", icon: Inbox },
  { to: "/live", label: "Live Operations", icon: Radio },
  { to: "/triage", label: "AI Issue Triage", icon: Sparkles },
  { to: "/voice", label: "Voice Studio", icon: AudioLines },
  { to: "/agents", label: "AI Agent Studio", icon: Bot },
  { to: "/workflows", label: "Workflow Builder", icon: Workflow },
  { to: "/tools", label: "Tool Registry", icon: Wrench },
  { to: "/transactions", label: "Transaction Intelligence", icon: ArrowLeftRight },
  { to: "/disputes", label: "Dispute Management", icon: Scale },
  { to: "/customers", label: "Customer Management", icon: Users },
  { to: "/conversations", label: "Conversation History", icon: MessagesSquare },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/performance", label: "Operator Performance", icon: Gauge },
  { to: "/audit", label: "Audit & Compliance", icon: ScrollText },
  { to: "/team", label: "Team & Roles", icon: UserCog },
  { to: "/integrations", label: "Integrations", icon: Plug },
  { to: "/security", label: "Security Center", icon: ShieldAlert },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;
