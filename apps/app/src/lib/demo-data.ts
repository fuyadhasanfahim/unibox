import { subDays, subHours } from "date-fns";
import { z } from "zod";

// Demo fixtures for /components only. Real data comes from the API (shared schema in @repo/shared later).

export const channelSchema = z.enum(["whatsapp", "messenger", "instagram"]);
export const leadStatusSchema = z.enum(["new", "contacted", "qualified", "won", "lost"]);

export const leadSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  email: z.email(),
  channel: channelSchema,
  status: leadStatusSchema,
  owner: z.string(),
  value: z.number().nonnegative(),
  lastActivity: z.date(),
});

export type Channel = z.infer<typeof channelSchema>;
export type LeadStatus = z.infer<typeof leadStatusSchema>;
export type Lead = z.infer<typeof leadSchema>;

// Fixed clock + seeded PRNG: server and client render identical rows (no hydration mismatch).
export const DEMO_NOW = new Date("2026-10-24T12:00:00Z");

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ["Ayesha", "Rahim", "Nusrat", "Tanvir", "Sadia", "Imran", "Farhana", "Kamal", "Lamia", "Arif", "Mitu", "Sabbir", "Priya", "Omar", "Elena", "Diego", "Mei", "Lucas", "Zara", "Noah"];
const LAST = ["Rahman", "Hossain", "Akter", "Islam", "Chowdhury", "Khan", "Ahmed", "Das", "Silva", "Garcia", "Chen", "Müller", "Okafor", "Patel"];
const OWNERS = ["Fuyad", "Nadia", "Shakib", "Unassigned"];

export function makeLeads(count = 132): Lead[] {
  const rand = mulberry32(42);
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)]!;

  const leads = Array.from({ length: count }, (_, i) => {
    const first = pick(FIRST);
    const last = pick(LAST);
    return {
      id: `lead_${(i + 1).toString().padStart(4, "0")}`,
      name: `${first} ${last}`,
      email: `${first}.${last}${i}@example.com`.toLowerCase().replace("ü", "u"),
      channel: pick(channelSchema.options),
      status: pick(leadStatusSchema.options),
      owner: pick(OWNERS),
      value: Math.round(rand() * 480) * 25,
      lastActivity: subHours(subDays(DEMO_NOW, Math.floor(rand() * 45)), Math.floor(rand() * 23)),
    };
  });

  return z.array(leadSchema).parse(leads);
}

export const monthlyConversations = [
  { month: "Nov", whatsapp: 1240, messenger: 620, instagram: 410 },
  { month: "Dec", whatsapp: 1380, messenger: 640, instagram: 520 },
  { month: "Jan", whatsapp: 1310, messenger: 600, instagram: 590 },
  { month: "Feb", whatsapp: 1490, messenger: 710, instagram: 640 },
  { month: "Mar", whatsapp: 1720, messenger: 760, instagram: 700 },
  { month: "Apr", whatsapp: 1680, messenger: 820, instagram: 810 },
  { month: "May", whatsapp: 1910, messenger: 790, instagram: 880 },
  { month: "Jun", whatsapp: 2120, messenger: 860, instagram: 960 },
  { month: "Jul", whatsapp: 2050, messenger: 910, instagram: 1080 },
  { month: "Aug", whatsapp: 2380, messenger: 940, instagram: 1150 },
  { month: "Sep", whatsapp: 2610, messenger: 1010, instagram: 1290 },
  { month: "Oct", whatsapp: 2890, messenger: 1080, instagram: 1420 },
];

export const responseTime = [
  { day: "Mon", minutes: 14 },
  { day: "Tue", minutes: 11 },
  { day: "Wed", minutes: 12 },
  { day: "Thu", minutes: 8 },
  { day: "Fri", minutes: 9 },
  { day: "Sat", minutes: 6 },
  { day: "Sun", minutes: 5 },
];

export const channelShare = [
  { channel: "whatsapp", value: 54, fill: "var(--chart-1)" },
  { channel: "instagram", value: 27, fill: "var(--chart-5)" },
  { channel: "messenger", value: 19, fill: "var(--chart-4)" },
];
