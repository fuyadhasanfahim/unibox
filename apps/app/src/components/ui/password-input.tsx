"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { Input } from "./input";

export function PasswordInput({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input type={visible ? "text" : "password"} className={cn("pr-11", className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition hover:bg-foreground/[0.06] hover:text-foreground"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

// Rough guide only (length + variety); the server enforces the real minimum.
function score(password: string): 0 | 1 | 2 | 3 | 4 {
  if (!password) return 0;
  let s = 0;
  if (password.length >= 12) s++;
  if (password.length >= 16) s++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) s++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) s++;
  return Math.max(1, s) as 1 | 2 | 3 | 4;
}

const LABELS = ["", "Weak", "Fair", "Good", "Strong"];
const COLORS = ["", "bg-destructive", "bg-warning", "bg-chart-2", "bg-primary"];

export function PasswordStrength({ password }: { password: string }) {
  const s = score(password);
  return (
    <div className="grid gap-1.5" aria-live="polite">
      <div className="grid grid-cols-4 gap-1.5" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cn("h-1 rounded-full bg-foreground/10 transition-colors duration-300", i <= s && COLORS[s])}
          />
        ))}
      </div>
      {s > 0 && <p className="text-xs text-muted-foreground">Password strength: {LABELS[s]}</p>}
    </div>
  );
}
