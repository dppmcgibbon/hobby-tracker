"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Copy, Loader2 } from "lucide-react";
import { duplicateMiniature } from "@/app/actions/miniatures";
import { toast } from "sonner";

interface DuplicateMiniatureButtonProps {
  miniatureId: string;
  miniatureName?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
}

export function DuplicateMiniatureButton({
  miniatureId,
  miniatureName,
  variant = "outline",
  size = "default",
  showLabel = true,
}: DuplicateMiniatureButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState<"yes" | "no" | null>(null);

  const isLoading = loadingAction !== null;

  const handleDuplicate = async (copyImages: boolean) => {
    setLoadingAction(copyImages ? "yes" : "no");
    try {
      const result = await duplicateMiniature(miniatureId, { copyImages });
      if (result.success) {
        toast.success(
          copyImages
            ? "Miniature duplicated with images!"
            : "Miniature duplicated successfully!"
        );
        setIsOpen(false);
        router.push(`/dashboard/miniatures/${result.miniature.id}/edit`);
        router.refresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to duplicate miniature");
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(true);
        }}
        disabled={isLoading}
        title="Duplicate miniature"
      >
        <Copy className={showLabel ? "mr-2 h-4 w-4" : "h-4 w-4"} />
        {showLabel && "Duplicate"}
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => !isLoading && setIsOpen(open)}>
        <DialogContent
          className="sm:max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>
              Duplicate {miniatureName ? `"${miniatureName}"` : "Miniature"}
            </DialogTitle>
            <DialogDescription>
              Do you want to copy images as well as data?
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-sm text-muted-foreground space-y-1">
            <p>
              <span className="font-medium text-foreground">Yes:</span> Copies miniature data and duplicate photos.
            </p>
            <p>
              <span className="font-medium text-foreground">No:</span> Copies miniature data only (no photos).
            </p>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDuplicate(false)}
              disabled={isLoading}
            >
              {loadingAction === "no" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Duplicating...
                </>
              ) : (
                "No"
              )}
            </Button>
            <Button
              type="button"
              onClick={() => handleDuplicate(true)}
              disabled={isLoading}
            >
              {loadingAction === "yes" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Duplicating...
                </>
              ) : (
                "Yes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
