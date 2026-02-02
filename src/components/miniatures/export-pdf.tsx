"use client";

import { useTransition } from "react";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { generateCollectionPDF, downloadPDF } from "@/lib/utils/pdf-generator";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Miniature {
  id: string;
  name: string;
  faction?: { name: string };
  status?: string;
  tags?: { name: string; color: string | null }[];
}

interface ExportPDFProps {
  miniatures: Miniature[];
  selectedIds?: string[];
  collectionName?: string;
}

export function ExportPDF({
  miniatures,
  selectedIds = [],
  collectionName = "My Collection",
}: ExportPDFProps) {
  const [isPending, startTransition] = useTransition();

  const handleExport = (type: "all" | "filtered" | "selected") => {
    startTransition(async () => {
      try {
        let exportMiniatures: Miniature[] = [];
        let title = "";

        switch (type) {
          case "all":
            exportMiniatures = miniatures;
            title = `${collectionName} - Full Collection`;
            break;
          case "filtered":
            exportMiniatures = miniatures;
            title = `${collectionName} - Filtered View`;
            break;
          case "selected":
            if (selectedIds.length === 0) {
              toast.error("No miniatures selected");
              return;
            }
            exportMiniatures = miniatures.filter((m) => selectedIds.includes(m.id));
            title = `${collectionName} - Selected Miniatures (${selectedIds.length})`;
            break;
        }

        const doc = await generateCollectionPDF({
          title,
          miniatures: exportMiniatures,
          includeStats: true,
        });

        const filename = `${collectionName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
        downloadPDF(doc, filename);

        toast.success("PDF exported successfully");
      } catch (error) {
        console.error("PDF export error:", error);
        toast.error("Failed to export PDF");
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isPending}>
          <Download className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Export Options</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleExport("filtered")}>
          <FileText className="mr-2 h-4 w-4" />
          Current View ({miniatures.length} miniatures)
        </DropdownMenuItem>
        {selectedIds.length > 0 && (
          <DropdownMenuItem onClick={() => handleExport("selected")}>
            <FileText className="mr-2 h-4 w-4" />
            Selected ({selectedIds.length} miniatures)
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => handleExport("all")}>
          <FileText className="mr-2 h-4 w-4" />
          Entire Collection
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
