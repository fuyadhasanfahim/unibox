import type { Metadata } from "next";
import { ComingSoon } from "../_components/coming-soon";

export const metadata: Metadata = { title: "Inbox · Unibox" };

export default function InboxPage() {
  return <ComingSoon href="/inbox" phase="Phase 3" />;
}
