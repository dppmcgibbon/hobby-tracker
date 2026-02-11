"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Link from "next/link";
import { Edit, Archive, CheckCircle2, Hash } from "lucide-react";
import { toggleStorageBoxComplete } from "@/app/actions/storage";
import { useRouter } from "next/navigation";

interface StorageBox {
  id: string;
  name: string;
  location?: string | null;
  description?: string | null;
  completed?: boolean | null;
  miniature_count?: number;
}

interface StorageTableViewProps {
  storageBoxes: StorageBox[];
}

export function StorageTableView({ storageBoxes }: StorageTableViewProps) {
  const router = useRouter();
  const [updatingStates, setUpdatingStates] = useState<Record<string, boolean>>({});

  const handleToggleComplete = async (id: string, currentStatus: boolean) => {
    setUpdatingStates((prev) => ({ ...prev, [id]: true }));
    
    try {
      await toggleStorageBoxComplete(id, !currentStatus);
      router.refresh();
    } catch (error) {
      console.error("Failed to toggle storage box status:", error);
    } finally {
      setUpdatingStates((prev) => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div className="warhammer-card border-primary/30 rounded-sm overflow-hidden">
      <TooltipProvider>
        <Table>
          <TableHeader>
            <TableRow className="border-primary/20 hover:bg-muted/30">
              <TableHead className="font-bold uppercase text-xs tracking-wide text-primary">
                Name
              </TableHead>
              <TableHead className="font-bold uppercase text-xs tracking-wide text-primary">
                Description
              </TableHead>
              <TableHead className="font-bold uppercase text-xs tracking-wide text-primary text-center" title="Miniatures">
                <Hash className="h-4 w-4 mx-auto" />
              </TableHead>
              <TableHead className="font-bold uppercase text-xs tracking-wide text-primary text-center">
                Status
              </TableHead>
              <TableHead className="font-bold uppercase text-xs tracking-wide text-primary text-center w-[100px]">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {storageBoxes.map((box) => (
              <TableRow
                key={box.id}
                className="border-primary/10 hover:bg-muted/20 transition-colors"
              >
                <TableCell>
                  <Link
                    href={`/dashboard/storage/${box.id}`}
                    className="font-bold hover:text-primary transition-colors tracking-wide flex items-center gap-2"
                  >
                    <Archive className="h-4 w-4 text-primary" />
                    {box.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground max-w-md">
                  {box.description ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="truncate">{box.description}</p>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <p>{box.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell className="text-center font-bold text-primary">
                  {box.miniature_count || 0}
                </TableCell>
                <TableCell className="text-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleToggleComplete(box.id, box.completed ?? false)}
                        disabled={updatingStates[box.id]}
                        className="cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {box.completed ? (
                          <Badge
                            variant="default"
                            className="bg-green-600 text-white border-green-600 hover:bg-green-700 transition-colors"
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Audited
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-primary/30 hover:border-primary/50 transition-colors">
                            Check
                          </Badge>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Click to toggle status
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      title="View Details"
                    >
                      <Link href={`/dashboard/storage/${box.id}`}>
                        <Archive className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      title="Edit"
                    >
                      <Link href={`/dashboard/storage/${box.id}/edit`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TooltipProvider>
    </div>
  );
}
