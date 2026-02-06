"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { StatusBadge } from "./status-badge";
import { DuplicateMiniatureButton } from "./duplicate-miniature-button";
import { Edit, Trash2 } from "lucide-react";
import type { MiniatureStatus } from "@/types";

interface MiniatureWithRelations {
  id: string;
  name: string;
  quantity: number;
  created_at: string;
  faction_id?: string | null;
  unit_type?: string | null;
  factions: { id: string; name: string } | null;
  miniature_status: {
    status: string;
    completed_at?: string | null;
    based?: boolean | null;
    magnetised?: boolean | null;
  } | null;
  miniature_photos: { id: string; storage_path: string }[];
  storage_box?: { id: string; name: string; location?: string | null } | null;
}

interface MiniatureTableViewProps {
  miniatures: MiniatureWithRelations[];
  selectable?: boolean;
  selectedIds?: string[];
  onSelectChange?: (id: string, selected: boolean) => void;
}

export function MiniatureTableView({
  miniatures,
  selectable,
  selectedIds = [],
  onSelectChange,
}: MiniatureTableViewProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="warhammer-card border-primary/30 rounded-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-primary/20 hover:bg-muted/30">
            {selectable && (
              <TableHead className="w-12 font-bold uppercase text-xs tracking-wide text-primary">
                Select
              </TableHead>
            )}
            <TableHead className="font-bold uppercase text-xs tracking-wide text-primary">
              Name
            </TableHead>
            <TableHead className="font-bold uppercase text-xs tracking-wide text-primary">
              Faction
            </TableHead>
            <TableHead className="font-bold uppercase text-xs tracking-wide text-primary">
              Unit Type
            </TableHead>
            <TableHead className="font-bold uppercase text-xs tracking-wide text-primary text-center">
              Qty
            </TableHead>
            <TableHead className="font-bold uppercase text-xs tracking-wide text-primary">
              Status
            </TableHead>
            <TableHead className="font-bold uppercase text-xs tracking-wide text-primary">
              Storage
            </TableHead>
            <TableHead className="font-bold uppercase text-xs tracking-wide text-primary">
              Added
            </TableHead>
            <TableHead className="font-bold uppercase text-xs tracking-wide text-primary text-right">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {miniatures.map((miniature) => (
            <TableRow
              key={miniature.id}
              className="border-primary/10 hover:bg-muted/20 transition-colors"
            >
              {selectable && (
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.includes(miniature.id)}
                    onCheckedChange={(checked) => {
                      onSelectChange?.(miniature.id, !!checked);
                    }}
                  />
                </TableCell>
              )}
              <TableCell>
                <Link
                  href={`/dashboard/collection/${miniature.id}`}
                  className="font-bold hover:text-primary transition-colors uppercase tracking-wide"
                >
                  {miniature.name}
                </Link>
                {miniature.miniature_status?.based && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    Based
                  </Badge>
                )}
                {miniature.miniature_status?.magnetised && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    Magnetised
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {miniature.factions?.name || "-"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {miniature.unit_type || "-"}
              </TableCell>
              <TableCell className="text-center font-bold text-primary">
                {miniature.quantity}
              </TableCell>
              <TableCell>
                <StatusBadge
                  miniatureId={miniature.id}
                  status={miniature.miniature_status as MiniatureStatus | null}
                />
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {miniature.storage_box ? (
                  <Link
                    href={`/dashboard/storage/${miniature.storage_box.id}`}
                    className="hover:text-primary hover:underline"
                  >
                    {miniature.storage_box.name}
                  </Link>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {formatDate(miniature.created_at)}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <DuplicateMiniatureButton
                    miniatureId={miniature.id}
                    variant="ghost"
                    size="icon"
                    showLabel={false}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                  >
                    <Link href={`/dashboard/collection/${miniature.id}/edit`}>
                      <Edit className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
