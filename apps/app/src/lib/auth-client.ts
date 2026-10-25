import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { clientEnv } from "@/env/client";

// Talks to /api/auth on our own origin (proxied to the API by next.config rewrites).
export const authClient = createAuthClient({
  baseURL: clientEnv.NEXT_PUBLIC_APP_URL,
  plugins: [organizationClient()],
});
