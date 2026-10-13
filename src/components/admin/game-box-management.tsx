"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  ExternalLink,
  Layers,
  MapPin,
  Barcode,
  Loader2,
  AlertTriangle,
  FolderOpen,
  Filter,
  Copy,
} from "lucide-react";
import { createGameBox, updateGameBox, deleteGameBox, duplicateGameBox } from "@/app/actions/game-boxes";
import type { GameBox } from "@/types";
import { toast } from "sonner";

interface UniverseOption {
  id: string;
  name: string;
}

interface GameOption {
  id: string;
  name: string;
  universe_id?: string | null;
}

interface EditionOption {
  id: string;
  name: string;
  game_id: string;
}

interface ExpansionOption {
  id: string;
  name: string;
  edition_id: string;
}

export interface AdminGameBoxItem extends GameBox {
  game?: {
    id: string;
    name: string;
    universe_id?: string | null;
    universe?: { id: string; name: string } | null;
  } | null;
  edition?: { id: string; name: string } | null;
  expansion?: { id: string; name: string } | null;
  component_count: number;
}

interface GameBoxManagementProps {
  initialBoxes: AdminGameBoxItem[];
  universes: UniverseOption[];
  games: GameOption[];
  editions: EditionOption[];
  expansions: ExpansionOption[];
}

