"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
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
  Package,
  Plus,
  Edit,
  Trash2,
  Copy,
  RotateCcw,
  Layers,
  MapPin,
  Barcode,
  Camera,
  AlertTriangle,
  Sparkles,
  FileText,
  Dice5,
  CreditCard,
  Puzzle,
  LayoutGrid,
  ShieldAlert,
  Loader2,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Search,
  ExternalLink,
  Gamepad2,
  ArrowUpDown,
  ArrowDownAZ,
  CheckCircle2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteGameBox, duplicateGameBox } from "@/app/actions/game-boxes";
import {
  deleteGameComponent,
  uploadComponentPhoto,
  reorderGameComponents,
  resetGameBoxActualQuantities,
} from "@/app/actions/game-components";
import { GameBoxFormDialog } from "@/components/games/game-box-form-dialog";
import {
  GameComponentFormDialog,
  COMPONENT_TYPES,
} from "@/components/games/game-component-form-dialog";
import { GameComponentPhotoDialog } from "@/components/games/game-component-photo-dialog";
import { DuplicateGameComponentDialog } from "@/components/games/duplicate-game-component-dialog";
import { getR2PublicUrl } from "@/lib/r2";
import { getPhotoImageUrl } from "@/lib/photos";
import type { GameBox, GameComponent, GameComponentWithPhotos, Edition, Expansion } from "@/types";
import { toast } from "sonner";

export interface GameBoxWithComponents extends GameBox {
  game_components: GameComponentWithPhotos[];
  game?: {
    id: string;
    name: string;
    universe_id?: string | null;
    sequence?: number | null;
    universe?: { id: string; name: string } | null;
  } | null;
  edition?: { id: string; name: string; sequence?: number | null; year?: number | null } | null;
  expansion?: { id: string; name: string; sequence?: number | null; year?: number | null } | null;
  linked_miniatures_count?: number;
}

export type BoxSortOption = "game" | "name-asc" | "name-desc" | "components-desc" | "missing";

export interface GameBoxesGroup {
  gameId: string;
  gameName: string;
  universeName?: string;
  universeId?: string;
  game?: {
    id: string;
    name: string;
    universe_id?: string | null;
    universe?: { id: string; name: string } | null;
  } | null;
  boxes: GameBoxWithComponents[];
  totalComponents: number;
  totalMissing: number;
}

interface GameBoxesTabProps {
  gameId?: string;
  editionId?: string | null;
  expansionId?: string | null;
  gameTitle?: string;
  gameBoxes: GameBoxWithComponents[];
  availableEditions?: Edition[];
  availableExpansions?: Expansion[];
  universes?: { id: string; name: string }[];
  showUniverseFilter?: boolean;
  initialUniverseId?: string;
  initialSortBy?: BoxSortOption;
  initialSearchQuery?: string;
  showGameInfo?: boolean;
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

function getGroupedComponents(components: GameComponentWithPhotos[]) {
  return Object.entries(
    components.reduce<Record<string, GameComponentWithPhotos[]>>((acc, comp) => {
      const typeKey = comp.component_type || "other";
      if (!acc[typeKey]) acc[typeKey] = [];
      acc[typeKey].push(comp);
      return acc;
    }, {})
  )
    .map(([typeKey, items]) => {
      const sorted = [...items].sort((a, b) => {
        const orderA = a.display_order ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.display_order ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        const nameCmp = a.name.localeCompare(b.name, undefined, {
          numeric: true,
          sensitivity: "base",
        });
        if (nameCmp !== 0) return nameCmp;
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      });
      return [typeKey, sorted] as [string, GameComponentWithPhotos[]];
    })
    .sort(([typeA], [typeB]) => {
      const idxA = TYPE_ORDER.indexOf(typeA);
      const idxB = TYPE_ORDER.indexOf(typeB);
      const posA = idxA === -1 ? 999 : idxA;
      const posB = idxB === -1 ? 999 : idxB;
      if (posA !== posB) return posA - posB;
      return typeA.localeCompare(typeB);
    });
}

export function GameBoxesTab({
  gameId,
  editionId,
  expansionId,
  gameTitle = "Game",
  gameBoxes,
  availableEditions = [],
  availableExpansions = [],
  universes = [],
  showUniverseFilter = false,
  initialUniverseId = "all",
  initialSortBy,
  initialSearchQuery = "",
  showGameInfo = false,
}: GameBoxesTabProps) {
  const router = useRouter();

  // Local state for game boxes to allow immediate optimistic updates
  const [boxes, setBoxes] = useState<GameBoxWithComponents[]>(gameBoxes);

  // Sorting state: default to "game" on global boxes page, "name-asc" elsewhere
  const [sortBy, setSortBy] = useState<BoxSortOption>(
    initialSortBy || (showUniverseFilter ? "game" : "name-asc")
  );

  // Collapsible game section state: which games are expanded (default to collapsed on initial page open)
  const [expandedGameIds, setExpandedGameIds] = useState<Set<string>>(new Set());

  const toggleGameExpand = (gameId: string) => {
    setExpandedGameIds((prev) => {
      const next = new Set(prev);
      if (next.has(gameId)) {
        next.delete(gameId);
      } else {
        next.add(gameId);
      }
      return next;
    });
  };

  useEffect(() => {
    setBoxes(gameBoxes);
  }, [gameBoxes]);

  // Drag and drop state for components
  const [draggedCompId, setDraggedCompId] = useState<string | null>(null);
  const [dragOverCompId, setDragOverCompId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<"before" | "after" | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // Dialog state
  const [isAddBoxOpen, setIsAddBoxOpen] = useState(false);
  const [editingBox, setEditingBox] = useState<GameBox | null>(null);
  const [boxToDelete, setBoxToDelete] = useState<GameBox | null>(null);
  const [isDeletingBox, setIsDeletingBox] = useState(false);

  // Duplicate box state
  const [boxToDuplicate, setBoxToDuplicate] = useState<GameBoxWithComponents | null>(null);
  const [duplicateNewName, setDuplicateNewName] = useState("");
  const [isDuplicating, setIsDuplicating] = useState(false);

  // Reset actual quantities state
  const [boxToResetActual, setBoxToResetActual] = useState<GameBoxWithComponents | null>(null);
  const [isResettingActual, setIsResettingActual] = useState(false);

  const handleConfirmDuplicate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boxToDuplicate || !duplicateNewName.trim()) return;

    setIsDuplicating(true);
    try {
      await duplicateGameBox(boxToDuplicate.id, duplicateNewName.trim());
      toast.success(
        `Game box "${duplicateNewName.trim()}" duplicated successfully with all components and photos!`
      );
      setBoxToDuplicate(null);
      setDuplicateNewName("");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to duplicate game box");
    } finally {
      setIsDuplicating(false);
    }
  };

