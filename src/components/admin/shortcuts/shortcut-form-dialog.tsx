"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Wand2, Upload, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { removeBackgroundInBrowser } from "@/lib/background-removal-client";
import {
  createGameShortcut,
  updateGameShortcut,
  getShortcutLogoUploadUrl,
} from "@/app/actions/saved-filters";
import { getR2PublicUrl } from "@/lib/r2";

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

export interface ShortcutItem {
  id: string;
  name: string;
  filters: Record<string, string>;
  logo_url: string | null;
  is_starred: boolean;
}

interface ShortcutFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortcut?: ShortcutItem | null;
  universes: Universe[];
  games: Game[];
  editions: Edition[];
  expansions: Expansion[];
  onSuccess?: () => void;
}

export function ShortcutFormDialog({
  open,
  onOpenChange,
  shortcut,
  universes,
  games,
  editions,
  expansions,
  onSuccess,
}: ShortcutFormDialogProps) {
  const router = useRouter();
  const isEditing = Boolean(shortcut);

  const [name, setName] = useState("");
  const [universeId, setUniverseId] = useState<string>("none");
  const [gameId, setGameId] = useState<string>("none");
  const [editionId, setEditionId] = useState<string>("none");
  const [expansionId, setExpansionId] = useState<string>("none");
  const [isStarred, setIsStarred] = useState(true);

  // Logo state
  const [logoInputType, setLogoInputType] = useState<"file" | "url">("file");
  const [logoUrl, setLogoUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Background removal & upload state
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [nameManuallyEdited, setNameManuallyEdited] = useState(false);

  // Populate form on open or shortcut change
  useEffect(() => {
    if (shortcut) {
      setName(shortcut.name || "");
      setNameManuallyEdited(true);
      const filters = shortcut.filters || {};
      setUniverseId(filters.universeId || filters.universe || "none");
      setGameId(filters.gameId || filters.game || "none");
      setEditionId(filters.editionId || filters.edition || "none");
      setExpansionId(filters.expansionId || filters.expansion || "none");
      setIsStarred(shortcut.is_starred ?? true);

      const resolvedLogo = shortcut.logo_url ? getR2PublicUrl(shortcut.logo_url) : "";
      setLogoUrl(shortcut.logo_url || "");
      setPreviewUrl(resolvedLogo || null);
      setSelectedFile(null);
      setLogoInputType(shortcut.logo_url?.startsWith("http") ? "url" : "file");
    } else {
      setName("");
      setNameManuallyEdited(false);
      setUniverseId("none");
      setGameId("none");
      setEditionId("none");
      setExpansionId("none");
      setIsStarred(true);
      setLogoUrl("");
      setSelectedFile(null);
      setPreviewUrl(null);
      setLogoInputType("file");
    }
    setStatusMessage(null);
  }, [shortcut, open]);

  // Filtered editions for selected game
  const availableEditions = editions.filter(
    (e) => gameId !== "none" && e.game_id === gameId
  );

  // Filtered expansions for selected edition
  const availableExpansions = expansions.filter(
    (exp) => editionId !== "none" && exp.edition_id === editionId
  );

  // Auto-generate name when game/edition changes if not manually typed
  const handleGameChange = (newGameId: string) => {
    setGameId(newGameId);
    setEditionId("none");
    setExpansionId("none");

    const game = games.find((g) => g.id === newGameId);
    if (game?.universe_id) {
      setUniverseId(game.universe_id);
    }

    if (!nameManuallyEdited && game) {
      setName(game.name);
    }
  };

  const handleEditionChange = (newEditionId: string) => {
    setEditionId(newEditionId);
    setExpansionId("none");

    if (!nameManuallyEdited && gameId !== "none") {
      const game = games.find((g) => g.id === gameId);
      const edition = editions.find((e) => e.id === newEditionId);
      if (game && edition) {
        setName(`${game.name} ${edition.name}`);
      }
    }
  };

  const handleExpansionChange = (newExpansionId: string) => {
    setExpansionId(newExpansionId);

    if (!nameManuallyEdited && gameId !== "none") {
      const game = games.find((g) => g.id === gameId);
      const expansion = expansions.find((e) => e.id === newExpansionId);
      if (game && expansion && newExpansionId !== "none") {
        setName(`${game.name} - ${expansion.name}`);
      }
    }
  };

  // Handle local file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  // Handle AI Background Removal
  const handleRemoveBackground = async () => {
    if (!selectedFile && !previewUrl) {
      toast.error("Please select or provide an image first");
      return;
    }

    setIsRemovingBg(true);
    setStatusMessage("Removing background in browser using AI...");

    try {
      let inputSource: File | Blob;
      if (selectedFile) {
        inputSource = selectedFile;
      } else {
        // Fetch existing preview URL
        const res = await fetch(previewUrl!);
        inputSource = await res.blob();
      }

      const resultBlob = await removeBackgroundInBrowser(inputSource);
      const filename = selectedFile
        ? selectedFile.name.replace(/\.[^.]+$/, ".png")
        : "logo-transparent.png";

      const transparentFile = new File([resultBlob], filename, {
        type: "image/png",
      });

      setSelectedFile(transparentFile);
      const newPreviewUrl = URL.createObjectURL(resultBlob);
      setPreviewUrl(newPreviewUrl);
      toast.success("Background removed successfully!");
    } catch (err: any) {
      console.error("Background removal error:", err);
      toast.error("Failed to remove background: " + (err.message || "Unknown error"));
    } finally {
      setIsRemovingBg(false);
      setStatusMessage(null);
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a name for the shortcut");
      return;
    }

    setIsSaving(true);
    setStatusMessage("Saving shortcut...");

    try {
      let finalLogoUrl = logoUrl.trim();

      // If a file was selected/processed, upload to R2
      if (selectedFile) {
        setStatusMessage("Requesting upload ticket for logo...");
        const presigned = await getShortcutLogoUploadUrl(
          selectedFile.name,
          selectedFile.type || "image/png"
        );

        setStatusMessage("Uploading logo image to storage...");
        const putRes = await fetch(presigned.presignedUrl, {
          method: "PUT",
          headers: {
            "Content-Type": selectedFile.type || "image/png",
          },
          body: selectedFile,
        });

        if (!putRes.ok) {
          throw new Error("Failed to upload image to storage");
        }

        finalLogoUrl = presigned.publicUrl;
      }

      const shortcutData = {
        name: name.trim(),
        universeId: universeId !== "none" ? universeId : undefined,
        gameId: gameId !== "none" ? gameId : undefined,
        editionId: editionId !== "none" ? editionId : undefined,
        expansionId: expansionId !== "none" ? expansionId : undefined,
        logoUrl: finalLogoUrl || undefined,
        isStarred,
      };

      if (isEditing && shortcut) {
        await updateGameShortcut(shortcut.id, shortcutData);
        toast.success("Shortcut updated successfully");
      } else {
        await createGameShortcut(shortcutData);
        toast.success("Shortcut created successfully");
      }

      onOpenChange(false);
      router.refresh();
      onSuccess?.();
    } catch (err: any) {
      console.error("Error saving shortcut:", err);
      toast.error("Failed to save shortcut: " + (err.message || "Unknown error"));
    } finally {
      setIsSaving(false);
      setStatusMessage(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto warhammer-card border-primary/40 bg-zinc-950 text-foreground">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-wider text-primary gold-glow">
            {isEditing ? "Edit Shortcut" : "Add Game Shortcut"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Configure the destination route and transparent logo badge for the shortcut.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {/* Cascading Target Hierarchy */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Universe */}
            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
                Universe (Optional)
              </Label>
              <Select value={universeId} onValueChange={setUniverseId}>
                <SelectTrigger className="border-primary/30 bg-background/50">
                  <SelectValue placeholder="Select Universe" />
                </SelectTrigger>
                <SelectContent className="border-primary/40 bg-zinc-950 text-foreground">
                  <SelectItem value="none">None / Any</SelectItem>
                  {universes.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Game */}
            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
                Game
              </Label>
              <Select value={gameId} onValueChange={handleGameChange}>
                <SelectTrigger className="border-primary/30 bg-background/50">
                  <SelectValue placeholder="Select Game" />
                </SelectTrigger>
                <SelectContent className="border-primary/40 bg-zinc-950 text-foreground">
                  <SelectItem value="none">None / Any</SelectItem>
                  {games.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Edition */}
            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
                Edition (Optional)
              </Label>
              <Select
                value={editionId}
                onValueChange={handleEditionChange}
                disabled={gameId === "none"}
              >
                <SelectTrigger className="border-primary/30 bg-background/50 disabled:opacity-50">
                  <SelectValue
                    placeholder={
                      gameId === "none" ? "Select Game first" : "Select Edition"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="border-primary/40 bg-zinc-950 text-foreground">
                  <SelectItem value="none">None / Base Game</SelectItem>
                  {availableEditions.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} {e.year ? `(${e.year})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Expansion */}
            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
                Expansion (Optional)
              </Label>
              <Select
                value={expansionId}
                onValueChange={handleExpansionChange}
                disabled={editionId === "none"}
              >
                <SelectTrigger className="border-primary/30 bg-background/50 disabled:opacity-50">
                  <SelectValue
                    placeholder={
                      editionId === "none" ? "Select Edition first" : "Select Expansion"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="border-primary/40 bg-zinc-950 text-foreground">
                  <SelectItem value="none">None / Core Edition</SelectItem>
                  {availableExpansions.map((exp) => (
                    <SelectItem key={exp.id} value={exp.id}>
                      {exp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Shortcut Name */}
          <div className="space-y-1.5">
            <Label className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
              Shortcut Display Name *
            </Label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameManuallyEdited(true);
              }}
              placeholder="e.g. Space Hulk 1st Edition"
              className="border-primary/30 bg-background/50 font-medium"
              required
            />
          </div>

          {/* Starred Status */}
          <div className="flex items-center justify-between p-3 rounded-sm border border-primary/20 bg-background/30">
            <div>
              <p className="text-sm font-semibold">Show on Shortcuts Page</p>
              <p className="text-xs text-muted-foreground">
                Pinned shortcuts appear as cards on the main Shortcuts dashboard.
              </p>
            </div>
            <Switch checked={isStarred} onCheckedChange={setIsStarred} />
          </div>

          {/* Logo Section */}
          <div className="space-y-3 pt-1 border-t border-primary/20">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
                Logo / Card Image
              </Label>
              <div className="flex items-center gap-1 bg-zinc-900 border border-primary/20 rounded p-0.5">
                <Button
                  type="button"
                  size="sm"
                  variant={logoInputType === "file" ? "secondary" : "ghost"}
                  className="h-7 text-xs px-2.5"
                  onClick={() => setLogoInputType("file")}
                >
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  Upload
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={logoInputType === "url" ? "secondary" : "ghost"}
                  className="h-7 text-xs px-2.5"
                  onClick={() => setLogoInputType("url")}
                >
                  <LinkIcon className="h-3.5 w-3.5 mr-1" />
                  URL
                </Button>
              </div>
            </div>

            {logoInputType === "file" ? (
              <div className="space-y-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="border-primary/30 bg-background/50 cursor-pointer file:text-primary file:font-semibold"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  value={logoUrl}
                  onChange={(e) => {
                    setLogoUrl(e.target.value);
                    setPreviewUrl(e.target.value || null);
                    setSelectedFile(null);
                  }}
                  placeholder="https://... or /logos/..."
                  className="border-primary/30 bg-background/50 font-mono text-xs"
                />
              </div>
            )}

            {/* Logo Preview & Background Removal Action */}
            {previewUrl && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Preview:</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveBackground}
                    disabled={isRemovingBg}
                    className="h-7 text-xs border-primary/40 hover:bg-primary/20 text-primary hover:text-primary"
                  >
                    {isRemovingBg ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Removing Background...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-3.5 w-3.5 mr-1.5 text-primary" />
                        Remove Background
                      </>
                    )}
                  </Button>
                </div>

                {/* Checkerboard container to reveal transparency */}
                <div className="relative aspect-[16/9] w-full max-w-sm mx-auto rounded-sm border-2 border-primary/30 overflow-hidden flex items-center justify-center p-3 bg-zinc-950 shadow-inner [background-image:linear-gradient(45deg,#18181b_25%,transparent_25%),linear-gradient(-45deg,#18181b_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#18181b_75%),linear-gradient(-45deg,transparent_75%,#18181b_75%)] [background-size:16px_16px] [background-position:0_0,0_8px,8px_-8px,-8px_0]">
                  <Image
                    src={previewUrl}
                    alt="Logo preview"
                    width={400}
                    height={225}
                    unoptimized
                    className="object-contain max-h-full max-w-full drop-shadow-md transition-all"
                  />
                </div>
              </div>
            )}
          </div>

          {statusMessage && (
            <p className="text-xs text-primary/80 animate-pulse text-center">
              {statusMessage}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-primary/20">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving || isRemovingBg}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving || isRemovingBg}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                "Update Shortcut"
              ) : (
                "Create Shortcut"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
