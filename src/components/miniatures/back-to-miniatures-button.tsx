"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export function BackToMiniaturesButton() {
  const router = useRouter();

  const handleBack = () => {
    // Check if there's history to go back to
    if (window.history.length > 1) {
      router.back();
    } else {
      // Fallback to collection page if no history
      router.push("/dashboard/miniatures");
    }
  };

  return (
    <Button variant="ghost" onClick={handleBack}>
      <ArrowLeft className="mr-2 h-4 w-4" />
      Back to Miniatures
    </Button>
  );
}
