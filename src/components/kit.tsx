import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { ReactNode } from "react";

type T = keyof Database["public"]["Tables"];

export function useTable<K extends T>(table: K, order?: string) {
  return useQuery({
    queryKey: ["t", table, order],
    queryFn: async () => {
      let q = supabase.from(table).select("*");
      if (order) q = q.order(order as never, { ascending: false });
      const { data, error } = await q.limit(500);
      if (error) throw error;
      return data as unknown as Database["public"]["Tables"][K]["Row"][];
    },
  });
}

export function PageHeader({ title, desc, children }: { title: string; desc?: string; children?: ReactNode }) {
  return (
    <div className="animate-rise mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
        {desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}
      </div>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

const TONE: Record<string, string> = {
  successful: "success", completed: "success", resolved: "success", verified: "success", active: "success", published: "success", success: "success", configured: "success",
  pending: "warning", submitted: "warning", draft: "warning", awaiting_confirmation: "warning", verification_pending: "warning", medium: "warning", unverified: "warning", simulation: "warning",
  failed: "destructive", rejected: "destructive", frozen: "destructive", high: "destructive", critical: "destructive", escalated: "destructive", missing: "destructive",
  under_investigation: "cyan", reversed: "cyan", low: "muted",
};
export function StatusBadge({ value }: { value: string | null | undefined }) {
  const v = (value ?? "—").toString();
  const tone = TONE[v] ?? "muted";
  const cls = {
    success: "text-success bg-success/10 border-success/20",
    warning: "text-warning bg-warning/10 border-warning/20",
    destructive: "text-destructive bg-destructive/10 border-destructive/20",
    cyan: "text-cyan bg-cyan/10 border-cyan/20",
    muted: "text-muted-foreground bg-muted border-border",
  }[tone];
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[11px] ${cls}`}>{v.replace(/_/g, " ")}</span>;
}

export function Panel({ title, children, action, className = "" }: { title?: string; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <section className={`animate-rise rounded-xl border bg-card/80 shadow-sm backdrop-blur ${className}`}>
      {title && (
        <header className="flex items-center justify-between border-b px-4 py-2.5">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold"><span className="h-1.5 w-1.5 rounded-full bg-primary" />{title}</h2>{action}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export type Col<R> = { key: string; label: string; render?: ((r: R) => ReactNode) | undefined; mono?: boolean };
export function DataTable<R extends Record<string, any>>({ rows, cols, loading }: { rows?: R[] | undefined; cols: Col<R>[]; loading?: boolean }) {
  return (
    <div className="animate-rise overflow-x-auto rounded-xl border bg-card/80">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            {cols.map((c) => <th key={c.key} className="px-3 py-2 font-medium">{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {loading && <tr><td className="px-3 py-6 text-muted-foreground" colSpan={cols.length}>Loading…</td></tr>}
          {!loading && !rows?.length && <tr><td className="px-3 py-6 text-muted-foreground" colSpan={cols.length}>No records yet.</td></tr>}
          {rows?.map((r, i) => (
            <tr key={i} className="border-b last:border-0 transition-colors hover:bg-accent/50">
              {cols.map((c) => (
                <td key={c.key} className={`px-3 py-2 ${c.mono ? "font-mono text-xs" : ""}`}>
                  {c.render ? c.render(r) : String(r[c.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const inr = (n: number | string) => "₹" + Number(n).toLocaleString("en-IN");
export const dt = (s: string | null) => (s ? new Date(s).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  function move(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  }
  return (
    <div onMouseMove={move} className="group card-lift animate-rise relative overflow-hidden rounded-2xl border bg-card p-4">
      <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 [background:radial-gradient(220px_circle_at_var(--mx)_var(--my),color-mix(in_oklab,var(--primary)_22%,transparent),transparent_70%)]" />
      <span className="brand-gradient absolute inset-x-0 top-0 h-0.5 opacity-70" />
      <p className="relative text-xs text-muted-foreground">{label}</p>
      <p className="relative mt-2 bg-gradient-to-br from-foreground to-primary bg-clip-text font-display text-3xl font-bold tracking-tight text-transparent">{value}</p>
      {hint && <p className="relative mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function DemoBanner() {
  return (
    <div className="mb-5 flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
      <span className="font-mono font-semibold tracking-wider">DEMO ENVIRONMENT</span>
      <span className="text-warning/80">Seeded banking data · simulated financial operations · Gnani Prisma & Timbre live</span>
    </div>
  );
}
