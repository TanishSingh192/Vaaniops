import { describe, it, expect } from "vitest";
import { validateTransition } from "./dispute-rules";

describe("dispute workflow", () => {
  it("must be assigned before investigation or resolution", () => {
    expect(validateTransition("submitted", "resolved", { assigned: false, note: "done ok" })).not.toBeNull();
  });
  it("resolution requires a note", () => {
    expect(validateTransition("under_investigation", "resolved", { assigned: true, note: "" })).toMatch(/note/);
    expect(validateTransition("under_investigation", "resolved", { assigned: true, note: "Refund review approved" })).toBeNull();
  });
  it("only resolved or rejected disputes can be closed", () => {
    expect(validateTransition("under_investigation", "closed", { assigned: true })).not.toBeNull();
    expect(validateTransition("resolved", "closed", { assigned: true })).toBeNull();
  });
  it("closed disputes are final", () => {
    expect(validateTransition("closed", "under_investigation", { assigned: true })).not.toBeNull();
  });
});
