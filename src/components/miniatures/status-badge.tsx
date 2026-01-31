"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  const [magnetised, setMagnetised] = useState(status?.magnetised || false);
  const [based, setBased] = useState(status?.based || false);

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true);
    try {
      await updateMiniatureStatus(miniatureId, {
        status: newStatus as StatusType,
        magnetised,
        based,
      });
      setCurrentStatus(newStatus as StatusType);
      router.refresh();
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setUpdating(false);
    }
  };

  const handleToggle = async (field: "magnetised" | "based", value: boolean) => {
    setUpdating(true);
    try {
      const newData = {
        status: currentStatus,
        magnetised: field === "magnetised" ? value : magnetised,
        based: field === "based" ? value : based,
      };
      await updateMiniatureStatus(miniatureId, newData);
      if (field === "magnetised") setMagnetised(value);
      if (field === "based") setBased(value);
      router.refresh();
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="status" className="mb-2 block">
          Status
        </Label>
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
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="magnetised">Magnetised</Label>
        <Switch
          id="magnetised"
          checked={magnetised}
          onCheckedChange={(checked) => handleToggle("magnetised", checked)}
          disabled={updating}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="based">Based</Label>
        <Switch
          id="based"
          checked={based}
          onCheckedChange={(checked) => handleToggle("based", checked)}
          disabled={updating}
        />
      </div>

      {updating && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Updating...
        </div>
      )}
    </div>
  );
}
