import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel } from "@/components/kit";
import { supabase } from "@/integrations/supabase/client";
import { CUSTOMER_COLS, TXN_COLS, parseCsv, validateCustomers, validateTransactions } from "@/lib/csv-import";
import { meta } from "@/lib/meta";

export const Route = createFileRoute("/_authenticated/import")({ head: meta("Import Bank Data", "Upload customer accounts and transactions from CSV."), component: Imp });

function template(cols: readonly string[], sample: string, name: string) {
  const url = URL.createObjectURL(new Blob([cols.join(",") + "\n" + sample + "\n"], { type: "text/csv" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

function Imp() {
  const { role } = Route.useRouteContext(); const qc = useQueryClient();
  const [cust, setCust] = useState<Record<string, string>[]>([]); const [txn, setTxn] = useState<Record<string, string>[]>([]);
  const [busy, setBusy] = useState(false); const [done, setDone] = useState<string | null>(null);
  if (role !== "admin") return <><PageHeader title="Import Bank Data" /><Panel><p className="text-sm text-muted-foreground">Only admins can import data.</p></Panel></>;

  const c = validateCustomers(cust);
  const known = new Set(c.rows.map((r) => r["id"]!));
  const t = validateTransactions(txn, known);
  const errors = [...c.errors, ...t.errors];

  async function read(f: File | undefined, set: (r: Record<string, string>[]) => void) {
    if (!f) return; if (f.size > 5_000_000) { toast.error("File is over 5 MB"); return; }
    set(parseCsv(await f.text())); setDone(null);
  }
  async function run() {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("import_bank_data", { _customers: c.rows as never, _transactions: t.rows as never });
      if (error) throw error;
      const r = data as { customers: number; transactions: number };
      setDone(`Imported ${r.customers} customers and ${r.transactions} transactions.`); toast.success("Import complete"); qc.invalidateQueries();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  return (<>
    <PageHeader title="Import Bank Data" desc="Upload your customer accounts and their transactions. Existing records with the same id are updated." />
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="1. Customer accounts" action={<Button size="sm" variant="ghost" onClick={() => template(CUSTOMER_COLS, "CUST-2001,Ravi Sharma,XXXX4321,25000,+91XXXXXX10,ravi@example.com,hi-IN,verified", "customers-template.csv")}>Template</Button>}>
        <input type="file" accept=".csv,text/csv" aria-label="Customers CSV" onChange={(e) => read(e.target.files?.[0], setCust)} className="text-sm" />
        <p className="mt-2 text-xs text-muted-foreground">Required: id, name, masked_account, balance (₹). Full account numbers are masked to the last 4 digits.</p>
        {cust.length > 0 && <p className="mt-2 text-sm">{cust.length} rows read</p>}
      </Panel>
      <Panel title="2. Transactions" action={<Button size="sm" variant="ghost" onClick={() => template(TXN_COLS, "TXN-9001,CUST-2001,4000,Sharma Electronics,failed,UPI4021558731,debit,UPI,2026-11-05T10:30:00+05:30", "transactions-template.csv")}>Template</Button>}>
        <input type="file" accept=".csv,text/csv" aria-label="Transactions CSV" onChange={(e) => read(e.target.files?.[0], setTxn)} className="text-sm" />
        <p className="mt-2 text-xs text-muted-foreground">Required: id, customer_id, amount, merchant, status (successful / failed / pending). Each customer must be in file 1.</p>
        {txn.length > 0 && <p className="mt-2 text-sm">{txn.length} rows read</p>}
      </Panel>
    </div>
    {(cust.length > 0 || txn.length > 0) && (
      <Panel title="3. Check and import" className="mt-4">
        {errors.length > 0 ? <ul className="max-h-60 space-y-1 overflow-y-auto text-sm text-destructive">{errors.slice(0, 50).map((e) => <li key={e}>{e}</li>)}{errors.length > 50 && <li>…and {errors.length - 50} more</li>}</ul>
          : <p className="text-sm">Everything looks right: {c.rows.length} customers, {t.rows.length} transactions.</p>}
        {cust.length > 0 && <div className="mt-3 overflow-x-auto"><table className="text-xs"><thead><tr>{CUSTOMER_COLS.map((k) => <th key={k} className="px-2 py-1 text-left text-muted-foreground">{k}</th>)}</tr></thead>
          <tbody>{c.rows.slice(0, 5).map((r, i) => <tr key={i}>{CUSTOMER_COLS.map((k) => <td key={k} className="px-2 py-1 font-mono">{r[k]}</td>)}</tr>)}</tbody></table></div>}
        <Button className="mt-3" disabled={busy || errors.length > 0 || cust.length === 0} onClick={run}>{busy ? "Importing…" : "Import"}</Button>
        {done && <p className="mt-2 text-sm text-success">{done} <Link to="/customers" className="underline">View customers</Link></p>}
      </Panel>)}
  </>);
}
