"use client";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import Image from "next/image";
import { StatusIcon } from "./status-icon";
import { DuplicateMiniatureButton } from "./duplicate-miniature-button";
import { createClient } from "@/lib/supabase/client";
import type { MiniatureStatus } from "@/types";
import { Copy } from "lucide-react";

interface MiniatureCardProps {
  miniature: {
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
    miniature_photos: { storage_path: string }[];
    storage_box?: { id: string; name: string; location?: string | null } | null;
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
    <Card className="warhammer-card border-primary/30 hover:border-primary/50 transition-all hover:shadow-gold overflow-hidden relative group">
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
      {/* Duplicate button - shows on hover */}
      <div 
        className="absolute top-2 right-2 z-40 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <DuplicateMiniatureButton 
          miniatureId={miniature.id} 
          variant="default"
          size="icon"
          showLabel={false}
        />
      </div>
      <Link href={`/dashboard/miniatures/${miniature.id}`}>
        <div className="relative aspect-square p-4">
          <div className="relative w-full h-full">
            <Image
              src={imageUrl}
              alt={miniature.name}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-contain"
              loading="lazy"
              unoptimized={isLocalSupabase || imageUrl === "/placeholder-miniature.png"}
            />
          </div>
          {photos.length > 1 && (
            <Badge className="absolute top-6 right-6" variant="secondary">
              +{photos.length - 1}
            </Badge>
          )}
        </div>
        <div className="p-4 pb-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-lg font-semibold flex-1 leading-tight" style={{ marginBottom: '2px' }}>{miniature.name}</h3>
            {miniature.quantity > 1 && (
              <Badge variant="outline" className="text-xs shrink-0">
                x{miniature.quantity}
              </Badge>
            )}
          </div>
          {miniature.factions && (
            <p className="text-xs text-muted-foreground" style={{ marginTop: '2px' }}>
              {miniature.factions.name}
              {miniature.unit_type && `: ${miniature.unit_type}`}
            </p>
          )}
        </div>
        <CardContent className="pt-3 pb-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusIcon status={miniature.miniature_status as MiniatureStatus | null} />
              {miniature.miniature_status?.magnetised && (
                <Badge variant="outline" className="text-xs">
                  🧲
                </Badge>
              )}
              {miniature.miniature_status?.based && (
                <Badge variant="outline" className="text-xs">
                  ✓
                </Badge>
              )}
            </div>
            {miniature.storage_box && (
              <div className="flex items-center">
                <Badge variant="outline" className="text-xs">
                  📦 {miniature.storage_box.name}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
