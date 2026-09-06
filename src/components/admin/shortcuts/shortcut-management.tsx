"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  Search,
  Star,
  Gamepad2,
} from "lucide-react";
import { toast } from "sonner";
import { toggleStarFilter, deleteFilter } from "@/app/actions/saved-filters";
import { getR2PublicUrl } from "@/lib/r2";
import {
  ShortcutFormDialog,
  type ShortcutItem,
} from "./shortcut-form-dialog";

interface Universe {
  id: string;
  name: string;
}

interface Game {
  id: string;
  name: string;
  universe_id: string | null;
}

interface Edition {
  id: string;
  name: string;
  game_id: string;
  year: number | null;
}

interface Expansion {
  id: string;
  name: string;
  edition_id: string;
  sequence: number;
}

interface ShortcutManagementProps {
  shortcuts: ShortcutItem[];
  universes: Universe[];
  games: Game[];
  editions: Edition[];
  expansions: Expansion[];
}

export function ShortcutManagement({
  shortcuts: initialShortcuts,
  universes,
  games,
  editions,
  expansions,
}: ShortcutManagementProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingShortcut, setEditingShortcut] = useState<ShortcutItem | null>(null);
  const [deletingShortcut, setDeletingShortcut] = useState<ShortcutItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Helper maps for displaying names
  const universeMap = new Map(universes.map((u) => [u.id, u.name]));
  const gameMap = new Map(games.map((g) => [g.id, g.name]));
  const editionMap = new Map(editions.map((e) => [e.id, e.name]));
  const expansionMap = new Map(expansions.map((exp) => [exp.id, exp.name]));

  // Build target link preview
  const buildTargetUrl = (filters: Record<string, string>) => {
    const game = filters.gameId || filters.game;
    const edition = filters.editionId || filters.edition;
    const expansion = filters.expansionId || filters.expansion;
    const universe = filters.universeId || filters.universe;

    const hasGame = Boolean(game && game !== "all" && game !== "");
    const hasEdition = Boolean(edition && edition !== "all" && edition !== "");
    const hasExpansion = Boolean(expansion && expansion !== "all" && expansion !== "");

    if (hasGame || hasEdition || hasExpansion) {
      const params = new URLSearchParams();
      if (universe && universe !== "all" && universe !== "") {
        params.set("universe", universe);
      }
      if (hasGame) params.set("game", game);
      if (hasEdition) params.set("edition", edition);
      if (hasExpansion) params.set("expansion", expansion);
      return `/dashboard/games/detail?${params.toString()}`;
    }
    return "/dashboard/miniatures";
  };

  // Toggle star
  const handleToggleStar = async (shortcut: ShortcutItem) => {
    try {
      await toggleStarFilter(shortcut.id, !shortcut.is_starred);
      toast.success(
        shortcut.is_starred ? "Removed from shortcuts" : "Pinned to shortcuts"
      );
      router.refresh();
    } catch (err: any) {
      toast.error("Failed to update status: " + (err.message || "Unknown error"));
    }
  };

  // Confirm delete
  const handleDelete = async () => {
    if (!deletingShortcut) return;
    setIsDeleting(true);
    try {
      await deleteFilter(deletingShortcut.id);
      toast.success("Shortcut deleted");
      setDeletingShortcut(null);
      router.refresh();
    } catch (err: any) {
      toast.error("Failed to delete shortcut: " + (err.message || "Unknown error"));
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter shortcuts
  const filteredShortcuts = initialShortcuts.filter((s) => {
    const q = searchQuery.toLowerCase();
    const nameMatch = s.name.toLowerCase().includes(q);
    const filters = s.filters || {};
    const gameName = gameMap.get(filters.gameId || filters.game) || "";
    const editionName = editionMap.get(filters.editionId || filters.edition) || "";
    return nameMatch || gameName.toLowerCase().includes(q) || editionName.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search shortcuts..."
            className="pl-9 border-primary/30 bg-background/50"
          />
        </div>

        <Button
          onClick={() => {
            setEditingShortcut(null);
            setFormOpen(true);
          }}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Shortcut
        </Button>
      </div>

      {/* Shortcuts Table */}
      <div className="warhammer-card border-primary/30 rounded-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-primary/10 border-b border-primary/30">
            <TableRow>
              <TableHead className="w-[110px] text-xs font-black uppercase tracking-wider text-primary">
                Logo
              </TableHead>
              <TableHead className="text-xs font-black uppercase tracking-wider text-primary">
                Name & Hierarchy
              </TableHead>
              <TableHead className="text-xs font-black uppercase tracking-wider text-primary hidden md:table-cell">
                Target Route
              </TableHead>
              <TableHead className="w-[100px] text-center text-xs font-black uppercase tracking-wider text-primary">
                Pinned
              </TableHead>
              <TableHead className="w-[120px] text-right text-xs font-black uppercase tracking-wider text-primary">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredShortcuts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  <Gamepad2 className="h-10 w-10 mx-auto mb-2 opacity-40 text-primary" />
                  <p className="text-base font-semibold">No shortcuts found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Click "Add Shortcut" above to create your first game shortcut.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredShortcuts.map((s) => {
                const filters = s.filters || {};
                const uId = filters.universeId || filters.universe;
                const gId = filters.gameId || filters.game;
                const edId = filters.editionId || filters.edition;
                const expId = filters.expansionId || filters.expansion;

                const uName = universeMap.get(uId);
                const gName = gameMap.get(gId);
                const edName = editionMap.get(edId);
                const expName = expansionMap.get(expId);

                const targetUrl = buildTargetUrl(filters);
                const logoSrc = s.logo_url ? getR2PublicUrl(s.logo_url) : null;

                return (
                  <TableRow
                    key={s.id}
                    className="border-b border-primary/10 hover:bg-primary/5 transition-colors"
                  >
                    {/* Logo */}
                    <TableCell className="p-3">
                      <div className="relative w-20 h-12 rounded-sm border border-primary/30 overflow-hidden flex items-center justify-center bg-zinc-950 p-1 [background-image:linear-gradient(45deg,#18181b_25%,transparent_25%),linear-gradient(-45deg,#18181b_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#18181b_75%),linear-gradient(-45deg,transparent_75%,#18181b_75%)] [background-size:10px_10px] [background-position:0_0,0_5px,5px_-5px,-5px_0]">
                        {logoSrc ? (
                          <Image
                            src={logoSrc}
                            alt={s.name}
                            width={80}
                            height={48}
                            unoptimized
                            className="object-contain max-h-full max-w-full"
                          />
                        ) : (
                          <Star className="h-5 w-5 text-primary/40" />
                        )}
                      </div>
                    </TableCell>

                    {/* Name & Hierarchy */}
                    <TableCell className="py-3">
                      <div className="space-y-1">
                        <div className="font-bold text-sm tracking-wide text-foreground flex items-center gap-2">
                          {s.name}
                          {s.is_starred && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 border-amber-500/40 text-amber-400 bg-amber-500/10"
                            >
                              Pinned
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          {uName && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20"
                            >
                              {uName}
                            </Badge>
                          )}
                          {gName && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 border-primary/30"
                            >
                              {gName}
                            </Badge>
                          )}
                          {edName && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 border-muted-foreground/30"
                            >
                              {edName}
                            </Badge>
                          )}
                          {expName && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 border-muted-foreground/30"
                            >
                              {expName}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Target Route */}
                    <TableCell className="py-3 hidden md:table-cell">
                      <Link
                        href={targetUrl}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors font-mono max-w-xs truncate"
                      >
                        <span className="truncate">{targetUrl}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </Link>
                    </TableCell>

                    {/* Starred / Pinned Toggle */}
                    <TableCell className="py-3 text-center">
                      <Switch
                        checked={s.is_starred}
                        onCheckedChange={() => handleToggleStar(s)}
                        title={s.is_starred ? "Unpin from shortcuts" : "Pin to shortcuts"}
                      />
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => {
                            setEditingShortcut(s);
                            setFormOpen(true);
                          }}
                          title="Edit Shortcut"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeletingShortcut(s)}
                          title="Delete Shortcut"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit / Add Dialog */}
      <ShortcutFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        shortcut={editingShortcut}
        universes={universes}
        games={games}
        editions={editions}
        expansions={expansions}
        onSuccess={() => router.refresh()}
      />

      {/* Delete Confirmation Alert */}
      <AlertDialog
        open={Boolean(deletingShortcut)}
        onOpenChange={(open) => !open && setDeletingShortcut(null)}
      >
        <AlertDialogContent className="warhammer-card border-primary/40 bg-zinc-950 text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-destructive">
              Delete Shortcut?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete{" "}
              <strong className="text-foreground font-semibold">
                "{deletingShortcut?.name}"
              </strong>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
