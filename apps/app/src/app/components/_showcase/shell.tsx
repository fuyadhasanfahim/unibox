"use client";

import { Command as CommandIcon, Moon, Sparkles, Sun } from "lucide-react";
import { motion } from "motion/react";
import { useTheme } from "next-themes";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/misc";
import { Tooltip } from "@/components/ui/tooltip";

export const SECTIONS = [
  { id: "foundations", label: "Foundations" },
  { id: "stats", label: "Stats" },
  { id: "actions", label: "Actions" },
  { id: "forms", label: "Forms" },
  { id: "overlays", label: "Overlays" },
  { id: "dates", label: "Dates" },
  { id: "table", label: "Data table" },
  { id: "charts", label: "Charts" },
  { id: "display", label: "Display" },
] as const;

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Tooltip content="Toggle theme">
      <Button
        variant="glass"
        size="icon"
        aria-label="Toggle theme"
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      >
        {/* Both icons render; CSS picks one, so there is no hydration mismatch. */}
        <Sun className="hidden dark:block" />
        <Moon className="dark:hidden" />
      </Button>
    </Tooltip>
  );
}

function CommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (id: string) => {
    setOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <Button variant="glass" onClick={() => setOpen(true)} className="hidden gap-3 text-muted-foreground sm:inline-flex">
        <CommandIcon />
        Jump to…
        <span className="flex gap-1">
          <Kbd>Ctrl</Kbd>
          <Kbd>K</Kbd>
        </span>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Jump to section">
        <CommandInput placeholder="Search components…" />
        <CommandList>
          <CommandEmpty>No section found.</CommandEmpty>
          <CommandGroup heading="Sections">
            {SECTIONS.map((s) => (
              <CommandItem key={s.id} value={s.label} onSelect={() => go(s.id)}>
                <Sparkles />
                {s.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

export function ShowcaseHeader() {
  return (
    <header className="sticky top-3 z-40 mx-auto w-full max-w-6xl px-4">
      <div className="glass flex h-14 items-center gap-3 rounded-2xl px-3 pl-4">
        <a href="#foundations" className="flex items-center gap-2.5 font-display text-lg font-bold tracking-tight">
          <span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_24px_-4px_oklch(0.841_0.238_128.9/0.8)]">
            <Sparkles className="size-4" />
          </span>
          unibox<span className="text-primary-text">/ui</span>
        </a>
        <nav aria-label="Sections" className="ml-4 hidden gap-1 xl:flex">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
            >
              {s.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <CommandPalette />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

type SectionProps = { id: string; title: string; description: string; children: ReactNode };

export function Section({ id, title, description, children }: SectionProps) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="scroll-mt-24 grid gap-6"
    >
      <div className="grid gap-1.5">
        <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </motion.section>
  );
}

// Small labelled frame for a single demo inside a section.
export function Demo({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`glass grid content-start gap-4 rounded-2xl p-5 [&>button]:justify-self-start ${className ?? ""}`}>
      <p className="font-mono text-[0.68rem] font-medium uppercase tracking-widest text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}
