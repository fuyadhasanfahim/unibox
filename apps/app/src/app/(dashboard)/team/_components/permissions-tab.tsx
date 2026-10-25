"use client";

import { PERMISSIONS, ROLE_PERMISSIONS, TENANT_ROLES, type TenantRole } from "@repo/shared";
import { Check, Info, Minus } from "lucide-react";
import { Fragment } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { PERMISSION_INFO, ROLE_INFO } from "./role-meta";

const ROLES = [...TENANT_ROLES].reverse(); // agent → owner, least to most access

const GROUPS = PERMISSIONS.reduce<Record<string, (typeof PERMISSIONS)[number][]>>((acc, p) => {
  (acc[PERMISSION_INFO[p].group] ??= []).push(p);
  return acc;
}, {});

// Read-only view of the built-in role matrix (the same table the API enforces).
export function PermissionsTab({ myRole }: { myRole: TenantRole }) {
  return (
    <div className="grid gap-4">
      <div className="flex items-start gap-3 rounded-xl border border-border bg-foreground/[0.03] p-3.5 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-primary-text" />
        <p>
          Every workspace uses these four built-in roles. Your role is highlighted. Custom roles with your own permission sets are planned for a
          later release.
        </p>
      </div>

      <div className="glass overflow-hidden rounded-2xl">
        <ScrollArea orientation="horizontal">
          <table className="w-full min-w-[640px] text-sm">
            <caption className="sr-only">Permissions by role</caption>
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="h-14 px-4 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Permission
                </th>
                {ROLES.map((r) => {
                  const info = ROLE_INFO[r];
                  return (
                    <th
                      key={r}
                      scope="col"
                      className={cn("w-28 px-2 text-center", r === myRole && "bg-primary-soft")}
                    >
                      <span className="inline-flex flex-col items-center gap-1">
                        <info.icon className={cn("size-4", r === myRole ? "text-primary-text" : "text-muted-foreground")} />
                        <span className="text-xs font-semibold">{info.label}</span>
                        {r === myRole && <span className="text-[0.65rem] font-medium uppercase tracking-wide text-primary-text">You</span>}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {Object.entries(GROUPS).map(([group, perms]) => (
                <Fragment key={group}>
                  <tr>
                    <th
                      scope="rowgroup"
                      colSpan={ROLES.length + 1}
                      className="bg-foreground/[0.03] px-4 py-2 text-left text-[0.68rem] font-semibold uppercase tracking-widest text-muted-foreground"
                    >
                      {group}
                    </th>
                  </tr>
                  {perms.map((p) => (
                    <tr key={p} className="border-b border-border/60 last:border-b-0 transition-colors hover:bg-foreground/[0.02]">
                      <th scope="row" className="px-4 py-3 text-left font-normal">
                        {PERMISSION_INFO[p].label}
                      </th>
                      {ROLES.map((r) => {
                        const allowed = ROLE_PERMISSIONS[r].has(p);
                        return (
                          <td key={r} className={cn("text-center", r === myRole && "bg-primary-soft")}>
                            {allowed ? (
                              <Check aria-label="Allowed" className="mx-auto size-4 text-primary-text" strokeWidth={3} />
                            ) : (
                              <Minus aria-label="Not allowed" className="mx-auto size-4 text-muted-foreground/40" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </ScrollArea>
      </div>
    </div>
  );
}
