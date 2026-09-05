"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, ExternalLink, Plus, Edit2, Trash2, Loader2, Link2 } from "lucide-react";
import { GameLinkDialog } from "@/components/games/game-link-dialog";
import { deleteGameLink, type GameEntityType } from "@/app/actions/games";
import { type GameInfoLink, isGameResourceLink } from "@/lib/games/game-details";

interface GameLinksCardProps {
  entityType: GameEntityType;
  entityId: string;
  links: GameInfoLink[];
}

export function GameLinksCard({ entityType, entityId, links }: GameLinksCardProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingLink, setEditingLink] = useState<GameInfoLink | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Filter out PDF documents and game images so they only appear in their dedicated tabs
  const resourceLinks = links.filter(isGameResourceLink);

  const handleDelete = async (e: React.MouseEvent, linkId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm("Are you sure you want to remove this resource link?")) {
      return;
    }

    setDeletingId(linkId);
    try {
      await deleteGameLink(entityType, entityId, linkId);
      toast.success("Link removed");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete link";
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (e: React.MouseEvent, link: GameInfoLink) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingLink(link);
    setEditDialogOpen(true);
  };

  return (
    <>
      <Card className="warhammer-card border-primary/30">
        <CardHeader className="pb-3 border-b border-primary/15 flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg font-black uppercase tracking-wider text-primary flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Info & Resources
            </CardTitle>
            <CardDescription className="text-xs uppercase tracking-wide mt-1">
              Rules, community databases, and official links
            </CardDescription>
          </div>

          <GameLinkDialog
            entityType={entityType}
            entityId={entityId}
            trigger={
              <Button
                variant="outline"
                size="sm"
                className="border-primary/40 hover:border-primary hover:bg-primary/10 text-xs font-bold uppercase tracking-wider text-primary h-8"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Link
              </Button>
            }
          />
        </CardHeader>

        <CardContent className="pt-4">
          {resourceLinks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center border border-dashed border-primary/20 rounded-lg bg-neutral-950/40">
              <div className="p-3 rounded-full bg-primary/10 text-primary border border-primary/20 mb-3">
                <Link2 className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-foreground uppercase tracking-wider">
                No Links Added Yet
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Add references, rules wikis, official errata, or tactical guides for quick access.
              </p>
              <div className="mt-4">
                <GameLinkDialog
                  entityType={entityType}
                  entityId={entityId}
                  trigger={
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold uppercase tracking-wider"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Add First Link
                    </Button>
                  }
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {resourceLinks.map((link) => (
                <div
                  key={link.id || link.url}
                  className="relative p-3.5 rounded bg-muted/30 hover:bg-muted/70 border border-primary/20 hover:border-primary/50 transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-sm text-foreground hover:text-primary transition-colors flex items-center gap-1.5 flex-1 pr-2"
                      >
                        <span className="line-clamp-1">{link.title}</span>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                      </a>

                      {/* Action buttons */}
                      <div className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleEdit(e, link)}
                          className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          title="Edit link"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDelete(e, link.id)}
                          disabled={deletingId === link.id}
                          className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Delete link"
                        >
                          {deletingId === link.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {link.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {link.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-primary/10">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70">
                      {link.category || "Resource"}
                    </span>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-muted-foreground hover:text-primary font-mono truncate max-w-[180px]"
                    >
                      {link.url.replace(/^https?:\/\/(www\.)?/, "")}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Controlled edit dialog */}
      {editingLink && (
        <GameLinkDialog
          entityType={entityType}
          entityId={entityId}
          initialLink={editingLink}
          open={editDialogOpen}
          onOpenChange={(isOpen) => {
            setEditDialogOpen(isOpen);
            if (!isOpen) setEditingLink(null);
          }}
        />
      )}
    </>
  );
}
