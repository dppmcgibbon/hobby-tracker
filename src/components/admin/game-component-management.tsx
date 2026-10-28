"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Search,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  Layers,
  Camera,
  AlertTriangle,
  FileText,
  CreditCard,
  Dice5,
  Puzzle,
  LayoutGrid,
  ShieldAlert,
  Loader2,
  Sparkles,
} from "lucide-react";
import {
  createGameComponent,
  updateGameComponent,
  deleteGameComponent,
} from "@/app/actions/game-components";
import { GameComponentPhotoDialog } from "@/components/games/game-component-photo-dialog";
import { DuplicateGameComponentDialog } from "@/components/games/duplicate-game-component-dialog";
import { COMPONENT_TYPES, COMPONENT_STATUSES } from "@/components/games/game-component-form-dialog";
import { getR2PublicUrl } from "@/lib/r2";
import { getPhotoImageUrl } from "@/lib/photos";
import type { GameComponent } from "@/types";
import { toast } from "sonner";

export interface AdminGameComponentItem extends GameComponent {
  game_box?: {
    id: string;
    name: string;
    game_id: string;
    edition_id?: string | null;
    expansion_id?: string | null;
    game?: {
      id: string;
      name: string;
      universe_id?: string | null;
      universe?: { id: string; name: string } | null;
    } | null;
    edition?: { id: string; name: string } | null;
    expansion?: { id: string; name: string } | null;
  } | null;
}

interface BoxOption {
  id: string;
  name: string;
  game_id: string;
  game_name: string;
}

interface GameComponentManagementProps {
  initialComponents: AdminGameComponentItem[];
  allBoxes: BoxOption[];
  initialBoxFilter?: string;
}

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  rulebook: FileText,
  cards: CreditCard,
  dice: Dice5,
  tokens: Puzzle,
  boards: LayoutGrid,
  miniatures: Layers,
  tiles: LayoutGrid,
  markers: ShieldAlert,
  other: Box,
};

