import type { Metadata } from "next";
import { InvitationsView } from "./invitations-view";

export const metadata: Metadata = { title: "Invitations · Unibox" };

export default function InvitationsPage() {
  return <InvitationsView />;
}
