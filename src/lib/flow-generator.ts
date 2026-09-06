import { FLOW_NODE_META, type FlowNodeType } from "@/lib/flow-node-types";

export interface GeneratedNode {
  tempId: string;
  type: FlowNodeType;
  x: number;
  y: number;
  data: Record<string, unknown>;
}

export interface GeneratedEdge {
  source: string;
  target: string;
}

export interface GeneratedFlow {
  name: string;
  nodes: GeneratedNode[];
  edges: GeneratedEdge[];
}

const STEP_X = 260;
const ROW_Y = 180;

export function generateFlowFromPrompt(prompt: string): GeneratedFlow {
  const text = prompt.toLowerCase();
  const nodes: GeneratedNode[] = [];
  const edges: GeneratedEdge[] = [];

  function add(type: FlowNodeType, data?: Record<string, unknown>): string {
    const id = `n${nodes.length}`;
    const x = 60 + nodes.length * STEP_X;
    nodes.push({ tempId: id, type, x, y: ROW_Y, data: { ...FLOW_NODE_META[type].defaultData, ...data } });
    if (nodes.length > 1) edges.push({ source: nodes[nodes.length - 2].tempId, target: id });
    return id;
  }

  const keywordMatch = text.match(/(?:comments?|say|says|trigger(?:ed)? by|mentions?)\s+["']?([a-z0-9 ,'-]+)["']?/);
  const keywords = keywordMatch
    ? keywordMatch[1]
        .split(/,| or /)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 5)
    : ["info", "price", "guide"];
  add("TRIGGER", { keywords });

  add("MESSAGE", { text: "Hey! Thanks so much for reaching out 👋" });

  if (text.includes("follow")) {
    add("FOLLOW_GATE", { message: "Follow us first and I'll unlock this for you!" });
  }

  if (/(email|lead magnet|guide|pdf|ebook|freebie|download)/.test(text)) {
    add("EMAIL_CAPTURE", { prompt: "Drop your best email and I'll send it right over 📩" });
  }

  if (/(discount|coupon|promo|offer|sale)/.test(text)) {
    add("MESSAGE", { text: "Here's your exclusive discount code: WELCOME20 🎉" });
  }

  if (/(question|ask|survey|interested in)/.test(text)) {
    add("QUESTION", { question: "What are you most interested in?" });
  }

  if (/(link|website|shop|store|product|checkout|buy)/.test(text)) {
    add("LINK", { url: "https://example.com", label: "Check it out" });
  }

  if (/(wait|delay|follow up|follow-up|remind)/.test(text)) {
    add("DELAY", { seconds: 3600 });
    add("MESSAGE", { text: "Just checking back in — any questions I can help with?" });
  }

  if (/(tag|segment|crm|lead|pipeline)/.test(text)) {
    add("TAG", { tagName: "warm-lead" });
    add("CRM", { stage: "ENGAGED" });
  }

  if (/(human|agent|handoff|support|escalate)/.test(text)) {
    add("HUMAN_HANDOFF", { note: "Escalate to a human agent" });
  }

  add("END");

  const trimmed = prompt.trim();
  const name = trimmed.length > 0 ? trimmed[0].toUpperCase() + trimmed.slice(1, 60) : "Generated Flow";

  return { name, nodes, edges };
}
