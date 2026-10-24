"use client";

import { X } from "lucide-react";
import { Dialog as SheetPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn, focusRing } from "@/lib/utils";
import { DialogOverlay } from "./dialog";

export const Sheet = SheetPrimitive.Root;
export const SheetTrigger = SheetPrimitive.Trigger;
export const SheetClose = SheetPrimitive.Close;

// Right-side panel (filters, details, mobile nav).
export function SheetContent({ className, children, ...props }: ComponentProps<typeof SheetPrimitive.Content>) {
  return (
    <SheetPrimitive.Portal>
      <DialogOverlay />
      <SheetPrimitive.Content
        className={cn(
          "glass-strong fixed inset-y-2 right-2 z-50 flex w-[calc(100%-1rem)] max-w-md flex-col gap-5 rounded-2xl p-6",
          "data-[state=open]:animate-sheet-in data-[state=closed]:animate-sheet-out",
          className,
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close
          aria-label="Close"
          className={cn(
            "absolute right-4 top-4 grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-foreground/[0.07] hover:text-foreground",
            focusRing,
          )}
        >
          <X className="size-4" />
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

export function SheetTitle({ className, ...props }: ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title className={cn("font-display text-xl font-semibold", className)} {...props} />;
}

export function SheetDescription({ className, ...props }: ComponentProps<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description className={cn("text-sm text-muted-foreground", className)} {...props} />;
}
