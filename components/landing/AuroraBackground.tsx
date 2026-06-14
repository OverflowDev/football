/**
 * Fixed, subtle animated backdrop for the landing page: three slow-drifting
 * gradient blobs, a faint grid, a radial vignette and a touch of film grain.
 * Pure CSS — cheap, and disabled under prefers-reduced-motion.
 */
export function AuroraBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
      {/* drifting color blobs */}
      <div className="absolute -left-40 -top-40 h-[40rem] w-[40rem] animate-aurora-1 rounded-full bg-primary/25 blur-[140px]" />
      <div className="absolute -right-40 top-1/3 h-[34rem] w-[34rem] animate-aurora-2 rounded-full bg-emerald-500/20 blur-[150px]" />
      <div className="absolute -bottom-48 left-1/4 h-[34rem] w-[34rem] animate-aurora-1 rounded-full bg-fuchsia-500/15 blur-[150px] [animation-delay:-8s]" />

      {/* faint grid */}
      <div className="bg-grid absolute inset-0 opacity-60" />

      {/* vignette so edges fade to near-black */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,transparent,#0a0a0f_78%)]" />

      {/* grain */}
      <div className="grain absolute inset-0 opacity-[0.035]" />
    </div>
  );
}