  // Component dialog state
  const [boxForNewComponent, setBoxForNewComponent] = useState<GameBox | null>(null);
  const [editingComponent, setEditingComponent] = useState<GameComponent | null>(null);
  const [componentBoxId, setComponentBoxId] = useState<string>("");
  const [componentToDelete, setComponentToDelete] = useState<GameComponent | null>(null);
  const [isDeletingComponent, setIsDeletingComponent] = useState(false);

  // Duplicate component state
  const [componentToDuplicate, setComponentToDuplicate] = useState<GameComponentWithPhotos | null>(
    null
  );
  const [componentToDuplicateBoxId, setComponentToDuplicateBoxId] = useState<string>("");

  const handleOpenDuplicateComponent = (comp: GameComponentWithPhotos, boxId: string) => {
    setComponentToDuplicate(comp);
    setComponentToDuplicateBoxId(boxId);
  };

  const handleComponentDuplicated = (newComp: GameComponentWithPhotos) => {
    if (!newComp) return;
    setBoxes((prev) =>
      prev.map((b) => {
        if (b.id !== newComp.game_box_id) return b;
        return {
          ...b,
          game_components: [...(b.game_components || []), newComp],
        };
      })
    );
  };

  // Photo dialog state
  const [activePhotoComponent, setActivePhotoComponent] = useState<GameComponentWithPhotos | null>(
    null
  );
  const [uploadingComponentId, setUploadingComponentId] = useState<string | null>(null);
  const rowFileInputRef = useRef<HTMLInputElement>(null);
  const [targetComponentForUpload, setTargetComponentForUpload] =
    useState<GameComponentWithPhotos | null>(null);

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

