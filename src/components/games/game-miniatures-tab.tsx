"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Plus, ExternalLink } from "lucide-react";
import { MiniatureCard } from "@/components/miniatures/miniature-card";

export interface GameMiniatureItem {
  id: string;
  name: string;
  quantity: number;
  created_at: string;
  unit_type?: string | null;
  factions: { name: string } | null;
  miniature_status: {
    status: string;
    completed_at?: string | null;
    based?: boolean | null;
    magnetised?: boolean | null;
  } | null;
  miniature_photos: { storage_path: string; image_updated_at?: string | null }[];
  storage_box?: { id: string; name: string; location?: string | null } | null;
}

interface GameMiniaturesTabProps {
  miniatures: GameMiniatureItem[];
  gameTitle?: string;
  miniaturesFilterUrl: string;
}

export function GameMiniaturesTab({
  miniatures,
  gameTitle = "Game",
  miniaturesFilterUrl,
}: GameMiniaturesTabProps) {
  const totalModels = miniatures.reduce((sum, m) => sum + (m.quantity || 1), 0);

  return (
    <Card className="warhammer-card border-primary/30">
      <CardHeader className="pb-4 border-b border-primary/15 flex flex-row items-center justify-between space-y-0 flex-wrap gap-2">
        <div>
          <CardTitle className="text-lg font-black uppercase tracking-wider text-primary flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Miniatures & Units
          </CardTitle>
          <CardDescription className="text-xs uppercase tracking-wide mt-1">
            {miniatures.length > 0
              ? `${miniatures.length} unit${miniatures.length === 1 ? "" : "s"} (${totalModels} total model${totalModels === 1 ? "" : "s"}) assigned to ${gameTitle}`
              : `Operatives, units, and models assigned to ${gameTitle}`}
          </CardDescription>
        </div>

        <div className="flex items-center gap-2">
          {miniatures.length > 0 && (
            <Button
              asChild
              variant="outline"
              size="icon"
              className="border-primary/30 hover:border-primary hover:bg-primary/10 h-8 w-8 text-primary"
              title="View in Collection"
              aria-label="View in Collection"
            >
              <Link href={miniaturesFilterUrl}>
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
          )}

          <Button
            asChild
            size="icon"
            className="btn-warhammer-primary h-8 w-8"
            title="Add Miniature"
            aria-label="Add Miniature"
          >
            <Link href="/dashboard/miniatures/add">
              <Plus className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-5">
        {miniatures.length === 0 ? (
          <div className="text-center py-12 px-4 border border-dashed border-primary/20 rounded-sm bg-black/20">
            <div className="inline-flex p-3 rounded-full bg-primary/10 border border-primary/30 mb-3">
              <Package className="h-8 w-8 text-primary/70" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
              No Miniatures Assigned Yet
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Assign miniatures from your collection to {gameTitle}, or add new models to begin
              tracking your forces.
            </p>
            <div className="flex items-center justify-center gap-3 mt-5">
              <Button
                asChild
                size="sm"
                className="btn-warhammer-primary text-xs font-bold uppercase tracking-wider"
              >
                <Link href="/dashboard/miniatures/add">
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Add First Miniature
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-primary/40 hover:border-primary hover:bg-primary/10 text-xs font-bold uppercase tracking-wider text-primary"
              >
                <Link href="/dashboard/miniatures">Browse Collection</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {miniatures.map((miniature) => (
              <MiniatureCard key={miniature.id} miniature={miniature} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
