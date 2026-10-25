import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/misc";
import { ALL_NAV } from "./nav";

// Placeholder for sections that arrive in later phases, so the navigation is complete today.
export function ComingSoon({ href, phase }: { href: string; phase: string }) {
  const item = ALL_NAV.find((i) => i.href === href)!;
  return (
    <Card className="min-h-[60vh] items-center justify-center">
      <Empty icon={item.icon} title={`${item.label} is on its way`} description={`${item.description}. Arrives in ${phase}.`} />
    </Card>
  );
}
