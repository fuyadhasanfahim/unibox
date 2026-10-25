"use client";

import { LogIn, LogOut, Palette } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/misc";
import { authClient } from "@/lib/auth-client";

// Temporary home until the inbox exists: shows who is signed in.
export function SessionCard() {
  const router = useRouter();
  const { data, isPending } = authClient.useSession();
  const [signingOut, setSigningOut] = useState(false);

  if (isPending) return <Skeleton className="h-48 w-full max-w-md rounded-2xl" />;

  if (!data) {
    return (
      <Card className="w-full max-w-md items-start">
        <p className="font-display text-2xl font-bold">You&apos;re signed out</p>
        <p className="text-sm text-muted-foreground">Sign in to open your team&apos;s inbox.</p>
        <div className="flex gap-2">
          <Link href="/sign-in" className={buttonVariants()}>
            <LogIn /> Sign in
          </Link>
          <Link href="/components" className={buttonVariants({ variant: "glass" })}>
            <Palette /> UI kit
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card spotlight className="w-full max-w-md">
      <div className="flex items-center gap-3">
        <Avatar alt={data.user.name} className="size-12" status="online" />
        <div className="grid">
          <span className="font-display text-xl font-bold">{data.user.name}</span>
          <span className="text-sm text-muted-foreground">{data.user.email}</span>
        </div>
        <Badge variant="lime" dot className="ml-auto">
          Signed in
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">The inbox lands in the next phase. For now, your session works end to end.</p>
      <div className="flex gap-2">
        <Button
          variant="glass"
          loading={signingOut}
          onClick={async () => {
            setSigningOut(true);
            await authClient.signOut();
            router.replace("/sign-in");
          }}
        >
          {!signingOut && <LogOut />} Sign out
        </Button>
        <Link href="/components" className={buttonVariants({ variant: "ghost" })}>
          <Palette /> UI kit
        </Link>
      </div>
    </Card>
  );
}
