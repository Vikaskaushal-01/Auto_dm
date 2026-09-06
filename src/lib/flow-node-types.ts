import type { LucideIcon } from "lucide-react";
import {
  Zap,
  MessageSquare,
  Image,
  Video,
  FileText,
  Link2,
  MousePointerClick,
  HelpCircle,
  GitBranch,
  Sparkles,
  Clock,
  Mail,
  UserPlus,
  Tag,
  Users,
  Webhook,
  Globe,
  LifeBuoy,
  Flag,
} from "lucide-react";

export const FLOW_NODE_TYPE_VALUES = [
  "TRIGGER",
  "MESSAGE",
  "IMAGE",
  "VIDEO",
  "FILE",
  "LINK",
  "BUTTON",
  "QUESTION",
  "CONDITION",
  "AI",
  "DELAY",
  "EMAIL_CAPTURE",
  "FOLLOW_GATE",
  "TAG",
  "CRM",
  "WEBHOOK",
  "API",
  "HUMAN_HANDOFF",
  "END",
] as const;

export type FlowNodeType = (typeof FLOW_NODE_TYPE_VALUES)[number];

export interface FlowFieldDef {
  key: string;
  label: string;
  kind: "text" | "textarea" | "url" | "number" | "keywords" | "select";
  placeholder?: string;
  options?: string[];
}

export interface FlowNodeMeta {
  type: FlowNodeType;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
  category: "Flow" | "Content" | "Logic" | "Capture" | "Integration";
  defaultData: Record<string, unknown>;
  fields: FlowFieldDef[];
  summary: (data: Record<string, unknown>) => string;
}

function str(data: Record<string, unknown>, key: string, fallback = ""): string {
  const v = data[key];
  return typeof v === "string" && v.length > 0 ? v : fallback;
}

