export function LiveBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-background"
    >
      <div
        className="animate-grid absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, #EAE5DC 1px, transparent 1px), linear-gradient(to bottom, #EAE5DC 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="animate-orb-1 absolute -right-20 -top-20 h-[60vh] w-[60vw] rounded-full bg-accent-primary/20 blur-[100px]" />
      <div className="animate-orb-2 absolute -bottom-40 -left-20 h-[70vh] w-[50vw] rounded-full bg-accent-secondary/15 blur-[110px]" />
      <div className="animate-orb-1 absolute left-1/3 top-1/3 h-[30vh] w-[30vw] rounded-full bg-accent-primary/10 blur-[90px]" />
    </div>
  );
}
