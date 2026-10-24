"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

export { toast } from "sonner";

export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={resolvedTheme === "light" ? "light" : "dark"}
      position="bottom-right"
      gap={10}
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "glass-strong! rounded-xl! border-(--glass-border)! text-foreground! font-sans! shadow-none!",
          description: "text-muted-foreground!",
          closeButton:
            "bg-(--glass-strong)! border-(--glass-border)! text-muted-foreground! hover:text-foreground! hover:bg-muted! transition-colors!",
          actionButton: "bg-primary! text-primary-foreground! font-medium!",
          success: "[&_[data-icon]]:text-success!",
          error: "[&_[data-icon]]:text-destructive!",
        },
      }}
    />
  );
}
