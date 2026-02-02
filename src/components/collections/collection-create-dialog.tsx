"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { HexColorPicker } from "react-colorful";
import { createCollection } from "@/app/actions/collections";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function CollectionCreateDialog({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      try {
        const result = await createCollection({ name, description, color });
        toast.success("Collection created successfully");
        setIsOpen(false);
        setName("");
        setDescription("");
        setColor("#3b82f6");
        router.push(`/dashboard/collections/${result.collection.id}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to create collection");
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Collection</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Collection Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Tournament Army, Work in Progress"
              maxLength={100}
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this collection for?"
              maxLength={500}
              rows={3}
            />
          </div>
          <div>
            <Label>Collection Color</Label>
            <div className="flex items-center gap-4 mt-2">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="w-12 h-12 rounded-md border-2 border-gray-300"
                    style={{ backgroundColor: color }}
                  />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3">
                  <HexColorPicker color={color} onChange={setColor} />
                </PopoverContent>
              </Popover>
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#3b82f6"
                pattern="^#[0-9A-Fa-f]{6}$"
                className="flex-1"
              />
            </div>
          </div>
          <Button type="submit" disabled={isPending} className="w-full">
            Create Collection
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
