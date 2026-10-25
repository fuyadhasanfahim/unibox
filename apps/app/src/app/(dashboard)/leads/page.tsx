import type { Metadata } from "next";
import { ComingSoon } from "../_components/coming-soon";

export const metadata: Metadata = { title: "Leads · Unibox" };

export default function LeadsPage() {
  return <ComingSoon href="/leads" phase="Phase 5" />;
}
