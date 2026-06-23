import { cn } from "@/lib/utils";

/**
 * soka brand mark — an upward price-chart line launching into a football
 * ("the ball is going up"), on an indigo→emerald gradient tile.
 */
export function SokaMark({ size = 32, className }: { size?: number; className?: string }) {
  const gid = "soka-bg";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#22c55e" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill={`url(#${gid})`} />
      <path
        d="M10 34 L19 27 L26 31 L36 17"
        stroke="#ffffff"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="36" cy="17" r="5.4" fill="#ffffff" />
      <path d="M36 13.6 L38.85 15.67 L37.76 19.02 L34.24 19.02 L33.15 15.67 Z" fill="#0a0a0f" />
    </svg>
  );
}

/** Full logo: mark + "soka" wordmark. */
export function SokaLogo({
  size = 32,
  className,
  showWord = true,
}: {
  size?: number;
  className?: string;
  showWord?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <SokaMark size={size} />
      {showWord && (
        <span className="font-display text-lg font-bold lowercase tracking-tight text-content">
          soka
        </span>
      )}
    </span>
  );
}
