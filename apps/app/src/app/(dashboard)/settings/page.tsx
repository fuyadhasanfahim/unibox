import type { Metadata } from "next";
import { ComingSoon } from "../_components/coming-soon";

export const metadata: Metadata = { title: "Settings · Unibox" };

export default function SettingsPage() {
  return <ComingSoon href="/settings" phase="Phase 1 (RBAC)" />;
}