function arr(data: Record<string, unknown>, key: string): string[] {
  const v = data[key];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

export const FLOW_NODE_TYPES: FlowNodeMeta[] = [
  {
    type: "TRIGGER",
    label: "Trigger",
    description: "Starts the flow when a comment or message matches",
    icon: Zap,
    color: "text-amber-400",
    category: "Flow",
    defaultData: { keywords: ["info", "price"] },
    fields: [{ key: "keywords", label: "Trigger keywords", kind: "keywords", placeholder: "info, price, guide" }],
    summary: (d) => (arr(d, "keywords").length ? arr(d, "keywords").join(", ") : "Any comment"),
  },
  {
    type: "MESSAGE",
    label: "Send Message",
    description: "Sends a text message to the contact",
    icon: MessageSquare,
    color: "text-violet-400",
    category: "Content",
    defaultData: { text: "Hey! Thanks for reaching out 👋" },
    fields: [{ key: "text", label: "Message text", kind: "textarea", placeholder: "What should the bot say?" }],
    summary: (d) => str(d, "text", "Empty message"),
  },
  {
    type: "IMAGE",
    label: "Send Image",
    description: "Sends an image attachment",
    icon: Image,
    color: "text-sky-400",
    category: "Content",
    defaultData: { url: "", caption: "" },
    fields: [
      { key: "url", label: "Image URL", kind: "url", placeholder: "https://..." },
      { key: "caption", label: "Caption", kind: "text" },
    ],
    summary: (d) => str(d, "caption") || str(d, "url") || "No image set",
  },
  {
    type: "VIDEO",
    label: "Send Video",
    description: "Sends a video attachment",
    icon: Video,
    color: "text-sky-400",
    category: "Content",
    defaultData: { url: "" },
    fields: [{ key: "url", label: "Video URL", kind: "url", placeholder: "https://..." }],
    summary: (d) => str(d, "url", "No video set"),
  },
  {
    type: "FILE",
    label: "Send File",
    description: "Sends a downloadable file",
    icon: FileText,
    color: "text-sky-400",
    category: "Content",
    defaultData: { url: "", filename: "" },
    fields: [
      { key: "filename", label: "File name", kind: "text", placeholder: "guide.pdf" },
      { key: "url", label: "File URL", kind: "url", placeholder: "https://..." },
    ],
    summary: (d) => str(d, "filename") || str(d, "url") || "No file set",
  },
  {
    type: "LINK",
    label: "Send Link",
    description: "Sends a tappable link",
    icon: Link2,
    color: "text-sky-400",
    category: "Content",
    defaultData: { url: "https://", label: "Learn more" },
    fields: [
      { key: "label", label: "Link text", kind: "text" },
      { key: "url", label: "URL", kind: "url", placeholder: "https://..." },
    ],
    summary: (d) => str(d, "label", "Untitled link"),
  },
  {
    type: "BUTTON",
    label: "Button Options",
    description: "Presents tappable button choices",
    icon: MousePointerClick,
    color: "text-fuchsia-400",
    category: "Content",
    defaultData: { label: "Choose an option", options: ["Yes", "No"] },
    fields: [
      { key: "label", label: "Prompt", kind: "text" },
      { key: "options", label: "Options", kind: "keywords", placeholder: "Yes, No" },
    ],
    summary: (d) => (arr(d, "options").length ? arr(d, "options").join(" / ") : "No options set"),
  },
  {
    type: "QUESTION",
    label: "Ask Question",
    description: "Asks the contact a free-text question",
    icon: HelpCircle,
    color: "text-fuchsia-400",
    category: "Content",
    defaultData: { question: "What are you most interested in?" },
    fields: [{ key: "question", label: "Question", kind: "textarea" }],
    summary: (d) => str(d, "question", "Empty question"),
  },
  {
    type: "CONDITION",
    label: "Condition",
    description: "Branches the flow based on a field check",
    icon: GitBranch,
    color: "text-orange-400",
    category: "Logic",
    defaultData: { field: "reply", operator: "contains", value: "" },
    fields: [
      { key: "field", label: "Field", kind: "text", placeholder: "reply" },
      { key: "operator", label: "Operator", kind: "select", options: ["contains", "equals", "exists"] },
      { key: "value", label: "Value", kind: "text" },
    ],
    summary: (d) => `${str(d, "field", "field")} ${str(d, "operator", "contains")} "${str(d, "value")}"`,
  },
  {
    type: "AI",
    label: "AI Reply",
    description: "Generates a reply using an AI prompt",
    icon: Sparkles,
    color: "text-orange-400",
    category: "Logic",
    defaultData: { prompt: "Answer the user's question helpfully using our product info." },
    fields: [{ key: "prompt", label: "AI instructions", kind: "textarea" }],
    summary: (d) => str(d, "prompt", "No instructions set"),
  },
  {
    type: "DELAY",
    label: "Delay",
    description: "Waits before continuing the flow",
    icon: Clock,
    color: "text-orange-400",
    category: "Logic",
    defaultData: { seconds: 60 },
    fields: [{ key: "seconds", label: "Wait (seconds)", kind: "number" }],
    summary: (d) => {
      const s = typeof d.seconds === "number" ? d.seconds : 60;
      if (s >= 3600) return `Wait ${Math.round(s / 3600)}h`;
      if (s >= 60) return `Wait ${Math.round(s / 60)}m`;
      return `Wait ${s}s`;
    },
  },
  {
    type: "EMAIL_CAPTURE",
    label: "Capture Email",
    description: "Collects an email address",
    icon: Mail,
    color: "text-emerald-400",
    category: "Capture",
    defaultData: { prompt: "Drop your best email and I'll send it right over 📩" },
    fields: [{ key: "prompt", label: "Prompt", kind: "textarea" }],
    summary: (d) => str(d, "prompt", "No prompt set"),
  },
  {
    type: "FOLLOW_GATE",
    label: "Follow Gate",
    description: "Requires a follow before continuing",
    icon: UserPlus,
    color: "text-emerald-400",
    category: "Capture",
    defaultData: { message: "Follow us to unlock this content!" },
    fields: [{ key: "message", label: "Message", kind: "textarea" }],
    summary: (d) => str(d, "message", "No message set"),
  },
  {
    type: "TAG",
    label: "Add Tag",
    description: "Tags the contact for segmentation",
    icon: Tag,
    color: "text-emerald-400",
    category: "Capture",
    defaultData: { tagName: "warm-lead" },
    fields: [{ key: "tagName", label: "Tag name", kind: "text" }],
    summary: (d) => `Tag: ${str(d, "tagName", "untagged")}`,
  },
  {
    type: "CRM",
    label: "Update CRM Stage",
    description: "Moves the lead to a pipeline stage",
    icon: Users,
    color: "text-emerald-400",
    category: "Integration",
    defaultData: { stage: "ENGAGED" },
    fields: [
      {
        key: "stage",
        label: "Pipeline stage",
        kind: "select",
        options: ["NEW", "ENGAGED", "QUALIFIED", "CUSTOMER", "REPEAT_CUSTOMER"],
      },
    ],
    summary: (d) => `Move to ${str(d, "stage", "ENGAGED")}`,
  },
  {
    type: "WEBHOOK",
    label: "Webhook",
    description: "Calls an external webhook URL",
    icon: Webhook,
    color: "text-neutral-400",
    category: "Integration",
    defaultData: { url: "" },
    fields: [{ key: "url", label: "Webhook URL", kind: "url", placeholder: "https://..." }],
    summary: (d) => str(d, "url", "No URL set"),
  },
  {
    type: "API",
    label: "API Call",
    description: "Calls a custom API endpoint",
    icon: Globe,
    color: "text-neutral-400",
    category: "Integration",
    defaultData: { url: "", method: "POST" },
    fields: [
      { key: "method", label: "Method", kind: "select", options: ["GET", "POST", "PUT"] },
      { key: "url", label: "Endpoint URL", kind: "url", placeholder: "https://..." },
    ],
    summary: (d) => `${str(d, "method", "POST")} ${str(d, "url", "(no URL)")}`,
  },
  {
    type: "HUMAN_HANDOFF",
    label: "Human Handoff",
    description: "Routes the conversation to a human agent",
    icon: LifeBuoy,
    color: "text-rose-400",
    category: "Flow",
    defaultData: { note: "Escalate to a human agent" },
    fields: [{ key: "note", label: "Note for agent", kind: "textarea" }],
    summary: (d) => str(d, "note", "No note set"),
  },
  {
    type: "END",
    label: "End",
    description: "Marks the end of the flow",
    icon: Flag,
    color: "text-neutral-500",
    category: "Flow",
    defaultData: {},
    fields: [],
    summary: () => "End of flow",
  },
];

export const FLOW_NODE_META: Record<FlowNodeType, FlowNodeMeta> = Object.fromEntries(
  FLOW_NODE_TYPES.map((m) => [m.type, m]),
) as Record<FlowNodeType, FlowNodeMeta>;
