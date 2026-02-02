"use client";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import Image from "next/image";
import { StatusBadge } from "./status-badge";
import { createClient } from "@/lib/supabase/client";
import type { MiniatureStatus } from "@/types";

interface MiniatureCardProps {
  miniature: {
    id: string;
    name: string;
    quantity: number;
    created_at: string;
    factions: { name: string } | null;
    miniature_status: {
      status: string;
      completed_at?: string | null;
      based?: boolean | null;
      magnetised?: boolean | null;
    } | null;
    miniature_photos: { storage_path: string }[];
  };
  selectable?: boolean;
  selected?: boolean;
  onSelectChange?: (id: string, selected: boolean) => void;
}

export function MiniatureCard({
  miniature,
  selectable,
  selected,
  onSelectChange,
}: MiniatureCardProps) {
  const supabase = createClient();
  const photos = miniature.miniature_photos || [];
  const firstPhoto = photos[0];

  // DEBUG: Log when component renders
  console.log(`MiniatureCard ${miniature.id}:`, { selectable, selected });

  // Format date consistently for SSR/Client hydration
  const formattedDate = new Date(miniature.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  let imageUrl = "/placeholder-miniature.png";
  let isLocalSupabase = false;
  if (firstPhoto && firstPhoto.storage_path) {
    const { data } = supabase.storage
      .from("miniature-photos")
      .getPublicUrl(firstPhoto.storage_path);
    imageUrl = data.publicUrl;
    isLocalSupabase = imageUrl.includes("127.0.0.1") || imageUrl.includes("localhost");
    console.log("Generated image URL:", imageUrl);
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow relative">
      {selectable && (
        <div
          className="absolute top-2 left-2 z-50 bg-white dark:bg-gray-800 rounded-md p-2 shadow-lg border-2 border-primary"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log("Checkbox wrapper clicked");
          }}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => {
              console.log("Checkbox changed:", { miniatureId: miniature.id, checked });
              onSelectChange?.(miniature.id, !!checked);
            }}
          />
        </div>
      )}
      {/* DEBUG: Visual indicator when selectable is true */}
      {selectable && (
        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-bl z-40">
          Selectable
        </div>
      )}
      <Link href={`/dashboard/collection/${miniature.id}`}>
        <div className="relative aspect-square bg-muted">
          <Image
            src={imageUrl}
            alt={miniature.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
            loading="lazy"
            unoptimized={isLocalSupabase || imageUrl === "/placeholder-miniature.png"}
          />
          {photos.length > 1 && (
            <Badge className="absolute top-2 right-2" variant="secondary">
              +{photos.length - 1}
            </Badge>
          )}
        </div>
        <CardHeader>
          <CardTitle className="line-clamp-2">{miniature.name}</CardTitle>
          {miniature.factions && (
            <p className="text-sm text-muted-foreground">{miniature.factions.name}</p>
          )}
        </CardHeader>
        <CardContent>
          <StatusBadge
            miniatureId={miniature.id}
            status={miniature.miniature_status as MiniatureStatus | null}
          />
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            Quantity: {miniature.quantity} • Added {formattedDate}
          </p>
        </CardFooter>
      </Link>
    </Card>
  );
}
