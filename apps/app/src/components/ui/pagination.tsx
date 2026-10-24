"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { motion } from "motion/react";
import { useId } from "react";
import { cn, focusRing } from "@/lib/utils";

type PaginationProps = {
  /** 1-based current page. */
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
};

// 1 … 4 5 [6] 7 8 … 20 — always 7 slots so the control never jumps in width.
function pageItems(page: number, count: number): (number | "gap")[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  if (page <= 4) return [1, 2, 3, 4, 5, "gap", count];
  if (page >= count - 3) return [1, "gap", count - 4, count - 3, count - 2, count - 1, count];
  return [1, "gap", page - 1, page, page + 1, "gap", count];
}

const navBtn = cn(
  "grid size-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-foreground/[0.07] hover:text-foreground disabled:pointer-events-none disabled:opacity-30 [&_svg]:size-4",
  focusRing,
);

export function Pagination({ page, pageCount, onPageChange, className }: PaginationProps) {
  const layoutId = useId();
  const count = Math.max(pageCount, 1);

  return (
    <nav aria-label="Pagination" className={cn("flex items-center gap-1", className)}>
      <button type="button" className={navBtn} aria-label="First page" disabled={page <= 1} onClick={() => onPageChange(1)}>
        <ChevronsLeft />
      </button>
      <button type="button" className={navBtn} aria-label="Previous page" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        <ChevronLeft />
      </button>

      <ul className="hidden items-center gap-1 sm:flex">
        {pageItems(page, count).map((item, i) =>
          item === "gap" ? (
            <li key={`gap-${i}`} aria-hidden className="grid size-9 place-items-center text-muted-foreground">
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                aria-current={item === page ? "page" : undefined}
                aria-label={`Page ${item}`}
                onClick={() => onPageChange(item)}
                className={cn(
                  "relative grid h-9 min-w-9 place-items-center rounded-lg px-2 font-mono text-sm tabular-nums transition-colors",
                  item === page ? "font-semibold text-primary-foreground" : "text-muted-foreground hover:bg-foreground/[0.07] hover:text-foreground",
                  focusRing,
                )}
              >
                {item === page && (
                  <motion.span
                    layoutId={layoutId}
                    className="absolute inset-0 rounded-lg bg-primary shadow-[0_4px_14px_-4px_oklch(0.841_0.238_128.9/0.65)]"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative">{item}</span>
              </button>
            </li>
          ),
        )}
      </ul>
      <span className="px-2 font-mono text-sm tabular-nums text-muted-foreground sm:hidden">
        {page} / {count}
      </span>

      <button type="button" className={navBtn} aria-label="Next page" disabled={page >= count} onClick={() => onPageChange(page + 1)}>
        <ChevronRight />
      </button>
      <button type="button" className={navBtn} aria-label="Last page" disabled={page >= count} onClick={() => onPageChange(count)}>
        <ChevronsRight />
      </button>
    </nav>
  );
}
