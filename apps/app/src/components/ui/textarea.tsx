"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { useField } from "./field";
import { fieldSurface } from "./input";

// Grows with its content natively (field-sizing), capped by max-h, then scrolls.
export function Textarea({ className, id, ...props }: ComponentProps<"textarea">) {
  const field = useField();
  return (
    <textarea
      id={id ?? field?.id}
      aria-describedby={field?.describedBy}
      aria-invalid={field?.invalid || undefined}
      className={cn(fieldSurface, "min-h-24 max-h-64 resize-none px-3 py-2.5 [field-sizing:content]", className)}
      {...props}
    />
  );
}
