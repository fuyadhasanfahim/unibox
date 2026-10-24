import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn, focusRing } from "@/lib/utils";
import { Spinner } from "./spinner";

export const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap font-medium",
    "transition-[background-color,color,box-shadow,transform,border-color] duration-200 ease-out",
    "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    focusRing,
  ],
  {
    variants: {
      variant: {
        primary: [
          "bg-primary text-primary-foreground",
          "shadow-[inset_0_1px_0_0_oklch(1_0_0/0.45),0_1px_2px_oklch(0_0_0/0.2),0_0_0_1px_oklch(0.648_0.2_131.7/0.5)]",
          "hover:bg-primary-hover hover:shadow-[inset_0_1px_0_0_oklch(1_0_0/0.5),0_8px_24px_-6px_oklch(0.841_0.238_128.9/0.55),0_0_0_1px_oklch(0.648_0.2_131.7/0.5)]",
        ],
        glass: "glass text-foreground hover:bg-foreground/[0.06]",
        outline: "border border-border bg-transparent hover:border-foreground/20 hover:bg-foreground/[0.04]",
        ghost: "text-foreground hover:bg-foreground/[0.06]",
        destructive:
          "bg-[oklch(0.577_0.245_27.3)] text-white shadow-[inset_0_1px_0_0_oklch(1_0_0/0.25)] hover:bg-[oklch(0.505_0.213_27.5)]",
        link: "text-primary-text underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        sm: "h-8 rounded-md px-3 text-xs",
        md: "h-10 rounded-lg px-4 text-sm",
        lg: "h-12 rounded-xl px-6 text-base",
        icon: "size-10 rounded-lg",
        "icon-sm": "size-8 rounded-md",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  asChild,
  loading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && <Spinner />}
          {children}
        </>
      )}
    </Comp>
  );
}
