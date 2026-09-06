export const PIPELINE_STAGES = ["NEW", "ENGAGED", "QUALIFIED", "CUSTOMER", "REPEAT_CUSTOMER"] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const STAGE_LABELS: Record<PipelineStage, string> = {
  NEW: "New Lead",
  ENGAGED: "Engaged",
  QUALIFIED: "Qualified",
  CUSTOMER: "Customer",
  REPEAT_CUSTOMER: "Repeat Customer",
};
