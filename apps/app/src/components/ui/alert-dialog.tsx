"use client";

import { AlertDialog as AlertPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";

// For destructive confirmations: no outside-click dismiss, focus lands on Cancel.
export const AlertDialog = AlertPrimitive.Root;
export const AlertDialogTrigger = AlertPrimitive.Trigger;

export function AlertDialogContent({ className, ...props }: ComponentProps<typeof AlertPrimitive.Content>) {
  return (
    <AlertPrimitive.Portal>
      <AlertPrimitive.Overlay className="fixed inset-0 z-50 bg-stone-950/50 backdrop-blur-[3px] data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out" />
      <AlertPrimitive.Content
        className={cn(
          "glass-strong fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-5 rounded-2xl p-6",
          "data-[state=open]:animate-dialog-in data-[state=closed]:animate-dialog-out",
          className,
        )}
        {...props}
      />
    </AlertPrimitive.Portal>
  );
}

export function AlertDialogHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("grid gap-1.5", className)} {...props} />;
}

export function AlertDialogFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />;
}

export function AlertDialogTitle({ className, ...props }: ComponentProps<typeof AlertPrimitive.Title>) {
  return <AlertPrimitive.Title className={cn("font-display text-lg font-semibold", className)} {...props} />;
}

export function AlertDialogDescription({ className, ...props }: ComponentProps<typeof AlertPrimitive.Description>) {
  return <AlertPrimitive.Description className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function AlertDialogCancel({ className, ...props }: ComponentProps<typeof AlertPrimitive.Cancel>) {
  return <AlertPrimitive.Cancel className={cn(buttonVariants({ variant: "outline" }), className)} {...props} />;
}

export function AlertDialogAction({ className, ...props }: ComponentProps<typeof AlertPrimitive.Action>) {
  return <AlertPrimitive.Action className={cn(buttonVariants({ variant: "destructive" }), className)} {...props} />;
}
