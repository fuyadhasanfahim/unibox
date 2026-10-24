"use client";

import { endOfMonth, format, isSameDay, startOfMonth, subDays, subMonths } from "date-fns";
import { CalendarDays, X } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Calendar } from "./calendar";
import { useField } from "./field";
import { fieldSurface } from "./input";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export type { DateRange };

const DISPLAY = "MMM d, yyyy";

function Trigger({ label, placeholder, className }: { label?: string; placeholder: string; className?: string }) {
  const field = useField();
  return (
    <PopoverTrigger
      id={field?.id}
      aria-describedby={field?.describedBy}
      aria-invalid={field?.invalid || undefined}
      className={cn(fieldSurface, "flex h-10 items-center gap-2.5 px-3 text-left", !label && "text-muted-foreground/70", className)}
    >
      <CalendarDays aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      <span className="truncate">{label ?? placeholder}</span>
    </PopoverTrigger>
  );
}

type SingleProps = {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
};

export function DatePicker({ value, onChange, placeholder = "Pick a date", className }: SingleProps) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Trigger label={value && format(value, DISPLAY)} placeholder={placeholder} className={className} />
      <PopoverContent align="start" className="w-auto p-3">
        <Calendar
          mode="single"
          selected={value}
          defaultMonth={value}
          onSelect={(d) => {
            onChange(d);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

type MultipleProps = {
  value: Date[];
  onChange: (dates: Date[]) => void;
  max?: number;
  placeholder?: string;
  className?: string;
};

export function MultiDatePicker({ value, onChange, max, placeholder = "Pick dates", className }: MultipleProps) {
  const sorted = [...value].sort((a, b) => a.getTime() - b.getTime());
  const label = value.length
    ? value.length === 1
      ? format(value[0]!, DISPLAY)
      : `${value.length} dates selected`
    : undefined;

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <Trigger label={label} placeholder={placeholder} />
        <PopoverContent align="start" className="w-auto p-3">
          <Calendar mode="multiple" max={max} selected={value} onSelect={(d) => onChange(d ?? [])} />
        </PopoverContent>
      </Popover>
      {sorted.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Selected dates">
          {sorted.map((d) => (
            <li
              key={d.toISOString()}
              className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary-soft py-0.5 pl-2.5 pr-1 font-mono text-xs text-primary-text animate-pop-in"
            >
              {format(d, "MMM d")}
              <button
                type="button"
                aria-label={`Remove ${format(d, DISPLAY)}`}
                onClick={() => onChange(value.filter((x) => !isSameDay(x, d)))}
                className="grid size-4 place-items-center rounded-full transition hover:bg-primary/25"
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const PRESETS: { label: string; range: () => DateRange }[] = [
  { label: "Today", range: () => ({ from: new Date(), to: new Date() }) },
  { label: "Last 7 days", range: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
  { label: "Last 30 days", range: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
  { label: "This month", range: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  {
    label: "Last month",
    range: () => {
      const last = subMonths(new Date(), 1);
      return { from: startOfMonth(last), to: endOfMonth(last) };
    },
  },
];

// Rendered only while the popover is open, so `new Date()` never runs during prerender.
function RangePresets({ value, onPick }: { value?: DateRange; onPick: (range: DateRange) => void }) {
  return (
    <ul className="flex gap-1 overflow-x-auto sm:w-36 sm:flex-col sm:border-r sm:border-border sm:pr-3">
      {PRESETS.map((p) => {
        const r = p.range();
        const active = value?.from && value.to && isSameDay(value.from, r.from!) && isSameDay(value.to, r.to!);
        return (
          <li key={p.label}>
            <button
              type="button"
              onClick={() => onPick(r)}
              className={cn(
                "w-full whitespace-nowrap rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors",
                active ? "bg-primary-soft font-medium text-primary-text" : "text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

type RangeProps = {
  value?: DateRange;
  onChange: (range: DateRange | undefined) => void;
  placeholder?: string;
  className?: string;
};

// Two months side by side plus quick presets.
export function DateRangePicker({ value, onChange, placeholder = "Pick a date range", className }: RangeProps) {
  const [month, setMonth] = useState<Date | undefined>(value?.from);
  const label = value?.from
    ? value.to
      ? `${format(value.from, "MMM d")} – ${format(value.to, DISPLAY)}`
      : format(value.from, DISPLAY)
    : undefined;

  return (
    <Popover>
      <Trigger label={label} placeholder={placeholder} className={className} />
      <PopoverContent align="start" className="flex w-auto flex-col gap-3 p-3 sm:flex-row">
        <RangePresets
          value={value}
          onPick={(r) => {
            onChange(r);
            if (r.to) setMonth(subMonths(r.to, 1));
          }}
        />
        <Calendar mode="range" numberOfMonths={2} month={month} onMonthChange={setMonth} selected={value} onSelect={onChange} />
      </PopoverContent>
    </Popover>
  );
}