  // Universe & search filtering (for global boxes view)
  const [selectedUniverseId, setSelectedUniverseId] = useState<string>(initialUniverseId || "all");
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || "");

  const filteredBoxes = useMemo(() => {
    return boxes.filter((box) => {
      if (showUniverseFilter && selectedUniverseId !== "all") {
        const uId = box.game?.universe_id || box.game?.universe?.id;
        if (uId !== selectedUniverseId) {
          return false;
        }
      }
      if (showUniverseFilter && searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = box.name.toLowerCase().includes(q);
        const matchGame = box.game?.name?.toLowerCase().includes(q);
        const matchUniverse = box.game?.universe?.name?.toLowerCase().includes(q);
        const matchLoc = box.location?.toLowerCase().includes(q);
        const matchBarcode = box.barcode?.toLowerCase().includes(q);
        const matchNotes = box.notes?.toLowerCase().includes(q);
        const matchComp = (box.game_components || []).some((c) => c.name.toLowerCase().includes(q));
        return (
          matchName ||
          matchGame ||
          matchUniverse ||
          matchLoc ||
          matchBarcode ||
          matchNotes ||
          matchComp
        );
      }
      return true;
    });
  }, [boxes, showUniverseFilter, selectedUniverseId, searchQuery]);

  const gameGroups = useMemo<GameBoxesGroup[]>(() => {
    const groupsMap = new Map<string, GameBoxesGroup>();

    for (const box of filteredBoxes) {
      const gId = box.game?.id || "unassigned";
      const gName = box.game?.name || "Standalone / Other Boxes";
      const uName = box.game?.universe?.name;
      const uId = box.game?.universe_id || box.game?.universe?.id;

      if (!groupsMap.has(gId)) {
        groupsMap.set(gId, {
          gameId: gId,
          gameName: gName,
          universeName: uName,
          universeId: uId,
          game: box.game,
          boxes: [],
          totalComponents: 0,
          totalMissing: 0,
        });
      }

      const grp = groupsMap.get(gId)!;
      grp.boxes.push(box);
      const comps = box.game_components || [];
      grp.totalComponents += comps.length;
      grp.totalMissing += comps.reduce(
        (acc, c) => acc + Math.max(0, c.quantity_expected - c.quantity_actual),
        0
      );
    }

    for (const grp of groupsMap.values()) {
      grp.boxes.sort((a, b) => {
        // 1. Order by edition sequence (lowest sequence first)
        const editionSeqA = a.edition?.sequence ?? Number.MAX_SAFE_INTEGER;
        const editionSeqB = b.edition?.sequence ?? Number.MAX_SAFE_INTEGER;
        if (editionSeqA !== editionSeqB) {
          return editionSeqA - editionSeqB;
        }

        // 2. Order by expansion sequence (lowest sequence first: e.g. 1 Core Game before 2 Expansion)
        const expansionSeqA =
          a.expansion?.sequence ?? (a.box_type === "core" ? 0 : Number.MAX_SAFE_INTEGER);
        const expansionSeqB =
          b.expansion?.sequence ?? (b.box_type === "core" ? 0 : Number.MAX_SAFE_INTEGER);
        if (expansionSeqA !== expansionSeqB) {
          return expansionSeqA - expansionSeqB;
        }

        // 3. If sequences match, 'core' box_type takes precedence
        if (a.box_type !== b.box_type) {
          if (a.box_type === "core") return -1;
          if (b.box_type === "core") return 1;
        }

        // 4. Natural alphanumeric order by name (e.g. SPACE-HULK-001 before SPACE-HULK-002)
        const nameComparison = a.name.localeCompare(b.name, undefined, {
          numeric: true,
          sensitivity: "base",
        });
        if (nameComparison !== 0) return nameComparison;

        // 5. Fallback to created_at
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      });
    }

    return Array.from(groupsMap.values()).sort((a, b) => {
      if (a.gameId === "unassigned") return 1;
      if (b.gameId === "unassigned") return -1;
      return a.gameName.localeCompare(b.gameName);
    });
  }, [filteredBoxes]);

  const sortedBoxes = useMemo(() => {
    const list = [...filteredBoxes];
    switch (sortBy) {
      case "name-desc":
        return list.sort((a, b) => b.name.localeCompare(a.name));
      case "components-desc":
        return list.sort(
          (a, b) => (b.game_components?.length || 0) - (a.game_components?.length || 0)
        );
      case "missing":
        return list.sort((a, b) => {
          const missA = (a.game_components || []).reduce(
            (acc, c) => acc + Math.max(0, c.quantity_expected - c.quantity_actual),
            0
          );
          const missB = (b.game_components || []).reduce(
            (acc, c) => acc + Math.max(0, c.quantity_expected - c.quantity_actual),
            0
          );
          if (missB !== missA) return missB - missA;
          return a.name.localeCompare(b.name);
        });
      case "name-asc":
      default:
        return list.sort((a, b) => a.name.localeCompare(b.name));
    }
  }, [filteredBoxes, sortBy]);

  const allGamesExpanded =
    gameGroups.length > 0 && gameGroups.every((g) => expandedGameIds.has(g.gameId));

  const toggleAllGames = () => {
    if (allGamesExpanded) {
      setExpandedGameIds(new Set());
    } else {
      setExpandedGameIds(new Set(gameGroups.map((g) => g.gameId)));
    }
  };

  const allExpanded =
    filteredBoxes.length > 0 && filteredBoxes.every((b) => expandedBoxIds.has(b.id));

  const toggleAllBoxes = () => {
    if (allExpanded) {
      setExpandedBoxIds(new Set());
    } else {
      setExpandedBoxIds(new Set(filteredBoxes.map((b) => b.id)));
    }
  };

  const totalComponents = filteredBoxes.reduce(
    (acc, b) => acc + (b.game_components?.length || 0),
    0
  );

  const handleDeleteBox = async () => {
    if (!boxToDelete) return;
    setIsDeletingBox(true);
    try {
      await deleteGameBox(boxToDelete.id);
      toast.success(`Game box "${boxToDelete.name}" deleted`);
      setBoxes((prev) => prev.filter((b) => b.id !== boxToDelete.id));
      setBoxToDelete(null);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete box");
    } finally {
      setIsDeletingBox(false);
    }
  };

  const handleResetActualQuantities = async () => {
    if (!boxToResetActual) return;
    setIsResettingActual(true);
    try {
      await resetGameBoxActualQuantities(boxToResetActual.id);
      toast.success(`Actual quantities in "${boxToResetActual.name}" set to 0`);
      setBoxes((prev) =>
        prev.map((b) => {
          if (b.id !== boxToResetActual.id) return b;
          return {
            ...b,
            game_components: (b.game_components || []).map((c) => ({
              ...c,
              quantity_actual: 0,
            })),
          };
        })
      );
      setBoxToResetActual(null);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to reset actual quantities");
    } finally {
      setIsResettingActual(false);
    }
  };

  const handleDeleteComponent = async () => {
    if (!componentToDelete) return;
    setIsDeletingComponent(true);
    try {
      await deleteGameComponent(componentToDelete.id);
      toast.success(`Component "${componentToDelete.name}" deleted`);
      setBoxes((prev) =>
        prev.map((b) => ({
          ...b,
          game_components: (b.game_components || []).filter((c) => c.id !== componentToDelete.id),
        }))
      );
      setComponentToDelete(null);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete component");
    } finally {
      setIsDeletingComponent(false);
    }
  };

  // Drag and drop handlers for components
  const handleDragStart = (e: React.DragEvent, comp: GameComponentWithPhotos) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input") || target.closest("[data-no-drag]")) {
      e.preventDefault();
      return;
    }
    setDraggedCompId(comp.id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", comp.id);
  };

  const handleDragOver = (e: React.DragEvent, comp: GameComponentWithPhotos) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (comp.id === draggedCompId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position: "before" | "after" = e.clientY < midY ? "before" : "after";

    if (dragOverCompId !== comp.id || dragOverPosition !== position) {
      setDragOverCompId(comp.id);
      setDragOverPosition(position);
    }
  };

  const handleDragLeave = (e: React.DragEvent, comp: GameComponentWithPhotos) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      if (dragOverCompId === comp.id) {
        setDragOverCompId(null);
        setDragOverPosition(null);
      }
    }
  };

  const handleDragEnd = () => {
    setDraggedCompId(null);
    setDragOverCompId(null);
    setDragOverPosition(null);
  };

  const handleComponentDrop = async (
    e: React.DragEvent,
    targetComp: GameComponentWithPhotos,
    targetBoxId: string,
    dropPosition: "before" | "after"
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const sourceCompId = draggedCompId;
    setDraggedCompId(null);
    setDragOverCompId(null);
    setDragOverPosition(null);

    if (!sourceCompId || sourceCompId === targetComp.id) return;

    let sourceBox: GameBoxWithComponents | undefined;
    let sourceComp: GameComponentWithPhotos | undefined;

    for (const b of boxes) {
      const found = b.game_components?.find((c) => c.id === sourceCompId);
      if (found) {
        sourceBox = b;
        sourceComp = found;
        break;
      }
    }

    const targetBox = boxes.find((b) => b.id === targetBoxId);
    if (!sourceBox || !sourceComp || !targetBox) return;

    const previousBoxes = [...boxes];
    let newBoxes: GameBoxWithComponents[];
    const itemsToPersist: {
      id: string;
      display_order: number;
      component_type?: string;
      game_box_id?: string;
    }[] = [];

    if (sourceBox.id === targetBox.id) {
      const currentComponents = [...(sourceBox.game_components || [])];
      const sourceIndex = currentComponents.findIndex((c) => c.id === sourceCompId);
      if (sourceIndex === -1) return;

      const [movedComp] = currentComponents.splice(sourceIndex, 1);
      const updatedMovedComp: GameComponentWithPhotos = {
        ...movedComp,
        component_type: targetComp.component_type,
      };

      const targetIndex = currentComponents.findIndex((c) => c.id === targetComp.id);
      if (targetIndex === -1) return;

      const insertIndex = dropPosition === "before" ? targetIndex : targetIndex + 1;
      currentComponents.splice(insertIndex, 0, updatedMovedComp);

      const updatedComponents = currentComponents.map((comp, idx) => ({
        ...comp,
        display_order: idx,
      }));

      newBoxes = boxes.map((b) =>
        b.id === sourceBox.id ? { ...b, game_components: updatedComponents } : b
      );

      updatedComponents.forEach((comp, idx) => {
        itemsToPersist.push({
          id: comp.id,
          display_order: idx,
          component_type: comp.component_type || undefined,
          game_box_id: sourceBox.id,
        });
      });
    } else {
      const sourceComponents = [...(sourceBox.game_components || [])];
      const sourceIndex = sourceComponents.findIndex((c) => c.id === sourceCompId);
      if (sourceIndex === -1) return;

      const [movedComp] = sourceComponents.splice(sourceIndex, 1);
      const updatedMovedComp: GameComponentWithPhotos = {
        ...movedComp,
        game_box_id: targetBox.id,
        component_type: targetComp.component_type,
      };

      const targetComponents = [...(targetBox.game_components || [])];
      const targetIndex = targetComponents.findIndex((c) => c.id === targetComp.id);
      const insertIndex =
        targetIndex === -1
          ? targetComponents.length
          : dropPosition === "before"
            ? targetIndex
            : targetIndex + 1;

      targetComponents.splice(insertIndex, 0, updatedMovedComp);

      const updatedSource = sourceComponents.map((comp, idx) => ({
        ...comp,
        display_order: idx,
      }));

      const updatedTarget = targetComponents.map((comp, idx) => ({
        ...comp,
        display_order: idx,
      }));

      newBoxes = boxes.map((b) => {
        if (b.id === sourceBox.id) return { ...b, game_components: updatedSource };
        if (b.id === targetBox.id) return { ...b, game_components: updatedTarget };
        return b;
      });

      updatedSource.forEach((comp, idx) => {
        itemsToPersist.push({
          id: comp.id,
          display_order: idx,
          game_box_id: sourceBox.id,
        });
      });

      updatedTarget.forEach((comp, idx) => {
        itemsToPersist.push({
          id: comp.id,
          display_order: idx,
          component_type: comp.component_type || undefined,
          game_box_id: targetBox.id,
        });
      });
    }

    setBoxes(newBoxes);
    setIsSavingOrder(true);

    try {
      await reorderGameComponents(itemsToPersist);
      toast.success("Component order updated", { duration: 1500 });
    } catch (error) {
      console.error("Failed to reorder components:", error);
      setBoxes(previousBoxes);
      toast.error(error instanceof Error ? error.message : "Failed to update component order");
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleTypeHeaderDrop = async (e: React.DragEvent, boxId: string, targetTypeKey: string) => {
    e.preventDefault();
    e.stopPropagation();

    const sourceCompId = draggedCompId;
    setDraggedCompId(null);
    setDragOverCompId(null);
    setDragOverPosition(null);

    if (!sourceCompId) return;

    let sourceBox: GameBoxWithComponents | undefined;
    let sourceComp: GameComponentWithPhotos | undefined;

    for (const b of boxes) {
      const found = b.game_components?.find((c) => c.id === sourceCompId);
      if (found) {
        sourceBox = b;
        sourceComp = found;
        break;
      }
    }

    const targetBox = boxes.find((b) => b.id === boxId);
    if (!sourceBox || !sourceComp || !targetBox) return;

    const previousBoxes = [...boxes];
    const itemsToPersist: {
      id: string;
      display_order: number;
      component_type?: string;
      game_box_id?: string;
    }[] = [];

    const sourceComponents = [...(sourceBox.game_components || [])];
    const sourceIdx = sourceComponents.findIndex((c) => c.id === sourceCompId);
    if (sourceIdx === -1) return;
    const [movedComp] = sourceComponents.splice(sourceIdx, 1);

    const updatedMovedComp: GameComponentWithPhotos = {
      ...movedComp,
      game_box_id: targetBox.id,
      component_type: targetTypeKey,
    };

    if (sourceBox.id === targetBox.id) {
      const firstTargetTypeIdx = sourceComponents.findIndex(
        (c) => (c.component_type || "other") === targetTypeKey
      );
      const insertIdx = firstTargetTypeIdx === -1 ? sourceComponents.length : firstTargetTypeIdx;
      sourceComponents.splice(insertIdx, 0, updatedMovedComp);

      const updated = sourceComponents.map((c, idx) => ({ ...c, display_order: idx }));
      setBoxes(boxes.map((b) => (b.id === sourceBox.id ? { ...b, game_components: updated } : b)));
      updated.forEach((c, idx) => {
        itemsToPersist.push({
          id: c.id,
          display_order: idx,
          component_type: c.component_type || undefined,
          game_box_id: sourceBox.id,
        });
      });
    } else {
      const targetComponents = [...(targetBox.game_components || [])];
      const firstTargetTypeIdx = targetComponents.findIndex(
        (c) => (c.component_type || "other") === targetTypeKey
      );
      const insertIdx = firstTargetTypeIdx === -1 ? targetComponents.length : firstTargetTypeIdx;
      targetComponents.splice(insertIdx, 0, updatedMovedComp);

      const updatedSource = sourceComponents.map((c, idx) => ({ ...c, display_order: idx }));
      const updatedTarget = targetComponents.map((c, idx) => ({ ...c, display_order: idx }));

      setBoxes(
        boxes.map((b) => {
          if (b.id === sourceBox.id) return { ...b, game_components: updatedSource };
          if (b.id === targetBox.id) return { ...b, game_components: updatedTarget };
          return b;
        })
      );

      updatedSource.forEach((c, idx) => {
        itemsToPersist.push({ id: c.id, display_order: idx, game_box_id: sourceBox.id });
      });
      updatedTarget.forEach((c, idx) => {
        itemsToPersist.push({
          id: c.id,
          display_order: idx,
          component_type: c.component_type || undefined,
          game_box_id: targetBox.id,
        });
      });
    }

    setExpandedTypeKeys((prev) => new Set(prev).add(`${boxId}_${targetTypeKey}`));

    setIsSavingOrder(true);
    try {
      await reorderGameComponents(itemsToPersist);
      toast.success("Component moved", { duration: 1500 });
    } catch (error) {
      console.error("Failed to reorder component:", error);
      setBoxes(previousBoxes);
      toast.error(error instanceof Error ? error.message : "Failed to move component");
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleMoveComponent = async (
    boxId: string,
    typeKey: string,
    index: number,
    direction: "up" | "down"
  ) => {
    const targetBox = boxes.find((b) => b.id === boxId);
    if (!targetBox) return;

    const grouped = getGroupedComponents(targetBox.game_components || []);
    const groupEntry = grouped.find(([key]) => key === typeKey);
    if (!groupEntry) return;

    const [, typeItems] = groupEntry;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= typeItems.length) return;

    const updatedTypeItems = [...typeItems];
    const [moved] = updatedTypeItems.splice(index, 1);
    updatedTypeItems.splice(targetIndex, 0, moved);

    const allUpdatedComponents: GameComponentWithPhotos[] = [];
    for (const [key, items] of grouped) {
      if (key === typeKey) {
        allUpdatedComponents.push(...updatedTypeItems);
      } else {
        allUpdatedComponents.push(...items);
      }
    }

    const updatedComponents = allUpdatedComponents.map((comp, idx) => ({
      ...comp,
      display_order: idx,
    }));

    const previousBoxes = [...boxes];
    const newBoxes = boxes.map((b) =>
      b.id === boxId ? { ...b, game_components: updatedComponents } : b
    );

    setBoxes(newBoxes);
    setIsSavingOrder(true);

    const itemsToPersist = updatedComponents.map((comp, idx) => ({
      id: comp.id,
      display_order: idx,
      component_type: comp.component_type || undefined,
      game_box_id: boxId,
    }));

    try {
      await reorderGameComponents(itemsToPersist);
      toast.success("Component order updated", { duration: 1500 });
    } catch (error) {
      console.error("Failed to reorder component:", error);
      setBoxes(previousBoxes);
      toast.error(error instanceof Error ? error.message : "Failed to update component order");
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleSortAlphabetically = async (boxId: string, typeKey?: string) => {
    const targetBox = boxes.find((b) => b.id === boxId);
    if (!targetBox) return;

    const components = targetBox.game_components || [];
    if (components.length <= 1) return;

    const grouped = getGroupedComponents(components);

    const sortAlpha = (items: GameComponentWithPhotos[]) =>
      [...items].sort((a, b) => {
        const cmp = a.name.localeCompare(b.name, undefined, {
          numeric: true,
          sensitivity: "base",
        });
        if (cmp !== 0) return cmp;
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      });

    const allUpdatedComponents: GameComponentWithPhotos[] = [];
    for (const [key, items] of grouped) {
      if (!typeKey || key === typeKey) {
        allUpdatedComponents.push(...sortAlpha(items));
      } else {
        allUpdatedComponents.push(...items);
      }
    }

    const updatedComponents = allUpdatedComponents.map((comp, idx) => ({
      ...comp,
      display_order: idx,
    }));

    const previousBoxes = [...boxes];
    const newBoxes = boxes.map((b) =>
      b.id === boxId ? { ...b, game_components: updatedComponents } : b
    );

    setBoxes(newBoxes);
    setIsSavingOrder(true);

    const itemsToPersist = updatedComponents.map((comp, idx) => ({
      id: comp.id,
      display_order: idx,
      component_type: comp.component_type || undefined,
      game_box_id: boxId,
    }));

    try {
      await reorderGameComponents(itemsToPersist);
      const msg = typeKey
        ? "Category sorted alphabetically (A-Z)"
        : `Components in "${targetBox.name}" sorted alphabetically (A-Z)`;
      toast.success(msg, { duration: 1500 });
    } catch (error) {
      console.error("Failed to sort components alphabetically:", error);
      setBoxes(previousBoxes);
      toast.error(
        error instanceof Error ? error.message : "Failed to sort components alphabetically"
      );
    } finally {
      setIsSavingOrder(false);
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
        <CardHeader className="pb-3 border-b border-primary/15 flex flex-col md:flex-row md:items-center md:justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-xl font-black uppercase tracking-wider text-primary flex items-center gap-2">
              <Box className="h-5 w-5 text-primary" />
              {showUniverseFilter ? "BOXES" : "Game Boxes & Components"}
            </CardTitle>
            <CardDescription className="text-xs uppercase tracking-wide mt-1">
              {showUniverseFilter
                ? sortBy === "game"
                  ? `Physical boxes and component inventory across ${gameGroups.length} ${gameGroups.length === 1 ? "game" : "games"} (${filteredBoxes.length} ${filteredBoxes.length === 1 ? "box" : "boxes"}, ${totalComponents} components)`
                  : `Physical boxes and component inventory across all games (${filteredBoxes.length} ${filteredBoxes.length === 1 ? "box" : "boxes"}, ${totalComponents} components)`
                : `Physical boxes and component inventory for ${gameTitle} (${boxes.length} ${boxes.length === 1 ? "box" : "boxes"}, ${totalComponents} components)`}
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {showUniverseFilter && universes && universes.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Select value={selectedUniverseId} onValueChange={setSelectedUniverseId}>
                  <SelectTrigger className="w-[180px] sm:w-[200px] h-9 text-xs font-semibold bg-background/50 border-primary/30">
                    <SelectValue placeholder="All Universes" />
                  </SelectTrigger>
                  <SelectContent className="warhammer-card border-primary/30">
                    <SelectItem value="all">All Universes</SelectItem>
                    {universes.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {showUniverseFilter && (
              <div className="relative w-full sm:w-[200px]">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search boxes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-xs bg-background/50 border-primary/30"
                />
              </div>
            )}

            {showUniverseFilter && (
              <div className="flex items-center gap-1.5">
                <Select value={sortBy} onValueChange={(val) => setSortBy(val as BoxSortOption)}>
                  <SelectTrigger className="w-[160px] sm:w-[175px] h-9 text-xs font-semibold bg-background/50 border-primary/30">
                    <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-primary shrink-0" />
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent className="warhammer-card border-primary/30">
                    <SelectItem value="game">Sort by Game</SelectItem>
                    <SelectItem value="name-asc">Box Name (A-Z)</SelectItem>
                    <SelectItem value="name-desc">Box Name (Z-A)</SelectItem>
                    <SelectItem value="components-desc">Most Components</SelectItem>
                    <SelectItem value="missing">Missing Items First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {isSavingOrder && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-primary/15 border border-primary/30 text-xs font-bold text-primary animate-pulse mr-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving order...</span>
              </div>
            )}

            {showUniverseFilter && sortBy === "game" && gameGroups.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAllGames}
                className="text-xs border-primary/30 text-primary hover:bg-primary/10 shrink-0"
              >
                {allGamesExpanded ? "Collapse Games" : "Expand Games"}
              </Button>
            )}

            {filteredBoxes.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAllBoxes}
                className="text-xs border-primary/30 text-primary hover:bg-primary/10 shrink-0"
              >
                {sortBy === "game"
                  ? allExpanded
                    ? "Collapse Boxes"
                    : "Expand Boxes"
                  : allExpanded
                    ? "Collapse All"
                    : "Expand All"}
              </Button>
            )}

            {gameId && (
              <Button onClick={() => setIsAddBoxOpen(true)} size="sm" className="shrink-0">
                <Plus className="h-4 w-4 mr-1.5" />
                Add Game Box
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {filteredBoxes.length === 0 ? (
            <div className="py-12 px-4 border border-dashed border-primary/30 rounded-lg text-center space-y-3 bg-primary/5">
              <div className="p-3 bg-primary/10 rounded-full border border-primary/20 text-primary inline-flex">
                <Box className="h-8 w-8" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">
                  {boxes.length === 0 ? "No Game Boxes Recorded" : "No Matching Game Boxes"}
                </h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                  {boxes.length === 0
                    ? `No game boxes have been created${gameTitle ? ` for ${gameTitle}` : ""}.`
                    : "No game boxes match the selected universe or search query."}
                </p>
              </div>
              {boxes.length > 0 && (
                <Button
                  onClick={() => {
                    setSelectedUniverseId("all");
                    setSearchQuery("");
                    setSortBy("game");
                  }}
                  variant="outline"
                  size="sm"
                  className="mt-2 border-primary/40 text-primary hover:bg-primary hover:text-black"
                >
                  Clear Filters
                </Button>
              )}
              {gameId && boxes.length === 0 && (
                <Button
                  onClick={() => setIsAddBoxOpen(true)}
                  variant="outline"
                  size="sm"
                  className="mt-2 border-primary/40 text-primary hover:bg-primary hover:text-black"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add First Game Box
                </Button>
              )}
            </div>
          ) : (
            (() => {
              const renderBoxCard = (box: GameBoxWithComponents) => {
                const components = box.game_components || [];
                const isExpanded = expandedBoxIds.has(box.id);
                const isQtyMismatchAny = components.some(
                  (c) => c.quantity_actual < c.quantity_expected || c.status === "missing"
                );
                const totalMissingCount = components.reduce(
                  (acc, c) => acc + Math.max(0, c.quantity_expected - c.quantity_actual),
                  0
                );

                const totalExpectedInBox = components.reduce(
                  (acc, c) => acc + (c.quantity_expected || 0),
                  0
                );

                const totalActualInBox = components.reduce(
                  (acc, c) => acc + (c.quantity_actual || 0),
                  0
                );

                const extrasInBox = components.reduce(
                  (acc, c) => acc + Math.max(0, c.quantity_actual - c.quantity_expected),
                  0
                );

                const isBoxMissing = isQtyMismatchAny || totalMissingCount > 0;

                const isBoxComplete =
                  components.length > 0 &&
                  !isBoxMissing &&
                  components.every((c) => c.quantity_expected === c.quantity_actual);

                const isBoxCompletedWithExtras =
                  components.length > 0 &&
                  !isBoxMissing &&
                  totalActualInBox > totalExpectedInBox;

                const groupedComponents = getGroupedComponents(components);

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
                            {isBoxMissing && (
                              <Badge
                                variant="outline"
                                className="text-xs border-amber-500/50 text-amber-400 bg-amber-500/10 flex items-center gap-1 font-semibold"
                                title={`Missing ${totalMissingCount} item${totalMissingCount === 1 ? "" : "s"}`}
                              >
                                <AlertTriangle className="h-3 w-3" />
                                {totalMissingCount > 0
                                  ? `Missing ${totalMissingCount}`
                                  : "Incomplete"}
                              </Badge>
                            )}
                            {isBoxComplete && (
                              <Badge
                                variant="outline"
                                className="text-xs border-emerald-500/50 text-emerald-400 bg-emerald-500/10 flex items-center gap-1 font-semibold"
                                title="All components present in expected quantities"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                Complete
                              </Badge>
                            )}
                            {isBoxCompletedWithExtras && (
                              <Badge
                                variant="outline"
                                className="text-xs border-blue-500/50 text-blue-400 bg-blue-500/10 flex items-center gap-1 font-semibold"
                                title={
                                  extrasInBox > 0
                                    ? `Completed with ${extrasInBox} extra item${extrasInBox === 1 ? "" : "s"}`
                                    : "Completed with extra items"
                                }
                              >
                                <Sparkles className="h-3 w-3" />
                                Completed + Extras
                              </Badge>
                            )}
                          </div>

                          {/* Hierarchy (Universe, Game, Edition, Expansion) */}
                          {showGameInfo && box.game && (
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-0.5 ml-6">
                              {box.game.universe?.name && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] uppercase font-bold border-primary/30 text-primary py-0"
                                >
                                  {box.game.universe.name}
                                </Badge>
                              )}
                              <Link
                                href={`/dashboard/games/detail?universe=${box.game.universe_id || ""}&game=${box.game.id}&edition=${box.edition_id || ""}&expansion=${box.expansion_id || ""}&tab=boxes`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-foreground hover:text-primary font-semibold flex items-center gap-1 underline-offset-2 hover:underline"
                                title="Open game details"
                              >
                                <span>{box.game.name}</span>
                                <ExternalLink className="h-3 w-3 text-muted-foreground" />
                              </Link>
                              {box.edition?.name && (
                                <span className="text-muted-foreground/80">
                                  &bull; {box.edition.name}
                                </span>
                              )}
                              {box.expansion?.name && (
                                <span className="text-muted-foreground/80">
                                  &bull; {box.expansion.name}
                                </span>
                              )}
                            </div>
                          )}

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
                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0 flex-wrap">
                        {(box.linked_miniatures_count ?? 0) > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="h-8 gap-1.5 text-xs font-semibold text-primary border-primary/30 hover:bg-primary/10 hover:border-primary/60 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                            title={`View ${box.linked_miniatures_count} miniature${box.linked_miniatures_count !== 1 ? "s" : ""} in ${box.name}`}
                          >
                            <Link href={`/dashboard/miniatures?box=${encodeURIComponent(box.id)}`}>
                              <Package className="h-3.5 w-3.5" />
                              <span>Miniatures</span>
                              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-primary/20 text-[10px] font-bold">
                                {box.linked_miniatures_count}
                              </span>
                            </Link>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setBoxToResetActual(box);
                          }}
                          className="h-8 w-8 hover:text-amber-400 hover:bg-amber-400/10 text-muted-foreground"
                          title="Reset actual quantities to 0"
                          aria-label="Reset actual quantities to 0"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setBoxToDuplicate(box);
                            setDuplicateNewName(`${box.name} (Copy)`);
                          }}
                          className="h-8 w-8 hover:text-primary hover:bg-primary/10"
                          title="Duplicate game box"
                          aria-label="Duplicate game box"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
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
                        <div className="flex items-center justify-between pb-2 mb-3 border-b border-border/40">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                              Components ({components.length})
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {components.length > 1 && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isSavingOrder}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSortAlphabetically(box.id);
                                }}
                                className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10 hover:text-primary gap-1.5 px-2.5 font-medium"
                                title="Sort all components in this box alphabetically (A-Z)"
                                aria-label="Sort all components in this box alphabetically (A-Z)"
                              >
                                <ArrowDownAZ className="h-3.5 w-3.5" />
                                <span>Sort A-Z</span>
                              </Button>
                            )}
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

                              const totalActualInGroup = typeItems.reduce(
                                (acc, c) => acc + (c.quantity_actual || 0),
                                0
                              );

                              const extrasInGroup = typeItems.reduce(
                                (acc, c) =>
                                  acc + Math.max(0, c.quantity_actual - c.quantity_expected),
                                0
                              );

                              const isComplete =
                                typeItems.length > 0 &&
                                typeItems.every(
                                  (c) => c.quantity_expected === c.quantity_actual
                                );

                              const isCompletedWithExtras =
                                typeItems.length > 0 &&
                                missingInGroup === 0 &&
                                totalActualInGroup > totalExpectedInGroup;

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
                                    onDragOver={(e) => {
                                      if (draggedCompId) {
                                        e.preventDefault();
                                        e.dataTransfer.dropEffect = "move";
                                      }
                                    }}
                                    onDrop={(e) => {
                                      if (draggedCompId) {
                                        handleTypeHeaderDrop(e, box.id, typeKey);
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

                                    <div className="flex items-center gap-2">
                                      {typeItems.length > 1 && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          disabled={isSavingOrder}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleSortAlphabetically(box.id, typeKey);
                                          }}
                                          className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-primary hover:bg-primary/15 gap-1 shrink-0"
                                          title={`Sort ${sectionLabel} alphabetically (A-Z)`}
                                          aria-label={`Sort ${sectionLabel} alphabetically (A-Z)`}
                                        >
                                          <ArrowDownAZ className="h-3 w-3" />
                                          <span className="hidden sm:inline text-[10px] font-semibold uppercase tracking-wider">
                                            Sort A-Z
                                          </span>
                                        </Button>
                                      )}
                                      {missingInGroup > 0 && (
                                        <Badge
                                          variant="outline"
                                          className="text-[11px] border-amber-500/50 text-amber-400 bg-amber-500/10 flex items-center gap-1 font-semibold"
                                          title={`Missing ${missingInGroup} item${missingInGroup === 1 ? "" : "s"}`}
                                        >
                                          <AlertTriangle className="h-3 w-3" />
                                          Missing {missingInGroup}
                                        </Badge>
                                      )}
                                      {isComplete && (
                                        <Badge
                                          variant="outline"
                                          className="text-[11px] border-emerald-500/50 text-emerald-400 bg-emerald-500/10 flex items-center gap-1 font-semibold"
                                          title="All components present in expected quantities"
                                        >
                                          <CheckCircle2 className="h-3 w-3" />
                                          Complete
                                        </Badge>
                                      )}
                                      {isCompletedWithExtras && (
                                        <Badge
                                          variant="outline"
                                          className="text-[11px] border-blue-500/50 text-blue-400 bg-blue-500/10 flex items-center gap-1 font-semibold"
                                          title={
                                            extrasInGroup > 0
                                              ? `Completed with ${extrasInGroup} extra item${extrasInGroup === 1 ? "" : "s"}`
                                              : "Completed with extra items"
                                          }
                                        >
                                          <Sparkles className="h-3 w-3" />
                                          Completed + Extras
                                        </Badge>
                                      )}
                                    </div>
                                  </div>

                                  {/* Component Rows within this type (hidden behind collapsible type row) */}
                                  {isTypeExpanded && (
                                    <div className="space-y-3 pl-2 sm:pl-3 animate-in fade-in-50 duration-200">
                                      {typeItems.map((comp, compIdx) => {
                                        const isQtyMismatch =
                                          comp.quantity_actual < comp.quantity_expected;
                                        const isDragging = draggedCompId === comp.id;
                                        const isDragOver =
                                          dragOverCompId === comp.id && draggedCompId !== comp.id;

                                        const rawImgUrl = comp.image_storage_path
                                          ? getR2PublicUrl(comp.image_storage_path)
                                          : null;
                                        const imgUrl = rawImgUrl
                                          ? getPhotoImageUrl(rawImgUrl, comp.image_updated_at)
                                          : null;

                                        return (
                                          <div
                                            key={comp.id}
                                            draggable={!isSavingOrder}
                                            onDragStart={(e) => handleDragStart(e, comp)}
                                            onDragOver={(e) => handleDragOver(e, comp)}
                                            onDragLeave={(e) => handleDragLeave(e, comp)}
                                            onDragEnd={handleDragEnd}
                                            onDrop={(e) => {
                                              const position = dragOverPosition || "after";
                                              handleComponentDrop(e, comp, box.id, position);
                                            }}
                                            className={`group/comp relative rounded-lg p-3 sm:p-4 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 select-none ${
                                              isDragging
                                                ? "opacity-30 border-2 border-dashed border-primary bg-primary/10 scale-[0.99]"
                                                : isDragOver
                                                  ? dragOverPosition === "before"
                                                    ? "border-t-2 border-t-primary border-x border-b border-border/60 bg-primary/15 shadow-[0_-3px_12px_rgba(212,175,55,0.25)]"
                                                    : "border-b-2 border-b-primary border-x border-t border-border/60 bg-primary/15 shadow-[0_3px_12px_rgba(212,175,55,0.25)]"
                                                  : "border border-border/60 hover:border-primary/40 bg-background/50 hover:bg-muted/30"
                                            }`}
                                          >
                                            {/* Left: Drag Handle & Arrows, Big Image Thumbnail & Info */}
                                            <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                              {/* Reorder Controls (Drag Handle & Up/Down Arrows) */}
                                              <div
                                                data-no-drag="true"
                                                className="flex items-center gap-0.5 shrink-0 self-center -ml-1"
                                              >
                                                <div
                                                  className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-primary transition-colors p-1 rounded hover:bg-primary/10"
                                                  title="Drag to reorder"
                                                  aria-label="Drag to reorder"
                                                >
                                                  <GripVertical className="h-5 w-5" />
                                                </div>
                                                <div className="flex flex-col -my-1 ml-0.5 opacity-60 sm:opacity-40 group-hover/comp:opacity-100 group-focus-within/comp:opacity-100 transition-opacity">
                                                  <button
                                                    type="button"
                                                    disabled={compIdx === 0 || isSavingOrder}
                                                    onClick={(e) => {
                                                      e.preventDefault();
                                                      e.stopPropagation();
                                                      handleMoveComponent(
                                                        box.id,
                                                        typeKey,
                                                        compIdx,
                                                        "up"
                                                      );
                                                    }}
                                                    className="text-muted-foreground hover:text-primary disabled:opacity-20 disabled:hover:text-muted-foreground p-0.5 leading-none transition-colors"
                                                    title="Move up"
                                                    aria-label={`Move ${comp.name} up`}
                                                  >
                                                    <ChevronUp className="h-3.5 w-3.5" />
                                                  </button>
                                                  <button
                                                    type="button"
                                                    disabled={
                                                      compIdx === typeItems.length - 1 ||
                                                      isSavingOrder
                                                    }
                                                    onClick={(e) => {
                                                      e.preventDefault();
                                                      e.stopPropagation();
                                                      handleMoveComponent(
                                                        box.id,
                                                        typeKey,
                                                        compIdx,
                                                        "down"
                                                      );
                                                    }}
                                                    className="text-muted-foreground hover:text-primary disabled:opacity-20 disabled:hover:text-muted-foreground p-0.5 leading-none transition-colors"
                                                    title="Move down"
                                                    aria-label={`Move ${comp.name} down`}
                                                  >
                                                    <ChevronDown className="h-3.5 w-3.5" />
                                                  </button>
                                                </div>
                                              </div>

                                              {/* Big Component Thumbnail with click-to-edit photo */}
                                              <div
                                                data-no-drag="true"
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
                                                    draggable={false}
                                                    className="w-full h-full object-contain p-1.5 transition-transform group-hover/img:scale-105 pointer-events-none select-none"
                                                  />
                                                ) : (
                                                  <div className="flex flex-col items-center justify-center text-muted-foreground/50 group-hover/img:text-primary transition-colors p-2 text-center pointer-events-none select-none">
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

                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 flex flex-col items-center justify-center transition-opacity text-primary gap-1 z-20 pointer-events-none">
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
                                                {/* Quantity Display above component name: Actual / Expected */}
                                                <div className="flex items-center gap-1.5 font-mono text-[11px] font-medium text-muted-foreground">
                                                  <span className="text-muted-foreground/70 text-[10px] uppercase font-sans tracking-wider font-semibold">
                                                    Qty:
                                                  </span>
                                                  <span
                                                    title="Actual quantity"
                                                    className={`font-bold ${
                                                      isQtyMismatch
                                                        ? "text-destructive"
                                                        : comp.quantity_actual > comp.quantity_expected
                                                          ? "text-blue-400"
                                                          : "text-foreground"
                                                    }`}
                                                  >
                                                    {comp.quantity_actual}
                                                  </span>
                                                  <span className="text-muted-foreground/50">
                                                    /
                                                  </span>
                                                  <span
                                                    title="Expected quantity"
                                                    className="text-muted-foreground"
                                                  >
                                                    {comp.quantity_expected}
                                                  </span>
                                                  {isQtyMismatch && (
                                                    <span
                                                      title={`Missing ${comp.quantity_expected - comp.quantity_actual} piece(s)`}
                                                      className="flex items-center text-destructive text-[10px] font-bold font-sans ml-1 bg-destructive/10 px-1.5 py-0.5 rounded border border-destructive/20"
                                                    >
                                                      <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                                                      Missing{" "}
                                                      {comp.quantity_expected -
                                                        comp.quantity_actual}
                                                    </span>
                                                  )}
                                                  {comp.quantity_actual > comp.quantity_expected && (
                                                    <span
                                                      title={`${comp.quantity_actual - comp.quantity_expected} extra piece(s)`}
                                                      className="flex items-center text-blue-400 text-[10px] font-bold font-sans ml-1 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20"
                                                    >
                                                      <Sparkles className="h-2.5 w-2.5 mr-1" />
                                                      +{comp.quantity_actual - comp.quantity_expected} Extra
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
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleAddPhotoRowClick(comp);
                                                }}
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
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleOpenDuplicateComponent(comp, box.id);
                                                }}
                                                className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                                title="Duplicate component"
                                                aria-label="Duplicate component"
                                              >
                                                <Copy className="h-4 w-4" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                  e.stopPropagation();
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
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setComponentToDelete(comp);
                                                }}
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
              };

              return sortBy === "game" ? (
                <div className="space-y-6">
                  {gameGroups.map((group) => {
                    const isGameExpanded = searchQuery.trim()
                      ? true
                      : expandedGameIds.has(group.gameId);

                    return (
                      <div key={group.gameId} className="space-y-3">
                        {/* Collapsible Game Header */}
                        <div
                          role="button"
                          tabIndex={0}
                          aria-expanded={isGameExpanded}
                          onClick={() => toggleGameExpand(group.gameId)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              toggleGameExpand(group.gameId);
                            }
                          }}
                          className={`group/gameheader flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-lg cursor-pointer transition-all border select-none ${
                            isGameExpanded
                              ? "bg-card/95 border-primary/50 text-foreground shadow-sm ring-1 ring-primary/20"
                              : "bg-card/60 hover:bg-card/85 border-primary/25 hover:border-primary/45 text-foreground/90"
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="p-1 rounded bg-primary/10 text-primary border border-primary/20 shrink-0">
                              <ChevronRight
                                className={`h-4 w-4 text-primary transition-transform duration-200 ${
                                  isGameExpanded ? "rotate-90" : ""
                                }`}
                              />
                            </div>
                            <div className="p-1.5 rounded-md bg-primary/15 text-primary border border-primary/30 shrink-0">
                              <Gamepad2 className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex flex-wrap items-center gap-2 min-w-0">
                              <h3 className="font-black text-base sm:text-lg uppercase tracking-wider text-foreground truncate">
                                {group.gameName}
                              </h3>
                              {group.universeName && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] uppercase font-bold border-primary/30 text-primary py-0"
                                >
                                  {group.universeName}
                                </Badge>
                              )}
                              <Badge variant="secondary" className="text-xs font-mono font-medium">
                                {group.boxes.length} {group.boxes.length === 1 ? "box" : "boxes"}
                              </Badge>
                              <span className="text-xs text-muted-foreground hidden sm:inline">
                                ({group.totalComponents}{" "}
                                {group.totalComponents === 1 ? "component" : "components"})
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            {group.totalMissing > 0 && (
                              <Badge
                                variant="outline"
                                className="text-xs border-amber-500/50 text-amber-400 bg-amber-500/10 flex items-center gap-1 font-semibold"
                              >
                                <AlertTriangle className="h-3 w-3" />
                                <span>{group.totalMissing} Missing</span>
                              </Badge>
                            )}
                            {group.game && (
                              <Link
                                href={`/dashboard/games/detail?universe=${group.universeId || ""}&game=${group.gameId}&tab=boxes`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs text-muted-foreground hover:text-primary font-semibold flex items-center gap-1 px-2.5 py-1 rounded border border-transparent hover:border-primary/30 hover:bg-primary/10 transition-all"
                                title={`Open ${group.gameName} details`}
                              >
                                <span>Game Details</span>
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            )}
                          </div>
                        </div>

                        {/* Game's Boxes */}
                        {isGameExpanded && (
                          <div className="space-y-4 pl-2 sm:pl-4 border-l-2 border-primary/20 ml-2 sm:ml-4 animate-in fade-in-50 duration-200">
                            {group.boxes.map((box) => renderBoxCard(box))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-6">{sortedBoxes.map((box) => renderBoxCard(box))}</div>
              );
            })()
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Game Box Dialog */}
      <GameBoxFormDialog
        box={editingBox}
        gameId={editingBox?.game_id || gameId || ""}
        editionId={editingBox?.edition_id || editionId}
        expansionId={editingBox?.expansion_id || expansionId}
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

      {/* Duplicate Component Dialog */}
      <DuplicateGameComponentDialog
        component={componentToDuplicate}
        boxes={boxes.map((b) => ({ id: b.id, name: b.name }))}
        currentBoxId={componentToDuplicateBoxId}
        currentBoxName={boxes.find((b) => b.id === componentToDuplicateBoxId)?.name}
        open={!!componentToDuplicate}
        onOpenChange={(open) => {
          if (!open) {
            setComponentToDuplicate(null);
            setComponentToDuplicateBoxId("");
          }
        }}
        onSuccess={handleComponentDuplicated}
      />

      {/* Duplicate Game Box Dialog */}
      <Dialog
        open={!!boxToDuplicate}
        onOpenChange={(open) => {
          if (!open && !isDuplicating) {
            setBoxToDuplicate(null);
            setDuplicateNewName("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md bg-card border-primary/30">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-primary">
              <Copy className="h-5 w-5" />
              Duplicate Game Box
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Create an independent copy of this game box along with all of its components and
              photos.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmDuplicate} className="space-y-4 py-2">
            <div className="space-y-1.5 p-3 rounded-lg border border-border/60 bg-muted/30 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Original Box:</span>
                <span className="font-bold text-foreground">{boxToDuplicate?.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Components to copy:</span>
                <span className="font-bold text-primary font-mono">
                  {boxToDuplicate?.game_components?.length || 0}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="duplicate-box-name"
                className="text-xs font-bold uppercase tracking-wider"
              >
                New Box Name
              </Label>
              <Input
                id="duplicate-box-name"
                value={duplicateNewName}
                onChange={(e) => setDuplicateNewName(e.target.value)}
                placeholder="Enter name for the new game box..."
                className="border-primary/30 focus-visible:border-primary font-semibold"
                autoFocus
                disabled={isDuplicating}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setBoxToDuplicate(null);
                  setDuplicateNewName("");
                }}
                disabled={isDuplicating}
                className="border-border/60"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isDuplicating || !duplicateNewName.trim()}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
              >
                {isDuplicating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Duplicating Box & Photos...
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate Box
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Actual Quantities Confirmation Alert */}
      <AlertDialog
        open={!!boxToResetActual}
        onOpenChange={(open) => {
          if (!open) setBoxToResetActual(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-amber-400" />
              Reset Actual Quantities: {boxToResetActual?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will set the actual quantities of all components in this game box to 0. Expected
              quantities will not be changed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResettingActual}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleResetActualQuantities();
              }}
              disabled={isResettingActual}
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            >
              {isResettingActual && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reset to 0
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
