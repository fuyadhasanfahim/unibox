import type { Metadata } from "next";
import { ComingSoon } from "../_components/coming-soon";

export const metadata: Metadata = { title: "Team · Unibox" };

export default function TeamPage() {
  return <ComingSoon href="/team" phase="Phase 1 (RBAC)" />;
}
