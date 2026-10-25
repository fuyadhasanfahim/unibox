import { Sparkles } from "lucide-react";
import Link from "next/link";
import { BrandPanel } from "./_components/brand-panel";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto grid min-h-dvh w-full max-w-7xl gap-6 p-4 lg:grid-cols-2 lg:p-6">
      <BrandPanel />
      <main className="flex flex-col items-center justify-center py-8">
        <Link href="/" className="mb-8 flex items-center gap-2.5 font-display text-xl font-bold tracking-tight lg:hidden">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </span>
          unibox
        </Link>
        <div className="glass w-full max-w-md rounded-3xl p-6 sm:p-10">{children}</div>
      </main>
    </div>
  );
}
