"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ComponentProps } from "react";
import { DayPicker } from "react-day-picker";
import { cn, focusRing } from "@/lib/utils";

const navButton = cn(
  "grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-foreground/[0.07] hover:text-foreground disabled:opacity-30",
  focusRing,
);

// Fully themed DayPicker (no library CSS). Modifier classes land on the day cell; we style its button.
export function Calendar({ className, classNames, showOutsideDays = true, ...props }: ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("relative w-fit p-1", className)}
      classNames={{
        months: "relative flex flex-col gap-6 sm:flex-row",
        month: "flex flex-col gap-3",
        month_caption: "flex h-8 items-center justify-center",
        caption_label: "font-display text-sm font-semibold",
        nav: "absolute inset-x-1 top-1 z-10 flex items-center justify-between",
        button_previous: navButton,
        button_next: navButton,
        month_grid: "border-collapse",
        weekdays: "",
        weekday: "size-9 text-[0.68rem] font-medium uppercase tracking-wide text-muted-foreground",
        week: "",
        day: "group/day relative size-9 p-0 text-center text-sm",
        day_button: cn(
          "relative z-10 size-9 rounded-lg font-mono text-[0.8rem] tabular-nums transition-[background-color,color,transform] duration-150",
          "hover:bg-foreground/[0.08] active:scale-90",
          focusRing,
        ),
        today:
          "[&>button]:font-semibold [&>button]:text-primary-text [&>button]:after:absolute [&>button]:after:bottom-1 [&>button]:after:left-1/2 [&>button]:after:size-1 [&>button]:after:-translate-x-1/2 [&>button]:after:rounded-full [&>button]:after:bg-primary",
        selected:
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:font-semibold [&>button]:shadow-[0_4px_14px_-4px_oklch(0.841_0.238_128.9/0.7)] [&>button]:hover:bg-primary-hover [&>button]:after:bg-primary-foreground",
        range_start: "rounded-l-lg bg-primary-soft",
        range_end: "rounded-r-lg bg-primary-soft",
        range_middle:
          "bg-primary-soft [&>button]:bg-transparent! [&>button]:text-foreground! [&>button]:shadow-none! [&>button]:font-normal!",
        outside: "[&>button]:text-muted-foreground/40",
        disabled: "[&>button]:pointer-events-none [&>button]:opacity-30",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: c }) =>
          orientation === "left" ? <ChevronLeft className={cn("size-4", c)} /> : <ChevronRight className={cn("size-4", c)} />,
      }}
      {...props}
    />
  );
}
