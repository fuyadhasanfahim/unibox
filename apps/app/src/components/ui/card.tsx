"use client";

import type { ComponentProps, PointerEvent } from "react";
import { cn } from "@/lib/utils";

type CardProps = ComponentProps<"div"> & {
  /** Lime glow that follows the cursor. Use on interactive or hero cards only. */
  spotlight?: boolean;
};

function trackPointer(e: PointerEvent<HTMLDivElement>) {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
  e.currentTarget.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
}

export function Card({ className, spotlight, onPointerMove, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      onPointerMove={
        spotlight
          ? (e) => {
              trackPointer(e);
              onPointerMove?.(e);
            }
          : onPointerMove
      }
      className={cn(
        "glass relative flex flex-col gap-5 overflow-hidden rounded-2xl p-6",
        spotlight && [
          "before:pointer-events-none before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-500 hover:before:opacity-100",
          "before:bg-[radial-gradient(22rem_circle_at_var(--spot-x)_var(--spot-y),oklch(0.841_0.238_128.9/0.12),transparent_60%)]",
        ],
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("grid gap-1.5", className)} {...props} />;
}

export function CardTitle({ className, ...props }: ComponentProps<"h3">) {
  return <h3 className={cn("font-display text-lg font-semibold tracking-tight", className)} {...props} />;
}

export function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("relative", className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("relative flex items-center gap-2", className)} {...props} />;
}
