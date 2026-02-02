"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { addMiniaturesToCollection } from "@/app/actions/collections";
import { getMiniaturesExcludingCollection } from "@/app/actions/miniatures";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Miniature {
  id: string;
  name: string;
  factions?: { name: string } | null;
}

interface Props {
  collectionId: string;
  children: React.ReactNode;
}

export function AddMiniaturesDialog({ collectionId, children }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [miniatures, setMiniatures] = useState<Miniature[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);

  const loadMiniatures = async () => {
    setIsLoading(true);
    try {
      const result = await getMiniaturesExcludingCollection(collectionId);
      setMiniatures(result.miniatures);
    } catch {
      toast.error("Failed to load miniatures");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      loadMiniatures();
    }
  };

  const handleSubmit = () => {
    if (selectedIds.length === 0) return;

    startTransition(async () => {
      try {
        await addMiniaturesToCollection(collectionId, selectedIds);
        toast.success(`Added ${selectedIds.length} miniature(s) to collection`);
        setIsOpen(false);
        setSelectedIds([]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to add miniatures");
      }
    });
  };

  const toggleMiniature = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Miniatures to Collection</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading miniatures...</p>
          ) : miniatures.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No miniatures available to add</p>
          ) : (
            <div className="space-y-2">
              {miniatures.map((miniature) => (
                <div
                  key={miniature.id}
                  className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent cursor-pointer"
                  onClick={() => toggleMiniature(miniature.id)}
                >
                  <Checkbox
                    checked={selectedIds.includes(miniature.id)}
                    onCheckedChange={() => toggleMiniature(miniature.id)}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{miniature.name}</p>
                    {miniature.factions && (
                      <p className="text-sm text-muted-foreground">{miniature.factions.name}</p>
                    )}
                  </div>
                  {selectedIds.includes(miniature.id) && <Check className="h-5 w-5 text-primary" />}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">{selectedIds.length} selected</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending || selectedIds.length === 0}>
              Add to Collection
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
