import { describe, expect, it } from "vitest";
import { maskAccount, parseCsv, validateCustomers, validateTransactions } from "./csv-import";

describe("csv import", () => {
  it("parses quoted cells with commas", () => {
    expect(parseCsv('id,name\r\nC1,"Sharma, Ravi"\n')).toEqual([{ id: "C1", name: "Sharma, Ravi" }]);
  });
  it("masks full account numbers to last 4 digits", () => {
    expect(maskAccount("123456789012")).toBe("XXXX9012");
  });
  it("rejects non-numeric balances", () => {
    expect(validateCustomers([{ id: "C1", name: "A", masked_account: "XX12", balance: "abc" }]).errors).toHaveLength(1);
  });
  it("rejects transactions for unknown customers", () => {
    const r = validateTransactions([{ id: "T1", customer_id: "C9", amount: "100", merchant: "M", status: "failed" }], new Set(["C1"]));
    expect(r.errors[0]).toContain("C9 not found");
  });
});
