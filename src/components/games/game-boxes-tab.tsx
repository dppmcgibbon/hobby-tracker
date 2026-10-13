"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Box,
  Plus,
  Edit,
  Trash2,
  Layers,
  MapPin,
  Barcode,
  Camera,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  FileText,
  Dice5,
  CreditCard,
  Puzzle,
  LayoutGrid,
  ShieldAlert,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { deleteGameBox } from "@/app/actions/game-boxes";
import { deleteGameComponent, uploadComponentPhoto } from "@/app/actions/game-components";
import { GameBoxFormDialog } from "@/components/games/game-box-form-dialog";
import {
  GameComponentFormDialog,
  COMPONENT_TYPES,
} from "@/components/games/game-component-form-dialog";
import { GameComponentPhotoDialog } from "@/components/games/game-component-photo-dialog";
import { getR2PublicUrl } from "@/lib/r2";
import { getPhotoImageUrl } from "@/lib/photos";
import type { GameBox, GameComponent, GameComponentWithPhotos, Edition, Expansion } from "@/types";
import { toast } from "sonner";

export interface GameBoxWithComponents extends GameBox {
  game_components: GameComponentWithPhotos[];
}

interface GameBoxesTabProps {
  gameId: string;
  editionId?: string | null;
  expansionId?: string | null;
  gameTitle?: string;
  gameBoxes: GameBoxWithComponents[];
  availableEditions?: Edition[];
  availableExpansions?: Expansion[];
}

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  rulebook: FileText,
  cards: CreditCard,
  dice: Dice5,
  tokens: Puzzle,
  tiles: LayoutGrid,
  boards: LayoutGrid,
  miniatures: Box,
  markers: Sparkles,
  scenery: Layers,
  other: Layers,
};

const TYPE_ORDER = COMPONENT_TYPES.map((t) => t.value);

