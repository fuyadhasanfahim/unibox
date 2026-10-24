"use client";

import {
  columnFilteringFeature,
  columnVisibilityFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_includesString,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  useTable,
  type Column,
  type ColumnDef,
  type Row,
  type RowData,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown, Columns3, SearchX } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Checkbox } from "./controls";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { SearchInput } from "./input";
import { Empty } from "./misc";
import { Pagination } from "./pagination";
import { ScrollArea } from "./scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

// Module scope: stable features keep TanStack row models cached between renders.
export const dataTableFeatures = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  filterFns: { includesString: filterFn_includesString },
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text, datetime: sortFn_datetime, basic: sortFn_basic },
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
  rowSelectionFeature,
  columnVisibilityFeature,
});

type Features = typeof dataTableFeatures;
// Columns hold different value types (string, number, Date). TanStack's own columnHelper.columns()
// types this slot as `any`; `unknown` breaks assignability, so this is the one deliberate exception.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DataTableColumn<TData extends RowData> = ColumnDef<Features, TData, any>;

export function columnHelper<TData extends RowData>() {
  return createColumnHelper<Features, TData>();
}

export function SortHeader<TData extends RowData>({ column, title }: { column: Column<Features, TData, unknown>; title: string }) {
  const sorted = column.getIsSorted();
  const Icon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ChevronsUpDown;
  return (
    <button
      type="button"
      onClick={column.getToggleSortingHandler()}
      className={cn(
        "-ml-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-foreground/[0.06] hover:text-foreground",
        sorted && "text-foreground",
      )}
    >
      {title}
      <Icon className={cn("size-3.5", sorted ? "text-primary-text" : "opacity-50")} />
    </button>
  );
}

// Checkbox column with select-all for the current page (Shift-click selects a range).
export function selectColumn<TData extends RowData>(): DataTableColumn<TData> {
  return {
    id: "select",
    enableSorting: false,
    enableHiding: false,
    header: ({ table }) => (
      <Checkbox
        aria-label="Select all rows on this page"
        checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false}
        onCheckedChange={(v) => table.toggleAllPageRowsSelected(v === true)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label="Select row"
        checked={row.getIsSelected()}
        onClick={row.getToggleSelectedHandler()}
      />
    ),
  };
}

type DataTableProps<TData extends RowData> = {
  columns: DataTableColumn<TData>[];
  data: TData[];
  getRowId: (row: TData) => string;
  searchPlaceholder?: string;
  /** Extra toolbar controls (filters, export…). */
  toolbar?: ReactNode;
  /** Rendered when rows are selected; receives the selected rows. */
  bulkActions?: (rows: Row<Features, TData>[]) => ReactNode;
  pageSizes?: number[];
};

const DEFAULT_PAGE_SIZES = [8, 16, 32];

export function DataTable<TData extends RowData>({
  columns,
  data,
  getRowId,
  searchPlaceholder = "Search…",
  toolbar,
  bulkActions,
  pageSizes = DEFAULT_PAGE_SIZES,
}: DataTableProps<TData>) {
  // TanStack mutates one stable table instance; opt out of React Compiler memoization so reads stay fresh.
  "use no memo";

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const table = useTable({
    features: dataTableFeatures,
    columns,
    data,
    getRowId,
    globalFilterFn: "includesString",
    getColumnCanGlobalFilter: (column) => column.id !== "select" && column.id !== "actions",
    state: { globalFilter: debouncedSearch },
    onGlobalFilterChange: (v) => setSearch(typeof v === "string" ? v : ""),
    initialState: { pagination: { pageIndex: 0, pageSize: pageSizes[0] ?? 8 } },
  });

  const { pageIndex, pageSize } = table.state.pagination;
  const total = table.getRowCount();
  const rows = table.getRowModel().rows;
  const selected = table.getSelectedRowModel().rows;
  const from = total === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min(total, (pageIndex + 1) * pageSize);
  const searching = search !== debouncedSearch;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onValueChange={setSearch}
          placeholder={searchPlaceholder}
          aria-label="Search table"
          className="w-full sm:w-72"
        />
        {toolbar}
        <div className="ml-auto flex items-center gap-2">
          {selected.length > 0 && bulkActions && (
            <div className="flex items-center gap-2 animate-pop-in">
              <span className="font-mono text-xs text-muted-foreground">{selected.length} selected</span>
              {bulkActions(selected)}
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="glass" size="md">
                <Columns3 />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllLeafColumns()
                .filter((c) => c.getCanHide())
                .map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.id}
                    checked={c.getIsVisible()}
                    onCheckedChange={(v) => c.toggleVisibility(v === true)}
                    onSelect={(e) => e.preventDefault()}
                    className="capitalize"
                  >
                    {c.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="glass overflow-hidden rounded-2xl">
        <ScrollArea orientation="horizontal">
          <table className={cn("w-full min-w-[720px] text-sm transition-opacity", searching && "opacity-60")}>
            <thead>
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id} className="border-b border-border">
                  {group.headers.map((header) => (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={
                        header.column.getIsSorted() === "asc"
                          ? "ascending"
                          : header.column.getIsSorted() === "desc"
                            ? "descending"
                            : undefined
                      }
                      className="h-11 whitespace-nowrap px-4 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground first:w-12"
                    >
                      {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody key={`${pageIndex}-${debouncedSearch}`}>
              {rows.map((row, i) => (
                <tr
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  style={{ animationDelay: `${i * 25}ms` }}
                  className={cn(
                    "border-b border-border/60 last:border-b-0 animate-fade-in [animation-fill-mode:both]",
                    "transition-colors hover:bg-foreground/[0.03] data-[state=selected]:bg-primary-soft",
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="h-14 whitespace-nowrap px-4">
                      <table.FlexRender cell={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <Empty
              icon={SearchX}
              title="No results"
              description={`Nothing matches "${debouncedSearch}". Try a different name, email or channel.`}
              action={
                <Button variant="glass" size="sm" onClick={() => setSearch("")}>
                  Clear search
                </Button>
              }
            />
          )}
        </ScrollArea>
      </div>

      <div className="flex flex-col-reverse items-center justify-between gap-3 sm:flex-row">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>
            Showing <span className="font-mono text-foreground tabular-nums">{from}–{to}</span> of{" "}
            <span className="font-mono text-foreground tabular-nums">{total}</span>
          </span>
          <Select value={String(pageSize)} onValueChange={(v) => table.setPageSize(Number(v))}>
            <SelectTrigger aria-label="Rows per page" className="h-9 w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizes.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Pagination page={pageIndex + 1} pageCount={table.getPageCount()} onPageChange={(p) => table.setPageIndex(p - 1)} />
      </div>
    </div>
  );
}
