import type { Metadata } from "next";
import { ComingSoon } from "../_components/coming-soon";

export const metadata: Metadata = { title: "Follow-ups · Unibox" };

export default function FollowUpsPage() {
  return <ComingSoon href="/follow-ups" phase="Phase 5" />;
}
