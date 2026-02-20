"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { createPaint, updatePaint, deletePaint } from "@/app/actions/paints-admin";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const PAINT_TYPES = [
  "base",
  "layer",
  "shade",
  "dry",
  "technical",
  "contrast",
  "air",
  "spray",
] as const;

export interface PaintRecord {
  id: string;
  brand: string;
  name: string;
  type: string;
  color_hex: string | null;
  created_at?: string;
}

interface PaintManagementProps {
  paints: PaintRecord[];
}

export function PaintManagement({ paints }: PaintManagementProps) {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);
  const [editingPaint, setEditingPaint] = useState<PaintRecord | null>(null);
  const [deletingPaint, setDeletingPaint] = useState<PaintRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const [formData, setFormData] = useState({
    brand: "",
    name: "",
    type: "layer",
    color_hex: "",
  });

  const brands = useMemo(
    () => Array.from(new Set(paints.map((p) => p.brand))).sort(),
    [paints]
  );

  const filteredPaints = useMemo(() => {
    return paints.filter((p) => {
      const matchBrand = brandFilter === "all" || p.brand === brandFilter;
      const matchType = typeFilter === "all" || p.type === typeFilter;
      const matchSearch =
        !search.trim() ||
        p.brand.toLowerCase().includes(search.toLowerCase()) ||
        p.name.toLowerCase().includes(search.toLowerCase());
      return matchBrand && matchType && matchSearch;
    });
  }, [paints, brandFilter, typeFilter, search]);

  const openAddDialog = () => {
    setEditingPaint(null);
    setFormData({
      brand: brands[0] ?? "",
      name: "",
      type: "layer",
      color_hex: "",
    });
    setShowDialog(true);
  };

  const openEditDialog = (paint: PaintRecord) => {
    setEditingPaint(paint);
    setFormData({
      brand: paint.brand,
      name: paint.name,
      type: paint.type,
      color_hex: paint.color_hex ?? "",
    });
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingPaint) {
        await updatePaint(editingPaint.id, {
          brand: formData.brand,
          name: formData.name,
          type: formData.type,
          color_hex: formData.color_hex || null,
        });
        toast.success("Paint updated successfully");
      } else {
        await createPaint({
          brand: formData.brand,
          name: formData.name,
          type: formData.type,
          color_hex: formData.color_hex || null,
        });
        toast.success("Paint added successfully");
      }
      setShowDialog(false);
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to save paint");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingPaint) return;
    setIsSubmitting(true);
    try {
      await deletePaint(deletingPaint.id);
      toast.success("Paint deleted");
      setDeletingPaint(null);
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to delete paint");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {filteredPaints.length} paint{filteredPaints.length !== 1 ? "s" : ""}
          {brandFilter !== "all" || typeFilter !== "all" || search
            ? ` (filtered from ${paints.length})`
            : ""}
        </p>
        <Button onClick={openAddDialog} className="gap-2 w-fit">
          <Plus className="h-4 w-4" />
          Add Paint
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Input
          placeholder="Search brand or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={brandFilter} onValueChange={setBrandFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Brand" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All brands</SelectItem>
            {brands.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {PAINT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Color</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="font-mono text-xs">Hex</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPaints.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No paints match the filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredPaints.map((paint) => (
                <TableRow key={paint.id}>
                  <TableCell>
                    <div
                      className="h-8 w-8 rounded border border-border shrink-0"
                      style={{ backgroundColor: paint.color_hex ?? "#e5e5e5" }}
                      title={paint.color_hex ?? "No hex"}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{paint.brand}</TableCell>
                  <TableCell>{paint.name}</TableCell>
                  <TableCell>
                    <span className="text-xs uppercase tracking-wide px-2 py-1 bg-muted rounded">
                      {paint.type}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {paint.color_hex ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(paint)}
                        className="h-8 w-8"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingPaint(paint)}
                        className="h-8 w-8 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPaint ? "Edit Paint" : "Add Paint"}</DialogTitle>
            <DialogDescription>
              {editingPaint
                ? "Update paint details or hex code."
                : "Add a new paint. Use an existing brand or type a new one."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="brand">Brand *</Label>
                <Input
                  id="brand"
                  list="brand-list"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="e.g. Citadel, Army Painter"
                  required
                />
                <datalist id="brand-list">
                  {brands.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Mephiston Red"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAINT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="color_hex">Color (hex)</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="color_hex"
                    value={formData.color_hex}
                    onChange={(e) => setFormData({ ...formData, color_hex: e.target.value })}
                    placeholder="#cf2127"
                    className="font-mono"
                  />
                  <div
                    className="h-10 w-10 rounded border border-border shrink-0"
                    style={{
                      backgroundColor:
                        /^#?[0-9A-Fa-f]{6}$/.test(formData.color_hex.replace(/^#/, ""))
                          ? formData.color_hex.startsWith("#")
                            ? formData.color_hex
                            : `#${formData.color_hex}`
                          : "#e5e5e5",
                    }}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingPaint ? (
                  "Update Paint"
                ) : (
                  "Add Paint"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingPaint} onOpenChange={() => setDeletingPaint(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete paint</AlertDialogTitle>
            <AlertDialogDescription>
              Delete &quot;{deletingPaint?.name}&quot; ({deletingPaint?.brand})? This cannot be
              undone. User inventories and recipe steps using this paint may be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