export function GameComponentManagement({
  initialComponents,
  allBoxes,
  initialBoxFilter,
}: GameComponentManagementProps) {
  const router = useRouter();
  const [components, setComponents] = useState<AdminGameComponentItem[]>(initialComponents);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBox, setSelectedBox] = useState<string>(initialBoxFilter || "all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Duplicate Component state
  const [componentToDuplicate, setComponentToDuplicate] = useState<AdminGameComponentItem | null>(
    null
  );

  const handleOpenDuplicate = (comp: AdminGameComponentItem) => {
    setComponentToDuplicate(comp);
  };

  const handleComponentDuplicated = (
    newComp: GameComponent | (GameComponent & { game_box?: AdminGameComponentItem["game_box"] })
  ) => {
    if (!newComp) return;
    const matchedBox = allBoxes.find((b) => b.id === newComp.game_box_id);
    const itemWithBox: AdminGameComponentItem = {
      ...newComp,
      game_box: matchedBox
        ? {
            id: matchedBox.id,
            name: matchedBox.name,
            game_id: matchedBox.game_id,
            game: { id: matchedBox.game_id, name: matchedBox.game_name },
          }
        : null,
    };
    setComponents((prev) => [itemWithBox, ...prev]);
  };
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<AdminGameComponentItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Inputs
  const [formData, setFormData] = useState<{
    game_box_id: string;
    name: string;
    component_type: string;
    quantity_expected: number | string;
    quantity_actual: number | string;
    status: string;
    description: string;
    notes: string;
  }>({
    game_box_id: allBoxes[0]?.id || "",
    name: "",
    component_type: "other",
    quantity_expected: 1,
    quantity_actual: 1,
    status: "complete",
    description: "",
    notes: "",
  });

  // Photo Dialog state
  const [photoTargetComponent, setPhotoTargetComponent] = useState<AdminGameComponentItem | null>(
    null
  );
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);

  // Delete Alert state
  const [deleteComponentId, setDeleteComponentId] = useState<string | null>(null);
  const [deleteComponentName, setDeleteComponentName] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtered components
  const filteredComponents = useMemo(() => {
    return components.filter((c) => {
      // Box filter
      if (selectedBox !== "all" && c.game_box_id !== selectedBox) {
        return false;
      }
      // Type filter
      if (selectedType !== "all" && c.component_type !== selectedType) {
        return false;
      }
      // Status filter
      if (selectedStatus !== "all" && c.status !== selectedStatus) {
        return false;
      }
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesBox = (c.game_box?.name || "").toLowerCase().includes(q);
        const matchesGame = (c.game_box?.game?.name || "").toLowerCase().includes(q);
        const matchesNotes = (c.notes || "").toLowerCase().includes(q);
        const matchesDesc = (c.description || "").toLowerCase().includes(q);
        return matchesName || matchesBox || matchesGame || matchesNotes || matchesDesc;
      }
      return true;
    });
  }, [components, selectedBox, selectedType, selectedStatus, searchQuery]);

  // Overall Stats
  const totalCount = components.length;
  const missingPartsCount = components.filter(
    (c) => c.status === "missing_parts" || c.quantity_actual < c.quantity_expected
  ).length;
  const damagedCount = components.filter((c) => c.status === "damaged").length;
  const withImagesCount = components.filter((c) => Boolean(c.image_storage_path)).length;

  const handleOpenAdd = () => {
    setEditingComponent(null);
    setFormData({
      game_box_id: selectedBox !== "all" ? selectedBox : allBoxes[0]?.id || "",
      name: "",
      component_type: "tokens",
      quantity_expected: 1,
      quantity_actual: 1,
      status: "complete",
      description: "",
      notes: "",
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (c: AdminGameComponentItem) => {
    setEditingComponent(c);
    setFormData({
      game_box_id: c.game_box_id,
      name: c.name,
      component_type: c.component_type || "other",
      quantity_expected: c.quantity_expected ?? 1,
      quantity_actual: c.quantity_actual ?? 1,
      status: c.status || "complete",
      description: c.description || "",
      notes: c.notes || "",
    });
    setIsFormOpen(true);
  };

  const handleSaveComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Component name is required");
      return;
    }
    if (!formData.game_box_id) {
      toast.error("Please select a game box");
      return;
    }

    const numExpected =
      typeof formData.quantity_expected === "number"
        ? Math.max(0, formData.quantity_expected)
        : Math.max(0, parseInt(String(formData.quantity_expected), 10) || 0);

    const numActual =
      typeof formData.quantity_actual === "number"
        ? Math.max(0, formData.quantity_actual)
        : Math.max(0, parseInt(String(formData.quantity_actual), 10) || 0);

    setIsSubmitting(true);
    try {
      if (editingComponent) {
        await updateGameComponent(editingComponent.id, {
          game_box_id: formData.game_box_id,
          name: formData.name.trim(),
          component_type: formData.component_type,
          quantity_expected: numExpected,
          quantity_actual: numActual,
          status: formData.status,
          description: formData.description.trim() || null,
          notes: formData.notes.trim() || null,
        });
        toast.success(`Component "${formData.name}" updated`);
      } else {
        await createGameComponent({
          game_box_id: formData.game_box_id,
          name: formData.name.trim(),
          component_type: formData.component_type,
          quantity_expected: numExpected,
          quantity_actual: numActual,
          status: formData.status,
          description: formData.description.trim() || null,
          notes: formData.notes.trim() || null,
        });
        toast.success(`Component "${formData.name}" created`);
      }

      setIsFormOpen(false);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save game component");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteComponentId) return;
    setIsDeleting(true);
    try {
      await deleteGameComponent(deleteComponentId);
      toast.success(`Component "${deleteComponentName}" deleted`);
      setComponents((prev) => prev.filter((c) => c.id !== deleteComponentId));
      setDeleteComponentId(null);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete game component");
    } finally {
      setIsDeleting(false);
    }
  };

  const openPhotoDialog = (c: AdminGameComponentItem) => {
    setPhotoTargetComponent(c);
    setIsPhotoDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="warhammer-card border-primary/20 bg-card/60">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs uppercase font-bold tracking-wider">
              Total Components
            </CardDescription>
            <CardTitle className="text-3xl font-black text-primary gold-glow flex items-center justify-between">
              {totalCount}
              <Layers className="h-6 w-6 text-primary/40" />
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="warhammer-card border-primary/20 bg-card/60">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs uppercase font-bold tracking-wider">
              Missing / Incomplete
            </CardDescription>
            <CardTitle className="text-3xl font-black text-destructive flex items-center justify-between">
              {missingPartsCount}
              <AlertTriangle className="h-6 w-6 text-destructive/40" />
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="warhammer-card border-primary/20 bg-card/60">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs uppercase font-bold tracking-wider">
              Damaged Parts
            </CardDescription>
            <CardTitle className="text-3xl font-black text-amber-500 flex items-center justify-between">
              {damagedCount}
              <ShieldAlert className="h-6 w-6 text-amber-500/40" />
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="warhammer-card border-primary/20 bg-card/60">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs uppercase font-bold tracking-wider">
              With Photos
            </CardDescription>
            <CardTitle className="text-3xl font-black text-primary gold-glow flex items-center justify-between">
              {withImagesCount}
              <Camera className="h-6 w-6 text-primary/40" />
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Search & Filter Toolbar */}
      <Card className="warhammer-card border-primary/30 p-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex flex-1 flex-col sm:flex-row items-center gap-3 w-full flex-wrap">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search components, boxes, notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background/50 border-primary/30 h-9"
              />
            </div>

            {/* Box Filter */}
            <Select value={selectedBox} onValueChange={setSelectedBox}>
              <SelectTrigger className="w-full sm:w-56 bg-background/50 border-primary/30 h-9">
                <SelectValue placeholder="All Game Boxes" />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                <SelectItem value="all">All Game Boxes</SelectItem>
                {allBoxes.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name} ({b.game_name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full sm:w-40 bg-background/50 border-primary/30 h-9">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {COMPONENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full sm:w-40 bg-background/50 border-primary/30 h-9">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {COMPONENT_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleOpenAdd}
            disabled={allBoxes.length === 0}
            className="w-full lg:w-auto bg-primary hover:bg-primary/90 text-black font-bold h-9 shrink-0"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Component
          </Button>
        </div>
      </Card>

      {/* Components Grid / Cards */}
      {filteredComponents.length === 0 ? (
        <Card className="warhammer-card border-primary/20 p-12 text-center">
          <Layers className="mx-auto h-12 w-12 text-primary opacity-30 mb-3" />
          <h3 className="text-lg font-bold uppercase tracking-wider text-primary">
            No Game Components Found
          </h3>
          <p className="text-muted-foreground text-sm mt-1 max-w-md mx-auto">
            {searchQuery ||
            selectedBox !== "all" ||
            selectedType !== "all" ||
            selectedStatus !== "all"
              ? "No game components match your active search or filter selections."
              : "No game components added yet. Make sure you have at least one Game Box, then click 'Add Component'."}
          </p>
          {(searchQuery ||
            selectedBox !== "all" ||
            selectedType !== "all" ||
            selectedStatus !== "all") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSelectedBox("all");
                setSelectedType("all");
                setSelectedStatus("all");
              }}
              className="mt-4"
            >
              Clear Filters
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredComponents.map((component) => {
            const rawUrl = component.image_storage_path
              ? getR2PublicUrl(component.image_storage_path)
              : null;
            const imageUrl = rawUrl ? getPhotoImageUrl(rawUrl, component.image_updated_at) : null;

            const TypeIcon = TYPE_ICONS[component.component_type || "other"] || Box;
            const isDiscrepancy = component.quantity_actual < component.quantity_expected;
            const statusConfig = COMPONENT_STATUSES.find((s) => s.value === component.status);

            const detailUrlParams = new URLSearchParams();
            if (component.game_box?.game?.universe_id) {
              detailUrlParams.set("universe", component.game_box.game.universe_id);
            }
            if (component.game_box?.game_id) {
              detailUrlParams.set("game", component.game_box.game_id);
            }
            if (component.game_box?.edition_id) {
              detailUrlParams.set("edition", component.game_box.edition_id);
            }
            if (component.game_box?.expansion_id) {
              detailUrlParams.set("expansion", component.game_box.expansion_id);
            }
            detailUrlParams.set("tab", "boxes");
            const detailUrl = `/dashboard/games/detail?${detailUrlParams.toString()}`;

            return (
              <Card
                key={component.id}
                className="warhammer-card border-primary/25 hover:border-primary/50 transition-all flex flex-col justify-between"
              >
                <CardHeader className="pb-3 border-b border-primary/10">
                  <div className="flex items-start gap-3">
                    {/* Thumbnail with photo dialog trigger */}
                    <button
                      type="button"
                      onClick={() => openPhotoDialog(component)}
                      className="relative h-16 w-16 rounded-sm overflow-hidden border border-primary/30 bg-card/90 shrink-0 group flex items-center justify-center cursor-pointer hover:border-primary transition-colors"
                      title={imageUrl ? "View / Edit Component Photo" : "Upload Component Photo"}
                    >
                      {imageUrl ? (
                        <>
                          <Image
                            src={imageUrl}
                            alt={component.name}
                            fill
                            className="object-contain p-1 group-hover:scale-105 transition-transform"
                            unoptimized
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Sparkles className="h-4 w-4 text-primary" />
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                          <Camera className="h-5 w-5" />
                          <span className="text-[9px] font-bold uppercase mt-0.5">Photo</span>
                        </div>
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase tracking-wider border-primary/30 text-primary/80 py-0 flex items-center gap-1"
                        >
                          <TypeIcon className="h-3 w-3" />
                          <span>{component.component_type || "other"}</span>
                        </Badge>

                        <Badge
                          variant={isDiscrepancy ? "destructive" : "secondary"}
                          className="text-[10px] font-mono py-0 font-bold"
                        >
                          {component.quantity_actual}/{component.quantity_expected}
                        </Badge>

                        <Badge
                          variant="outline"
                          className={`text-[10px] uppercase tracking-wider py-0 ${
                            component.status === "complete"
                              ? "text-emerald-400 border-emerald-500/30"
                              : component.status === "missing_parts"
                                ? "text-destructive border-destructive/30"
                                : "text-amber-400 border-amber-500/30"
                          }`}
                        >
                          {statusConfig?.label || component.status}
                        </Badge>
                      </div>

                      <CardTitle className="text-base font-black uppercase tracking-wide text-foreground truncate">
                        {component.name}
                      </CardTitle>

                      <CardDescription className="text-xs text-primary font-semibold truncate mt-0.5">
                        <Box className="inline h-3 w-3 mr-1 align-sub" />
                        {component.game_box?.name || "Unknown Box"}
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                        onClick={() => handleOpenDuplicate(component)}
                        title="Duplicate Component"
                        aria-label="Duplicate Component"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                        onClick={() => handleOpenEdit(component)}
                        title="Edit Component"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          setDeleteComponentId(component.id);
                          setDeleteComponentName(component.name);
                        }}
                        title="Delete Component"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-3 pb-3 flex-1 flex flex-col justify-between gap-3 text-xs">
                  <div className="space-y-1 text-muted-foreground">
                    {component.description && (
                      <p className="text-xs text-foreground/80 line-clamp-2">
                        {component.description}
                      </p>
                    )}
                    {component.notes && (
                      <p className="text-[11px] italic text-muted-foreground line-clamp-2">
                        &ldquo;{component.notes}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-primary/10 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground truncate">
                      {component.game_box?.game?.name || "Game"}
                      {component.game_box?.edition && ` • ${component.game_box.edition.name}`}
                    </span>

                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="h-6 text-[11px] px-2 gap-1"
                    >
                      <Link href={detailUrl}>
                        <span>Game Detail</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Component Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md warhammer-card border-primary/30">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-wider text-primary gold-glow flex items-center gap-2">
              <Layers className="h-5 w-5" />
              {editingComponent ? "Edit Game Component" : "Add Game Component"}
            </DialogTitle>
            <DialogDescription className="text-xs uppercase tracking-wide">
              Track cards, tokens, dice, rulebooks, and check part completeness
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveComponent} className="space-y-4 py-2">
            {/* Box selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider">
                Target Game Box <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.game_box_id}
                onValueChange={(val) => setFormData((prev) => ({ ...prev, game_box_id: val }))}
              >
                <SelectTrigger className="bg-background/50 border-primary/30 text-xs">
                  <SelectValue placeholder="Select target game box" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {allBoxes.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.game_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Component Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider">
                Component Name <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="e.g. Wound Counters, Quest Cards, D12 Dice"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                required
                className="bg-background/50 border-primary/30 text-sm"
              />
            </div>

            {/* Component Type & Status */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider">Type</Label>
                <Select
                  value={formData.component_type}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, component_type: val }))}
                >
                  <SelectTrigger className="bg-background/50 border-primary/30 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPONENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, status: val }))}
                >
                  <SelectTrigger className="bg-background/50 border-primary/30 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPONENT_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Quantities */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider">
                  Actual Quantity
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.quantity_actual}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      quantity_actual: val === "" ? "" : Math.max(0, parseInt(val, 10) || 0),
                    }));
                  }}
                  className="bg-background/50 border-primary/30 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider">
                  Expected Quantity
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.quantity_expected}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      quantity_expected: val === "" ? "" : Math.max(0, parseInt(val, 10) || 0),
                    }));
                  }}
                  className="bg-background/50 border-primary/30 text-sm"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider">Description</Label>
              <Input
                placeholder="Brief item description (e.g. Double-sided 10mm cardboard chits)"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                className="bg-background/50 border-primary/30 text-xs"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider">Notes</Label>
              <Textarea
                placeholder="Condition remarks, missing parts details..."
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                rows={2}
                className="bg-background/50 border-primary/30 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
                disabled={isSubmitting}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-black font-bold h-8 text-xs"
              >
                {isSubmitting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                {editingComponent ? "Save Changes" : "Create Component"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={Boolean(deleteComponentId)}
        onOpenChange={(open) => !open && setDeleteComponentId(null)}
      >
        <AlertDialogContent className="warhammer-card border-destructive/40">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Delete Component?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Are you sure you want to delete{" "}
              <strong className="text-foreground">&quot;{deleteComponentName}&quot;</strong>? This
              will also remove its associated photo if present.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold"
            >
              {isDeleting ? "Deleting..." : "Delete Component"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Component Photo Dialog (Upload, Background Removal, Eraser, Crop, Rotate, Delete) */}
      <GameComponentPhotoDialog
        component={photoTargetComponent}
        open={isPhotoDialogOpen}
        onOpenChange={setIsPhotoDialogOpen}
        onSuccess={() => {
          router.refresh();
        }}
      />
      {/* Duplicate Component Dialog */}
      <DuplicateGameComponentDialog
        component={componentToDuplicate}
        boxes={allBoxes.map((b) => ({ id: b.id, name: `${b.game_name} - ${b.name}` }))}
        currentBoxId={componentToDuplicate?.game_box_id}
        currentBoxName={componentToDuplicate?.game_box?.name}
        open={!!componentToDuplicate}
        onOpenChange={(open) => {
          if (!open) setComponentToDuplicate(null);
        }}
        onSuccess={handleComponentDuplicated}
      />
    </div>
  );
}
