"use client";

import { motion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { authClient } from "@/lib/auth-client";
import { useUi } from "@/stores/ui";
import { AppSidebar, SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_WIDTH } from "./app-sidebar";
import { SiteHeader } from "./site-header";

const GAP = 12; // floating sidebar inset + gap to content (px)

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const collapsed = useUi((s) => s.sidebarCollapsed);
  const { data: session, isPending } = authClient.useSession();

  // Persisted sidebar state is applied after mount so SSR and hydration agree.
  useEffect(() => {
    void useUi.persist.rehydrate();
  }, []);

  // The proxy only checks that a cookie exists; bounce to sign-in if it is expired or revoked.
  // Confirm with a fresh request first: when this (Activity-cached) shell is shown again right
  // after sign-in, the hook can still hold the null session from the previous sign-out.
  useEffect(() => {
    if (isPending || session) return;
    let cancelled = false;
    void authClient.getSession().then(({ data }) => {
      if (!cancelled && !data) router.replace(`/sign-in?next=${encodeURIComponent(pathname)}`);
    });
    return () => {
      cancelled = true;
    };
  }, [isPending, session, pathname, router]);

  const offset = (collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH) + GAP * 2;

  return (
    <div className="min-h-dvh" style={{ "--sidebar-offset": `${offset}px` } as React.CSSProperties}>
      <AppSidebar />
      <motion.div
        initial={false}
        animate={{ "--content-pl": `${offset}px` } as Record<string, string>}
        transition={{ type: "spring", stiffness: 380, damping: 36 }}
        className="flex min-h-dvh flex-col gap-4 p-3 md:pl-(--content-pl)"
      >
        <SiteHeader />
        <main id="main" className="flex-1 pb-6">
          {children}
        </main>
      </motion.div>
    </div>
  );
}
