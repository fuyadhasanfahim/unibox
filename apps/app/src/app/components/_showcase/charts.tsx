"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { axisProps, ChartLegend, ChartTooltip, gridProps, yAxisProps } from "@/components/ui/chart";
import { channelShare, monthlyConversations, responseTime } from "@/lib/demo-data";
import { Section } from "./shell";

const SERIES = [
  { key: "whatsapp", label: "WhatsApp", color: "var(--chart-1)" },
  { key: "instagram", label: "Instagram", color: "var(--chart-5)" },
  { key: "messenger", label: "Messenger", color: "var(--chart-4)" },
] as const;

const cursor = { stroke: "var(--primary)", strokeOpacity: 0.4, strokeDasharray: "4 4" };

export function Charts() {
  return (
    <Section
      id="charts"
      title="Charts"
      description="Recharts with our tokens: one lime hero series, quiet supporting colours, dashed grid and a glass tooltip."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="sm:flex sm:items-end sm:justify-between">
            <div className="grid gap-1.5">
              <CardTitle>Conversations by channel</CardTitle>
              <CardDescription>Last 12 months</CardDescription>
            </div>
            <ChartLegend items={SERIES.map((s) => ({ label: s.label, color: s.color }))} />
          </CardHeader>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyConversations} margin={{ left: 0, right: 8, top: 8 }}>
                <defs>
                  {SERIES.map((s) => (
                    <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={s.color} stopOpacity={s.key === "whatsapp" ? 0.45 : 0.18} />
                      <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis {...yAxisProps} />
                <Tooltip content={<ChartTooltip />} cursor={cursor} />
                {[...SERIES].reverse().map((s) => (
                  <Area
                    key={s.key}
                    dataKey={s.key}
                    name={s.label}
                    type="monotone"
                    stroke={s.color}
                    strokeWidth={s.key === "whatsapp" ? 2.5 : 1.5}
                    fill={`url(#fill-${s.key})`}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--background)" }}
                    animationDuration={1400}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Channel share</CardTitle>
            <CardDescription>Conversations this month</CardDescription>
          </CardHeader>
          <div className="relative h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<ChartTooltip valueFormatter={(v) => `${v}%`} />} />
                <Pie
                  data={channelShare}
                  dataKey="value"
                  nameKey="channel"
                  innerRadius="68%"
                  outerRadius="92%"
                  paddingAngle={3}
                  cornerRadius={6}
                  stroke="none"
                  animationDuration={1200}
                >
                  {channelShare.map((s) => (
                    <Cell key={s.channel} fill={s.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
              <AnimatedNumber value={5392} className="font-display text-3xl font-bold" />
              <span className="text-xs text-muted-foreground">total</span>
            </div>
          </div>
          <ChartLegend className="justify-center" items={SERIES.map((s) => ({ label: s.label, color: s.color }))} />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>First reply time</CardTitle>
            <CardDescription>Minutes, this week</CardDescription>
          </CardHeader>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={responseTime} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="day" {...axisProps} />
                <YAxis {...yAxisProps} />
                <Tooltip content={<ChartTooltip valueFormatter={(v) => `${v} min`} />} cursor={cursor} />
                <Line
                  dataKey="minutes"
                  name="Reply time"
                  type="monotone"
                  stroke="var(--chart-1)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "var(--background)", stroke: "var(--chart-1)", strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: "var(--chart-1)", stroke: "var(--background)", strokeWidth: 2 }}
                  animationDuration={1400}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly volume</CardTitle>
            <CardDescription>Stacked by channel</CardDescription>
          </CardHeader>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyConversations} margin={{ left: 0, right: 8, top: 8 }} barCategoryGap="28%">
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis {...yAxisProps} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--foreground)", fillOpacity: 0.04 }} />
                {SERIES.map((s, i) => (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    name={s.label}
                    stackId="a"
                    fill={s.color}
                    radius={i === SERIES.length - 1 ? [6, 6, 0, 0] : 0}
                    animationDuration={1000}
                    animationBegin={i * 150}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </Section>
  );
}
