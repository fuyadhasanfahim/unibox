"use client";

import { motion } from "motion/react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { createContext, useContext, useId, useState, type ComponentProps } from "react";
import { cn, focusRing } from "@/lib/utils";

const TabsContext = createContext<{ value?: string; layoutId: string }>({ layoutId: "tabs" });

// Tracks the active value so the indicator can glide between triggers (shared layoutId).
export function Tabs({ value, defaultValue, onValueChange, ...props }: ComponentProps<typeof TabsPrimitive.Root>) {
  const [internal, setInternal] = useState(defaultValue);
  const active = value ?? internal;
  const layoutId = useId();

  return (
    <TabsContext.Provider value={{ value: active, layoutId }}>
      <TabsPrimitive.Root
        value={active}
        onValueChange={(v) => {
          setInternal(v);
          onValueChange?.(v);
        }}
        {...props}
      />
    </TabsContext.Provider>
  );
}

export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn("glass inline-flex h-11 w-fit items-center gap-1 rounded-xl p-1", className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, children, value, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  const ctx = useContext(TabsContext);
  const active = ctx.value === value;

  return (
    <TabsPrimitive.Trigger
      value={value}
      className={cn(
        "relative inline-flex h-full items-center gap-2 rounded-lg px-3.5 text-sm font-medium text-muted-foreground transition-colors",
        "hover:text-foreground data-[state=active]:text-primary-foreground [&_svg]:size-4",
        focusRing,
        className,
      )}
      {...props}
    >
      {active && (
        <motion.span
          layoutId={ctx.layoutId}
          className="absolute inset-0 rounded-lg bg-primary shadow-[inset_0_1px_0_oklch(1_0_0/0.4),0_4px_14px_-4px_oklch(0.841_0.238_128.9/0.6)]"
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
        />
      )}
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </TabsPrimitive.Trigger>
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn("mt-4 outline-none data-[state=active]:animate-fade-in", className)}
      {...props}
    />
  );
}
