"use client";

import { useState } from "react";
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
} from "lucide-react";
import { deleteGameBox } from "@/app/actions/game-boxes";
import { deleteGameComponent } from "@/app/actions/game-components";
import { GameBoxFormDialog } from "@/components/games/game-box-form-dialog";
import {
  GameComponentFormDialog,
  COMPONENT_TYPES,
  COMPONENT_STATUSES,
} from "@/components/games/game-component-form-dialog";
import { GameComponentPhotoDialog } from "@/components/games/game-component-photo-dialog";
import { getR2PublicUrl } from "@/lib/r2";
import { getPhotoImageUrl } from "@/lib/photos";
import type { GameBox, GameComponent, Edition, Expansion } from "@/types";
import { toast } from "sonner";

export interface GameBoxWithComponents extends GameBox {
  game_components: GameComponent[];
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
  other: Layers,
};

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
  const [activePhotoComponent, setActivePhotoComponent] = useState<GameComponent | null>(null);

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

          <Button onClick={() => setIsAddBoxOpen(true)} size="sm" className="shrink-0">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Game Box
          </Button>
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
                return (
                  <div
                    key={box.id}
                    className="border border-primary/20 hover:border-primary/40 rounded-lg bg-card/60 overflow-hidden transition-all shadow-sm"
                  >
                    {/* Box Header Bar */}
                    <div className="p-4 bg-muted/40 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black text-lg text-foreground tracking-wide flex items-center gap-2">
                            <Box className="h-4 w-4 text-primary" />
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
                        </div>

                        {/* Location & Barcode Info */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-0.5">
                          {box.location && (
                            <span className="flex items-center gap-1 text-foreground/80 font-medium">
                              <MapPin className="h-3 w-3 text-primary" />
                              {box.location}
                            </span>
                          )}
                          {box.barcode && (
                            <span className="flex items-center gap-1 font-mono text-muted-foreground">
                              <Barcode className="h-3 w-3" />
                              {box.barcode}
                            </span>
                          )}
                          <span className="text-muted-foreground">
                            {components.length}{" "}
                            {components.length === 1 ? "component" : "components"}
                          </span>
                        </div>
                      </div>

                      {/* Box Action Buttons */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setBoxForNewComponent(box);
                            setComponentBoxId(box.id);
                          }}
                          className="text-xs border-primary/30 text-primary hover:bg-primary/10"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Add Component
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingBox(box)}
                          className="h-8 w-8 hover:text-primary hover:bg-primary/10"
                          title="Edit box"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setBoxToDelete(box)}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          title="Delete box"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Box Notes */}
                    {box.notes && (
                      <div className="px-4 py-2 bg-muted/20 text-xs text-muted-foreground border-b border-border/40 italic">
                        &quot;{box.notes}&quot;
                      </div>
                    )}

                    {/* Box Components Content */}
                    <div className="p-4">
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {components.map((comp) => {
                            const TypeIcon = TYPE_ICONS[comp.component_type] || Layers;
                            const isQtyMismatch = comp.quantity_actual < comp.quantity_expected;
                            const typeLabel =
                              COMPONENT_TYPES.find((t) => t.value === comp.component_type)?.label ||
                              comp.component_type;
                            const statusLabel =
                              COMPONENT_STATUSES.find((s) => s.value === comp.status)?.label ||
                              comp.status;

                            const rawImgUrl = comp.image_storage_path
                              ? getR2PublicUrl(comp.image_storage_path)
                              : null;
                            const imgUrl = rawImgUrl
                              ? getPhotoImageUrl(rawImgUrl, comp.image_updated_at)
                              : null;

                            return (
                              <div
                                key={comp.id}
                                className="group/comp relative border border-border/60 hover:border-primary/40 rounded-lg p-3 bg-background/50 hover:bg-muted/30 transition-all flex flex-col justify-between gap-2.5"
                              >
                                <div className="flex items-start gap-3">
                                  {/* Component Thumbnail with click-to-edit photo */}
                                  <div
                                    onClick={() => setActivePhotoComponent(comp)}
                                    className="relative w-14 h-14 shrink-0 rounded-md border border-border/80 bg-muted/40 hover:border-primary cursor-pointer flex items-center justify-center overflow-hidden transition-all shadow-inner group/img"
                                    title="Click to view or edit photo"
                                  >
                                    {imgUrl ? (
                                      /* eslint-disable-next-line @next/next/no-img-element */
                                      <img
                                        src={imgUrl}
                                        alt={comp.name}
                                        className="w-full h-full object-contain p-1"
                                      />
                                    ) : (
                                      <TypeIcon className="h-6 w-6 text-muted-foreground/50 group-hover/img:text-primary" />
                                    )}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity text-primary">
                                      <Camera className="h-4 w-4" />
                                    </div>
                                  </div>

                                  {/* Info */}
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-sm text-foreground truncate">
                                      {comp.name}
                                    </h4>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] px-1.5 py-0 h-4 uppercase text-muted-foreground"
                                      >
                                        {typeLabel.split("/")[0].trim()}
                                      </Badge>
                                      <Badge
                                        variant={
                                          comp.status === "complete" ? "secondary" : "outline"
                                        }
                                        className={`text-[10px] px-1.5 py-0 h-4 capitalize ${
                                          comp.status !== "complete"
                                            ? "border-amber-500/50 text-amber-400 bg-amber-500/10"
                                            : ""
                                        }`}
                                      >
                                        {statusLabel.split("/")[0].trim()}
                                      </Badge>
                                    </div>

                                    {comp.description && (
                                      <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-1">
                                        {comp.description}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Footer Bar: Quantity & Actions */}
                                <div className="flex items-center justify-between border-t border-border/40 pt-2 text-xs">
                                  <div className="flex items-center gap-1 font-mono">
                                    <span className="text-muted-foreground text-[11px]">Qty:</span>
                                    <span
                                      className={`font-bold ${
                                        isQtyMismatch ? "text-destructive" : "text-primary"
                                      }`}
                                    >
                                      {comp.quantity_actual}
                                    </span>
                                    <span className="text-muted-foreground">/</span>
                                    <span className="text-muted-foreground">
                                      {comp.quantity_expected}
                                    </span>
                                    {isQtyMismatch && (
                                      <span
                                        title={`Missing ${comp.quantity_expected - comp.quantity_actual} piece(s)`}
                                      >
                                        <AlertTriangle className="h-3 w-3 text-destructive ml-1" />
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setActivePhotoComponent(comp)}
                                      className="h-6 w-6 text-muted-foreground hover:text-primary"
                                      title="Manage photo (Crop, Erase, Remove BG)"
                                    >
                                      <Camera className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setEditingComponent(comp);
                                        setComponentBoxId(box.id);
                                      }}
                                      className="h-6 w-6 text-muted-foreground hover:text-primary"
                                      title="Edit component"
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setComponentToDelete(comp)}
                                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                      title="Delete component"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
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
