"use client";

import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Link from "next/link";
import { StatusBadge } from "./status-badge";
import { DuplicateMiniatureButton } from "./duplicate-miniature-button";
import { Edit, Image as ImageIcon, Magnet, Sprout, Activity, Hash } from "lucide-react";
import { updateMiniatureStatus } from "@/app/actions/miniatures";
import type { MiniatureStatus } from "@/types";

// Lazy load the photo dialog to reduce initial bundle size
const MiniaturePhotoDialog = lazy(() => 
  import("./miniature-photo-dialog").then(module => ({ default: module.MiniaturePhotoDialog }))
);

interface MiniatureWithRelations {
  id: string;
  name: string;
  quantity: number;
  created_at: string;
  faction_id?: string | null;
  unit_type?: string | null;
  base_id?: string | null;
  base_shape_id?: string | null;
  base_type_id?: string | null;
  factions: { id: string; name: string } | null;
  miniature_status: {
    status: string;
    completed_at?: string | null;
    based?: boolean | null;
    magnetised?: boolean | null;
  } | null;
  miniature_photos: { id: string; storage_path: string }[];
  storage_box?: { id: string; name: string; location?: string | null } | null;
  bases?: { id: string; name: string } | null;
  base_shapes?: { id: string; name: string } | null;
  base_types?: { id: string; name: string } | null;
  miniature_games?: Array<{
    game_id: string;
    edition_id?: string | null;
    expansion_id?: string | null;
    game?: { id: string; name: string } | null;
    edition?: { id: string; name: string } | null;
    expansion?: { id: string; name: string } | null;
  }>;
}

interface MiniatureTableViewProps {
  miniatures: MiniatureWithRelations[];
  selectable?: boolean;
  selectedIds?: string[];
  onSelectChange?: (id: string, selected: boolean) => void;
  onMiniaturesUpdate?: (miniatures: MiniatureWithRelations[]) => void;
}

