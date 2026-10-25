"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AuthHeader({ title, description }: { title: string; description: ReactNode }) {
  return (
    <div className="grid gap-2">
      <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

// Announced to screen readers; shakes once on each new error so the change is noticed.
export function FormAlert({ message, tone = "error" }: { message?: string; tone?: "error" | "success" }) {
  return (
    <AnimatePresence initial={false} mode="popLayout">
      {message && (
        <motion.div
          key={message}
          role={tone === "error" ? "alert" : "status"}
          initial={{ opacity: 0, y: -6 }}
          animate={tone === "error" ? { opacity: 1, y: 0, x: [0, -6, 6, -4, 4, 0] } : { opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.4 }}
          className={cn(
            "flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm",
            tone === "error"
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-primary/30 bg-primary-soft text-primary-text",
          )}
        >
          {tone === "error" ? <AlertCircle className="mt-0.5 size-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" />}
          <span>{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function AuthFooter({ children }: { children: ReactNode }) {
  return <p className="text-center text-sm text-muted-foreground">{children}</p>;
}
