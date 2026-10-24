"use client";

import { MotionConfig } from "motion/react";
import { ThemeProvider } from "next-themes";
import { Tooltip } from "radix-ui";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      {/* "user" respects prefers-reduced-motion for every motion component. */}
      <MotionConfig reducedMotion="user">
        <Tooltip.Provider delayDuration={250} skipDelayDuration={150}>
          {children}
          <Toaster />
        </Tooltip.Provider>
      </MotionConfig>
    </ThemeProvider>
  );
}
