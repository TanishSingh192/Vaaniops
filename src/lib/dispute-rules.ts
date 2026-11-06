export const DISPUTE_STATUSES = [
  "submitted", "assigned", "under_investigation", "escalated", "resolved", "rejected", "closed",
] as const;
export type DisputeStatus = (typeof DISPUTE_STATUSES)[number];

const NEXT: Record<DisputeStatus, DisputeStatus[]> = {
  submitted: ["assigned", "escalated", "rejected"],
  assigned: ["under_investigation", "escalated", "resolved", "rejected"],
  under_investigation: ["escalated", "resolved", "rejected"],
  escalated: ["under_investigation", "resolved", "rejected"],
  resolved: ["closed", "under_investigation"],
  rejected: ["closed"],
  closed: [],
  // legacy value from seed data
} as Record<DisputeStatus, DisputeStatus[]>;

export function allowedNext(from: string): DisputeStatus[] {
  if (from === "verification_pending") return ["assigned", "under_investigation", "rejected"];
  return NEXT[from as DisputeStatus] ?? [];
}

export function validateTransition(from: string, to: string, opts: { note?: string | undefined; assigned: boolean }): string | null {
  if (!allowedNext(from).includes(to as DisputeStatus)) return `Cannot move a dispute from ${from} to ${to}.`;
  if (to !== "assigned" && to !== "rejected" && to !== "escalated" && !opts.assigned) return "Assign the dispute to an operator first.";
  if ((to === "resolved" || to === "rejected") && !(opts.note && opts.note.trim().length >= 5)) return "Add a resolution note (at least 5 characters).";
  return null;
}
