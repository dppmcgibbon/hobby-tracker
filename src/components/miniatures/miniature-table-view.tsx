"use client";

import { useState, useEffect, useCallback, lazy, Suspense, Fragment } from "react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Link from "next/link";
import { DuplicateMiniatureButton } from "./duplicate-miniature-button";
import { Edit, Image as ImageIcon, Magnet, Sprout, Activity, Hash, Check, Plus } from "lucide-react";
import { PhotoUpload } from "./photo-upload";
import { StatusIcon } from "./status-icon";
import { createClient } from "@/lib/supabase/client";
import { getPhotoImageUrl } from "@/lib/photos";
import Image from "next/image";

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
  material?: string | null;
  year?: number | null;
  factions: { id: string; name: string } | null;
  miniature_status: {
    status: string;
    completed_at?: string | null;
    based?: boolean | null;
    magnetised?: boolean | null;
  } | null;
  miniature_photos: { id: string; storage_path: string; image_updated_at?: string | null }[];
  storage_box?: { id: string; name: string; location?: string | null } | null;
  bases?: { id: string; name: string } | null;
  base_shapes?: { id: string; name: string } | null;
  base_types?: { id: string; name: string } | null;
  miniature_tags?: Array<{
    tag_id: string;
    tags: { id: string; name: string; color: string | null } | null;
  }>;
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
  const supabase = createClient();
  const [selectedMiniatureIndex, setSelectedMiniatureIndex] = useState<number | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [localMiniatures, setLocalMiniatures] = useState(miniatures);
  
  // Separate state to prevent table re-renders
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // State for expanded info rows
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  
  // Pagination state - persist in URL
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [hasHydrated, setHasHydrated] = useState(false);
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  
  // Read pagination from URL after hydration (client-side only)
  useEffect(() => {
    if (hasHydrated) return; // Only run once after mount
    
    const params = new URLSearchParams(window.location.search);
    const page = params.get('page');
    const perPage = params.get('perPage');
    
    if (page) {
      const pageNum = parseInt(page, 10);
      if (!isNaN(pageNum) && pageNum > 0) {
        setCurrentPage(pageNum);
      }
    }
    
    if (perPage) {
      const perPageNum = parseInt(perPage, 10);
      if (!isNaN(perPageNum) && perPageNum > 0) {
        setItemsPerPage(perPageNum);
      }
    }
    
    setHasHydrated(true);
  }, [hasHydrated]);
  
  // Calculate pagination
  const totalItems = localMiniatures.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  
  // Apply sorting
  const sortedMiniatures = [...localMiniatures].sort((a, b) => {
    if (!sortColumn) return 0;
    
    let comparison = 0;
    
    switch (sortColumn) {
      case "faction":
        const factionA = a.factions?.name || "";
        const factionB = b.factions?.name || "";
        comparison = factionA.localeCompare(factionB);
        // If factions are the same, sort by unit
        if (comparison === 0) {
          const unitA = a.unit_type || "";
          const unitB = b.unit_type || "";
          comparison = unitA.localeCompare(unitB);
          // If units are the same, sort by name
          if (comparison === 0) {
            comparison = a.name.localeCompare(b.name);
          }
        }
        break;
      case "unit":
        const unitA = a.unit_type || "";
        const unitB = b.unit_type || "";
        comparison = unitA.localeCompare(unitB);
        // If units are the same, sort by name
        if (comparison === 0) {
          comparison = a.name.localeCompare(b.name);
        }
        break;
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "quantity":
        comparison = (a.quantity || 0) - (b.quantity || 0);
        // If quantities are the same, sort by name
        if (comparison === 0) {
          comparison = a.name.localeCompare(b.name);
        }
        break;
      case "status":
        const statusA = a.miniature_status?.status || "backlog";
        const statusB = b.miniature_status?.status || "backlog";
        comparison = statusA.localeCompare(statusB);
        // If statuses are the same, sort by name
        if (comparison === 0) {
          comparison = a.name.localeCompare(b.name);
        }
        break;
    }
    
    return sortDirection === "asc" ? comparison : -comparison;
  });
  
  const currentMiniatures = sortedMiniatures.slice(startIndex, endIndex);
  
  // Handle column header click
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new column with ascending direction
      setSortColumn(column);
      setSortDirection("asc");
    }
    // Don't reset page when sorting - user might want to see sorted results on current page
  };

  // Sync local state with incoming props when miniatures change (e.g., filtering)
  useEffect(() => {
    setLocalMiniatures(miniatures);
    // Reset to first page when miniatures change (but only if filters changed, not on refresh)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (!params.get('page')) {
        setCurrentPage(1);
      }
    }
  }, [miniatures]);
  
  // Validate current page when data size changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const newTotalPages = Math.ceil(localMiniatures.length / itemsPerPage);
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(newTotalPages);
    }
  }, [localMiniatures.length, itemsPerPage, currentPage]);

  // Update URL when pagination changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const params = new URLSearchParams(window.location.search);
    
    if (currentPage > 1) {
      params.set('page', currentPage.toString());
    } else {
      params.delete('page');
    }
    
    if (itemsPerPage !== 25) {
      params.set('perPage', itemsPerPage.toString());
    } else {
      params.delete('perPage');
    }
    
    const newUrl = params.toString() 
      ? `${window.location.pathname}?${params.toString()}` 
      : window.location.pathname;
    
    // Only update if URL changed
    if (newUrl !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState({}, '', newUrl);
    }
  }, [currentPage, itemsPerPage]);

  const selectedMiniature = selectedMiniatureIndex !== null ? localMiniatures[selectedMiniatureIndex] : null;

  const openGallery = useCallback((miniature: MiniatureWithRelations, photoIndex = 0) => {
    const index = localMiniatures.findIndex((m) => m.id === miniature.id);
    // Use a single state update to batch the changes
    requestAnimationFrame(() => {
      setSelectedMiniatureIndex(index);
      setSelectedPhotoIndex(photoIndex);
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

  const handlePhotoDeleted = useCallback((miniatureIndex: number, photoIndex: number) => {
    setLocalMiniatures((prev) => {
      const next = prev.map((m, i) => {
        if (i !== miniatureIndex) return m;
        const newPhotos = m.miniature_photos.filter((_, j) => j !== photoIndex);
        return { ...m, miniature_photos: newPhotos };
      });
      return next;
    });
    const mini = localMiniatures[miniatureIndex];
    const remainingCount = mini.miniature_photos.length - 1;
    if (remainingCount === 0) {
      closeGallery();
      return;
    }
    setSelectedPhotoIndex((prev) => Math.min(prev, remainingCount - 1));
  }, [localMiniatures, closeGallery]);

  return (
    <>
      <div className="warhammer-card border-primary/30 rounded-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-primary/20 hover:bg-muted/30">
            {selectable && (
              <TableHead className="w-12 font-bold uppercase text-xs tracking-wide text-primary">
                Select
              </TableHead>
            )}
            <TableHead 
              className="font-bold uppercase text-xs tracking-wide text-primary cursor-pointer hover:bg-muted/20"
              onClick={() => handleSort("faction")}
            >
              Faction
            </TableHead>
            <TableHead 
              className="font-bold uppercase text-xs tracking-wide text-primary cursor-pointer hover:bg-muted/20"
              onClick={() => handleSort("unit")}
            >
              Unit
            </TableHead>
            <TableHead 
              className="font-bold uppercase text-xs tracking-wide text-primary cursor-pointer hover:bg-muted/20"
              onClick={() => handleSort("name")}
            >
              Name
            </TableHead>
            <TableHead 
              className="font-bold uppercase text-xs tracking-wide text-primary text-center cursor-pointer hover:bg-muted/20" 
              title="Quantity"
              onClick={() => handleSort("quantity")}
            >
              <Hash className="h-4 w-4 mx-auto" />
            </TableHead>
            <TableHead 
              className="font-bold uppercase text-xs tracking-wide text-primary cursor-pointer hover:bg-muted/20" 
              title="Status"
              onClick={() => handleSort("status")}
            >
              <div className="flex justify-center items-center">
                <Activity className="h-4 w-4" />
              </div>
            </TableHead>
            <TableHead className="font-bold uppercase text-xs tracking-wide text-primary text-center" title="Magnetised">
              <Magnet className="h-4 w-4 mx-auto" />
            </TableHead>
            <TableHead className="font-bold uppercase text-xs tracking-wide text-primary text-center" title="Based">
              <Sprout className="h-4 w-4 mx-auto" />
            </TableHead>
            <TableHead className="font-bold uppercase text-xs tracking-wide text-primary text-center w-[50px]" title="Photos & Info">
            </TableHead>
            <TableHead className="font-bold uppercase text-xs tracking-wide text-primary text-center w-[50px]">
            </TableHead>
            <TableHead className="font-bold uppercase text-xs tracking-wide text-primary text-center w-[50px]">
              <Button
                asChild
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                title="Add Miniature"
              >
                <Link href="/dashboard/miniatures/add">
                  <Plus className="h-4 w-4" />
                </Link>
              </Button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentMiniatures.map((miniature) => (
            <Fragment key={miniature.id}>
            <TableRow
              className="border-primary/10 hover:bg-muted/20 transition-colors cursor-pointer"
              onClick={() => setExpandedRowId(expandedRowId === miniature.id ? null : miniature.id)}
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
                      return `/dashboard/miniatures?${params.toString()}`;
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
                      return `/dashboard/miniatures?${params.toString()}`;
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
                  href={`/dashboard/miniatures/${miniature.id}`}
                  className="font-bold hover:text-primary transition-colors tracking-wide"
                >
                  {miniature.name}
                </Link>
              </TableCell>
              <TableCell className="text-center font-bold text-primary">
                {miniature.quantity}
              </TableCell>
              <TableCell className="text-center">
                <div className="flex justify-center">
                  <StatusIcon status={miniature.miniature_status} />
                </div>
              </TableCell>
              <TableCell className="text-center">
                {miniature.miniature_status?.magnetised ? (
                  <Check className="h-4 w-4 mx-auto text-primary" />
                ) : (
                  ""
                )}
              </TableCell>
              <TableCell className="text-center">
                {miniature.miniature_status?.based ? (
                  <Check className="h-4 w-4 mx-auto text-primary" />
                ) : (
                  ""
                )}
              </TableCell>
              <TableCell className="text-center">
                <Button
                  variant="ghost"
                  size="icon"
                  title="View details and photos"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedRowId(expandedRowId === miniature.id ? null : miniature.id);
                  }}
                >
                  <ImageIcon className={`h-4 w-4 ${miniature.miniature_photos?.length ? 'text-primary' : ''}`} />
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
                  <Link href={`/dashboard/miniatures/${miniature.id}/edit`}>
                    <Edit className="h-4 w-4" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
            {/* Accordion row for additional info */}
            {expandedRowId === miniature.id && (
              <TableRow className="border-primary/10 bg-stone-900 hover:bg-stone-900">
                <TableCell colSpan={selectable ? 12 : 11} className="py-2">
                  <div className="flex gap-4 px-4 py-3 items-stretch">
                    {/* Left side - Details */}
                    <div className="flex-1 border border-primary/20 rounded p-3 pl-6 flex flex-col justify-center">
                      {/* Game */}
                      <div className="grid grid-cols-[140px_1fr] gap-4 py-1.5">
                        <div className="text-sm font-bold text-primary">Game:</div>
                        <div className="text-sm">
                          {miniature.miniature_games && miniature.miniature_games.length > 0
                            ? miniature.miniature_games
                                .map((mg) => mg.game?.name)
                                .filter(Boolean)
                                .join(", ")
                            : "-"}
                        </div>
                      </div>

                      {/* Edition */}
                      <div className="grid grid-cols-[140px_1fr] gap-4 py-1.5">
                        <div className="text-sm font-bold text-primary">Edition:</div>
                        <div className="text-sm">
                          {miniature.miniature_games && miniature.miniature_games.length > 0
                            ? miniature.miniature_games
                                .map((mg) => mg.edition?.name)
                                .filter(Boolean)
                                .join(", ")
                            : "-"}
                        </div>
                      </div>

                      {/* Expansion */}
                      <div className="grid grid-cols-[140px_1fr] gap-4 py-1.5">
                        <div className="text-sm font-bold text-primary">Expansion:</div>
                        <div className="text-sm">
                          {miniature.miniature_games && miniature.miniature_games.length > 0
                            ? miniature.miniature_games
                                .map((mg) => mg.expansion?.name)
                                .filter(Boolean)
                                .join(", ")
                            : "-"}
                        </div>
                      </div>

                      {/* Base Details */}
                      <div className="grid grid-cols-[140px_1fr] gap-4 py-1.5">
                        <div className="text-sm font-bold text-primary">Base:</div>
                        <div className="text-sm">
                          {miniature.bases || miniature.base_shapes || miniature.base_types
                            ? [
                                miniature.bases?.name,
                                miniature.base_shapes?.name,
                                miniature.base_types?.name,
                              ]
                                .filter(Boolean)
                                .join(" ")
                            : "-"}
                        </div>
                      </div>

                      {/* Material */}
                      <div className="grid grid-cols-[140px_1fr] gap-4 py-1.5">
                        <div className="text-sm font-bold text-primary">Material:</div>
                        <div className="text-sm">
                          {miniature.material || "-"}
                        </div>
                      </div>

                      {/* Year */}
                      <div className="grid grid-cols-[140px_1fr] gap-4 py-1.5">
                        <div className="text-sm font-bold text-primary">Year:</div>
                        <div className="text-sm">
                          {miniature.year || "-"}
                        </div>
                      </div>

                      {/* Storage Box */}
                      <div className="grid grid-cols-[140px_1fr] gap-4 py-1.5">
                        <div className="text-sm font-bold text-primary">Storage Box:</div>
                        <div className="text-sm">
                          {miniature.storage_box ? (
                            <Link
                              href={`/dashboard/storage/${miniature.storage_box.id}`}
                              className="hover:text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {miniature.storage_box.name}
                            </Link>
                          ) : (
                            "-"
                          )}
                        </div>
                      </div>

                      {/* Photos Count */}
                      <div className="grid grid-cols-[140px_1fr] gap-4 py-1.5">
                        <div className="text-sm font-bold text-primary">Photos:</div>
                        <div className="text-sm">
                          {miniature.miniature_photos?.length || 0}
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="grid grid-cols-[140px_1fr] gap-4 py-1.5">
                        <div className="text-sm font-bold text-primary">Tags:</div>
                        <div className="flex flex-wrap gap-1">
                          {miniature.miniature_tags && miniature.miniature_tags.length > 0 ? (
                            miniature.miniature_tags.map((mt) => 
                              mt.tags ? (
                                <Badge
                                  key={mt.tag_id}
                                  style={{
                                    backgroundColor: mt.tags.color || undefined,
                                  }}
                                  className="text-xs"
                                >
                                  {mt.tags.name}
                                </Badge>
                              ) : null
                            )
                          ) : (
                            <span className="text-sm">-</span>
                          )}
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="grid grid-cols-[140px_1fr] gap-4 py-1.5">
                        <div className="text-sm font-bold text-primary">Notes:</div>
                        <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {(miniature as any).notes || "-"}
                        </div>
                      </div>
                    </div>

                    {/* Right side - Photo Upload + Gallery */}
                    <div className="flex-1 border border-primary/20 rounded p-3 flex flex-col gap-4 min-w-0">
                      <div>
                        <p className="text-xs font-bold text-primary mb-2">Upload Photo</p>
                        <PhotoUpload miniatureId={miniature.id} compact />
                      </div>
                      {miniature.miniature_photos && miniature.miniature_photos.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-primary mb-2">Photos</p>
                          <div className="flex gap-5 justify-center items-center flex-wrap">
                            {miniature.miniature_photos.slice(0, 3).map((photo, index) => {
                            const publicUrl = supabase.storage
                              .from("miniature-photos")
                              .getPublicUrl(photo.storage_path).data.publicUrl;
                            const imageUrl = getPhotoImageUrl(publicUrl, photo.image_updated_at);
                            return (
                              <div
                                key={photo.id}
                                className="relative aspect-square rounded overflow-hidden border-2 border-primary/70 cursor-pointer hover:border-primary transition-colors min-h-[160px]"
                                onClick={() => openGallery(miniature, index)}
                              >
                                <Image
                                  src={imageUrl}
                                  alt={miniature.name}
                                  fill
                                  className="object-cover"
                                  sizes="200px"
                                />
                              </div>
                            );
                          })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
            </Fragment>
          ))}
        </TableBody>
      </Table>
      
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
                const newItemsPerPage = Number(e.target.value);
                setItemsPerPage(newItemsPerPage);
                // Adjust current page if it would be out of bounds with new items per page
                const newTotalPages = Math.ceil(totalItems / newItemsPerPage);
                if (currentPage > newTotalPages) {
                  setCurrentPage(Math.max(1, newTotalPages));
                }
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
            onPhotoDeleted={handlePhotoDeleted}
          />
        </Suspense>
      )}
    </>
  );
}
