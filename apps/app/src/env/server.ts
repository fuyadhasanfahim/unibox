import "server-only";
import { z } from "zod";
import { parseEnv } from "./parse";

const empty = (v: unknown) => (v === "" ? undefined : v);

// Server-only: importing this from a Client Component is a build error.
export const serverEnv = parseEnv(
  z
    .object({
      NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
      API_URL: z.url(),
      INTERNAL_PROXY_SECRET: z.string().min(32, "must be at least 32 characters"),
      // Header the load balancer/CDN sets with the real client IP. Lowercase header name.
      TRUSTED_CLIENT_IP_HEADER: z.preprocess(empty, z.string().regex(/^[a-z0-9-]+$/).optional()),
    })
    .superRefine((env, ctx) => {
      // Without it every visitor shares one rate-limit bucket (one attacker could lock everyone out).
      if (env.NODE_ENV === "production" && !env.TRUSTED_CLIENT_IP_HEADER) {
        ctx.addIssue({ code: "custom", path: ["TRUSTED_CLIENT_IP_HEADER"], message: "is required in production" });
      }
    }),
  process.env,
);