export function MiniatureTableView({
  miniatures,
  selectable,
  selectedIds = [],
  onSelectChange,
  onMiniaturesUpdate,
}: MiniatureTableViewProps) {
  const router = useRouter();
  const [updatingStates, setUpdatingStates] = useState<Record<string, boolean>>({});
  const [selectedMiniatureIndex, setSelectedMiniatureIndex] = useState<number | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [localMiniatures, setLocalMiniatures] = useState(miniatures);
  
  // Separate state to prevent table re-renders
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  
  // Calculate pagination
  const totalItems = localMiniatures.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMiniatures = localMiniatures.slice(startIndex, endIndex);

  // Sync local state with incoming props when miniatures change (e.g., filtering)
  useEffect(() => {
    setLocalMiniatures(miniatures);
    // Reset to first page when miniatures change
    setCurrentPage(1);
  }, [miniatures]);

  const selectedMiniature = selectedMiniatureIndex !== null ? localMiniatures[selectedMiniatureIndex] : null;

  const getBaseTooltip = (miniature: MiniatureWithRelations) => {
    const baseParts: string[] = [];
    
    if (miniature.bases?.name) {
      baseParts.push(miniature.bases.name);
    }
    if (miniature.base_shapes?.name) {
      baseParts.push(miniature.base_shapes.name);
    }
    if (miniature.base_types?.name) {
      baseParts.push(miniature.base_types.name);
    }
    
    return {
      baseInfo: baseParts.length > 0 ? baseParts.join(" ") : null,
      storageBox: miniature.storage_box?.name || null,
    };
  };

  const handleToggle = async (
    miniatureId: string,
    field: "magnetised" | "based",
    value: boolean,
    currentStatus: MiniatureStatus | null
  ) => {
    setUpdatingStates((prev) => ({ ...prev, [`${miniatureId}-${field}`]: true }));
    
    // Optimistically update local state
    setLocalMiniatures((prev) => 
      prev.map((m) => 
        m.id === miniatureId
          ? {
              ...m,
              miniature_status: {
                ...m.miniature_status,
                status: (currentStatus?.status as any) || "backlog",
                [field]: value,
              } as any,
            }
          : m
      )
    );
    
    try {
      await updateMiniatureStatus(miniatureId, {
        status: (currentStatus?.status as any) || "backlog",
        magnetised: field === "magnetised" ? value : currentStatus?.magnetised ?? false,
        based: field === "based" ? value : currentStatus?.based ?? false,
      });
    } catch (error) {
      console.error(`Failed to update ${field}:`, error);
      // Revert optimistic update on error
      setLocalMiniatures(miniatures);
    } finally {
      setUpdatingStates((prev) => ({ ...prev, [`${miniatureId}-${field}`]: false }));
    }
  };

  const openGallery = useCallback((miniature: MiniatureWithRelations) => {
    const index = localMiniatures.findIndex((m) => m.id === miniature.id);
    // Use a single state update to batch the changes
    requestAnimationFrame(() => {
      setSelectedMiniatureIndex(index);
      setSelectedPhotoIndex(0);
      setDialogOpen(true);
    });
  }, [localMiniatures]);

  const closeGallery = useCallback(() => {
    setDialogOpen(false);
    // Delay clearing the selected indices until after animation
    setTimeout(() => {
      setSelectedMiniatureIndex(null);
      setSelectedPhotoIndex(0);
    }, 200);
  }, []);

  const handleNavigate = useCallback((miniatureIndex: number, photoIndex: number) => {
    setSelectedMiniatureIndex(miniatureIndex);
    setSelectedPhotoIndex(photoIndex);
  }, []);

  return (
    <>
      <div className="warhammer-card border-primary/30 rounded-sm overflow-hidden">
        <TooltipProvider>
        <Table>
          <TableHeader>
            <TableRow className="border-primary/20 hover:bg-muted/30">
            {selectable && (
              <TableHead className="w-12 font-bold uppercase text-xs tracking-wide text-primary">
                Select
              </TableHead>
            )}
            <TableHead className="font-bold uppercase text-xs tracking-wide text-primary">
              Faction
            </TableHead>
            <TableHead className="font-bold uppercase text-xs tracking-wide text-primary">
              Unit
            </TableHead>
            <TableHead className="font-bold uppercase text-xs tracking-wide text-primary">
              Name
            </TableHead>
            <TableHead className="font-bold uppercase text-xs tracking-wide text-primary text-center" title="Quantity">
              <Hash className="h-4 w-4 mx-auto" />
            </TableHead>
            <TableHead className="font-bold uppercase text-xs tracking-wide text-primary" title="Status">
              <div className="flex justify-center">
                <Activity className="h-4 w-4" />
              </div>
            </TableHead>
            <TableHead className="font-bold uppercase text-xs tracking-wide text-primary text-center" title="Magnetised">
              <Magnet className="h-4 w-4 mx-auto" />
            </TableHead>
            <TableHead className="font-bold uppercase text-xs tracking-wide text-primary text-center" title="Based">
              <Sprout className="h-4 w-4 mx-auto" />
            </TableHead>
            <TableHead className="font-bold uppercase text-xs tracking-wide text-primary text-center w-[50px]">
            </TableHead>
            <TableHead className="font-bold uppercase text-xs tracking-wide text-primary text-center w-[50px]">
            </TableHead>
            <TableHead className="font-bold uppercase text-xs tracking-wide text-primary text-center w-[50px]">
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentMiniatures.map((miniature) => {
            const baseTooltip = getBaseTooltip(miniature);
            const RowContent = (
              <TableRow
                key={miniature.id}
                className="border-primary/10 hover:bg-muted/20 transition-colors"
              >
              {selectable && (
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.includes(miniature.id)}
                    onCheckedChange={(checked) => {
                      onSelectChange?.(miniature.id, !!checked);
                    }}
                  />
                </TableCell>
              )}
              <TableCell className="text-muted-foreground">
                {miniature.factions?.name ? (
                  <Link
                    href={(() => {
                      const params = new URLSearchParams();
                      params.set('faction', miniature.factions.id);
                      // Use the first game/edition if available
                      const primaryGame = miniature.miniature_games?.[0];
                      if (primaryGame?.game_id) {
                        params.set('game', primaryGame.game_id);
                      }
                      if (primaryGame?.edition_id) {
                        params.set('edition', primaryGame.edition_id);
                      }
                      return `/dashboard/collection?${params.toString()}`;
                    })()}
                    className="hover:text-primary transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {miniature.factions.name}
                  </Link>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {miniature.unit_type ? (
                  <Link
                    href={(() => {
                      const params = new URLSearchParams();
                      params.set('unit', miniature.unit_type);
                      if (miniature.factions?.id) {
                        params.set('faction', miniature.factions.id);
                      }
                      return `/dashboard/collection?${params.toString()}`;
                    })()}
                    className="hover:text-primary transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {miniature.unit_type}
                  </Link>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell>
                <Link
                  href={`/dashboard/collection/${miniature.id}`}
                  className="font-bold hover:text-primary transition-colors tracking-wide"
                >
                  {miniature.name}
                </Link>
              </TableCell>
              <TableCell className="text-center font-bold text-primary">
                {miniature.quantity}
              </TableCell>
              <TableCell>
                <div className="flex justify-center">
                  <StatusBadge
                    miniatureId={miniature.id}
                    status={miniature.miniature_status as MiniatureStatus | null}
                  />
                </div>
              </TableCell>
              <TableCell className="text-center">
                <Switch
                  checked={miniature.miniature_status?.magnetised ?? false}
                  onCheckedChange={(checked) =>
                    handleToggle(miniature.id, "magnetised", checked, miniature.miniature_status)
                  }
                  disabled={updatingStates[`${miniature.id}-magnetised`]}
                  onClick={(e) => e.stopPropagation()}
                />
              </TableCell>
              <TableCell className="text-center">
                <Switch
                  checked={miniature.miniature_status?.based ?? false}
                  onCheckedChange={(checked) =>
                    handleToggle(miniature.id, "based", checked, miniature.miniature_status)
                  }
                  disabled={updatingStates[`${miniature.id}-based`]}
                  onClick={(e) => e.stopPropagation()}
                />
              </TableCell>
              <TableCell className="text-center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openGallery(miniature)}
                  disabled={miniature.miniature_photos.length === 0}
                  title={
                    miniature.miniature_photos.length === 0
                      ? "No photos"
                      : `View ${miniature.miniature_photos.length} photo(s)`
                  }
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </TableCell>
              <TableCell className="text-center">
                <DuplicateMiniatureButton
                  miniatureId={miniature.id}
                  variant="ghost"
                  size="icon"
                  showLabel={false}
                />
              </TableCell>
              <TableCell className="text-center">
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                >
                  <Link href={`/dashboard/collection/${miniature.id}/edit`}>
                    <Edit className="h-4 w-4" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
            );

            return baseTooltip.baseInfo || baseTooltip.storageBox ? (
              <Tooltip key={miniature.id}>
                <TooltipTrigger asChild>
                  {RowContent}
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-sm font-medium">
                    {baseTooltip.baseInfo && <p>{baseTooltip.baseInfo}</p>}
                    {baseTooltip.storageBox && <p>{baseTooltip.storageBox}</p>}
                  </div>
                </TooltipContent>
              </Tooltip>
            ) : (
              RowContent
            );
          })}
        </TableBody>
      </Table>
      </TooltipProvider>
      
      {/* Pagination Controls - Bottom */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-primary/20">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems}
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="text-sm border border-primary/20 rounded px-2 py-1 bg-background"
            >
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
              <option value={200}>200 per page</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm px-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              Last
            </Button>
          </div>
        </div>
      )}
      </div>

      {/* Photo Gallery Dialog - Lazy loaded and rendered outside the table */}
      {dialogOpen && selectedMiniatureIndex !== null && (
        <Suspense fallback={null}>
          <MiniaturePhotoDialog
            miniatures={localMiniatures}
            selectedMiniatureIndex={selectedMiniatureIndex}
            selectedPhotoIndex={selectedPhotoIndex}
            onClose={closeGallery}
            onNavigate={handleNavigate}
          />
        </Suspense>
      )}
    </>
  );
}
