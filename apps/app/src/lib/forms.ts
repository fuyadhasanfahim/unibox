import type { z } from "zod";

// First error message per top-level field, for <Field error={...}>.
export function fieldErrors<T extends Record<string, unknown>>(error: z.ZodError): Partial<Record<keyof T, string>> {
  const out: Partial<Record<keyof T, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof T | undefined;
    if (key !== undefined && out[key] === undefined) out[key] = issue.message;
  }
  return out;
}

// Only same-site relative paths: blocks open redirects like ?next=//evil.com or ?next=https://evil.com.
export function safeNext(next: string | null, fallback = "/"): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}
