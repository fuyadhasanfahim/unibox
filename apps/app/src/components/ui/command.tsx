"use client";

import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";
import { Dialog as DialogPrimitive, VisuallyHidden } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DialogOverlay } from "./dialog";

export function Command({ className, ...props }: ComponentProps<typeof CommandPrimitive>) {
  return <CommandPrimitive className={cn("flex h-full w-full flex-col overflow-hidden", className)} {...props} />;
}

export function CommandInput({ className, ...props }: ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div className="flex items-center gap-2.5 border-b border-border px-4">
      <Search aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      <CommandPrimitive.Input
        className={cn(
          "h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70",
          className,
        )}
        {...props}
      />
    </div>
  );
}

export function CommandList({ className, ...props }: ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      className={cn(
        "max-h-80 overflow-y-auto overscroll-contain p-1.5 transition-[height] duration-200 h-(--cmdk-list-height)",
        className,
      )}
      {...props}
    />
  );
}

export function CommandEmpty(props: ComponentProps<typeof CommandPrimitive.Empty>) {
  return <CommandPrimitive.Empty className="py-10 text-center text-sm text-muted-foreground" {...props} />;
}

export function CommandGroup({ className, ...props }: ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      className={cn(
        "[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function CommandItem({ className, ...props }: ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      className={cn(
        "relative flex cursor-default select-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none",
        "data-[selected=true]:bg-primary-soft data-[selected=true]:text-foreground data-[disabled=true]:opacity-50",
        "[&_svg]:size-4 [&_svg]:text-muted-foreground data-[selected=true]:[&_svg]:text-primary-text",
        className,
      )}
      {...props}
    />
  );
}

export function CommandSeparator({ className, ...props }: ComponentProps<typeof CommandPrimitive.Separator>) {
  return <CommandPrimitive.Separator className={cn("-mx-1.5 my-1 h-px bg-border", className)} {...props} />;
}

type CommandDialogProps = ComponentProps<typeof DialogPrimitive.Root> & {
  title?: string;
  children: ReactNode;
};

// ⌘K palette: cmdk inside a Radix dialog (focus trap, Esc, aria handled by Radix).
export function CommandDialog({ title = "Command palette", children, ...props }: CommandDialogProps) {
  return (
    <DialogPrimitive.Root {...props}>
      <DialogPrimitive.Portal>
        <DialogOverlay />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="glass-strong fixed left-1/2 top-[18%] z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl data-[state=open]:animate-pop-in data-[state=closed]:animate-pop-out"
        >
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
          </VisuallyHidden.Root>
          <Command loop>{children}</Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
