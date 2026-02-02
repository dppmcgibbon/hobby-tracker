"use client";

import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Download, Trash2, ExternalLink, Tag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface StlCardProps {
  stlFile: {
    id: string;
    name: string;
    description?: string | null;
    source?: string | null;
    source_url?: string | null;
    designer?: string | null;
    is_supported: boolean;
    file_size_bytes?: number | null;
    thumbnail_path?: string | null;
    storage_path: string;
  };
  tags?: Array<{ tag_id: string; tags: { name: string; color: string } }>;
  onDelete?: () => void;
}

export function StlCard({ stlFile, tags, onDelete }: StlCardProps) {
  const handleDownload = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from("stl-files")
        .download(stlFile.storage_path);

      if (error) throw error;

      // Create download link
      const url = window.URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${stlFile.name}.stl`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Download started");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download file");
    }
  };

  const getThumbnailUrl = () => {
    if (!stlFile.thumbnail_path) return null;
    const supabase = createClient();
    const { data } = supabase.storage.from("stl-thumbnails").getPublicUrl(stlFile.thumbnail_path);
    return data.publicUrl;
  };

  const thumbnailUrl = getThumbnailUrl();
  const fileSizeMB = stlFile.file_size_bytes
    ? (stlFile.file_size_bytes / 1024 / 1024).toFixed(2)
    : null;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardHeader className="p-0">
        {thumbnailUrl ? (
          <div className="aspect-square relative bg-muted">
            <Image
              src={thumbnailUrl}
              alt={stlFile.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        ) : (
          <div className="aspect-square bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
            <div className="text-6xl text-slate-600">📦</div>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-lg line-clamp-1">{stlFile.name}</h3>
            {stlFile.is_supported && (
              <Badge variant="secondary" className="shrink-0 text-xs">
                Supported
              </Badge>
            )}
          </div>

          {stlFile.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{stlFile.description}</p>
          )}

          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag.tag_id}
                  variant="secondary"
                  className="text-xs"
                  style={{ backgroundColor: tag.tags.color, color: "white" }}
                >
                  {tag.tags.name}
                </Badge>
              ))}
              {tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  <Tag className="h-3 w-3 mr-1" />+{tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {stlFile.designer && (
              <span className="flex items-center gap-1">
                <span className="font-medium">By:</span> {stlFile.designer}
              </span>
            )}
            {stlFile.source && (
              <span className="flex items-center gap-1">
                <span className="font-medium">From:</span> {stlFile.source}
              </span>
            )}
            {fileSizeMB && <span>{fileSizeMB} MB</span>}
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 flex gap-2">
        <Button asChild variant="default" size="sm" className="flex-1">
          <Link href={`/dashboard/stl/${stlFile.id}`}>
            <Eye className="mr-2 h-4 w-4" />
            View
          </Link>
        </Button>

        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="h-4 w-4" />
        </Button>

        {stlFile.source_url && (
          <Button asChild variant="outline" size="sm">
            <a href={stlFile.source_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        )}

        {onDelete && (
          <Button variant="outline" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
