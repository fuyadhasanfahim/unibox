"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type TooltipItem = { name?: string | number; value?: unknown; color?: string; dataKey?: unknown };

type ChartTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<TooltipItem>;
  label?: ReactNode;
  valueFormatter?: (value: number) => string;
};

// Glass tooltip for Recharts: pass as <Tooltip content={<ChartTooltip />} />.
export function ChartTooltip({ active, payload, label, valueFormatter = (v) => v.toLocaleString("en-US") }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong min-w-36 rounded-xl px-3 py-2.5 text-xs animate-pop-in">
      {label !== undefined && <p className="mb-1.5 font-medium text-foreground">{label}</p>}
      <ul className="grid gap-1">
        {payload.map((item) => (
          <li key={String(item.dataKey ?? item.name)} className="flex items-center gap-2">
            <span aria-hidden className="size-2 rounded-full" style={{ background: item.color }} />
            <span className="capitalize text-muted-foreground">{item.name}</span>
            <span className="ml-auto font-mono font-medium tabular-nums text-foreground">
              {typeof item.value === "number" ? valueFormatter(item.value) : String(item.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Shared axis/grid styling so every chart reads the same.
export const axisProps = {
  stroke: "var(--muted-foreground)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
  tickMargin: 10,
} as const;

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

// Y axis with short labels (2.4K) so ticks never clip at the chart edge.
export const yAxisProps = {
  ...axisProps,
  width: 40,
  tickFormatter: (v: number) => compact.format(v),
} as const;

export const gridProps = {
  stroke: "var(--border)",
  strokeDasharray: "3 6",
  vertical: false,
} as const;

export function ChartLegend({ items, className }: { items: { label: string; color: string }[]; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-4 text-xs text-muted-foreground", className)}>
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-full" style={{ background: i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
