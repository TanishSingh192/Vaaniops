import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NAV } from "@/lib/nav";
import { Logo, LogoMark } from "@/components/Logo";
import { Bell, ChevronsLeft, ChevronsRight, LogOut, Moon, Search, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
    return { user: data.user, role: (roles?.[0]?.role ?? "viewer") as "admin" | "operator" | "viewer" };
  },
  component: Shell,
});

function Shell() {
  const { user, role } = Route.useRouteContext();
  const [collapsed, setCollapsed] = useState(false);
  const [env, setEnv] = useState("Development");
  const path = useRouterState({ select: (s) => s.location.pathname });
  const qc = useQueryClient();
  const nav = useNavigate();

  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  }
  function toggleTheme() { document.documentElement.classList.toggle("dark"); }

  return (
    <div className="flex min-h-screen">
      <aside className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex ${collapsed ? "w-14" : "w-60"} transition-[width]`}>
        <div className="flex h-14 items-center border-b px-3">{collapsed ? <LogoMark animated /> : <Logo animated />}</div>
        {!collapsed && (
          <div className="border-b px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">Organization</p>
            <p className="text-[13px] font-medium">Demo Bank of India</p>
          </div>
        )}
        <nav className="flex-1 overflow-y-auto p-2">
          {NAV.map(({ to, label, icon: I }) => {
            const active = path.startsWith(to);
            return (
              <Link key={to} to={to} title={label}
                className={`group relative mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-all duration-200 focus-visible:outline-2 focus-visible:outline-ring ${active ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground" : "hover:translate-x-0.5 hover:bg-sidebar-accent/60"}`}>
                {active && <span className="brand-gradient absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full" />}
                <I className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-110 ${active ? "text-primary" : ""}`} />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-2">
          <button onClick={() => setCollapsed(!collapsed)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-sidebar-accent">
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /> Collapse</>}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur">
          <div className="md:hidden"><LogoMark /></div>
          <div className="relative hidden max-w-sm flex-1 sm:block">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search customers, transactions, disputes…" className="h-9 pl-8" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-1.5 text-xs text-muted-foreground lg:flex"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" /><span className="relative h-2 w-2 rounded-full bg-success" /></span>Systems nominal</span>
            <select value={env} onChange={(e) => setEnv(e.target.value)} className="h-8 rounded-md border bg-card px-2 text-xs">
              {["Development", "Staging", "Production"].map((e) => <option key={e}>{e}</option>)}
            </select>
            <Button size="icon" variant="ghost" onClick={toggleTheme} aria-label="Toggle theme"><Sun className="hidden h-4 w-4 dark:block" /><Moon className="h-4 w-4 dark:hidden" /></Button>
            <Button size="icon" variant="ghost" aria-label="Notifications"><Bell className="h-4 w-4" /></Button>
            <div className="hidden text-right sm:block">
              <p className="text-xs font-medium leading-tight">{user.email}</p>
              <p className="font-mono text-[10px] uppercase text-muted-foreground">{role}</p>
            </div>
            <Button size="icon" variant="ghost" onClick={signOut} aria-label="Sign out"><LogOut className="h-4 w-4" /></Button>
          </div>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b px-2 py-1.5 md:hidden">
          {NAV.map(({ to, label }) => (
            <Link key={to} to={to} className={`whitespace-nowrap rounded px-2 py-1 text-xs ${path.startsWith(to) ? "bg-accent" : "text-muted-foreground"}`}>{label}</Link>
          ))}
        </nav>
        <main className="surface-glow flex-1 p-4 md:p-6"><div key={path} className="animate-rise"><Outlet /></div></main>
      </div>
    </div>
  );
}