export function GameBoxesTab({
  gameId,
  editionId,
  expansionId,
  gameTitle = "Game",
  gameBoxes,
  availableEditions = [],
  availableExpansions = [],
}: GameBoxesTabProps) {
  const router = useRouter();

  // Dialog state
  const [isAddBoxOpen, setIsAddBoxOpen] = useState(false);
  const [editingBox, setEditingBox] = useState<GameBox | null>(null);
  const [boxToDelete, setBoxToDelete] = useState<GameBox | null>(null);
  const [isDeletingBox, setIsDeletingBox] = useState(false);

  // Component dialog state
  const [boxForNewComponent, setBoxForNewComponent] = useState<GameBox | null>(null);
  const [editingComponent, setEditingComponent] = useState<GameComponent | null>(null);
  const [componentBoxId, setComponentBoxId] = useState<string>("");
  const [componentToDelete, setComponentToDelete] = useState<GameComponent | null>(null);
  const [isDeletingComponent, setIsDeletingComponent] = useState(false);

  // Photo dialog state
  const [activePhotoComponent, setActivePhotoComponent] = useState<GameComponentWithPhotos | null>(null);
  const [uploadingComponentId, setUploadingComponentId] = useState<string | null>(null);
  const rowFileInputRef = useRef<HTMLInputElement>(null);
  const [targetComponentForUpload, setTargetComponentForUpload] = useState<GameComponentWithPhotos | null>(null);

  const handleAddPhotoRowClick = (comp: GameComponentWithPhotos) => {
    setTargetComponentForUpload(comp);
    if (rowFileInputRef.current) {
      rowFileInputRef.current.value = "";
      rowFileInputRef.current.click();
    }
  };

  const handleRowFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetComponentForUpload) return;
    const comp = targetComponentForUpload;
    setUploadingComponentId(comp.id);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await uploadComponentPhoto(comp.id, formData);
      toast.success(`Photo added to ${comp.name}`);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add photo");
    } finally {
      setUploadingComponentId(null);
      setTargetComponentForUpload(null);
      if (rowFileInputRef.current) rowFileInputRef.current.value = "";
    }
  };

  // Collapsible box state: which boxes are expanded to display components
  const [expandedBoxIds, setExpandedBoxIds] = useState<Set<string>>(new Set());

  // Collapsible component type state: which type sections are expanded
  const [expandedTypeKeys, setExpandedTypeKeys] = useState<Set<string>>(new Set());

  const toggleBox = (boxId: string) => {
    setExpandedBoxIds((prev) => {
      const next = new Set(prev);
      if (next.has(boxId)) {
        next.delete(boxId);
      } else {
        next.add(boxId);
      }
      return next;
    });
  };

  const toggleTypeSection = (boxId: string, typeKey: string) => {
    const key = `${boxId}_${typeKey}`;
    setExpandedTypeKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const allExpanded =
    gameBoxes.length > 0 && gameBoxes.every((b) => expandedBoxIds.has(b.id));

  const toggleAllBoxes = () => {
    if (allExpanded) {
      setExpandedBoxIds(new Set());
    } else {
      setExpandedBoxIds(new Set(gameBoxes.map((b) => b.id)));
    }
  };

  const totalComponents = gameBoxes.reduce((acc, b) => acc + (b.game_components?.length || 0), 0);

  const handleDeleteBox = async () => {
    if (!boxToDelete) return;
    setIsDeletingBox(true);
    try {
      await deleteGameBox(boxToDelete.id);
      toast.success(`Game box "${boxToDelete.name}" deleted`);
      setBoxToDelete(null);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete box");
    } finally {
      setIsDeletingBox(false);
    }
  };

  const handleDeleteComponent = async () => {
    if (!componentToDelete) return;
    setIsDeletingComponent(true);
    try {
      await deleteGameComponent(componentToDelete.id);
      toast.success(`Component "${componentToDelete.name}" deleted`);
      setComponentToDelete(null);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete component");
    } finally {
      setIsDeletingComponent(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden file input for component row add photo button */}
      <input
        ref={rowFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleRowFileSelected}
      />

      {/* Top Header Card */}
      <Card className="warhammer-card border-primary/30">
        <CardHeader className="pb-3 border-b border-primary/15 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-xl font-black uppercase tracking-wider text-primary flex items-center gap-2">
              <Box className="h-5 w-5 text-primary" />
              Game Boxes & Components
            </CardTitle>
            <CardDescription className="text-xs uppercase tracking-wide mt-1">
              Physical boxes and component inventory for {gameTitle} ({gameBoxes.length}{" "}
              {gameBoxes.length === 1 ? "box" : "boxes"}, {totalComponents} components)
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {gameBoxes.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAllBoxes}
                className="text-xs border-primary/30 text-primary hover:bg-primary/10 shrink-0"
              >
                {allExpanded ? "Collapse All" : "Expand All"}
              </Button>
            )}
            <Button onClick={() => setIsAddBoxOpen(true)} size="sm" className="shrink-0">
              <Plus className="h-4 w-4 mr-1.5" />
              Add Game Box
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {gameBoxes.length === 0 ? (
            <div className="py-12 px-4 border border-dashed border-primary/30 rounded-lg text-center space-y-3 bg-primary/5">
              <div className="p-3 bg-primary/10 rounded-full border border-primary/20 text-primary inline-flex">
                <Box className="h-8 w-8" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">No Game Boxes Recorded</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                  Add a physical game box for this game to inventory its rulebooks, dice, cards,
                  tokens, and tiles.
                </p>
              </div>
              <Button
                onClick={() => setIsAddBoxOpen(true)}
                variant="outline"
                size="sm"
                className="mt-2 border-primary/40 text-primary hover:bg-primary hover:text-black"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add First Game Box
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {gameBoxes.map((box) => {
                const components = box.game_components || [];
                const isExpanded = expandedBoxIds.has(box.id);
                const isQtyMismatchAny = components.some(
                  (c) => c.quantity_actual < c.quantity_expected || c.status === "missing"
                );
                const totalMissingCount = components.reduce(
                  (acc, c) => acc + Math.max(0, c.quantity_expected - c.quantity_actual),
                  0
                );

                const groupedComponents = Object.entries(
                  components.reduce<Record<string, GameComponentWithPhotos[]>>((acc, comp) => {
                    const typeKey = comp.component_type || "other";
                    if (!acc[typeKey]) acc[typeKey] = [];
                    acc[typeKey].push(comp);
                    return acc;
                  }, {})
                ).sort(([typeA], [typeB]) => {
                  const idxA = TYPE_ORDER.indexOf(typeA);
                  const idxB = TYPE_ORDER.indexOf(typeB);
                  const posA = idxA === -1 ? 999 : idxA;
                  const posB = idxB === -1 ? 999 : idxB;
                  if (posA !== posB) return posA - posB;
                  return typeA.localeCompare(typeB);
                });

                return (
                  <div
                    key={box.id}
                    className={`border rounded-lg bg-card/60 overflow-hidden transition-all shadow-sm ${
                      isExpanded
                        ? "border-primary/50 shadow-md ring-1 ring-primary/20"
                        : "border-primary/20 hover:border-primary/40 hover:bg-card/80"
                    }`}
                  >
                    {/* Box Header Bar / Details (Clickable to toggle components) */}
                    <div
                      role="button"
                      tabIndex={0}
                      aria-expanded={isExpanded}
                      onClick={() => toggleBox(box.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleBox(box.id);
                        }
                      }}
                      className={`p-4 bg-muted/40 hover:bg-muted/60 cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none ${
                        isExpanded ? "border-b border-border/60 bg-muted/50" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="mt-0.5 p-1 rounded bg-primary/10 text-primary border border-primary/20 shrink-0">
                          <ChevronRight
                            className={`h-4 w-4 text-primary transition-transform duration-200 ${
                              isExpanded ? "rotate-90" : ""
                            }`}
                          />
                        </div>

                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-black text-lg text-foreground tracking-wide flex items-center gap-2">
                              <Box className="h-4 w-4 text-primary shrink-0" />
                              {box.name}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-xs uppercase border-primary/30 text-primary font-semibold"
                            >
                              {box.box_type || "Core"}
                            </Badge>
                            {box.condition && (
                              <Badge variant="secondary" className="text-xs capitalize font-medium">
                                {box.condition.replace(/_/g, " ")}
                              </Badge>
                            )}
                            {isQtyMismatchAny && (
                              <Badge
                                variant="outline"
                                className="text-xs border-amber-500/50 text-amber-400 bg-amber-500/10 flex items-center gap-1 font-semibold"
                              >
                                <AlertTriangle className="h-3 w-3" />
                                {totalMissingCount > 0 ? `${totalMissingCount} Missing` : "Incomplete"}
                              </Badge>
                            )}
                          </div>

                          {/* Location & Barcode Info */}
                          {(box.location || box.barcode) && (
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-0.5 ml-6">
                              {box.location && (
                                <span className="flex items-center gap-1 text-foreground/80 font-medium">
                                  <MapPin className="h-3 w-3 text-primary shrink-0" />
                                  {box.location}
                                </span>
                              )}
                              {box.barcode && (
                                <span className="flex items-center gap-1 font-mono text-muted-foreground">
                                  <Barcode className="h-3 w-3 shrink-0" />
                                  {box.barcode}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Box Notes inside header if present */}
                          {box.notes && (
                            <p className="text-xs text-muted-foreground italic pt-1 ml-6">
                              &quot;{box.notes}&quot;
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Box Action Buttons */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingBox(box);
                          }}
                          className="h-8 w-8 hover:text-primary hover:bg-primary/10"
                          title="Edit box"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setBoxToDelete(box);
                          }}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          title="Delete box"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Box Components Content (only displayed when game box is clicked / expanded) */}
                    {isExpanded && (
                      <div className="p-4 bg-muted/10 animate-in fade-in-50 duration-200">
                        <div className="flex items-center justify-end pb-2 mb-3 border-b border-border/40">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setBoxForNewComponent(box);
                              setComponentBoxId(box.id);
                            }}
                            className="h-7 w-7 text-primary hover:bg-primary/10 hover:text-primary"
                            title="Add component"
                            aria-label="Add component"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        {components.length === 0 ? (
                          <div className="py-6 text-center text-xs text-muted-foreground space-y-2">
                            <p>No components recorded in this box yet.</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setBoxForNewComponent(box);
                                setComponentBoxId(box.id);
                              }}
                              className="text-primary hover:bg-primary/10 text-xs font-semibold"
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" />
                              Add component now
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {groupedComponents.map(([typeKey, typeItems]) => {
                              const isTypeExpanded = expandedTypeKeys.has(`${box.id}_${typeKey}`);
                              const SectionIcon = TYPE_ICONS[typeKey] || Layers;
                              const sectionLabel =
                                COMPONENT_TYPES.find((t) => t.value === typeKey)?.label ||
                                typeKey.charAt(0).toUpperCase() + typeKey.slice(1);

                              const missingInGroup = typeItems.reduce(
                                (acc, c) =>
                                  acc + Math.max(0, c.quantity_expected - c.quantity_actual),
                                0
                              );

                              const totalExpectedInGroup = typeItems.reduce(
                                (acc, c) => acc + (c.quantity_expected || 0),
                                0
                              );

                              return (
                                <div key={typeKey} className="space-y-2.5">
                                  {/* Collapsible Component Type Row Header */}
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    aria-expanded={isTypeExpanded}
                                    onClick={() => toggleTypeSection(box.id, typeKey)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        toggleTypeSection(box.id, typeKey);
                                      }
                                    }}
                                    className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all border select-none ${
                                      isTypeExpanded
                                        ? "bg-primary/10 border-primary/40 text-foreground shadow-sm"
                                        : "bg-background/40 hover:bg-muted/40 border-border/60 hover:border-primary/30 text-foreground/90"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <ChevronRight
                                        className={`h-4 w-4 text-primary transition-transform duration-200 shrink-0 ${
                                          isTypeExpanded ? "rotate-90" : ""
                                        }`}
                                      />
                                      <div className="p-1 rounded bg-primary/10 text-primary border border-primary/20 shrink-0">
                                        <SectionIcon className="h-3.5 w-3.5" />
                                      </div>
                                      <h4 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                                        {sectionLabel}
                                        <span className="text-xs font-mono font-normal text-muted-foreground">
                                          ({totalExpectedInGroup}{" "}
                                          {totalExpectedInGroup === 1 ? "item" : "items"})
                                        </span>
                                      </h4>
                                    </div>

                                    {missingInGroup > 0 && (
                                      <Badge
                                        variant="outline"
                                        className="text-[11px] border-amber-500/50 text-amber-400 bg-amber-500/10 flex items-center gap-1 font-semibold"
                                      >
                                        <AlertTriangle className="h-3 w-3" />
                                        Missing {missingInGroup}
                                      </Badge>
                                    )}
                                  </div>

                                  {/* Component Rows within this type (hidden behind collapsible type row) */}
                                  {isTypeExpanded && (
                                    <div className="space-y-3 pl-2 sm:pl-3 animate-in fade-in-50 duration-200">
                                      {typeItems.map((comp) => {
                                      const isQtyMismatch =
                                        comp.quantity_actual < comp.quantity_expected;

                                      const rawImgUrl = comp.image_storage_path
                                        ? getR2PublicUrl(comp.image_storage_path)
                                        : null;
                                      const imgUrl = rawImgUrl
                                        ? getPhotoImageUrl(rawImgUrl, comp.image_updated_at)
                                        : null;

                                      return (
                                        <div
                                          key={comp.id}
                                          className="group/comp relative border border-border/60 hover:border-primary/40 rounded-lg p-3 sm:p-4 bg-background/50 hover:bg-muted/30 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                                        >
                                          {/* Left: Big Image Thumbnail & Info */}
                                          <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
                                            {/* Big Component Thumbnail with click-to-edit photo */}
                                            <div
                                              onClick={() => setActivePhotoComponent(comp)}
                                              className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 shrink-0 rounded-lg border border-border/80 bg-muted/40 hover:border-primary cursor-pointer flex items-center justify-center overflow-hidden transition-all shadow-inner group/img"
                                              title={
                                                comp.photos && comp.photos.length > 1
                                                  ? `View all ${comp.photos.length} photos`
                                                  : "Click to view or edit photo"
                                              }
                                            >
                                              {imgUrl ? (
                                                /* eslint-disable-next-line @next/next/no-img-element */
                                                <img
                                                  src={imgUrl}
                                                  alt={comp.name}
                                                  className="w-full h-full object-contain p-1.5 transition-transform group-hover/img:scale-105"
                                                />
                                              ) : (
                                                <div className="flex flex-col items-center justify-center text-muted-foreground/50 group-hover/img:text-primary transition-colors p-2 text-center">
                                                  <SectionIcon className="h-10 w-10 sm:h-12 sm:h-12 stroke-[1.5]" />
                                                  <span className="text-[10px] uppercase font-bold mt-1 tracking-wider opacity-60">
                                                    No Photo
                                                  </span>
                                                </div>
                                              )}

                                              {/* Photo count badge if multiple photos */}
                                              {comp.photos && comp.photos.length > 1 && (
                                                <div className="absolute bottom-1.5 right-1.5 bg-black/80 backdrop-blur border border-primary/40 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded text-primary flex items-center gap-1 shadow z-10 pointer-events-none">
                                                  <Camera className="h-3 w-3" />
                                                  <span>{comp.photos.length}</span>
                                                </div>
                                              )}

                                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 flex flex-col items-center justify-center transition-opacity text-primary gap-1 z-20">
                                                <Camera className="h-5 w-5" />
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-center px-1">
                                                  {imgUrl
                                                    ? comp.photos && comp.photos.length > 1
                                                      ? `View Photos (${comp.photos.length})`
                                                      : "View Photo"
                                                    : "Add Photo"}
                                                </span>
                                              </div>
                                            </div>

                                            {/* Component Info */}
                                            <div className="flex-1 min-w-0 space-y-1">
                                              {/* Quantity Display above component name */}
                                              <div className="flex items-center gap-1.5 font-mono text-[11px] font-medium text-muted-foreground">
                                                <span>{comp.quantity_actual}</span>
                                                <span>/</span>
                                                <span>{comp.quantity_expected}</span>
                                                {isQtyMismatch && (
                                                  <span
                                                    title={`Missing ${comp.quantity_expected - comp.quantity_actual} piece(s)`}
                                                    className="flex items-center text-destructive text-[10px] font-bold font-sans ml-1 bg-destructive/10 px-1.5 py-0.5 rounded border border-destructive/20"
                                                  >
                                                    <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                                                    Missing {comp.quantity_expected - comp.quantity_actual}
                                                  </span>
                                                )}
                                              </div>

                                              <h4 className="font-bold text-base sm:text-lg text-foreground truncate">
                                                {comp.name}
                                              </h4>

                                              {comp.description && (
                                                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2">
                                                  {comp.description}
                                                </p>
                                              )}
                                            </div>
                                          </div>

                                          {/* Right: Actions */}
                                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => handleAddPhotoRowClick(comp)}
                                              disabled={uploadingComponentId === comp.id}
                                              className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                              title="Add photo"
                                              aria-label="Add photo"
                                            >
                                              {uploadingComponentId === comp.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                              ) : (
                                                <Camera className="h-4 w-4" />
                                              )}
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => {
                                                setEditingComponent(comp);
                                                setComponentBoxId(box.id);
                                              }}
                                              className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                              title="Edit component"
                                              aria-label="Edit component"
                                            >
                                              <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => setComponentToDelete(comp)}
                                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                              title="Delete component"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Game Box Dialog */}
      <GameBoxFormDialog
        box={editingBox}
        gameId={gameId}
        editionId={editionId}
        expansionId={expansionId}
        availableEditions={availableEditions}
        availableExpansions={availableExpansions}
        open={isAddBoxOpen || !!editingBox}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddBoxOpen(false);
            setEditingBox(null);
          }
        }}
      />

      {/* Add / Edit Component Dialog */}
      <GameComponentFormDialog
        component={editingComponent}
        gameBoxId={componentBoxId}
        gameBoxName={boxForNewComponent?.name}
        open={!!boxForNewComponent || !!editingComponent}
        onOpenChange={(open) => {
          if (!open) {
            setBoxForNewComponent(null);
            setEditingComponent(null);
          }
        }}
      />

      {/* Component Photo Editing Dialog (Crop, Erase, Remove BG) */}
      <GameComponentPhotoDialog
        component={activePhotoComponent}
        open={!!activePhotoComponent}
        onOpenChange={(open) => {
          if (!open) setActivePhotoComponent(null);
        }}
      />

      {/* Delete Box Confirmation Alert */}
      <AlertDialog
        open={!!boxToDelete}
        onOpenChange={(open) => {
          if (!open) setBoxToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Delete Game Box: {boxToDelete?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this game box and all associated components inside it.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingBox}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteBox();
              }}
              disabled={isDeletingBox}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingBox && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Box
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Component Confirmation Alert */}
      <AlertDialog
        open={!!componentToDelete}
        onOpenChange={(open) => {
          if (!open) setComponentToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Delete Component: {componentToDelete?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this component and its associated photo?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingComponent}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteComponent();
              }}
              disabled={isDeletingComponent}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingComponent && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Component
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
