import { describe, it, expect } from "vitest";
import { detectIntent } from "./intent";

describe("detectIntent", () => {
  it("routes failed UPI Hinglish to dispute workflow with amount", () => {
    const r = detectIntent("Mere UPI se 4,000 rupaye kat gaye, lekin merchant ko payment nahi mila.");
    expect(r.intent).toBe("failed_upi_payment");
    expect(r.amount).toBe(4000);
    expect(r.language).toBe("hi-IN");
  });
  it("detects duplicate debit", () => {
    expect(detectIntent("Mere account se same payment do baar deduct hua hai.").intent).toBe("duplicate_transaction");
  });
  it("detects card freeze", () => {
    expect(detectIntent("Please freeze my card, suspicious transaction").intent).toBe("card_freeze");
  });
});
