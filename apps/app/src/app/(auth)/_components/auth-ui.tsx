"use client";

import type { ReactNode } from "react";

export function AuthHeader({ title, description }: { title: string; description: ReactNode }) {
  return (
    <div className="grid gap-2">
      <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function AuthFooter({ children }: { children: ReactNode }) {
  return <p className="text-center text-sm text-muted-foreground">{children}</p>;
}

export { FormAlert } from "@/components/ui/form-alert";
