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

type StatusType = "backlog" | "assembled" | "primed" | "painting" | "completed";

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
        <SelectTrigger id="status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="backlog">Backlog</SelectItem>
          <SelectItem value="assembled">Assembled</SelectItem>
          <SelectItem value="primed">Primed</SelectItem>
          <SelectItem value="painting">In Progress</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
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
