"use client";

import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { useId } from "react";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "./animated-number";
import { Card } from "./card";

type StatCardProps = {
  label: string;
  value: number;
  format?: Intl.NumberFormatOptions;
  /** Percent change vs previous period, e.g. 12.4 or -3.1. */
  delta?: number;
  icon?: LucideIcon;
  trend?: number[];
  className?: string;
};

export function StatCard({ label, value, format, delta, icon: Icon, trend, className }: StatCardProps) {
  const gradientId = useId();
  const up = (delta ?? 0) >= 0;
  const color = up ? "var(--chart-1)" : "var(--destructive)";

  return (
    <Card spotlight className={cn("group gap-3 pb-0 transition-transform duration-300 hover:-translate-y-0.5", className)}>
      <div className="relative flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        {Icon && (
          <span className="grid size-9 place-items-center rounded-xl bg-primary-soft text-primary-text ring-1 ring-primary/20 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
            <Icon className="size-4" />
          </span>
        )}
      </div>

      <div className="relative flex flex-wrap items-center gap-x-3 gap-y-2">
        <AnimatedNumber value={value} format={format} className="text-3xl font-semibold tracking-tight" />
        {delta !== undefined && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              up ? "bg-primary-soft text-primary-text" : "bg-destructive/12 text-destructive",
            )}
          >
            {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            <AnimatedNumber value={delta / 100} signed format={{ style: "percent", maximumFractionDigits: 1 }} />
          </span>
        )}
      </div>

      {trend && (
        // Bleeds to the card edges so the sparkline reads as the card's floor.
        <div aria-hidden className="relative -mx-6 h-14">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend.map((v, i) => ({ i, v }))} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area dataKey="v" type="monotone" stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} animationDuration={1200} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