export function GameBoxManagement({
  initialBoxes,
  universes,
  games,
  editions,
  expansions,
}: GameBoxManagementProps) {
  const router = useRouter();
  const [boxes, setBoxes] = useState<AdminGameBoxItem[]>(initialBoxes);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUniverse, setSelectedUniverse] = useState<string>("all");
  const [selectedGame, setSelectedGame] = useState<string>("all");

  // Form Dialog state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBox, setEditingBox] = useState<AdminGameBoxItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form inputs
  const [formData, setFormData] = useState({
    name: "",
    game_id: "",
    edition_id: "",
    expansion_id: "",
    box_type: "core",
    condition: "good",
    location: "",
    barcode: "",
    notes: "",
  });

  // Delete dialog state
  const [deleteBoxId, setDeleteBoxId] = useState<string | null>(null);
  const [deleteBoxName, setDeleteBoxName] = useState<string>("");
  const [deleteComponentCount, setDeleteComponentCount] = useState<number>(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // Duplicate dialog state
  const [boxToDuplicate, setBoxToDuplicate] = useState<AdminGameBoxItem | null>(null);
  const [duplicateNewName, setDuplicateNewName] = useState("");
  const [isDuplicating, setIsDuplicating] = useState(false);

  const handleConfirmDuplicate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boxToDuplicate || !duplicateNewName.trim()) return;

    setIsDuplicating(true);
    try {
      await duplicateGameBox(boxToDuplicate.id, duplicateNewName.trim());
      toast.success(`Game box "${duplicateNewName.trim()}" duplicated successfully!`);
      setBoxToDuplicate(null);
      setDuplicateNewName("");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to duplicate game box");
    } finally {
      setIsDuplicating(false);
    }
  };

  // Available games based on selected universe in filter
  const filteredGamesForFilter = useMemo(() => {
    if (selectedUniverse === "all") return games;
    return games.filter((g) => g.universe_id === selectedUniverse);
  }, [games, selectedUniverse]);

  // Form: Editions available based on selected game in form
  const availableEditionsForForm = useMemo(() => {
    if (!formData.game_id) return [];
    return editions.filter((e) => e.game_id === formData.game_id);
  }, [editions, formData.game_id]);

  // Form: Expansions available based on selected edition in form
  const availableExpansionsForForm = useMemo(() => {
    if (!formData.edition_id) return [];
    return expansions.filter((e) => e.edition_id === formData.edition_id);
  }, [expansions, formData.edition_id]);

  // Filtered boxes
  const filteredBoxes = useMemo(() => {
    return boxes.filter((b) => {
      // Universe filter
      if (selectedUniverse !== "all") {
        if (b.game?.universe_id !== selectedUniverse) return false;
      }
      // Game filter
      if (selectedGame !== "all") {
        if (b.game_id !== selectedGame) return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = b.name.toLowerCase().includes(q);
        const matchesGame = (b.game?.name || "").toLowerCase().includes(q);
        const matchesEdition = (b.edition?.name || "").toLowerCase().includes(q);
        const matchesExpansion = (b.expansion?.name || "").toLowerCase().includes(q);
        const matchesLocation = (b.location || "").toLowerCase().includes(q);
        const matchesBarcode = (b.barcode || "").toLowerCase().includes(q);
        const matchesNotes = (b.notes || "").toLowerCase().includes(q);
        return (
          matchesName ||
          matchesGame ||
          matchesEdition ||
          matchesExpansion ||
          matchesLocation ||
          matchesBarcode ||
          matchesNotes
        );
      }
      return true;
    });
  }, [boxes, selectedUniverse, selectedGame, searchQuery]);

  // Overall Stats
  const totalBoxes = boxes.length;
  const totalComponents = boxes.reduce((acc, b) => acc + b.component_count, 0);
  const totalWithEditions = boxes.filter((b) => b.edition_id).length;
  const totalWithExpansions = boxes.filter((b) => b.expansion_id).length;

  const handleOpenAdd = () => {
    setEditingBox(null);
    setFormData({
      name: "",
      game_id: games[0]?.id || "",
      edition_id: "",
      expansion_id: "",
      box_type: "core",
      condition: "good",
      location: "",
      barcode: "",
      notes: "",
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (b: AdminGameBoxItem) => {
    setEditingBox(b);
    setFormData({
      name: b.name,
      game_id: b.game_id,
      edition_id: b.edition_id || "",
      expansion_id: b.expansion_id || "",
      box_type: b.box_type || "core",
      condition: b.condition || "good",
      location: b.location || "",
      barcode: b.barcode || "",
      notes: b.notes || "",
    });
    setIsFormOpen(true);
  };

  const handleSaveBox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Box name is required");
      return;
    }
    if (!formData.game_id) {
      toast.error("Please select a game");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingBox) {
        await updateGameBox(editingBox.id, {
          name: formData.name.trim(),
          game_id: formData.game_id,
          edition_id: formData.edition_id || null,
          expansion_id: formData.expansion_id || null,
          box_type: formData.box_type,
          condition: formData.condition,
          location: formData.location.trim() || null,
          barcode: formData.barcode.trim() || null,
          notes: formData.notes.trim() || null,
        });
        toast.success(`Game box "${formData.name}" updated`);
      } else {
        await createGameBox({
          name: formData.name.trim(),
          game_id: formData.game_id,
          edition_id: formData.edition_id || null,
          expansion_id: formData.expansion_id || null,
          box_type: formData.box_type,
          condition: formData.condition,
          location: formData.location.trim() || null,
          barcode: formData.barcode.trim() || null,
          notes: formData.notes.trim() || null,
        });
        toast.success(`Game box "${formData.name}" created`);
      }

      setIsFormOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to save game box");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteBoxId) return;
    setIsDeleting(true);
    try {
      await deleteGameBox(deleteBoxId);
      toast.success(`Game box "${deleteBoxName}" deleted`);
      setBoxes((prev) => prev.filter((b) => b.id !== deleteBoxId));
      setDeleteBoxId(null);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete game box");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="warhammer-card border-primary/20 bg-card/60">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs uppercase font-bold tracking-wider">
              Total Boxes
            </CardDescription>
            <CardTitle className="text-3xl font-black text-primary gold-glow flex items-center justify-between">
              {totalBoxes}
              <Box className="h-6 w-6 text-primary/40" />
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="warhammer-card border-primary/20 bg-card/60">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs uppercase font-bold tracking-wider">
              Total Components
            </CardDescription>
            <CardTitle className="text-3xl font-black text-primary gold-glow flex items-center justify-between">
              {totalComponents}
              <Layers className="h-6 w-6 text-primary/40" />
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="warhammer-card border-primary/20 bg-card/60">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs uppercase font-bold tracking-wider">
              Edition Linked
            </CardDescription>
            <CardTitle className="text-3xl font-black text-primary gold-glow">
              {totalWithEditions}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="warhammer-card border-primary/20 bg-card/60">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs uppercase font-bold tracking-wider">
              Expansion Linked
            </CardDescription>
            <CardTitle className="text-3xl font-black text-primary gold-glow">
              {totalWithExpansions}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filter and Action Header */}
      <Card className="warhammer-card border-primary/30 p-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-1 flex-col sm:flex-row items-center gap-3 w-full">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search boxes, games, barcodes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background/50 border-primary/30 h-9"
              />
            </div>

            {/* Universe Filter */}
            <Select
              value={selectedUniverse}
              onValueChange={(val) => {
                setSelectedUniverse(val);
                setSelectedGame("all");
              }}
            >
              <SelectTrigger className="w-full sm:w-48 bg-background/50 border-primary/30 h-9">
                <SelectValue placeholder="All Universes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Universes</SelectItem>
                {universes.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Game Filter */}
            <Select value={selectedGame} onValueChange={setSelectedGame}>
              <SelectTrigger className="w-full sm:w-48 bg-background/50 border-primary/30 h-9">
                <SelectValue placeholder="All Games" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Games</SelectItem>
                {filteredGamesForFilter.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleOpenAdd}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-black font-bold h-9"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Game Box
          </Button>
        </div>
      </Card>

      {/* Game Boxes Table / Card List */}
      {filteredBoxes.length === 0 ? (
        <Card className="warhammer-card border-primary/20 p-12 text-center">
          <Box className="mx-auto h-12 w-12 text-primary opacity-30 mb-3" />
          <h3 className="text-lg font-bold uppercase tracking-wider text-primary">
            No Game Boxes Found
          </h3>
          <p className="text-muted-foreground text-sm mt-1 max-w-md mx-auto">
            {searchQuery || selectedUniverse !== "all" || selectedGame !== "all"
              ? "No game boxes match your search or filter criteria."
              : "No physical game boxes added yet. Click 'Add Game Box' to create your first one."}
          </p>
          {(searchQuery || selectedUniverse !== "all" || selectedGame !== "all") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSelectedUniverse("all");
                setSelectedGame("all");
              }}
              className="mt-4"
            >
              Clear Filters
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBoxes.map((box) => {
            const detailUrlParams = new URLSearchParams();
            if (box.game?.universe_id) detailUrlParams.set("universe", box.game.universe_id);
            detailUrlParams.set("game", box.game_id);
            if (box.edition_id) detailUrlParams.set("edition", box.edition_id);
            if (box.expansion_id) detailUrlParams.set("expansion", box.expansion_id);
            detailUrlParams.set("tab", "boxes");
            const detailUrl = `/dashboard/games/detail?${detailUrlParams.toString()}`;

            return (
              <Card
                key={box.id}
                className="warhammer-card border-primary/25 hover:border-primary/50 transition-all flex flex-col justify-between"
              >
                <CardHeader className="pb-3 border-b border-primary/10">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        {box.game?.universe && (
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase tracking-wider border-primary/30 text-primary/80 py-0"
                          >
                            {box.game.universe.name}
                          </Badge>
                        )}
                        <Badge
                          variant="secondary"
                          className="text-[10px] uppercase font-bold tracking-wider py-0"
                        >
                          {box.box_type || "core"}
                        </Badge>
                        {box.condition && (
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase tracking-wider text-muted-foreground py-0"
                          >
                            {box.condition}
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg font-black uppercase tracking-wide text-foreground truncate">
                        {box.name}
                      </CardTitle>
                      <CardDescription className="text-xs font-semibold text-primary truncate mt-0.5">
                        {box.game?.name || "Unknown Game"}
                        {box.edition && ` • ${box.edition.name}`}
                        {box.expansion && ` • ${box.expansion.name}`}
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => {
                          setBoxToDuplicate(box);
                          setDuplicateNewName(`${box.name} (Copy)`);
                        }}
                        title="Duplicate Game Box"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => handleOpenEdit(box)}
                        title="Edit Game Box"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          setDeleteBoxId(box.id);
                          setDeleteBoxName(box.name);
                          setDeleteComponentCount(box.component_count);
                        }}
                        title="Delete Game Box"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-3 pb-3 flex-1 flex flex-col justify-between gap-3 text-xs">
                  <div className="space-y-1.5 text-muted-foreground">
                    {box.location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                        <span className="truncate">Storage: {box.location}</span>
                      </div>
                    )}
                    {box.barcode && (
                      <div className="flex items-center gap-1.5">
                        <Barcode className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                        <span className="font-mono text-[11px] truncate">
                          Barcode: {box.barcode}
                        </span>
                      </div>
                    )}
                    {box.notes && (
                      <p className="text-[11px] italic text-muted-foreground line-clamp-2 mt-1">
                        "{box.notes}"
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-primary/10 flex items-center justify-between gap-2">
                    <Link
                      href={`/dashboard/admin/game-components?box=${box.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                    >
                      <Layers className="h-3.5 w-3.5" />
                      {box.component_count} {box.component_count === 1 ? "component" : "components"}
                    </Link>

                    <Button variant="ghost" size="sm" asChild className="h-7 text-xs px-2 gap-1">
                      <Link href={detailUrl}>
                        <span>Detail Page</span>
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

      {/* Add / Edit Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg warhammer-card border-primary/30">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-wider text-primary gold-glow flex items-center gap-2">
              <Box className="h-5 w-5" />
              {editingBox ? "Edit Game Box" : "Add Game Box"}
            </DialogTitle>
            <DialogDescription className="text-xs uppercase tracking-wide">
              Configure physical board game box details and hierarchical links
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveBox} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider">
                Box Name <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="e.g. Warhammer Quest: Cursed City Core Box"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                required
                className="bg-background/50 border-primary/30 text-sm"
              />
            </div>

            {/* Game Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider">
                Target Game <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.game_id}
                onValueChange={(val) => {
                  setFormData((prev) => ({
                    ...prev,
                    game_id: val,
                    edition_id: "",
                    expansion_id: "",
                  }));
                }}
              >
                <SelectTrigger className="bg-background/50 border-primary/30 text-sm">
                  <SelectValue placeholder="Select a game" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {games.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Edition Selection (Optional) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Edition (Optional)
                </Label>
                <Select
                  value={formData.edition_id || "none"}
                  onValueChange={(val) => {
                    const newEdition = val === "none" ? "" : val;
                    setFormData((prev) => ({
                      ...prev,
                      edition_id: newEdition,
                      expansion_id: "",
                    }));
                  }}
                  disabled={!formData.game_id || availableEditionsForForm.length === 0}
                >
                  <SelectTrigger className="bg-background/50 border-primary/30 text-xs">
                    <SelectValue placeholder="None (Game-level)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Game-level box)</SelectItem>
                    {availableEditionsForForm.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Expansion Selection (Optional) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Expansion (Optional)
                </Label>
                <Select
                  value={formData.expansion_id || "none"}
                  onValueChange={(val) => {
                    setFormData((prev) => ({
                      ...prev,
                      expansion_id: val === "none" ? "" : val,
                    }));
                  }}
                  disabled={!formData.edition_id || availableExpansionsForForm.length === 0}
                >
                  <SelectTrigger className="bg-background/50 border-primary/30 text-xs">
                    <SelectValue placeholder="None (Edition-level)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Edition-level box)</SelectItem>
                    {availableExpansionsForForm.map((ex) => (
                      <SelectItem key={ex.id} value={ex.id}>
                        {ex.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Box Type and Condition */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider">Box Type</Label>
                <Select
                  value={formData.box_type}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, box_type: val }))}
                >
                  <SelectTrigger className="bg-background/50 border-primary/30 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="core">Core Box</SelectItem>
                    <SelectItem value="expansion">Expansion Box</SelectItem>
                    <SelectItem value="starter">Starter Set</SelectItem>
                    <SelectItem value="bundle">Bundle / Big Box</SelectItem>
                    <SelectItem value="custom">Custom / Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider">Condition</Label>
                <Select
                  value={formData.condition}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, condition: val }))}
                >
                  <SelectTrigger className="bg-background/50 border-primary/30 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mint">Mint / New</SelectItem>
                    <SelectItem value="good">Good Condition</SelectItem>
                    <SelectItem value="worn">Worn / Shelfwear</SelectItem>
                    <SelectItem value="damaged">Damaged Box</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Storage Location & Barcode */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider">
                  Storage Location
                </Label>
                <Input
                  placeholder="e.g. Kallax Shelf 2"
                  value={formData.location}
                  onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                  className="bg-background/50 border-primary/30 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider">Barcode / EAN</Label>
                <Input
                  placeholder="e.g. 5011921123456"
                  value={formData.barcode}
                  onChange={(e) => setFormData((prev) => ({ ...prev, barcode: e.target.value }))}
                  className="bg-background/50 border-primary/30 text-xs font-mono"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider">Notes</Label>
              <Textarea
                placeholder="Any special remarks or details about this physical box..."
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
                {editingBox ? "Save Changes" : "Create Game Box"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
        <DialogContent className="max-w-md warhammer-card border-primary/30">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-wider text-primary gold-glow flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Duplicate Game Box
            </DialogTitle>
            <DialogDescription className="text-xs uppercase tracking-wide">
              Create an independent duplicate with all components and photos
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
                  {boxToDuplicate?.component_count || 0}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-duplicate-box-name" className="text-xs font-bold uppercase tracking-wider">
                New Box Name
              </Label>
              <Input
                id="admin-duplicate-box-name"
                value={duplicateNewName}
                onChange={(e) => setDuplicateNewName(e.target.value)}
                placeholder="Enter name for the new game box..."
                className="bg-background/50 border-primary/30 text-sm font-semibold"
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={Boolean(deleteBoxId)}
        onOpenChange={(open) => !open && setDeleteBoxId(null)}
      >
        <AlertDialogContent className="warhammer-card border-destructive/40">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Delete Game Box?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Are you sure you want to delete{" "}
              <strong className="text-foreground">"{deleteBoxName}"</strong>?
              {deleteComponentCount > 0 && (
                <span className="block mt-2 font-bold text-destructive">
                  Warning: This box contains {deleteComponentCount} game components, which will also
                  be deleted!
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold"
            >
              {isDeleting ? "Deleting..." : "Delete Box"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
