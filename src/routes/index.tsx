import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { scrollState } from "@/lib/scroll-state";
import { MorphMark } from "@/components/MorphMark";

const MorphScene = lazy(() => import("@/components/three/MorphScene"));
import secureCard from "@/assets/secure-card.jpg";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ArrowRight, Mic, ShieldCheck, Workflow, Languages, Zap, ScrollText } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VaaniOps — Don't just talk to your enterprise. Get things done." },
      { name: "description", content: "VaaniOps turns Hindi, Hinglish, Marathi and English speech into verified backend actions for banking operations." },
      { property: "og:title", content: "VaaniOps — Enterprise Voice Operations" },
      { property: "og:description", content: "Multilingual voice-to-action agent for BFSI operations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const LANGS = ["नमस्ते", "Hinglish", "मराठी", "English", "हिंदी"];
const STEPS = [
  { t: "Listen", d: "Prisma transcribes the caller in their own language." },
  { t: "Understand", d: "AI reasoning extracts intent, amount and merchant." },
  { t: "Act", d: "Allowlisted tools raise disputes or freeze cards." },
  { t: "Confirm", d: "Timbre speaks the outcome back — fully audited." },
];

function Wave() {
  return (
    <div className="flex h-24 items-center justify-center gap-1.5" aria-hidden>
      {Array.from({ length: 36 }).map((_, i) => (
        <span
          key={i}
          className="animate-wave w-1.5 rounded-full brand-gradient"
          style={{ height: `${20 + Math.abs(Math.sin(i * 0.55)) * 80}%`, animationDelay: `${(i % 9) * 0.11}s`, opacity: 0.45 + (i % 4) * 0.15 }}
        />
      ))}
    </div>
  );
}

function Tilt({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  function move(e: React.MouseEvent) {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(1100px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
  }
  return (
    <div ref={ref} onMouseMove={move} onMouseLeave={() => ref.current && (ref.current.style.transform = "")}
      className={`transition-transform duration-300 ease-out [transform-style:preserve-3d] ${className}`}>{children}</div>
  );
}

function useScrollStory() {
  const storyRef = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);
  useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - innerHeight;
        scrollState.progress = max > 0 ? Math.min(1, scrollY / max) : 0;
        const el = storyRef.current; if (!el) return;
        const r = el.getBoundingClientRect();
        const t = Math.min(0.999, Math.max(0, -r.top / (r.height - innerHeight)));
        setStep(Math.floor(t * STEPS.length));
      });
    };
    on(); addEventListener("scroll", on, { passive: true }); addEventListener("resize", on);
    return () => { removeEventListener("scroll", on); removeEventListener("resize", on); cancelAnimationFrame(raf); };
  }, []);
  return { storyRef, step };
}

