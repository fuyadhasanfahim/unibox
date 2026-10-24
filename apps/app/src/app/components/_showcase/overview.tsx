"use client";

import { DollarSign, MessagesSquare, Plus, Timer, Users } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { Demo, Section } from "./shell";

const SWATCHES = [
  { name: "Lime 400", token: "--primary", note: "Primary, actions, focus", className: "bg-primary text-primary-foreground" },
  { name: "Lime soft", token: "--primary-soft", note: "Selected, badges", className: "bg-primary-soft text-primary-text" },
  { name: "Stone 950", token: "--background", note: "Dark base", className: "bg-stone-950 text-stone-100" },
  { name: "Stone 900 glass", token: "--glass", note: "Surfaces", className: "glass text-foreground" },
  { name: "Stone 400", token: "--muted-foreground", note: "Secondary text", className: "bg-stone-400 text-stone-950" },
  { name: "Stone 50", token: "light base", note: "Light mode", className: "bg-stone-50 text-stone-950" },
];

export function Foundations() {
  return (
    <section id="foundations" className="scroll-mt-24 grid gap-10 pt-10 sm:pt-16">
      <div className="grid max-w-3xl gap-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Badge variant="lime" dot>
            Design system v0.1
          </Badge>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
          className="font-display text-5xl font-bold leading-[0.95] tracking-tight sm:text-7xl"
        >
          Electric lime on <span className="text-primary-text">warm graphite.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-xl text-base text-muted-foreground sm:text-lg"
        >
          Every Unibox primitive in one place: frosted glass surfaces, one loud accent, and motion that explains
          what just changed.
        </motion.p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Demo label="Colour">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {SWATCHES.map((s, i) => (
              <motion.li
                key={s.name}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.06, type: "spring", stiffness: 300, damping: 24 }}
                className={`flex h-28 flex-col justify-end rounded-xl border border-(--glass-border) p-3 ${s.className}`}
              >
                <span className="text-sm font-semibold">{s.name}</span>
                <span className="font-mono text-[0.68rem] opacity-70">{s.token}</span>
                <span className="text-[0.7rem] opacity-80">{s.note}</span>
              </motion.li>
            ))}
          </ul>
        </Demo>
        <Demo label="Type">
          <div className="grid gap-4">
            <div>
              <p className="font-display text-4xl font-bold tracking-tight">Bricolage</p>
              <p className="text-xs text-muted-foreground">Display · headings, numbers that matter</p>
            </div>
            <div>
              <p className="text-xl">Geist Sans for interface text.</p>
              <p className="text-xs text-muted-foreground">Body · labels, buttons, tables</p>
            </div>
            <div>
              <p className="font-mono text-xl tabular-nums">$12,480.00 · 09:41</p>
              <p className="text-xs text-muted-foreground">Geist Mono · metrics, ids, dates</p>
            </div>
          </div>
        </Demo>
      </div>
    </section>
  );
}

const TREND_A = [12, 18, 15, 22, 28, 26, 34, 40, 38, 46];
const TREND_B = [30, 28, 31, 27, 24, 22, 20, 18, 16, 14];
const TREND_C = [8, 10, 9, 14, 13, 18, 21, 20, 26, 29];

export function Stats() {
  const [leads, setLeads] = useState(1284);
  const [revenue, setRevenue] = useState(48250);

  return (
    <Section
      id="stats"
      title="Stat cards"
      description="Digits roll up from below when the card scrolls into view, and again whenever the value changes. Hover a card for the lime spotlight."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open conversations" value={3427} delta={12.4} icon={MessagesSquare} trend={TREND_A} />
        <StatCard label="New leads" value={leads} delta={8.1} icon={Users} trend={TREND_C} />
        <StatCard
          label="Pipeline value"
          value={revenue}
          format={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }}
          delta={21.7}
          icon={DollarSign}
          trend={TREND_A}
        />
        <StatCard
          label="Avg. first reply"
          value={4.8}
          format={{ maximumFractionDigits: 1 }}
          delta={-6.3}
          icon={Timer}
          trend={TREND_B}
        />
      </div>
      <div className="glass flex flex-wrap items-center gap-4 rounded-2xl p-4">
        <Button
          onClick={() => {
            setLeads((n) => n + Math.ceil(Math.random() * 40));
            setRevenue((n) => n + Math.ceil(Math.random() * 4000));
          }}
        >
          <Plus />
          Simulate incoming leads
        </Button>
        <span className="text-sm text-muted-foreground">
          Today: <AnimatedNumber value={leads - 1284} signed className="text-base font-semibold text-primary-text" /> leads
        </span>
      </div>
    </Section>
  );
}
