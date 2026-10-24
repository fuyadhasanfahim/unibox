import "server-only";
import { z } from "zod";
import { parseEnv } from "./parse";

// Server-only: importing this from a Client Component is a build error.
export const serverEnv = parseEnv(
  z.object({
    API_URL: z.url(),
  }),
  process.env,
);
