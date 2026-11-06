// SVG mark that morphs between step shapes. Every shape has the same 8 points so the
// browser can interpolate the path smoothly via the CSS `d` transition.
const SHAPES = [
  "M50 10 L78 22 L90 50 L78 78 L50 90 L22 78 L10 50 L22 22 Z", // listen: circle-ish
  "M50 8 L64 36 L92 50 L64 64 L50 92 L36 64 L8 50 L36 36 Z", // understand: spark
  "M20 20 L50 20 L80 20 L80 50 L80 80 L50 80 L20 80 L20 50 Z", // act: square
  "M14 52 L26 40 L38 52 L44 58 L62 34 L86 14 L92 22 L44 78 Z", // confirm: tick
];

export function MorphMark({ step, className = "" }: { step: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <defs>
        <linearGradient id="mm-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--primary)" />
          <stop offset="1" stopColor="var(--cyan)" />
        </linearGradient>
      </defs>
      <path d={SHAPES[step % SHAPES.length]} fill="url(#mm-g)"
        style={{ transition: "d 700ms cubic-bezier(.7,0,.2,1)", d: `path("${SHAPES[step % SHAPES.length]}")` } as React.CSSProperties} />
    </svg>
  );
}
