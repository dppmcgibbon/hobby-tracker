"use client";

import { useState, useEffect } from "react";
import { getPaintImagePath } from "@/lib/utils/paint-image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getPaintEquivalents } from "@/app/actions/paints";
import type { Paint } from "@/types";

interface PaintSwatchProps {
  type: string;
  name: string;
  colorHex?: string | null;
  size?: "xs" | "sm" | "md";
  className?: string;
  paintId?: string;
  brand?: string;
}

const sizeClasses: Record<string, string> = {
  xs: "w-4 h-4",
  sm: "w-8 h-8",
  md: "w-12 h-12",
};

export function PaintSwatch({
  type,
  name,
  colorHex,
  size = "md",
  className = "",
  paintId,
  brand,
}: PaintSwatchProps) {
  const [imageError, setImageError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [equivalents, setEquivalents] = useState<Paint[]>([]);
  const imagePath = getPaintImagePath(type, name);

  useEffect(() => {
    if (modalOpen && paintId) {
      getPaintEquivalents(paintId).then(setEquivalents).catch(() => setEquivalents([]));
    }
  }, [modalOpen, paintId]);

  const sizeClass = sizeClasses[size] ?? sizeClasses.md;

  const openModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setModalOpen(true);
  };

  if (!imageError) {
    return (
      <>
        <button
          type="button"
          onClick={openModal}
          className={`${sizeClass} rounded flex-shrink-0 cursor-pointer p-0 border-0 bg-transparent hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${className}`}
        >
          <img
            src={imagePath}
            alt={name}
            className={`${sizeClass} rounded object-contain bg-transparent block`}
            onError={() => setImageError(true)}
          />
        </button>
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{name}</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center py-6">
              <img
                src={imagePath}
                alt={name}
                className="w-80 h-80 object-contain bg-transparent"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
            {equivalents.length > 0 && (
              <div className="border-t pt-4 space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Equivalent colours
                </h4>
                <div className="flex flex-wrap gap-2">
                  {equivalents.map((eq) => (
                    <div
                      key={eq.id}
                      className="flex items-center gap-2 rounded-lg border px-3 py-2"
                    >
                      <div
                        className="w-8 h-8 rounded shrink-0 border"
                        style={{ backgroundColor: eq.color_hex ?? "#888" }}
                      />
                      <div>
                        <span className="text-sm font-medium">{eq.name}</span>
                        {eq.brand && (
                          <span className="block text-xs text-muted-foreground">{eq.brand}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Fallback when no SVG image (e.g. Army Painter, Vallejo): clickable colour block + modal
  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={`${sizeClass} rounded flex-shrink-0 cursor-pointer p-0 border-0 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${className}`}
        style={{ backgroundColor: colorHex || "#888" }}
        title={name}
      />
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{name}</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center py-6">
            <div
              className="w-80 h-80 rounded-lg border"
              style={{ backgroundColor: colorHex || "#888" }}
            />
          </div>
          {equivalents.length > 0 && (
            <div className="border-t pt-4 space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                Equivalent colours
              </h4>
              <div className="flex flex-wrap gap-2">
                {equivalents.map((eq) => (
                  <div
                    key={eq.id}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2"
                  >
                    <div
                      className="w-8 h-8 rounded shrink-0 border"
                      style={{ backgroundColor: eq.color_hex ?? "#888" }}
                    />
                    <div>
                      <span className="text-sm font-medium">{eq.name}</span>
                      {eq.brand && (
                        <span className="block text-xs text-muted-foreground">{eq.brand}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
