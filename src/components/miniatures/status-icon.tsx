"use client";

import { 
  HelpCircle, 
  XCircle, 
  Scissors, 
  Package, 
  Hammer, 
  SprayCan, 
  Paintbrush, 
  Wrench, 
  Settings,
  Hand,
  Footprints,
  CircleUser,
  CheckCircle2
} from "lucide-react";
import { STATUS_LABELS } from "@/lib/constants/miniature-status";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StatusIconProps {
  /** Status object with at least a `status` field (e.g. from miniature_status relation). */
  status: { status?: string | null } | null;
}

const STATUS_ICONS = {
  unknown: HelpCircle,
  missing: XCircle,
  needs_stripped: Scissors,
  backlog: Package,
  built: Hammer,
  primed: SprayCan,
  painting_started: Paintbrush,
  needs_repair: Wrench,
  sub_assembled: Settings,
  missing_arm: Hand,
  missing_leg: Footprints,
  missing_head: CircleUser,
  complete: CheckCircle2,
};

export function StatusIcon({ status }: StatusIconProps) {
  const statusValue = status?.status || "backlog";
  const statusLabel = STATUS_LABELS[statusValue] || statusValue;
  const Icon = STATUS_ICONS[statusValue as keyof typeof STATUS_ICONS] || Package;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center justify-center cursor-default">
            <Icon className="h-4 w-4" />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs font-medium">{statusLabel}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