function Index() {
  const { storyRef, step } = useScrollStory();
  return (
    <div className="noise relative min-h-screen overflow-x-clip bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[900px] bg-[radial-gradient(60%_50%_at_70%_30%,color-mix(in_oklab,var(--primary)_22%,transparent),transparent_70%)]" />
      <div className="grid-bg pointer-events-none absolute inset-0 h-[900px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />

      <div className="pointer-events-none fixed inset-y-0 right-0 z-0 w-full lg:w-[58%]" aria-hidden>
        <ClientOnly fallback={null}><Suspense fallback={null}><MorphScene /></Suspense></ClientOnly>
      </div>

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Logo animated />
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
          <a href="#platform" className="transition-colors hover:text-foreground">Platform</a>
          <a href="#trust" className="transition-colors hover:text-foreground">Security</a>
        </nav>
        <Button asChild size="sm" className="rounded-full px-5"><Link to="/auth">Sign in</Link></Button>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid max-w-7xl items-center gap-10 px-6 pt-10 pb-20 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
          <div>
            <div className="animate-rise glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs">
              <span className="relative flex h-2 w-2"><span className="absolute h-full w-full animate-ping rounded-full bg-primary opacity-70" /><span className="relative h-2 w-2 rounded-full bg-primary" /></span>
              Voice operations for Indian banking
            </div>
            <h1 className="animate-rise mt-7 font-display text-[clamp(2.75rem,6.5vw,5.75rem)] font-extrabold leading-[0.95] tracking-[-0.04em]" style={{ animationDelay: ".08s" }}>
              Your customers speak.<br /><span className="text-shimmer">The work gets done.</span>
            </h1>
            <p className="animate-rise mt-7 max-w-xl text-lg leading-relaxed text-muted-foreground" style={{ animationDelay: ".16s" }}>
              VaaniOps understands Hindi, Hinglish, Marathi and English, raises disputes and freezes cards through guarded tools, then confirms back in the caller's own voice.
            </p>
            <div className="animate-rise mt-10 flex flex-wrap items-center gap-4" style={{ animationDelay: ".24s" }}>
              <Button asChild size="lg" className="group h-12 rounded-full px-7 shadow-glow transition-transform hover:-translate-y-0.5">
                <Link to="/auth">Open the console <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
              </Button>
              <a href="#how" className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">See how it works</a>
            </div>
            <dl className="animate-rise mt-14 grid max-w-md grid-cols-3 gap-6 border-t pt-6" style={{ animationDelay: ".32s" }}>
              {[["4", "languages"], ["~2s", "to transcript"], ["100%", "audited"]].map(([v, l]) => (
                <div key={l}><dt className="font-display text-2xl font-bold">{v}</dt><dd className="text-xs text-muted-foreground">{l}</dd></div>
              ))}
            </dl>
          </div>

          <div className="relative mx-auto aspect-square w-full max-w-[560px]">
            <div className="glass animate-float absolute left-0 top-[14%] rounded-2xl px-4 py-3 text-sm">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Heard · Hinglish</p>
              <p className="mt-1 max-w-[210px] font-medium">"UPI se ₹4,000 kat gaye, payment nahi pahuncha"</p>
            </div>
            <div className="glass animate-float absolute bottom-[12%] right-0 rounded-2xl px-4 py-3 text-sm" style={{ animationDelay: "1.5s" }}>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Action</p>
              <p className="mt-1 flex items-center gap-2 font-medium"><span className="h-2 w-2 rounded-full bg-cyan" /> Dispute DSP-81F9 raised</p>
            </div>
          </div>
        </section>

        <section className="border-y bg-card/30 py-5">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-12 gap-y-3 px-6 font-display text-xl text-muted-foreground/70">
            {LANGS.map((l) => <span key={l}>{l}</span>)}
          </div>
        </section>

        <section id="how" ref={storyRef} className="relative" style={{ height: `${STEPS.length * 90 + 40}vh` }}>
          <div className="sticky top-0 flex h-screen items-center">
            <div className="mx-auto w-full max-w-7xl px-6">
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">How it works · scroll</p>
              <h2 className="mt-4 max-w-2xl font-display text-4xl font-bold tracking-tight md:text-5xl">From a sentence to a settled ticket.</h2>
              <div className="mt-12 grid max-w-xl gap-6">
                <div className="glass flex items-center gap-6 rounded-3xl p-6">
                  <MorphMark step={step} className="h-20 w-20 shrink-0 drop-shadow-[0_0_24px_color-mix(in_oklab,var(--primary)_60%,transparent)]" />
                  <div key={step} className="animate-rise">
                    <span className="font-mono text-xs text-primary">0{step + 1} / 0{STEPS.length}</span>
                    <h3 className="mt-1 font-display text-3xl font-bold">{STEPS[step]?.t}</h3>
                    <p className="mt-1 text-muted-foreground">{STEPS[step]?.d}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {STEPS.map((s, i) => (
                    <div key={s.t} className="h-1 flex-1 overflow-hidden rounded-full bg-border">
                      <div className="h-full brand-gradient transition-all duration-500" style={{ width: i <= step ? "100%" : "0%" }} />
                    </div>
                  ))}
                </div>
                <Wave />
              </div>
            </div>
          </div>
        </section>

        <section id="platform" className="relative mx-auto max-w-7xl px-6 py-28">
          <Tilt><div className="grid gap-4 md:grid-cols-6">
            <div id="trust" className="card-lift relative overflow-hidden rounded-3xl border bg-card md:col-span-3 md:row-span-2">
              <img src={secureCard} alt="Frosted glass bank card beside a glowing shield" loading="lazy" width={1024} height={1024} className="h-72 w-full object-cover md:h-96" />
              <div className="p-8">
                <ShieldCheck className="h-6 w-6 text-primary" />
                <h3 className="mt-4 font-display text-2xl font-bold">Guardrails before anything moves.</h3>
                <p className="mt-2 text-muted-foreground">Allowlisted tools, independent role checks and spoken confirmation before a card is frozen or money is reversed.</p>
              </div>
            </div>
            {[
              { i: Languages, t: "Native code-mixing", d: "Hinglish and regional speech, understood as people actually talk." },
              { i: Workflow, t: "Real workflows", d: "Failed UPI, duplicate debit and card freeze flows that write real records." },
              { i: Zap, t: "Seconds, not queues", d: "Resolution starts the moment the caller stops speaking." },
              { i: ScrollText, t: "Append-only audit", d: "Every intent, tool call and balance change, timestamped." },
            ].map(({ i: I, t, d }) => (
              <div key={t} className="card-lift group rounded-3xl border bg-card p-7 md:col-span-3 lg:col-span-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl brand-gradient text-primary-foreground shadow-glow transition-transform group-hover:-rotate-6 group-hover:scale-110">
                  <I className="h-5 w-5" />
                </div>
                <h3 className="mt-5 font-display text-lg font-bold">{t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{d}</p>
              </div>
            ))}
          </div></Tilt>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-28">
          <div className="relative overflow-hidden rounded-[2rem] brand-gradient p-12 text-primary-foreground md:p-16">
            <div className="grid-bg absolute inset-0 opacity-20" />
            <h2 className="relative max-w-2xl font-display text-4xl font-extrabold tracking-tight md:text-5xl">Let every customer be heard in their own language.</h2>
            <Button asChild size="lg" variant="secondary" className="relative mt-8 h-12 rounded-full px-7"><Link to="/auth">Get started <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
          </div>
        </section>
      </main>
      <footer className="relative border-t py-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 text-xs text-muted-foreground"><Logo /><span>© 2026 VaaniOps · Built for Indian banking</span></div>
      </footer>
    </div>
  );
}
