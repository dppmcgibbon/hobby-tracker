"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateMiniatureStatus } from "@/app/actions/miniatures";
import { Loader2 } from "lucide-react";
import type { MiniatureStatus } from "@/types";
import { getMiniatureStatusDisplayLabel } from "@/lib/constants/miniature-status";

interface StatusBadgeProps {
  miniatureId: string;
  status: MiniatureStatus | null;
  /** Rows from `miniature_statuses` (same source as other status dropdowns). */
  statusRows: { name: string }[];
}

export function StatusBadge({ miniatureId, status, statusRows }: StatusBadgeProps) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>(status?.status || "backlog");

  // Sync local state with props when they change (e.g., after bulk update)
  useEffect(() => {
    if (status) {
      setCurrentStatus(status.status || "backlog");
    }
  }, [status]);

  const rowsForSelect = useMemo(() => {
    const out = [...statusRows];
    const s = status?.status;
    if (s && !out.some((r) => r.name === s)) {
      out.push({ name: s });
    }
    return out;
  }, [statusRows, status]);

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true);
    try {
      await updateMiniatureStatus(miniatureId, {
        status: newStatus,
        magnetised: status?.magnetised ?? false,
        based: status?.based ?? false,
      });
      setCurrentStatus(newStatus);
      router.refresh();
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-2">
      <Select value={currentStatus} onValueChange={handleStatusChange} disabled={updating}>
        <SelectTrigger id="status" className="w-[160px] [&>span]:mx-auto [&>span]:text-center">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {rowsForSelect.map((row) => (
            <SelectItem key={row.name} value={row.name}>
              {getMiniatureStatusDisplayLabel(row.name)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {updating && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Updating...
        </div>
      )}
    </div>
  );
}
