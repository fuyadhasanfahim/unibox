"use client";

import { addDays, format } from "date-fns";
import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { DatePicker, DateRangePicker, MultiDatePicker, type DateRange } from "@/components/ui/date-picker";
import { DEMO_NOW } from "@/lib/demo-data";
import { Demo, Section } from "./shell";

export function Dates() {
  const [single, setSingle] = useState<Date | undefined>();
  const [multiple, setMultiple] = useState<Date[]>([]);
  const [range, setRange] = useState<DateRange | undefined>({ from: addDays(DEMO_NOW, -6), to: DEMO_NOW });
  const [inline, setInline] = useState<Date | undefined>(DEMO_NOW);

  return (
    <Section
      id="dates"
      title="Dates"
      description="react-day-picker for the calendar engine, date-fns for every format and calculation. Range picker shows two months plus presets."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Demo label="Single">
          <DatePicker value={single} onChange={setSingle} />
          <p className="font-mono text-xs text-muted-foreground">{single ? format(single, "EEEE, MMMM d") : "No date yet"}</p>
        </Demo>
        <Demo label="Multiple">
          <MultiDatePicker value={multiple} onChange={setMultiple} max={5} placeholder="Pick up to 5 dates" />
        </Demo>
        <Demo label="Range">
          <DateRangePicker value={range} onChange={setRange} />
          <p className="font-mono text-xs text-muted-foreground">
            {range?.from && range.to
              ? `${Math.round((range.to.getTime() - range.from.getTime()) / 86_400_000) + 1} days selected`
              : "Pick a start and end"}
          </p>
        </Demo>
        <Demo label="Inline calendar" className="lg:col-span-3">
          <div className="overflow-x-auto">
            <Calendar mode="single" selected={inline} onSelect={setInline} numberOfMonths={2} defaultMonth={DEMO_NOW} />
          </div>
        </Demo>
      </div>
    </Section>
  );
}
