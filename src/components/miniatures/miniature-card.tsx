import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import type { Miniature, MiniatureStatus } from "@/types";

interface MiniatureWithRelations extends Miniature {
  faction?: { name: string; color_hex?: string } | null;
  status?: MiniatureStatus | null;
  photos?: { storage_path: string }[];
}

interface MiniatureCardProps {
  miniature: MiniatureWithRelations;
}

const statusColors = {
  backlog: "bg-slate-500",
  assembled: "bg-blue-500",
  primed: "bg-purple-500",
  painting: "bg-yellow-500",
  completed: "bg-green-500",
};

const statusLabels = {
  backlog: "Backlog",
  assembled: "Assembled",
  primed: "Primed",
  painting: "In Progress",
  completed: "Completed",
};

export function MiniatureCard({ miniature }: MiniatureCardProps) {
  const status = miniature.status?.status || "backlog";
  const firstPhoto = miniature.photos?.[0]?.storage_path;

  return (
    <Link href={`/dashboard/collection/${miniature.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full">
        <div className="aspect-square bg-slate-100 dark:bg-slate-800 flex items-center justify-center relative">
          {firstPhoto ? (
            <Image
              src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/miniature-photos/${firstPhoto}`}
              alt={miniature.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
              unoptimized
            />
          ) : (
            <Package className="h-16 w-16 text-muted-foreground" />
          )}
          <div className="absolute top-2 right-2">
            <Badge className={statusColors[status]}>{statusLabels[status]}</Badge>
          </div>
        </div>

        <CardHeader className="pb-3">
          <h3 className="font-semibold text-lg line-clamp-1">{miniature.name}</h3>
          {miniature.faction && (
            <p className="text-sm text-muted-foreground">{miniature.faction.name}</p>
          )}
        </CardHeader>

        <CardContent className="pb-3">
          <div className="flex flex-wrap gap-2">
            {miniature.unit_type && (
              <Badge variant="outline" className="text-xs">
                {miniature.unit_type}
              </Badge>
            )}
            {miniature.quantity > 1 && (
              <Badge variant="outline" className="text-xs">
                {miniature.quantity}x
              </Badge>
            )}
          </div>
        </CardContent>

        <CardFooter className="text-xs text-muted-foreground pt-0">
          Added {new Date(miniature.created_at).toLocaleDateString()}
        </CardFooter>
      </Card>
    </Link>
  );
}
