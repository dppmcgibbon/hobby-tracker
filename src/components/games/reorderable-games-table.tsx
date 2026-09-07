"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { GripVertical, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { reorderGames, reorderEditions, reorderExpansions } from "@/app/actions/games";

export interface ReorderableItem {
  id: string;
  name: string;
  year?: number | null;
  sequence?: number | null;
  href: string;
}

interface ReorderableGamesTableProps {
  items: ReorderableItem[];
  type: "games" | "editions" | "expansions";
  columnTitle: string; // e.g. "Game", "Edition", "Expansion"
  emptyMessage?: string;
}

export function ReorderableGamesTable({
  items,
  type,
  columnTitle,
  emptyMessage,
}: ReorderableGamesTableProps) {
  const [listItems, setListItems] = useState<ReorderableItem[]>(items);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  // Sync state if props change
  useEffect(() => {
    setListItems(items);
  }, [items]);

  const persistOrder = async (newItems: ReorderableItem[]) => {
    const previousItems = [...listItems];
    const orderedIds = newItems.map((item) => item.id);

    startTransition(async () => {
      try {
        if (type === "games") {
          await reorderGames(orderedIds);
        } else if (type === "editions") {
          await reorderEditions(orderedIds);
        } else if (type === "expansions") {
          await reorderExpansions(orderedIds);
        }
        toast.success(`${columnTitle} order updated`);
      } catch (error) {
        setListItems(previousItems);
        toast.error(
          error instanceof Error ? error.message : `Failed to update ${columnTitle.toLowerCase()} order`
        );
      }
    });
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if ((e.target as HTMLElement).closest("button")) {
      e.preventDefault();
      return;
    }
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", `${index}`);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...listItems];
    const [moved] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, moved);

    setListItems(updated);
    setDraggedIndex(null);
    setDragOverIndex(null);

    await persistOrder(updated);
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= listItems.length) return;

    const updated = [...listItems];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);

    setListItems(updated);
    await persistOrder(updated);
  };

  return (
    <div className="warhammer-card border-primary/30 rounded-sm overflow-hidden w-full relative">
      {isPending && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 px-2 py-1 rounded bg-background/80 backdrop-blur-sm border border-primary/30 text-[10px] uppercase font-bold text-primary tracking-wider shadow-sm">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Saving order...</span>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow className="border-primary/20 hover:bg-muted/30">
            <TableHead className="w-24 font-bold uppercase text-xs tracking-wide text-primary px-4 py-3 text-center">
              Order
            </TableHead>
            <TableHead className="font-bold uppercase text-xs tracking-wide text-primary px-4 py-3">
              {columnTitle}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {listItems.length === 0 ? (
            <TableRow>
              <TableCell colSpan={2} className="px-4 py-8 text-center text-sm text-muted-foreground italic">
                {emptyMessage || `No ${columnTitle.toLowerCase()}s found.`}
              </TableCell>
            </TableRow>
          ) : (
            listItems.map((item, index) => {
              const isDragging = draggedIndex === index;
              const isDragOver = dragOverIndex === index && draggedIndex !== index;
              const orderNumber = index + 1;

              return (
                <TableRow
                  key={item.id}
                  draggable={!isPending}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`group transition-all duration-150 select-none ${
                    isDragging
                      ? "opacity-30 bg-primary/10 border-dashed border-primary"
                      : isDragOver
                        ? "bg-primary/20 border-t-2 border-t-primary shadow-gold"
                        : "border-primary/10 hover:bg-muted/20"
                  }`}
                >
                  {/* Order & Drag Handle Cell */}
                  <TableCell className="px-3 py-2 text-center w-24 align-middle">
                    <div className="flex items-center justify-center gap-1.5">
                      <div
                        className="cursor-grab active:cursor-grabbing text-muted-foreground/60 group-hover:text-primary transition-colors p-1 rounded hover:bg-primary/10"
                        title="Drag to reorder"
                      >
                        <GripVertical className="h-4 w-4" />
                      </div>
                      <span className="inline-flex items-center justify-center min-w-[26px] h-6 px-1.5 rounded bg-primary/15 text-primary text-xs font-bold border border-primary/30 font-mono">
                        {orderNumber}
                      </span>
                      <div className="flex flex-col -my-1 ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          disabled={index === 0 || isPending}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleMove(index, "up");
                          }}
                          className="text-muted-foreground hover:text-primary disabled:opacity-20 disabled:hover:text-muted-foreground p-0.5 leading-none transition-colors"
                          title="Move up"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          disabled={index === listItems.length - 1 || isPending}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleMove(index, "down");
                          }}
                          className="text-muted-foreground hover:text-primary disabled:opacity-20 disabled:hover:text-muted-foreground p-0.5 leading-none transition-colors"
                          title="Move down"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </TableCell>

                  {/* Title / Link Cell */}
                  <TableCell className="p-0">
                    <Link
                      href={item.href}
                      draggable={false}
                      className="block w-full px-4 py-3.5 font-bold text-sm uppercase tracking-wide text-foreground hover:text-primary transition-colors"
                    >
                      {item.name}
                      {item.year && (
                        <span className="text-xs font-normal text-muted-foreground ml-2">
                          ({item.year})
                        </span>
                      )}
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
