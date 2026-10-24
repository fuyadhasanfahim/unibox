"use client";

import { Plus } from "lucide-react";
import { Accordion as AccordionPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn, focusRing } from "@/lib/utils";

export const Accordion = AccordionPrimitive.Root;

export function AccordionItem({ className, ...props }: ComponentProps<typeof AccordionPrimitive.Item>) {
  return <AccordionPrimitive.Item className={cn("border-b border-border last:border-b-0", className)} {...props} />;
}

export function AccordionTrigger({ className, children, ...props }: ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className={cn(
          "group flex flex-1 items-center justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-colors hover:text-primary-text",
          focusRing,
          className,
        )}
        {...props}
      >
        {children}
        <span className="grid size-6 shrink-0 place-items-center rounded-full border border-border transition-all duration-300 group-data-[state=open]:rotate-45 group-data-[state=open]:border-primary/40 group-data-[state=open]:bg-primary-soft group-data-[state=open]:text-primary-text">
          <Plus className="size-3.5" />
        </span>
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export function AccordionContent({ className, children, ...props }: ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      className="overflow-hidden text-sm text-muted-foreground data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up"
      {...props}
    >
      <div className={cn("pb-4", className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
}
