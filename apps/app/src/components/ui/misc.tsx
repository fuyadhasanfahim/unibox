import type { LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Separator({ className, vertical, ...props }: ComponentProps<"div"> & { vertical?: boolean }) {
  return (
    <div
      role="separator"
      aria-orientation={vertical ? "vertical" : "horizontal"}
      className={cn(
        "shrink-0 bg-gradient-to-r from-transparent via-border to-transparent",
        vertical ? "h-full w-px bg-gradient-to-b" : "h-px w-full",
        className,
      )}
      {...props}
    />
  );
}

export function Kbd({ className, ...props }: ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-border bg-foreground/[0.05] px-1.5 font-mono text-[0.68rem] font-medium text-muted-foreground shadow-[inset_0_-1px_0_var(--border)]",
        className,
      )}
      {...props}
    />
  );
}

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn(
        "rounded-lg bg-[linear-gradient(90deg,var(--muted)_0%,color-mix(in_oklch,var(--muted),var(--foreground)_8%)_50%,var(--muted)_100%)] bg-[length:200%_100%] animate-shimmer",
        className,
      )}
      {...props}
    />
  );
}

type EmptyProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function Empty({ icon: Icon, title, description, action, className }: EmptyProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-12 text-center", className)}>
      <span className="relative grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary-text ring-1 ring-primary/20">
        <span aria-hidden className="absolute inset-0 animate-ping rounded-2xl bg-primary/10 [animation-duration:2.4s]" />
        <Icon className="relative size-6" />
      </span>
      <div className="grid gap-1">
        <p className="font-display text-base font-semibold">{title}</p>
        {description && <p className="max-w-xs text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
