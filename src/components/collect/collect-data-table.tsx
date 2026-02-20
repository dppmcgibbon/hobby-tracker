"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, ArrowUp, ArrowDown, Check, X, ChevronDown, ChevronRight } from "lucide-react";
import { CollectRowForm } from "@/components/collect/collect-row-form";
import type { CollectConfigRow } from "@/lib/queries/collect";

interface CollectDataTableProps {
  app: string;
  tableConfig: CollectConfigRow[];
  rows: Record<string, unknown>[];
  initialSortKey?: string;
}

export function CollectDataTable({
  app,
  tableConfig,
  rows,
  initialSortKey,
}: CollectDataTableProps) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<string | null>(initialSortKey ?? null);
  const [sortAsc, setSortAsc] = useState(true);
  const [filterValue, setFilterValue] = useState<string>("all");
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);

  const displayColumns = tableConfig.filter((c) => c.display === 1);

  // Column with sequence 1 from collect_config - used for filter dropdown
  const filterColumn = useMemo(
    () => tableConfig.find((c) => c.sequence === 1),
    [tableConfig]
  );

  const filterOptions = useMemo(() => {
    if (!filterColumn) return [];
    const values = rows
      .map((r) => {
        const v = r[filterColumn.column_name];
        return v != null && v !== "" ? String(v) : null;
      })
      .filter((v): v is string => v != null);
    return [...new Set(values)].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [filterColumn, rows]);

  const filteredRows = useMemo(() => {
    if (!filterColumn || filterValue === "all") return rows;
    return rows.filter(
      (r) => String(r[filterColumn.column_name] ?? "") === filterValue
    );
  }, [rows, filterColumn, filterValue]);

  const sorted = [...filteredRows].sort((a, b) => {
    if (!sortKey) return 0;
    const aVal = a[sortKey];
    const bVal = b[sortKey];

    if (aVal === bVal) return 0;
    if (aVal == null && bVal != null) return sortAsc ? 1 : -1;
    if (aVal != null && bVal == null) return sortAsc ? -1 : 1;

    let cmp = 0;
    if (typeof aVal === "boolean" || typeof bVal === "boolean") {
      cmp = String(aVal).localeCompare(String(bVal));
    } else if (typeof aVal === "number" && typeof bVal === "number") {
      cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    } else {
      cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
    }
    return sortAsc ? cmp : -cmp;
  });

  const handleSort = (key: string) => {
    if (sortKey === key) setSortAsc((prev) => !prev);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const renderCell = (column: CollectConfigRow, row: Record<string, unknown>) => {
    const val = row[column.column_name];

    switch (column.column_type) {
      case "checkbox":
        return val ? (
          <Check className="h-4 w-4 text-green-500 inline" />
        ) : (
          <X className="h-4 w-4 text-muted-foreground inline" />
        );
      case "status":
        return (
          <Badge
            variant="outline"
            className={
              String(val).toUpperCase() === "COMPLETE"
                ? "border-green-500 text-green-500"
                : "border-amber-500 text-amber-500"
            }
          >
            {String(val ?? "")}
          </Badge>
        );
      case "image":
        if (val && typeof val === "string") {
          return (
            <span className="text-xs text-muted-foreground truncate max-w-[80px] block">
              {val}
            </span>
          );
        }
        return <span className="text-muted-foreground">—</span>;
      case "url":
        if (val && typeof val === "string" && val.startsWith("http")) {
          return (
            <a
              href={val}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline text-sm truncate max-w-[120px] block"
            >
              Link
            </a>
          );
        }
        return <span className="text-muted-foreground">—</span>;
      case "sequence":
      case "number":
        return <span className="font-mono text-sm">{String(val ?? "")}</span>;
      case "faction":
      case "series":
      case "center":
      default:
        return <span className="text-sm">{String(val ?? "") || "—"}</span>;
    }
  };

  const isSortable = (column: CollectConfigRow) => {
    return !["image", "url", "paint"].includes(column.column_type);
  };

  return (
    <Card className="warhammer-card border-primary/30 overflow-hidden">
      <CardContent className="p-0">
        {filterColumn && filterOptions.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 pb-4 px-4 border-b border-primary/20">
            <Select value={filterValue} onValueChange={setFilterValue}>
              <SelectTrigger id="collect-filter" className="w-[200px] border-primary/30">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {filterOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-primary/20 hover:bg-primary/5">
                <TableHead className="w-8 p-4" />
                {displayColumns.map((column) => (
                  <TableHead
                    key={column.id}
                    className={cn(
                      "p-4",
                      isSortable(column)
                        ? "cursor-pointer select-none font-bold uppercase tracking-wide text-primary hover:text-primary/80"
                        : "font-bold uppercase tracking-wide text-muted-foreground"
                    )}
                    onClick={() => isSortable(column) && handleSort(column.column_name)}
                  >
                    <div className="flex items-center gap-1">
                      {column.column_type === "sequence" && (
                        <span className="text-xs">#</span>
                      )}
                      {column.column_type !== "sequence" && (
                        <span>
                          {column.column_name.replace(/_/g, " ")}
                        </span>
                      )}
                      {isSortable(column) && (
                        <span className="opacity-60">
                          {sortKey === column.column_name ? (
                            sortAsc ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3" />
                          )}
                        </span>
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((row) => {
                const rowId = Number(row.id);
                const isExpanded = expandedRowId === rowId;
                return (
                  <React.Fragment key={rowId}>
                    <TableRow
                      className="border-primary/10 hover:bg-primary/5 cursor-pointer group"
                      onClick={() => setExpandedRowId(isExpanded ? null : rowId)}
                    >
                      <TableCell className="w-8 p-4">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-primary" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                        )}
                      </TableCell>
                      {displayColumns.map((column) => (
                        <TableCell
                          key={column.id}
                          className={cn(
                            "p-4",
                            ["checkbox", "number", "sequence", "status"].includes(
                              column.column_type
                            )
                              ? "text-center"
                              : ""
                          )}
                        >
                          {renderCell(column, row)}
                        </TableCell>
                      ))}
                    </TableRow>
                    {isExpanded && (
                      <TableRow>
                        <TableCell
                          colSpan={displayColumns.length + 1}
                          className="bg-muted/30 p-6"
                        >
                          <CollectRowForm
                            app={app}
                            row={row}
                            tableConfig={tableConfig}
                            onSave={() => {
                              router.refresh();
                              setExpandedRowId(null);
                            }}
                            onCancel={() => setExpandedRowId(null)}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
