"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Link from "next/link";
import Image from "next/image";
import { StatusBadge } from "./status-badge";
import { DuplicateMiniatureButton } from "./duplicate-miniature-button";
import { Edit, Trash2, Image as ImageIcon, ChevronLeft, ChevronRight, X, Magnet, Sprout, Activity, Hash } from "lucide-react";
import { updateMiniatureStatus } from "@/app/actions/miniatures";
import { createClient } from "@/lib/supabase/client";
import type { MiniatureStatus } from "@/types";

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
}

interface MiniatureTableViewProps {
  miniatures: MiniatureWithRelations[];
  selectable?: boolean;
  selectedIds?: string[];
  onSelectChange?: (id: string, selected: boolean) => void;
}

export function MiniatureTableView({
  miniatures,
  selectable,
  selectedIds = [],
  onSelectChange,
}: MiniatureTableViewProps) {
  const router = useRouter();
  const supabase = createClient();
  const [updatingStates, setUpdatingStates] = useState<Record<string, boolean>>({});
  const [selectedMiniatureIndex, setSelectedMiniatureIndex] = useState<number | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  const selectedMiniature = selectedMiniatureIndex !== null ? miniatures[selectedMiniatureIndex] : null;

  const getBaseTooltip = (miniature: MiniatureWithRelations) => {
    const baseParts: string[] = [];
    
    if (miniature.bases?.name) {
      baseParts.push(`Base: ${miniature.bases.name}`);
    }
    if (miniature.base_shapes?.name) {
      baseParts.push(`Shape: ${miniature.base_shapes.name}`);
    }
    if (miniature.base_types?.name) {
      baseParts.push(`Type: ${miniature.base_types.name}`);
    }
    
    return baseParts.length > 0 ? baseParts.join(", ") : null;
  };

  const handleToggle = async (
    miniatureId: string,
    field: "magnetised" | "based",
    value: boolean,
    currentStatus: MiniatureStatus | null
  ) => {
    setUpdatingStates((prev) => ({ ...prev, [`${miniatureId}-${field}`]: true }));
    try {
      await updateMiniatureStatus(miniatureId, {
        status: (currentStatus?.status as any) || "backlog",
        magnetised: field === "magnetised" ? value : currentStatus?.magnetised ?? false,
        based: field === "based" ? value : currentStatus?.based ?? false,
      });
      router.refresh();
    } catch (error) {
      console.error(`Failed to update ${field}:`, error);
    } finally {
      setUpdatingStates((prev) => ({ ...prev, [`${miniatureId}-${field}`]: false }));
    }
  };

  const openGallery = (miniature: MiniatureWithRelations) => {
    const index = miniatures.findIndex((m) => m.id === miniature.id);
    setSelectedMiniatureIndex(index);
    setSelectedPhotoIndex(0);
  };

  const closeGallery = () => {
    setSelectedMiniatureIndex(null);
    setSelectedPhotoIndex(0);
  };

  const goToPrevious = () => {
    if (!selectedMiniature) return;
    
    if (selectedPhotoIndex > 0) {
      // Go to previous photo of same miniature
      setSelectedPhotoIndex(selectedPhotoIndex - 1);
    } else if (selectedMiniatureIndex !== null && selectedMiniatureIndex > 0) {
      // Go to previous miniature (only if it has photos)
      let prevIndex = selectedMiniatureIndex - 1;
      while (prevIndex >= 0) {
        if (miniatures[prevIndex].miniature_photos.length > 0) {
          setSelectedMiniatureIndex(prevIndex);
          setSelectedPhotoIndex(miniatures[prevIndex].miniature_photos.length - 1); // Start at last photo
          return;
        }
        prevIndex--;
      }
    }
  };

  const goToNext = () => {
    if (!selectedMiniature) return;
    
    if (selectedPhotoIndex < selectedMiniature.miniature_photos.length - 1) {
      // Go to next photo of same miniature
      setSelectedPhotoIndex(selectedPhotoIndex + 1);
    } else if (selectedMiniatureIndex !== null && selectedMiniatureIndex < miniatures.length - 1) {
      // Go to next miniature (only if it has photos)
      let nextIndex = selectedMiniatureIndex + 1;
      while (nextIndex < miniatures.length) {
        if (miniatures[nextIndex].miniature_photos.length > 0) {
          setSelectedMiniatureIndex(nextIndex);
          setSelectedPhotoIndex(0); // Start at first photo
          return;
        }
        nextIndex++;
      }
    }
  };

  return (
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
          {miniatures.map((miniature) => {
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
                    href={`/dashboard/collection?faction=${miniature.factions.id}`}
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
                    href={`/dashboard/collection?unit=${encodeURIComponent(miniature.unit_type)}`}
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

            return baseTooltip ? (
              <Tooltip key={miniature.id}>
                <TooltipTrigger asChild>
                  {RowContent}
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-sm font-medium">{baseTooltip}</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              RowContent
            );
          })}
        </TableBody>
      </Table>
      </TooltipProvider>

      {/* Photo Gallery Dialog */}
      {selectedMiniature && (
        <Dialog open={!!selectedMiniature} onOpenChange={closeGallery}>
          <DialogContent className="max-w-4xl p-0">
            <DialogTitle className="sr-only">
              {selectedMiniature.miniature_photos[selectedPhotoIndex]
                ? `${selectedMiniature.name} photo ${selectedPhotoIndex + 1}`
                : selectedMiniature.name}
            </DialogTitle>
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10"
                onClick={closeGallery}
              >
                <X className="h-4 w-4" />
              </Button>

              {/* Miniature Name */}
              <div className="absolute top-2 left-2 z-10 bg-background/80 backdrop-blur px-3 py-1 rounded-sm">
                <p className="text-sm font-semibold">{selectedMiniature.name}</p>
              </div>

              {selectedMiniature.miniature_photos.length > 0 ? (
                <>
                  <div className="relative w-full h-[70vh]">
                    <Image
                      src={
                        supabase.storage
                          .from("miniature-photos")
                          .getPublicUrl(
                            selectedMiniature.miniature_photos[selectedPhotoIndex].storage_path
                          ).data.publicUrl
                      }
                      alt={`${selectedMiniature.name} photo ${selectedPhotoIndex + 1}`}
                      fill
                      sizes="(max-width: 1024px) 100vw, 896px"
                      className="object-contain"
                      priority
                      unoptimized
                    />
                  </div>

                  {/* Navigation - Always show if we can navigate */}
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur hover:bg-background/90"
                      onClick={goToPrevious}
                      disabled={selectedMiniatureIndex === 0 && selectedPhotoIndex === 0}
                      title="Previous photo or miniature"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur hover:bg-background/90"
                      onClick={goToNext}
                      disabled={
                        selectedMiniatureIndex === miniatures.length - 1 &&
                        selectedPhotoIndex === selectedMiniature.miniature_photos.length - 1
                      }
                      title="Next photo or miniature"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </Button>
                  </>

                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur px-3 py-1 rounded-full text-sm">
                    {selectedPhotoIndex + 1} / {selectedMiniature.miniature_photos.length}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-[50vh] text-muted-foreground">
                  No photos available
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
