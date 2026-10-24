"use client";

import { ScrollArea as ScrollPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type ScrollAreaProps = ComponentProps<typeof ScrollPrimitive.Root> & {
  /** Fade content into the edges instead of a hard cut. */
  fade?: boolean;
  orientation?: "vertical" | "horizontal" | "both";
};

export function ScrollArea({ className, children, fade, orientation = "vertical", ...props }: ScrollAreaProps) {
  return (
    <ScrollPrimitive.Root type="hover" scrollHideDelay={500} className={cn("relative overflow-hidden", className)} {...props}>
      <ScrollPrimitive.Viewport
        className={cn(
          "size-full rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
          fade && "[mask-image:linear-gradient(to_bottom,transparent,black_24px,black_calc(100%-24px),transparent)]",
        )}
      >
        {children}
      </ScrollPrimitive.Viewport>
      {orientation !== "horizontal" && <ScrollBar orientation="vertical" />}
      {orientation !== "vertical" && <ScrollBar orientation="horizontal" />}
      <ScrollPrimitive.Corner />
    </ScrollPrimitive.Root>
  );
}

function ScrollBar({ orientation }: { orientation: "vertical" | "horizontal" }) {
  return (
    <ScrollPrimitive.Scrollbar
      orientation={orientation}
      className={cn(
        "group/bar flex touch-none select-none p-0.5 transition-[width,height,opacity] duration-200",
        "data-[state=hidden]:opacity-0 data-[state=visible]:animate-fade-in",
        orientation === "vertical" ? "h-full w-2 hover:w-3" : "h-2 flex-col hover:h-3",
      )}
    >
      <ScrollPrimitive.Thumb className="relative flex-1 rounded-full bg-foreground/25 transition-colors group-hover/bar:bg-primary active:bg-primary" />
    </ScrollPrimitive.Scrollbar>
  );
}
