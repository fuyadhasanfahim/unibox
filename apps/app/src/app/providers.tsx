"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { ThemeProvider } from "next-themes";
import { Tooltip } from "radix-ui";
import { useState, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { ApiError } from "@/lib/api";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // 4xx answers are final (permission, not found, validation); only retry transient failures.
        retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
      },
    },
  });
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
        {/* "user" respects prefers-reduced-motion for every motion component. */}
        <MotionConfig reducedMotion="user">
          <Tooltip.Provider delayDuration={250} skipDelayDuration={150}>
            {children}
            <Toaster />
          </Tooltip.Provider>
        </MotionConfig>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
