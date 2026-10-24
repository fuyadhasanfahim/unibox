"use client";

import { Check, Minus } from "lucide-react";
import { Checkbox as CheckboxPrimitive, RadioGroup as RadioPrimitive, Slider as SliderPrimitive, Switch as SwitchPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn, focusRing } from "@/lib/utils";

export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "peer grid size-[18px] shrink-0 place-items-center rounded-[5px] border border-foreground/25 bg-input",
        "transition-[background-color,border-color,transform] duration-150 active:scale-90",
        "hover:border-foreground/40",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
        "data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground",
        "disabled:cursor-not-allowed disabled:opacity-50",
        focusRing,
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="animate-pop-in [--pop-y:0px]">
        {props.checked === "indeterminate" ? (
          <Minus className="size-3.5" strokeWidth={3} />
        ) : (
          <Check className="size-3.5" strokeWidth={3} />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent p-0.5",
        "bg-foreground/15 transition-colors duration-200",
        "data-[state=checked]:bg-primary data-[state=checked]:shadow-[0_0_16px_-2px_oklch(0.841_0.238_128.9/0.6)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        focusRing,
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "block size-5 rounded-full bg-white shadow-[0_2px_6px_oklch(0_0_0/0.3)]",
          "transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          "data-[state=checked]:translate-x-5",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export function RadioGroup({ className, ...props }: ComponentProps<typeof RadioPrimitive.Root>) {
  return <RadioPrimitive.Root className={cn("grid gap-3", className)} {...props} />;
}

export function RadioGroupItem({ className, ...props }: ComponentProps<typeof RadioPrimitive.Item>) {
  return (
    <RadioPrimitive.Item
      className={cn(
        "peer grid size-[18px] shrink-0 place-items-center rounded-full border border-foreground/25 bg-input",
        "transition-[border-color] hover:border-foreground/40 data-[state=checked]:border-primary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        focusRing,
        className,
      )}
      {...props}
    >
      <RadioPrimitive.Indicator className="size-2.5 rounded-full bg-primary shadow-[0_0_8px_oklch(0.841_0.238_128.9/0.7)] animate-pop-in [--pop-y:0px]" />
    </RadioPrimitive.Item>
  );
}

export function Slider({ className, ...props }: ComponentProps<typeof SliderPrimitive.Root>) {
  const thumbs = (props.value ?? props.defaultValue ?? [0]).length;
  return (
    <SliderPrimitive.Root
      className={cn("relative flex w-full touch-none select-none items-center py-2", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-foreground/12">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-primary" />
      </SliderPrimitive.Track>
      {Array.from({ length: thumbs }, (_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          aria-label={thumbs > 1 ? (i === 0 ? "Minimum" : "Maximum") : undefined}
          className={cn(
            "block size-5 rounded-full border-2 border-primary bg-background shadow-[0_2px_8px_oklch(0_0_0/0.25)]",
            "transition-transform duration-150 hover:scale-110 active:scale-95",
            focusRing,
          )}
        />
      ))}
    </SliderPrimitive.Root>
  );
}
