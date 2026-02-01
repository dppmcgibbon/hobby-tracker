"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updatePaintInventory, removePaintFromInventory } from "@/app/actions/paints";
import { Edit2, Trash2, Search } from "lucide-react";
import type { UserPaint, Paint } from "@/types";

interface UserPaintWithPaint extends UserPaint {
  paint: Paint;
}

interface PaintInventoryListProps {
  userPaints: UserPaintWithPaint[];
}

const paintTypeColors: Record<string, string> = {
  base: "bg-amber-500",
  layer: "bg-blue-500",
  shade: "bg-purple-500",
  dry: "bg-orange-500",
  technical: "bg-red-500",
  contrast: "bg-green-500",
  air: "bg-cyan-500",
  spray: "bg-pink-500",
};

export function PaintInventoryList({ userPaints }: PaintInventoryListProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [editingPaint, setEditingPaint] = useState<UserPaintWithPaint | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const filteredPaints = userPaints.filter((up) =>
    up.paint.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (userPaint: UserPaintWithPaint) => {
    setEditingPaint(userPaint);
    setQuantity(userPaint.quantity);
    setNotes(userPaint.notes || "");
  };

  const handleUpdate = async () => {
    if (!editingPaint) return;

    setIsUpdating(true);
    try {
      await updatePaintInventory(editingPaint.id, { quantity, notes });
      setEditingPaint(null);
      router.refresh();
    } catch (error) {
      console.error("Failed to update:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this paint from your inventory?")) return;

    try {
      await removePaintFromInventory(id);
      router.refresh();
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search your paints..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Color</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPaints.map((userPaint) => (
              <TableRow key={userPaint.id}>
                <TableCell>
                  <div
                    className="w-8 h-8 rounded border"
                    style={{ backgroundColor: userPaint.paint.color_hex || "#888" }}
                  />
                </TableCell>
                <TableCell className="font-medium">{userPaint.paint.name}</TableCell>
                <TableCell>{userPaint.paint.brand}</TableCell>
                <TableCell>
                  <Badge className={paintTypeColors[userPaint.paint.type] || "bg-gray-500"}>
                    {userPaint.paint.type}
                  </Badge>
                </TableCell>
                <TableCell>{userPaint.quantity}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {userPaint.notes || "-"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(userPaint)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(userPaint.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingPaint} onOpenChange={() => setEditingPaint(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Paint</DialogTitle>
            <DialogDescription>{editingPaint?.paint.name}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingPaint(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={isUpdating}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
