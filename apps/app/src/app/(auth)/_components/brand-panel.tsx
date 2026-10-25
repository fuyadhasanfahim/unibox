"use client";

import { Camera, MessageCircle, MessagesSquare, Sparkles } from "lucide-react";
import { motion } from "motion/react";

const BUBBLES = [
  { icon: MessageCircle, channel: "WhatsApp", text: "Is the bigger plan still on discount?", color: "var(--chart-1)", x: "6%", y: "8%" },
  { icon: Camera, channel: "Instagram", text: "Loved the reel! Do you ship to Dhaka?", color: "var(--chart-5)", x: "28%", y: "36%" },
  { icon: MessagesSquare, channel: "Messenger", text: "Can I book a demo for Friday?", color: "var(--chart-4)", x: "10%", y: "64%" },
];

// Left half of the auth screen: the brand promise, shown as live-looking messages arriving.
export function BrandPanel() {
  return (
    <div className="glass relative hidden h-full min-h-[560px] flex-col justify-between overflow-hidden rounded-3xl p-10 lg:flex">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-primary/25 blur-[90px]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-16 size-80 rounded-full bg-chart-5/15 blur-[90px]" />

      <div className="relative flex items-center gap-2.5 font-display text-xl font-bold tracking-tight">
        <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_28px_-4px_oklch(0.841_0.238_128.9/0.8)]">
          <Sparkles className="size-4" />
        </span>
        unibox
      </div>

      <div aria-hidden className="relative h-64">
        {BUBBLES.map((b, i) => (
          <motion.div
            key={b.channel}
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: [0, -6, 0], scale: 1 }}
            transition={{
              opacity: { delay: 0.3 + i * 0.35, duration: 0.5 },
              scale: { delay: 0.3 + i * 0.35, type: "spring", stiffness: 260, damping: 22 },
              y: { delay: 1.4 + i * 0.4, duration: 4 + i, repeat: Infinity, ease: "easeInOut" },
            }}
            style={{ left: b.x, top: b.y }}
            className="glass-strong absolute flex max-w-[78%] items-start gap-3 rounded-2xl rounded-tl-md p-3.5"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-full" style={{ background: `color-mix(in oklch, ${b.color} 22%, transparent)`, color: b.color }}>
              <b.icon className="size-4" />
            </span>
            <span className="grid gap-0.5">
              <span className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">{b.channel}</span>
              <span className="text-sm">{b.text}</span>
            </span>
          </motion.div>
        ))}
      </div>

      <div className="relative grid gap-3">
        <h2 className="font-display text-4xl font-bold leading-[1.05] tracking-tight">
          Every conversation.
          <br />
          <span className="text-primary-text">One calm inbox.</span>
        </h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          WhatsApp, Messenger and Instagram for your whole team, with leads and follow-ups built in.
        </p>
      </div>
    </div>
  );
}
