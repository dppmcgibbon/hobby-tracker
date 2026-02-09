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
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/constants/miniature-status";
import type { MiniatureStatus } from "@/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StatusIconProps {
  status: MiniatureStatus | null;
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
  missing_arm: AlertTriangle,
  missing_leg: AlertTriangle,
  missing_head: AlertTriangle,
  complete: CheckCircle2,
};

export function StatusIcon({ status }: StatusIconProps) {
  const statusValue = status?.status || "backlog";
  const statusLabel = STATUS_LABELS[statusValue] || statusValue;
  const statusColor = STATUS_COLORS[statusValue] || "hsl(0, 0%, 50%)";
  const Icon = STATUS_ICONS[statusValue as keyof typeof STATUS_ICONS] || Package;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className="inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors"
            style={{
              backgroundColor: statusColor,
            }}
          >
            <Icon className="h-4 w-4 text-white" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs font-medium">{statusLabel}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
