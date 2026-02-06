"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import Link from "next/link";
import { StatusBadge } from "./status-badge";
import { DuplicateMiniatureButton } from "./duplicate-miniature-button";
import { Edit, Trash2 } from "lucide-react";
import { updateMiniatureStatus } from "@/app/actions/miniatures";
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
  const router = useRouter();
  const [updatingStates, setUpdatingStates] = useState<Record<string, boolean>>({});

  const handleToggle = async (
    miniatureId: string,
    field: "magnetised" | "based",
    value: boolean,
    currentStatus: MiniatureStatus | null
  ) => {
    setUpdatingStates((prev) => ({ ...prev, [`${miniatureId}-${field}`]: true }));
    try {
      await updateMiniatureStatus(miniatureId, {
        status: (currentStatus?.status as any) || "backlog",
        magnetised: field === "magnetised" ? value : currentStatus?.magnetised ?? false,
        based: field === "based" ? value : currentStatus?.based ?? false,
      });
      router.refresh();
    } catch (error) {
      console.error(`Failed to update ${field}:`, error);
    } finally {
      setUpdatingStates((prev) => ({ ...prev, [`${miniatureId}-${field}`]: false }));
    }
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
              Faction
            </TableHead>
            <TableHead className="font-bold uppercase text-xs tracking-wide text-primary">
              Unit
            </TableHead>
            <TableHead className="font-bold uppercase text-xs tracking-wide text-primary">
              Name
            </TableHead>
            <TableHead className="font-bold uppercase text-xs tracking-wide text-primary text-center">
              Qty
            </TableHead>
            <TableHead className="font-bold uppercase text-xs tracking-wide text-primary">
              Status
            </TableHead>
            <TableHead className="font-bold uppercase text-xs tracking-wide text-primary text-center">
              Magnetised
            </TableHead>
            <TableHead className="font-bold uppercase text-xs tracking-wide text-primary text-center">
              Based
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
              <TableCell className="text-muted-foreground">
                {miniature.factions?.name || "-"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {miniature.unit_type || "-"}
              </TableCell>
              <TableCell>
                <Link
                  href={`/dashboard/collection/${miniature.id}`}
                  className="font-bold hover:text-primary transition-colors tracking-wide"
                >
                  {miniature.name}
                </Link>
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
              <TableCell className="text-center">
                <Switch
                  checked={miniature.miniature_status?.magnetised ?? false}
                  onCheckedChange={(checked) =>
                    handleToggle(miniature.id, "magnetised", checked, miniature.miniature_status)
                  }
                  disabled={updatingStates[`${miniature.id}-magnetised`]}
                  onClick={(e) => e.stopPropagation()}
                />
              </TableCell>
              <TableCell className="text-center">
                <Switch
                  checked={miniature.miniature_status?.based ?? false}
                  onCheckedChange={(checked) =>
                    handleToggle(miniature.id, "based", checked, miniature.miniature_status)
                  }
                  disabled={updatingStates[`${miniature.id}-based`]}
                  onClick={(e) => e.stopPropagation()}
                />
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
