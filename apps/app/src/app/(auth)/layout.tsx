import { Sparkles } from "lucide-react";
import Link from "next/link";
import { BrandPanel } from "./_components/brand-panel";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto grid min-h-dvh w-full max-w-6xl gap-6 p-4 lg:grid-cols-[1.1fr_1fr] lg:p-6">
      <BrandPanel />
      <main className="flex flex-col items-center justify-center py-10">
        <Link href="/" className="mb-10 flex items-center gap-2.5 font-display text-xl font-bold tracking-tight lg:hidden">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </span>
          unibox
        </Link>
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
