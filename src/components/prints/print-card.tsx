"use client";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Package, Trash2 } from "lucide-react";
import { updatePrintStatus, deletePrint } from "@/app/actions/prints";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Link from "next/link";

interface PrintCardProps {
  print: {
    id: string;
    status: string;
    quantity: number;
    scale_factor?: number | null;
    print_time_minutes?: number | null;
    material_used_ml?: number | null;
    material_cost?: number | null;
    notes?: string | null;
    created_at: string;
    stl_files?: { id: string; name: string } | null;
    miniatures?: { id: string; name: string } | null;
    materials?: { id: string; name: string; type: string } | null;
  };
}

const STATUS_COLORS = {
  queued: "bg-slate-500",
  printing: "bg-blue-500",
  completed: "bg-green-500",
  failed: "bg-red-500",
  cancelled: "bg-gray-500",
};

export function PrintCard({ print }: PrintCardProps) {
  const router = useRouter();

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updatePrintStatus(print.id, newStatus);
      toast.success("Print status updated");
      router.refresh();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async () => {
    try {
      await deletePrint(print.id);
      toast.success("Print deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete print");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{print.stl_files?.name || "Unnamed Print"}</CardTitle>
          <Badge className={STATUS_COLORS[print.status as keyof typeof STATUS_COLORS]}>
            {print.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {print.miniatures && (
          <div className="text-sm">
            <span className="font-medium">Miniature: </span>
            <Link
              href={`/dashboard/collection/${print.miniatures.id}`}
              className="text-primary hover:underline"
            >
              {print.miniatures.name}
            </Link>
          </div>
        )}

        {print.materials && (
          <div className="text-sm">
            <span className="font-medium">Material: </span>
            {print.materials.name} ({print.materials.type})
          </div>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Package className="h-4 w-4" />
            <span>Qty: {print.quantity}</span>
          </div>
          {print.print_time_minutes && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{print.print_time_minutes}min</span>
            </div>
          )}
          {print.scale_factor && print.scale_factor !== 1 && (
            <span>Scale: {print.scale_factor}x</span>
          )}
        </div>

        {print.material_used_ml && (
          <div className="text-sm text-muted-foreground">
            Material Used: {print.material_used_ml}ml
            {print.material_cost && ` ($${print.material_cost.toFixed(2)})`}
          </div>
        )}

        {print.notes && <p className="text-sm text-muted-foreground line-clamp-2">{print.notes}</p>}

        <div className="pt-2">
          <Select value={print.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="printing">Printing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>

      <CardFooter>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Print?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this print record. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
