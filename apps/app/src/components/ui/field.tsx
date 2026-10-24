"use client";

import { AnimatePresence, motion } from "motion/react";
import { createContext, useContext, useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Label } from "./label";

type FieldContextValue = { id: string; describedBy?: string; invalid: boolean };

const FieldContext = createContext<FieldContextValue | null>(null);

// Controls inside a Field pick up id, aria-describedby and aria-invalid automatically.
export function useField() {
  return useContext(FieldContext);
}

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
};

export function Field({ label, hint, error, required, className, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;

  return (
    <FieldContext.Provider value={{ id, describedBy, invalid: Boolean(error) }}>
      <div className={cn("grid gap-2", className)}>
        <Label htmlFor={id}>
          {label}
          {required && (
            <span aria-hidden className="ml-0.5 text-primary-text">
              *
            </span>
          )}
        </Label>
        {children}
        {hint && !error && (
          <p id={hintId} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )}
        <AnimatePresence initial={false}>
          {error && (
            <motion.p
              id={errorId}
              role="alert"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-xs font-medium text-destructive"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </FieldContext.Provider>
  );
}
