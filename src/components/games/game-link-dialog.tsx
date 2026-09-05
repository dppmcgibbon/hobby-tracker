"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Globe, ExternalLink } from "lucide-react";
import {
  addGameLink,
  updateGameLink,
  type GameEntityType,
} from "@/app/actions/games";
import type { GameInfoLink } from "@/lib/games/game-details";

interface GameLinkDialogProps {
  entityType: GameEntityType;
  entityId: string;
  initialLink?: GameInfoLink | null;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const CATEGORY_SUGGESTIONS = [
  "Rules",
  "Official",
  "Wiki",
  "Community",
  "Video",
  "Tools",
];

export function GameLinkDialog({
  entityType,
  entityId,
  initialLink,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: GameLinkDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen! : setInternalOpen;

  const isEditing = Boolean(initialLink?.id);

  const [title, setTitle] = useState(initialLink?.title || "");
  const [url, setUrl] = useState(initialLink?.url || "");
  const [description, setDescription] = useState(initialLink?.description || "");
  const [category, setCategory] = useState(initialLink?.category || "");

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setTitle(initialLink?.title || "");
      setUrl(initialLink?.url || "");
      setDescription(initialLink?.description || "");
      setCategory(initialLink?.category || "");
      setError(null);
    }
    setOpen(newOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanTitle = title.trim();
    let cleanUrl = url.trim();

    if (!cleanTitle) {
      setError("Please enter a link title.");
      return;
    }
    if (!cleanUrl) {
      setError("Please enter a valid URL.");
      return;
    }

    // Ensure URL has protocol
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = `https://${cleanUrl}`;
    }

    try {
      new URL(cleanUrl);
    } catch {
      setError("Please enter a valid web address (e.g. https://wahapedia.ru).");
      return;
    }

    setSaving(true);
    try {
      if (isEditing && initialLink?.id) {
        await updateGameLink(entityType, entityId, initialLink.id, {
          title: cleanTitle,
          url: cleanUrl,
          description: description.trim() || null,
          category: category.trim() || null,
        });
        toast.success("Link updated successfully!");
      } else {
        await addGameLink(entityType, entityId, {
          title: cleanTitle,
          url: cleanUrl,
          description: description.trim() || null,
          category: category.trim() || null,
        });
        toast.success("Link added successfully!");
      }

      router.refresh();
      setOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save link.";
      setError(message);
      toast.error("Failed to save link");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      <DialogContent className="sm:max-w-md border-primary/30 warhammer-card">
        <DialogHeader>
          <DialogTitle className="text-lg font-black uppercase tracking-wider text-primary gold-glow flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            {isEditing ? "Edit Link" : "Add Resource Link"}
          </DialogTitle>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {isEditing
              ? "Update resource link details"
              : "Add official rules, community databases, wikis, or guides"}
          </p>
        </DialogHeader>

        {error && (
          <div className="p-3 text-xs rounded bg-destructive/15 text-destructive border border-destructive/30">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="link-title" className="text-xs font-bold uppercase tracking-wider">
              Title <span className="text-primary">*</span>
            </Label>
            <Input
              id="link-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Wahapedia, Official Errata, Goonhammer Review"
              className="bg-neutral-950/60 border-primary/30 text-sm"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="link-url" className="text-xs font-bold uppercase tracking-wider">
              URL / Web Address <span className="text-primary">*</span>
            </Label>
            <div className="relative">
              <Input
                id="link-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="bg-neutral-950/60 border-primary/30 text-sm pr-9"
                required
              />
              <ExternalLink className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="link-desc" className="text-xs font-bold uppercase tracking-wider">
              Description <span className="text-muted-foreground text-[10px] normal-case">(Optional)</span>
            </Label>
            <Input
              id="link-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short note about what this resource contains"
              className="bg-neutral-950/60 border-primary/30 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="link-category" className="text-xs font-bold uppercase tracking-wider">
              Category <span className="text-muted-foreground text-[10px] normal-case">(Optional)</span>
            </Label>
            <Input
              id="link-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Rules, Wiki, Community, Video, etc."
              className="bg-neutral-950/60 border-primary/30 text-sm"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {CATEGORY_SUGGESTIONS.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setCategory(sug)}
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border transition-colors ${
                    category.toLowerCase() === sug.toLowerCase()
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                  }`}
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-primary/20">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
              className="text-xs uppercase font-bold tracking-wider"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs uppercase font-bold tracking-wider"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                "Save Changes"
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Add Link
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
