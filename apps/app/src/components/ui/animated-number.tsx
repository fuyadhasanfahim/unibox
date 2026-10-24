"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { cn } from "@/lib/utils";

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

type AnimatedNumberProps = {
  value: number;
  /** Intl options, e.g. { style: "currency", currency: "USD" } or { maximumFractionDigits: 1 }. */
  format?: Intl.NumberFormatOptions;
  locale?: string;
  /** Show "+" in front of positive values (deltas, growth). */
  signed?: boolean;
  className?: string;
};

// Odometer: every digit is a 0-9 column that rolls up from below into place.
// Starts when scrolled into view; later value changes roll from the previous digit.
export function AnimatedNumber({ value, format, locale = "en-US", signed, className }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });

  const text = new Intl.NumberFormat(locale, { ...format, signDisplay: signed ? "exceptZero" : "auto" }).format(value);
  const chars = text.split("");

  return (
    <span
      ref={ref}
      className={cn("inline-flex items-baseline overflow-hidden font-mono tabular-nums leading-none", className)}
    >
      {/* Screen readers get the final value once; the animated columns are decorative. */}
      <span className="sr-only">{text}</span>
      <span aria-hidden className="inline-flex">
        {chars.map((char, i) => {
          // Key from the right so units stay put when the number grows a digit.
          const key = chars.length - i;
          const digit = Number(char);
          if (char === " " || Number.isNaN(digit)) {
            return (
              <motion.span
                key={`s${key}`}
                initial={{ y: "100%", opacity: 0 }}
                animate={inView ? { y: 0, opacity: 1 } : undefined}
                transition={{ type: "spring", stiffness: 260, damping: 26, delay: 0.05 }}
                className={cn("inline-block", char === "+" && "text-primary-text")}
              >
                {char}
              </motion.span>
            );
          }
          return (
            <span key={`d${key}`} className="relative inline-block h-[1em] w-[1ch] overflow-hidden">
              <motion.span
                className="absolute inset-x-0 top-0 flex flex-col"
                initial={{ y: "0%" }}
                animate={{ y: inView ? `${-digit * 10}%` : "0%" }}
                transition={{ type: "spring", stiffness: 90, damping: 18, mass: 0.8, delay: (chars.length - i) * 0.04 }}
              >
                {DIGITS.map((d) => (
                  <span key={d} className="block h-[1em] leading-none">
                    {d}
                  </span>
                ))}
              </motion.span>
            </span>
          );
        })}
      </span>
    </span>
  );
}
