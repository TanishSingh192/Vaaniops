import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import orb from "@/assets/hero-orb.jpg";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — VaaniOps" },
      { name: "description", content: "Sign in to the VaaniOps operations console." },
      { property: "og:title", content: "Sign in — VaaniOps" },
      { property: "og:description", content: "Access the VaaniOps console." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) nav({ to: "/overview" }); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => { if (s) nav({ to: "/overview" }); });
    return () => data.subscription.unsubscribe();
  }, [nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
      if (error) toast.error(error.message);
      else toast.success("Check your email to confirm your account.");
    }
    setBusy(false);
  }

  async function oauth(p: "google" | "lovable") {
    const r = await lovable.auth.signInWithOAuth(p, { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error(String(r.error.message ?? r.error));
  }

  return (
    <div className="noise relative grid min-h-screen overflow-hidden bg-background lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r p-12 lg:flex">
        <div className="grid-bg absolute inset-0 [mask-image:radial-gradient(circle_at_center,black,transparent_75%)]" />
        <img src={orb} alt="" width={1408} height={1408} className="orb-bob absolute left-1/2 top-1/2 w-[85%] -translate-x-1/2 -translate-y-1/2 mix-blend-screen [mask-image:radial-gradient(circle,black_55%,transparent_72%)]" />
        <div className="relative" />
        <blockquote className="glass relative max-w-md rounded-2xl p-6">
          <p className="font-display text-xl leading-snug">"Mere card ko block kar do" — confirmed, frozen and audited in under ten seconds.</p>
          <p className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">VaaniOps · Live Operations</p>
        </blockquote>
      </aside>
      <div className="relative grid place-items-center px-4 py-12">
      <div className="animate-rise glass relative w-full max-w-sm rounded-3xl p-8">
        <Logo animated />
        <h1 className="mt-6 font-display text-2xl font-bold tracking-tight">{mode === "in" ? "Sign in to the console" : "Create a staff account"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">The first account becomes the administrator.</p>
        <div className="mt-6 grid gap-2">
          <Button variant="outline" onClick={() => oauth("google")}>Continue with Google</Button>
          <Button variant="outline" onClick={() => oauth("lovable")}>Continue with Lovable</Button>
        </div>
        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" />or<div className="h-px flex-1 bg-border" /></div>
        <form onSubmit={submit} className="grid gap-3">
          <div className="grid gap-1.5"><Label htmlFor="e">Work email</Label><Input id="e" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label htmlFor="p">Password</Label><Input id="p" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <Button type="submit" disabled={busy} className="shadow-glow transition-transform hover:-translate-y-0.5">{mode === "in" ? "Sign in" : "Create account"}</Button>
        </form>
        <button className="mt-4 text-sm text-muted-foreground hover:text-foreground" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "No account? Create one" : "Have an account? Sign in"}
        </button>
      </div>
      </div>
    </div>
  );
}
