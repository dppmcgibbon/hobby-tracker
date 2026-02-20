// Miniature status constants
// This maps database status values to their display labels

export const STATUS_LABELS: Record<string, string> = {
  unknown: "Unknown",
  missing: "Missing",
  needs_stripped: "Needs Stripped",
  backlog: "Backlog",
  built: "Built",
  primed: "Primed",
  painting_started: "Painting Started",
  needs_repair: "Needs Repair",
  sub_assembled: "Sub-Assembled",
  missing_arm: "Missing Arm",
  missing_leg: "Missing Leg",
  missing_head: "Missing Head",
  complete: "Complete",
  
  // Legacy mappings for backward compatibility
  assembled: "Built",
  painting: "Painting Started",
  completed: "Complete",
};

export const STATUS_COLORS: Record<string, string> = {
  unknown: "hsl(0, 0%, 50%)", // Gray
  missing: "hsl(0, 70%, 50%)", // Red
  needs_stripped: "hsl(30, 70%, 50%)", // Orange
  backlog: "hsl(0, 0%, 45%)", // Steel gray
  built: "hsl(43, 96%, 56%)", // Imperial gold
  primed: "hsl(30, 50%, 45%)", // Bronze
  painting_started: "hsl(200, 70%, 50%)", // Blue
  needs_repair: "hsl(15, 70%, 50%)", // Red-orange
  sub_assembled: "hsl(43, 80%, 60%)", // Light gold
  missing_arm: "hsl(0, 60%, 45%)", // Dark red
  missing_leg: "hsl(0, 60%, 45%)", // Dark red
  missing_head: "hsl(0, 60%, 45%)", // Dark red
  complete: "hsl(120, 60%, 40%)", // Green
  
  // Legacy mappings
  assembled: "hsl(43, 96%, 56%)",
  painting: "hsl(200, 70%, 50%)",
  completed: "hsl(120, 60%, 40%)",
};

export type MiniatureStatusValue = 
  | "unknown"
  | "missing"
  | "needs_stripped"
  | "backlog"
  | "built"
  | "primed"
  | "painting_started"
  | "needs_repair"
  | "sub_assembled"
  | "missing_arm"
  | "missing_leg"
  | "missing_head"
  | "complete";

/** Status groups used for filtering (e.g. "In Progress" = multiple statuses). */
export const STATUS_GROUP_IN_PROGRESS = new Set<MiniatureStatusValue>([
  "sub_assembled",
  "built",
  "primed",
  "painting_started",
]);
export const STATUS_GROUP_BACKLOG = new Set<MiniatureStatusValue>([
  "backlog",
  "unknown",
  "missing",
  "needs_stripped",
  "needs_repair",
  "missing_arm",
  "missing_leg",
  "missing_head",
]);
