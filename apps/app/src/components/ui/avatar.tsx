"use client";

import { Avatar as AvatarPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type AvatarProps = ComponentProps<typeof AvatarPrimitive.Root> & {
  src?: string;
  alt: string;
  /** Online/presence dot. */
  status?: "online" | "away";
};

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function Avatar({ src, alt, status, className, ...props }: AvatarProps) {
  return (
    <span className="relative inline-flex shrink-0">
      <AvatarPrimitive.Root
        className={cn(
          "relative inline-flex size-9 overflow-hidden rounded-full bg-muted ring-2 ring-background",
          className,
        )}
        {...props}
      >
        {src && <AvatarPrimitive.Image src={src} alt={alt} className="size-full object-cover" />}
        <AvatarPrimitive.Fallback
          delayMs={src ? 300 : 0}
          className="grid size-full place-items-center bg-gradient-to-br from-primary/40 to-chart-5/30 text-xs font-semibold text-foreground"
        >
          {initials(alt)}
        </AvatarPrimitive.Fallback>
      </AvatarPrimitive.Root>
      {status && (
        <span
          aria-label={status}
          className={cn(
            "absolute bottom-0 right-0 size-2.5 rounded-full ring-2 ring-background",
            status === "online" ? "bg-primary" : "bg-warning",
          )}
        />
      )}
    </span>
  );
}

// Overlapping stack that fans out on hover.
export function AvatarGroup({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "group/avatars flex -space-x-2.5 transition-all [&>*]:transition-[margin] [&>*]:duration-300 hover:-space-x-1",
        className,
      )}
      {...props}
    />
  );
}
