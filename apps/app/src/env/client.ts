import { z } from "zod";
import { parseEnv } from "./parse";

// Each NEXT_PUBLIC_* must be referenced literally: Next inlines them into the bundle at build time.
export const clientEnv = parseEnv(
  z.object({
    NEXT_PUBLIC_APP_URL: z.url(),
  }),
  {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
);
