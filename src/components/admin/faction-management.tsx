"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { createFaction, updateFaction, deleteFaction } from "@/app/actions/factions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Faction {
  id: string;
  name: string;
  army_type: string;
  description?: string | null;
  color_hex?: string | null;
}

interface ArmyType {
  id: string;
  name: string;
}

interface FactionManagementProps {
  factions: Faction[];
  armyTypes: ArmyType[];
}

export function FactionManagement({ factions, armyTypes }: FactionManagementProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingFaction, setEditingFaction] = useState<Faction | null>(null);
  const [deletingFaction, setDeletingFaction] = useState<Faction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    army_type: "imperium",
    description: "",
  });

  const openAddDialog = () => {
    setEditingFaction(null);
    setFormData({
      name: "",
      army_type: armyTypes.length > 0 ? armyTypes[0].name : "imperium",
      description: "",
    });
    setShowDialog(true);
  };

  const openEditDialog = (faction: Faction) => {
    setEditingFaction(faction);
    setFormData({
      name: faction.name,
      army_type: faction.army_type,
      description: faction.description || "",
    });
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingFaction) {
        await updateFaction(editingFaction.id, formData);
        toast.success("Faction updated successfully");
      } else {
        await createFaction(formData);
        toast.success("Faction created successfully");
      }
      setShowDialog(false);
      router.refresh();
    } catch (error) {
      console.error("Error saving faction:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save faction");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingFaction) return;

    setIsSubmitting(true);
    try {
      await deleteFaction(deletingFaction.id);
      toast.success("Faction deleted successfully");
      setDeletingFaction(null);
      router.refresh();
    } catch (error) {
      console.error("Error deleting faction:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete faction");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {factions.length} faction{factions.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={openAddDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Faction
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Army Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {factions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No factions yet. Add your first faction to get started.
                </TableCell>
              </TableRow>
            ) : (
              factions.map((faction) => (
                <TableRow key={faction.id}>
                  <TableCell className="font-semibold">{faction.name}</TableCell>
                  <TableCell>
                    <span className="text-xs uppercase tracking-wide px-2 py-1 bg-primary/10 rounded">
                      {faction.army_type}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                    {faction.description || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(faction)}
                        className="h-8 w-8"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingFaction(faction)}
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

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFaction ? "Edit Faction" : "Add New Faction"}</DialogTitle>
            <DialogDescription>
              {editingFaction
                ? "Update the faction details below."
                : "Enter the details for the new faction."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Space Marines"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="army_type">Army Type *</Label>
                <Select
                  value={formData.army_type}
                  onValueChange={(value) => setFormData({ ...formData, army_type: value })}
                >
                  <SelectTrigger id="army_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {armyTypes.map((type) => (
                      <SelectItem key={type.id} value={type.name}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the faction"
                  rows={3}
                />
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
                ) : editingFaction ? (
                  "Update Faction"
                ) : (
                  "Create Faction"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingFaction} onOpenChange={() => setDeletingFaction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Faction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingFaction?.name}"? This will remove the faction
              from all miniatures that use it.
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
