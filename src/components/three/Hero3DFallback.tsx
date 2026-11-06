export function Hero3DFallback() {
  return (
    <div
      className="relative mx-auto aspect-square w-full max-w-[34rem] overflow-hidden rounded-full"
      role="img"
      aria-label="Abstract illustration of an amber glass financial orb surrounded by orbital rings"
    >
      <div className="absolute inset-[8%] rounded-full bg-[radial-gradient(circle_at_36%_30%,#fff_0%,#f9e8d9_32%,#f4d0b4_53%,#ead2bd_68%,transparent_69%)] opacity-90 blur-[1px]" />
      <div className="absolute inset-[20%] rounded-full border border-white/80 bg-white/25 shadow-[inset_0_0_50px_rgba(255,255,255,0.8),0_20px_80px_rgba(185,95,61,0.14)] backdrop-blur-md" />
      <div className="absolute left-[39%] top-[35%] size-[23%] rounded-full bg-[radial-gradient(circle_at_35%_30%,#ffd1a5,#d97745_65%,#a8482f)] shadow-[0_0_65px_rgba(217,119,69,0.55)]" />
      <div className="absolute inset-[12%] rotate-[-28deg] rounded-[50%] border border-accent-secondary/30" />
      <div className="absolute inset-[18%] rotate-[35deg] rounded-[50%] border border-white/80" />
      <div className="absolute right-[20%] top-[24%] size-3 rounded-full bg-white shadow-[0_0_18px_6px_rgba(217,119,69,0.35)]" />
      <div className="absolute bottom-[24%] left-[20%] size-2 rounded-full bg-accent-primary/70" />
      <span className="absolute bottom-[12%] left-1/2 -translate-x-1/2 text-xs font-medium tracking-wide text-ink-muted">
        FINANCIAL CLARITY, IN MOTION
      </span>
    </div>
  );
}
