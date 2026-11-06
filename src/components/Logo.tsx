export function LogoMark({ className = "h-8 w-8", animated = false }: { className?: string; animated?: boolean }) {
  const bars = [10, 18, 24, 18, 10];
  return (
    <div className={`brand-gradient relative grid shrink-0 place-items-center rounded-[10px] shadow-glow ${className}`}>
      <div className="flex h-[58%] items-center gap-[12%] w-[62%] justify-center" aria-hidden>
        {bars.map((h, i) => (
          <span
            key={i}
            className={`block w-[14%] rounded-full bg-primary-foreground ${animated ? "animate-wave" : ""}`}
            style={{ height: `${(h / 24) * 100}%`, animationDelay: `${i * 0.12}s` }}
          />
        ))}
      </div>
    </div>
  );
}

export function Logo({ animated = false }: { animated?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark animated={animated} />
      <span className="font-display text-[17px] font-bold tracking-tight">
        Vaani<span className="text-brand">Ops</span>
      </span>
    </div>
  );
}
