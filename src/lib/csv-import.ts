/** Minimal RFC-4180 CSV parser (quotes, escaped quotes, CRLF). */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let q = false;
  const s = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) { if (ch === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; continue; }
    if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && s[i + 1] === "\n") i++; row.push(cell); cell = ""; if (row.some((c) => c.trim())) rows.push(row); row = []; }
    else cell += ch;
  }
  row.push(cell); if (row.some((c) => c.trim())) rows.push(row);
  const [head, ...body] = rows; if (!head) return [];
  const keys = head.map((h) => h.trim().toLowerCase());
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
}

export const CUSTOMER_COLS = ["id", "name", "masked_account", "balance", "phone", "email", "preferred_language", "verification_status"] as const;
export const TXN_COLS = ["id", "customer_id", "amount", "merchant", "status", "upi_reference", "txn_type", "payment_method", "occurred_at"] as const;

/** Mask an account number to its last 4 digits unless already masked. */
export function maskAccount(v: string) { return /[x•*]/i.test(v) ? v : v.length > 4 ? "XXXX" + v.slice(-4) : v; }

export function validateCustomers(rows: Record<string, string>[]) {
  const errors: string[] = []; const ids = new Set<string>();
  const out = rows.map((r, i) => {
    const n = i + 2;
    if (!r["id"]) errors.push(`Customers row ${n}: id is missing`);
    if (!r["name"]) errors.push(`Customers row ${n}: name is missing`);
    if (!r["masked_account"]) errors.push(`Customers row ${n}: masked_account is missing`);
    if (r["balance"] && !Number.isFinite(Number(r["balance"]))) errors.push(`Customers row ${n}: balance "${r["balance"]}" is not a number`);
    if (r["id"] && ids.has(r["id"])) errors.push(`Customers row ${n}: duplicate id ${r["id"]}`);
    ids.add(r["id"] ?? "");
    return { ...r, masked_account: maskAccount(r["masked_account"] ?? "") } as Record<string, string>;
  });
  return { rows: out, errors };
}

export function validateTransactions(rows: Record<string, string>[], knownCustomers: Set<string>) {
  const errors: string[] = [];
  rows.forEach((r, i) => {
    const n = i + 2;
    for (const k of ["id", "customer_id", "amount", "merchant", "status"]) if (!r[k]) errors.push(`Transactions row ${n}: ${k} is missing`);
    if (r["amount"] && !(Number(r["amount"]) > 0)) errors.push(`Transactions row ${n}: amount must be a positive number`);
    if (r["customer_id"] && !knownCustomers.has(r["customer_id"])) errors.push(`Transactions row ${n}: customer ${r["customer_id"]} not found`);
    if (r["occurred_at"] && Number.isNaN(Date.parse(r["occurred_at"]))) errors.push(`Transactions row ${n}: occurred_at is not a date`);
  });
  return { rows, errors };
}
