"use client";

import { useState, useEffect } from "react";
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

interface StatusBadgeProps {
  miniatureId: string;
  status: MiniatureStatus | null;
}

type StatusType = 
  | "unknown"
  | "missing"
  | "needs_stripped"
  | "backlog"
  | "built"
  | "primed"
  | "painting_started"
  | "needs_repair"
  | "sub_assembled"
  | "missing_arm"
  | "missing_leg"
  | "missing_head"
  | "complete";

export function StatusBadge({ miniatureId, status }: StatusBadgeProps) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<StatusType>(
    (status?.status as StatusType) || "backlog"
  );

  // Sync local state with props when they change (e.g., after bulk update)
  useEffect(() => {
    if (status) {
      setCurrentStatus((status.status as StatusType) || "backlog");
    }
  }, [status]);

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true);
    try {
      await updateMiniatureStatus(miniatureId, {
        status: newStatus as StatusType,
        magnetised: status?.magnetised ?? false,
        based: status?.based ?? false,
      });
      setCurrentStatus(newStatus as StatusType);
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
          <SelectItem value="unknown">Unknown</SelectItem>
          <SelectItem value="missing">Missing</SelectItem>
          <SelectItem value="needs_stripped">Needs Stripped</SelectItem>
          <SelectItem value="backlog">Backlog</SelectItem>
          <SelectItem value="built">Built</SelectItem>
          <SelectItem value="primed">Primed</SelectItem>
          <SelectItem value="painting_started">Painting Started</SelectItem>
          <SelectItem value="needs_repair">Needs Repair</SelectItem>
          <SelectItem value="sub_assembled">Sub-Assembled</SelectItem>
          <SelectItem value="missing_arm">Missing Arm</SelectItem>
          <SelectItem value="missing_leg">Missing Leg</SelectItem>
          <SelectItem value="missing_head">Missing Head</SelectItem>
          <SelectItem value="complete">Complete</SelectItem>
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
