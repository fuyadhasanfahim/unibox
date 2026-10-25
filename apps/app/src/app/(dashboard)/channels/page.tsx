import type { Metadata } from "next";
import { ComingSoon } from "../_components/coming-soon";

export const metadata: Metadata = { title: "Channels · Unibox" };

export default function ChannelsPage() {
  return <ComingSoon href="/channels" phase="Phase 2" />;
}
