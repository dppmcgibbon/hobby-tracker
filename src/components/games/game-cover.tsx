"use client";

import { useState } from "react";
import { Gamepad2, BookOpen, Package, Skull } from "lucide-react";
import { getR2PublicUrl } from "@/lib/r2";

interface GameCoverProps {
  title: string;
  subtitle?: string;
  universeName?: string;
  coverUrl?: string | null;
  coverImage?: string | null;
  coverType?: "box" | "book";
  year?: number | null;
}

export function GameCover({
  title,
  subtitle,
  universeName,
  coverUrl,
  coverImage,
  coverType = "box",
  year,
}: GameCoverProps) {
  const [imageError, setImageError] = useState(false);

  const isBook = coverType === "book";
  const resolvedCoverUrl = coverImage ? getR2PublicUrl(coverImage) : coverUrl;

  return (
    <div className="relative group mx-auto w-full max-w-[340px] aspect-[3/4] select-none">
      {/* 3D Box/Book Depth Shadow */}
      <div className="absolute inset-0 translate-x-2 translate-y-2 bg-black/80 rounded-sm filter blur-sm -z-10" />
      <div className="absolute inset-0 translate-x-1 translate-y-1 bg-primary/20 rounded-sm -z-10" />

      {/* Main Cover Body */}
      <div className="relative w-full h-full rounded-sm border-2 border-primary/40 bg-card overflow-hidden shadow-2xl flex flex-col justify-between p-6 bg-gradient-to-b from-neutral-900 via-zinc-950 to-black">
        {/* Book Spine / Box Edge Texture Highlight on Left */}
        <div className="absolute top-0 bottom-0 left-0 w-3.5 bg-gradient-to-r from-white/10 via-primary/20 to-transparent border-r border-primary/20 pointer-events-none z-20" />

        {/* Ornate Corner Accents */}
        <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-primary/60 pointer-events-none z-20" />
        <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-primary/60 pointer-events-none z-20" />
        <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-primary/60 pointer-events-none z-20" />
        <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-primary/60 pointer-events-none z-20" />

        {/* Inner Gold Foil Frame */}
        <div className="absolute inset-3 border border-primary/20 pointer-events-none z-20" />

        {resolvedCoverUrl && !imageError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolvedCoverUrl}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover z-0"
            onError={() => setImageError(true)}
          />
        ) : (
          <>
            {/* Top Header Section */}
            <div className="relative z-10 text-center pt-2">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary/80 gold-glow truncate">
                {universeName || "Tabletop System"}
              </p>
              <div className="h-px w-16 mx-auto bg-gradient-to-r from-transparent via-primary/50 to-transparent my-1.5" />
              {subtitle && (
                <span className="inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest bg-primary/15 text-primary rounded-full border border-primary/30">
                  {subtitle}
                </span>
              )}
            </div>

            {/* Central Emblem & Title Section */}
            <div className="relative z-10 text-center my-auto px-2 space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 border-2 border-primary/40 flex items-center justify-center shadow-lg shadow-black/60 group-hover:border-primary/80 transition-colors">
                {isBook ? (
                  <BookOpen className="h-8 w-8 text-primary" />
                ) : universeName?.toLowerCase().includes("40,000") ||
                  universeName?.toLowerCase().includes("kill team") ? (
                  <Skull className="h-8 w-8 text-primary" />
                ) : (
                  <Gamepad2 className="h-8 w-8 text-primary" />
                )}
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-foreground gold-glow leading-tight line-clamp-3">
                  {title}
                </h3>
              </div>
            </div>

            {/* Bottom Footer Section */}
            <div className="relative z-10 text-center pb-2 border-t border-primary/15 pt-2 flex items-center justify-between px-2">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {isBook ? (
                  <BookOpen className="h-3 w-3 text-primary" />
                ) : (
                  <Package className="h-3 w-3 text-primary" />
                )}
                <span>{isBook ? "Rulebook" : "Box Cover"}</span>
              </div>
              {year && (
                <span className="text-[10px] font-mono font-bold text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                  {year}
                </span>
              )}
            </div>
          </>
        )}

        {/* Ambient Subtle Light Sheen */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none z-20" />
      </div>
    </div>
  );
}
