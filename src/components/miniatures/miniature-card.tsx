"use client";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
}

export function MiniatureCard({ miniature }: MiniatureCardProps) {
  const supabase = createClient();
  const photos = miniature.miniature_photos || [];
  const firstPhoto = photos[0];

  console.log("Miniature photos:", {
    miniatureId: miniature.id,
    photosCount: photos.length,
    firstPhoto,
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
    <Link href={`/dashboard/collection/${miniature.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
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
            Quantity: {miniature.quantity} • Added{" "}
            {new Date(miniature.created_at).toLocaleDateString()}
          </p>
        </CardFooter>
      </Card>
    </Link>
  );
}
