"use client";

import { Search, X } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { useField } from "./field";

// Shared by Input, Textarea and picker triggers so every field surface matches.
export const fieldSurface = [
  "w-full rounded-lg border border-border bg-input text-sm text-foreground",
  "placeholder:text-muted-foreground/70",
  "transition-[border-color,box-shadow,background-color] duration-200",
  "hover:border-foreground/20",
  "outline-none focus-visible:border-primary/60 focus-visible:ring-4 focus-visible:ring-primary/15",
  "aria-invalid:border-destructive/60 aria-invalid:focus-visible:ring-destructive/15",
  "disabled:cursor-not-allowed disabled:opacity-50",
].join(" ");

export function Input({ className, id, ...props }: ComponentProps<"input">) {
  const field = useField();
  return (
    <input
      id={id ?? field?.id}
      aria-describedby={field?.describedBy}
      aria-invalid={field?.invalid || undefined}
      className={cn(fieldSurface, "h-10 px-3", className)}
      {...props}
    />
  );
}

type SearchInputProps = Omit<ComponentProps<"input">, "type" | "value" | "onChange"> & {
  value: string;
  onValueChange: (value: string) => void;
};

export function SearchInput({ className, value, onValueChange, ...props }: SearchInputProps) {
  return (
    <div className={cn("group relative", className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary-text"
      />
      <Input
        type="search"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className="pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
        {...props}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onValueChange("")}
          className="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition hover:bg-foreground/[0.06] hover:text-foreground animate-pop-in"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
