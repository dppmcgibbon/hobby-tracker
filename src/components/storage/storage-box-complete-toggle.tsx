"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { toggleStorageBoxComplete } from "@/app/actions/storage";
import { toast } from "sonner";

interface StorageBoxCompleteToggleProps {
  storageBoxId: string;
  completed: boolean;
  variant?: "checkbox" | "badge";
}

export function StorageBoxCompleteToggle({
  storageBoxId,
  completed,
  variant = "checkbox",
}: StorageBoxCompleteToggleProps) {
  const [isCompleted, setIsCompleted] = useState(completed);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleToggle = () => {
    const newValue = !isCompleted;
    setIsCompleted(newValue);

    startTransition(async () => {
      try {
        await toggleStorageBoxComplete(storageBoxId, newValue);
        toast.success(newValue ? "Marked as complete" : "Marked as incomplete");
        router.refresh();
      } catch (error) {
        // Revert on error
        setIsCompleted(!newValue);
        toast.error(error instanceof Error ? error.message : "Failed to update");
      }
    });
  };

  if (variant === "badge") {
    return (
      <button
        onClick={handleToggle}
        disabled={isPending}
        className="transition-opacity disabled:opacity-50"
      >
        <Badge
          variant={isCompleted ? "default" : "outline"}
          className={
            isCompleted
              ? "bg-green-600 hover:bg-green-700 text-white border-green-600"
              : "border-primary/30 hover:border-primary/50"
          }
        >
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {isCompleted ? "Complete" : "Mark Complete"}
        </Badge>
      </button>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id={`complete-${storageBoxId}`}
        checked={isCompleted}
        onCheckedChange={handleToggle}
        disabled={isPending}
      />
      <Label
        htmlFor={`complete-${storageBoxId}`}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
      >
        Mark as complete
      </Label>
    </div>
  );
}
