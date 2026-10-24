import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/misc";
import { Charts } from "./_showcase/charts";
import { Dates } from "./_showcase/dates";
import { Display } from "./_showcase/display";
import { Actions, Forms } from "./_showcase/forms";
import { Overlays } from "./_showcase/overlays";
import { Foundations, Stats } from "./_showcase/overview";
import { ShowcaseHeader } from "./_showcase/shell";
import { TableSection } from "./_showcase/table";

export const metadata: Metadata = {
  title: "Components · Unibox",
  description: "Unibox design system: every UI primitive in one place.",
};

export default function ComponentsPage() {
  return (
    <div className="pb-24">
      <ShowcaseHeader />
      <main className="mx-auto grid w-full max-w-6xl gap-20 px-4">
        <Foundations />
        <Stats />
        <Actions />
        <Forms />
        <Overlays />
        {/* Calendars read the current date, so they render at request time instead of prerender. */}
        <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
          <Dates />
        </Suspense>
        <TableSection />
        <Charts />
        <Display />
      </main>
    </div>
  );
}
