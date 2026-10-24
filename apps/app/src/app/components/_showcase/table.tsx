"use client";

import { formatDistanceStrict } from "date-fns";
import { Archive, Eye, MoreHorizontal, Trash2, UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { columnHelper, DataTable, selectColumn, SortHeader, type DataTableColumn } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toaster";
import { DEMO_NOW, makeLeads, type Channel, type Lead, type LeadStatus } from "@/lib/demo-data";
import { Section } from "./shell";

const LEADS = makeLeads();

const CHANNEL: Record<Channel, { label: string; color: string }> = {
  whatsapp: { label: "WhatsApp", color: "var(--chart-1)" },
  messenger: { label: "Messenger", color: "var(--chart-4)" },
  instagram: { label: "Instagram", color: "var(--chart-5)" },
};

const STATUS: Record<LeadStatus, "lime" | "neutral" | "outline" | "success" | "danger"> = {
  new: "lime",
  contacted: "neutral",
  qualified: "outline",
  won: "success",
  lost: "danger",
};

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const h = columnHelper<Lead>();

const columns: DataTableColumn<Lead>[] = [
  selectColumn<Lead>(),
  h.accessor("name", {
    header: ({ column }) => <SortHeader column={column} title="Contact" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <Avatar alt={row.original.name} />
        <div className="grid">
          <span className="font-medium">{row.original.name}</span>
          <span className="text-xs text-muted-foreground">{row.original.email}</span>
        </div>
      </div>
    ),
  }),
  h.accessor("channel", {
    header: ({ column }) => <SortHeader column={column} title="Channel" />,
    cell: ({ row }) => {
      const c = CHANNEL[row.original.channel];
      return (
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="size-2 rounded-full" style={{ background: c.color, boxShadow: `0 0 10px ${c.color}` }} />
          {c.label}
        </span>
      );
    },
  }),
  h.accessor("status", {
    header: ({ column }) => <SortHeader column={column} title="Status" />,
    cell: ({ row }) => (
      <Badge variant={STATUS[row.original.status]} className="capitalize">
        {row.original.status}
      </Badge>
    ),
  }),
  h.accessor("owner", {
    header: ({ column }) => <SortHeader column={column} title="Owner" />,
    cell: ({ row }) =>
      row.original.owner === "Unassigned" ? <span className="text-muted-foreground">Unassigned</span> : row.original.owner,
  }),
  h.accessor("value", {
    header: ({ column }) => <SortHeader column={column} title="Value" />,
    cell: ({ row }) => <span className="font-mono tabular-nums">{money.format(row.original.value)}</span>,
  }),
  h.accessor("lastActivity", {
    header: ({ column }) => <SortHeader column={column} title="Last activity" />,
    sortFn: "datetime",
    enableGlobalFilter: false,
    cell: ({ row }) => (
      <span className="text-muted-foreground">{formatDistanceStrict(row.original.lastActivity, DEMO_NOW, { addSuffix: true })}</span>
    ),
  }),
  {
    id: "actions",
    enableHiding: false,
    enableSorting: false,
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${row.original.name}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>
            <Eye />
            Open conversation
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => toast.success(`Assigned ${row.original.name} to you`)}>
            <UserPlus />
            Assign to me
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive>
            <Trash2 />
            Delete lead
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

export function TableSection() {
  return (
    <Section
      id="table"
      title="Data table"
      description="TanStack Table v9: sorting, debounced search (300 ms), page-level select-all with Shift-click ranges, column visibility and page size."
    >
      <DataTable
        columns={columns}
        data={LEADS}
        getRowId={(l) => l.id}
        searchPlaceholder="Search name, email, owner…"
        bulkActions={(rows) => (
          <Button variant="glass" size="sm" onClick={() => toast.success(`Archived ${rows.length} leads`)}>
            <Archive />
            Archive
          </Button>
        )}
      />
    </Section>
  );
}
