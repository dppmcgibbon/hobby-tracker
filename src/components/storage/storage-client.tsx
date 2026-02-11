"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StorageTableView } from "@/components/storage/storage-table-view";
import { Archive, CheckCircle2, Grid3x3, List, Plus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Link from "next/link";
import { useState } from "react";
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

interface StorageClientProps {
  storageBoxes: StorageBox[];
}

export function StorageClient({ storageBoxes }: StorageClientProps) {
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
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
    <div className="space-y-6 max-w-full">
      <div className="flex items-center justify-between">
        <div className="border-l-4 border-primary pl-4">
          <h1 className="text-4xl font-black uppercase tracking-wider text-primary gold-glow">
            Storage Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Organize your miniatures by storage location
          </p>
        </div>
        <div className="flex gap-2">
          {storageBoxes.length > 0 && (
            <div className="flex gap-1 border border-primary/20 rounded-sm overflow-hidden">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
                className={viewMode === "grid" ? "btn-warhammer-primary" : ""}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode("table")}
                className={viewMode === "table" ? "btn-warhammer-primary" : ""}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          )}
          <Button asChild className="btn-warhammer-primary">
            <Link href="/dashboard/storage/add">
              <Plus className="mr-2 h-4 w-4" />
              Add Storage Box
            </Link>
          </Button>
        </div>
      </div>

      {storageBoxes.length === 0 ? (
        <Card className="warhammer-card border-primary/30">
          <CardHeader>
            <CardTitle className="text-2xl uppercase tracking-wide text-primary">
              No Storage Boxes Yet
            </CardTitle>
            <CardDescription>
              Create storage boxes to organize your miniature collection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="btn-warhammer-primary">
              <Link href="/dashboard/storage/add">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Storage Box
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {storageBoxes.map((box) => (
            <Card
              key={box.id}
              className="warhammer-card border-primary/20 hover:border-primary/50 transition-all hover:shadow-gold"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Archive className="h-8 w-8 text-primary" />
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl uppercase tracking-wide">
                          {box.name}
                        </CardTitle>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handleToggleComplete(box.id, box.completed ?? false)}
                                disabled={updatingStates[box.id]}
                                className="cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {box.completed && (
                                  <Badge
                                    variant="default"
                                    className="bg-green-600 text-white border-green-600 hover:bg-green-700 transition-colors"
                                  >
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Audited
                                  </Badge>
                                )}
                                {!box.completed && (
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
                        </TooltipProvider>
                      </div>
                      {box.location && (
                        <p className="text-sm text-muted-foreground mt-1">{box.location}</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {box.description && (
                  <p className="text-sm text-muted-foreground mb-4">{box.description}</p>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" asChild className="flex-1">
                    <Link href={`/dashboard/storage/${box.id}`}>View Details</Link>
                  </Button>
                  <Button variant="outline" asChild className="flex-1">
                    <Link href={`/dashboard/storage/${box.id}/edit`}>Edit</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <StorageTableView storageBoxes={storageBoxes} />
      )}
    </div>
  );
}
