"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { duplicateMiniature } from "@/app/actions/miniatures";
import { toast } from "sonner";

interface DuplicateMiniatureButtonProps {
  miniatureId: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
}

export function DuplicateMiniatureButton({
  miniatureId,
  variant = "outline",
  size = "default",
  showLabel = true,
}: DuplicateMiniatureButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleDuplicate = async () => {
    setIsLoading(true);
    try {
      const result = await duplicateMiniature(miniatureId);
      if (result.success) {
        toast.success("Miniature duplicated successfully!");
        router.push(`/dashboard/collection/${result.miniature.id}/edit`);
        router.refresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to duplicate miniature");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDuplicate}
      disabled={isLoading}
    >
      <Copy className={showLabel ? "mr-2 h-4 w-4" : "h-4 w-4"} />
      {showLabel && (isLoading ? "Duplicating..." : "Duplicate")}
    </Button>
  );
}
