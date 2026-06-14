import { cn } from "@/lib/utils";

type BadgeVariant =
  | "default"
  | "up"
  | "down"
  | "neutral"
  | "primary"
  | "gold"
  | "outline";

const variants: Record<BadgeVariant, string> = {
  default: "bg-white/5 text-content-secondary border-white/10",
  up: "bg-up/10 text-up border-up/20",
  down: "bg-down/10 text-down border-down/20",
  neutral: "bg-white/5 text-content-secondary border-white/10",
  primary: "bg-primary/15 text-primary border-primary/30",
  gold: "bg-gold/15 text-gold border-gold/30",
  outline: "bg-transparent text-content-secondary border-white/15",
};

export function Badge({
  variant = "default",
  className,
  children,
}: {
  variant?: BadgeVariant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
