"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Plus,
  Edit,
  Trash2,
  ChevronUp,
  ChevronDown,
  Loader2,
  Search,
  AlertTriangle,
  Tag,
  Sparkles,
  HelpCircle,
  XCircle,
  Scissors,
  Package,
  ToyBrick,
  Hammer,
  SprayCan,
  Paintbrush,
  Wrench,
  Settings,
  Hand,
  Footprints,
  CircleUser,
  CheckCircle2,
} from "lucide-react";
import { createStatus, updateStatus, deleteStatus, moveStatus } from "@/app/actions/statuses";
import {
  getMiniatureStatusDisplayLabel,
  normalizeStatusKey,
  STATUS_COLORS,
} from "@/lib/constants/miniature-status";
import { toast } from "sonner";

export interface StatusItem {
  id: string;
  name: string;
  display_order: number;
  created_at: string | null;
}

interface StatusManagementProps {
  statuses: StatusItem[];
  usageCounts?: Record<string, number>;
}

const STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  unknown: HelpCircle,
  missing: XCircle,
  needs_stripped: Scissors,
  backlog: Package,
  on_sprue: ToyBrick,
  built: Hammer,
  primed: SprayCan,
  painting_started: Paintbrush,
  needs_repair: Wrench,
  sub_assembled: Settings,
  missing_arm: Hand,
  missing_leg: Footprints,
  missing_head: CircleUser,
  complete: CheckCircle2,
};

export function StatusManagement({
  statuses: initialStatuses,
  usageCounts = {},
}: StatusManagementProps) {
  const router = useRouter();

  // Dialog states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<StatusItem | null>(null);

  // Form states
  const [inputName, setInputName] = useState("");
  const [customKey, setCustomKey] = useState("");
  const [manualKeyOverride, setManualKeyOverride] = useState(false);
  const [inputOrder, setInputOrder] = useState<number | "">("");
  const [replacementStatusName, setReplacementStatusName] = useState<string>("");

  // Search & loading
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);

  // Filtered & sorted statuses
  const sortedStatuses = useMemo(() => {
    return [...initialStatuses].sort((a, b) => a.display_order - b.display_order);
  }, [initialStatuses]);

  const filteredStatuses = useMemo(() => {
    if (!searchQuery.trim()) return sortedStatuses;
    const q = searchQuery.toLowerCase().trim();
    return sortedStatuses.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        getMiniatureStatusDisplayLabel(s.name).toLowerCase().includes(q)
    );
  }, [sortedStatuses, searchQuery]);

  const nextDisplayOrder = useMemo(() => {
    if (initialStatuses.length === 0) return 1;
    return initialStatuses.reduce((max, s) => Math.max(max, s.display_order), 0) + 1;
  }, [initialStatuses]);

  const handleOpenAdd = () => {
    setInputName("");
    setCustomKey("");
    setManualKeyOverride(false);
    setInputOrder(nextDisplayOrder);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (status: StatusItem) => {
    setSelectedStatus(status);
    setInputName(getMiniatureStatusDisplayLabel(status.name));
    setCustomKey(status.name);
    setManualKeyOverride(true);
    setInputOrder(status.display_order);
    setIsEditOpen(true);
  };

  const handleOpenDelete = (status: StatusItem) => {
    setSelectedStatus(status);
    // Find a default replacement status that is not the one being deleted
    const alternative = initialStatuses.find((s) => s.id !== status.id)?.name || "";
    setReplacementStatusName(alternative);
    setIsDeleteOpen(true);
  };

  const handleNameChange = (val: string) => {
    setInputName(val);
    if (!manualKeyOverride) {
      setCustomKey(normalizeStatusKey(val));
    }
  };

  const handleKeyChange = (val: string) => {
    setManualKeyOverride(true);
    setCustomKey(normalizeStatusKey(val));
  };

  const handleCreate = async () => {
    const finalKey = customKey.trim() || normalizeStatusKey(inputName);
    if (!finalKey) {
      toast.error("Please enter a valid status name");
      return;
    }

    setIsSubmitting(true);
    try {
      await createStatus({
        name: finalKey,
        display_order: typeof inputOrder === "number" ? inputOrder : undefined,
      });
      toast.success(`Status "${getMiniatureStatusDisplayLabel(finalKey)}" created successfully`);
      setIsAddOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create status");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedStatus) return;
    const finalKey = customKey.trim() || normalizeStatusKey(inputName);
    if (!finalKey) {
      toast.error("Please enter a valid status name");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateStatus(selectedStatus.id, {
        name: finalKey,
        display_order: typeof inputOrder === "number" ? inputOrder : undefined,
      });
      toast.success(`Status updated successfully`);
      setIsEditOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedStatus) return;

    const inUse = usageCounts[selectedStatus.name] ?? 0;
    if (inUse > 0 && !replacementStatusName) {
      toast.error("Please select a replacement status for assigned miniatures");
      return;
    }

    setIsSubmitting(true);
    try {
      await deleteStatus(selectedStatus.id, {
        reassignToStatusName: inUse > 0 ? replacementStatusName : undefined,
      });
      toast.success(`Status "${getMiniatureStatusDisplayLabel(selectedStatus.name)}" deleted`);
      setIsDeleteOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete status");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMove = async (id: string, direction: "up" | "down") => {
    setMovingId(id);
    try {
      await moveStatus(id, direction);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to move status");
    } finally {
      setMovingId(null);
    }
  };

  const activeInUseCount = selectedStatus ? (usageCounts[selectedStatus.name] ?? 0) : 0;

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search statuses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={handleOpenAdd} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Add Status
        </Button>
      </div>

      {/* Statuses Table */}
      <div className="rounded-lg border border-border/60 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-[120px]">Order</TableHead>
              <TableHead>Status Name</TableHead>
              <TableHead>System Identifier</TableHead>
              <TableHead className="text-center">Miniatures</TableHead>
              <TableHead className="hidden md:table-cell">Created</TableHead>
              <TableHead className="w-[110px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStatuses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  {searchQuery
                    ? "No matching statuses found."
                    : "No statuses found. Add your first status above."}
                </TableCell>
              </TableRow>
            ) : (
              filteredStatuses.map((status, index) => {
                const isFirst = index === 0;
                const isLast = index === filteredStatuses.length - 1;
                const count = usageCounts[status.name] ?? 0;
                const IconComponent = STATUS_ICONS[status.name] || Tag;
                const statusColor = STATUS_COLORS[status.name] || "hsl(43, 96%, 56%)";
                const isMoving = movingId === status.id;

                return (
                  <TableRow key={status.id} className="group hover:bg-primary/5 transition-colors">
                    {/* Order column with Move Up/Down buttons */}
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Badge
                          variant="outline"
                          className="font-mono text-xs w-8 justify-center border-primary/30 text-primary"
                        >
                          #{status.display_order}
                        </Badge>
                        <div className="flex flex-col -space-y-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-muted-foreground hover:text-primary disabled:opacity-30"
                            onClick={() => handleMove(status.id, "up")}
                            disabled={isFirst || isMoving}
                            title="Move up"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-muted-foreground hover:text-primary disabled:opacity-30"
                            onClick={() => handleMove(status.id, "down")}
                            disabled={isLast || isMoving}
                            title="Move down"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </TableCell>

                    {/* Status Name + Icon/Color preview */}
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 border border-border shadow-sm"
                          style={{ backgroundColor: statusColor }}
                          title={`Color indicator for ${status.name}`}
                        />
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-semibold text-foreground text-sm">
                            {getMiniatureStatusDisplayLabel(status.name)}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* System Identifier */}
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground font-mono border border-border/40">
                        {status.name}
                      </code>
                    </TableCell>

                    {/* Miniatures Using Count */}
                    <TableCell className="text-center">
                      {count > 0 ? (
                        <Badge
                          variant="secondary"
                          className="font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
                        >
                          {count} {count === 1 ? "miniature" : "miniatures"}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Unused</span>
                      )}
                    </TableCell>

                    {/* Created At */}
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {status.created_at
                        ? new Date(status.created_at).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(status)}
                          className="h-8 w-8 hover:text-primary hover:bg-primary/10"
                          title="Edit status"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDelete(status)}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          title="Delete status"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Status Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Add Status
            </DialogTitle>
            <DialogDescription>Create a new status for your miniatures workflow.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="status-name">Display Name *</Label>
              <Input
                id="status-name"
                placeholder="e.g. Weathered, Basecoated, WIP"
                value={inputName}
                onChange={(e) => handleNameChange(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-key">System Identifier</Label>
              <Input
                id="status-key"
                placeholder="e.g. weathered, basecoated, wip"
                value={customKey}
                onChange={(e) => handleKeyChange(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Lowercase snake_case identifier used in database records and URL filters.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-order">Display Order</Label>
              <Input
                id="status-order"
                type="number"
                min="1"
                value={inputOrder}
                onChange={(e) =>
                  setInputOrder(e.target.value === "" ? "" : parseInt(e.target.value, 10))
                }
              />
            </div>

            {/* Live Preview */}
            {inputName.trim() && (
              <div className="p-3 bg-muted/50 rounded-md border border-border/60 space-y-1.5">
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Badge Preview
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-sm px-2.5 py-1">
                    <Tag className="mr-1.5 h-3.5 w-3.5 text-primary" />
                    {getMiniatureStatusDisplayLabel(customKey || inputName)}
                  </Badge>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting || !inputName.trim()}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Status Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" />
              Edit Status
            </DialogTitle>
            <DialogDescription>
              Update status display name, identifier, or display order.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {activeInUseCount > 0 && (
              <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-300">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <AlertTitle className="text-amber-300 font-semibold text-xs">
                  Assigned Miniatures
                </AlertTitle>
                <AlertDescription className="text-amber-200/90 text-xs mt-1">
                  This status is currently assigned to {activeInUseCount} miniature(s). Renaming the
                  identifier will automatically update all assigned miniatures.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-status-name">Display Name *</Label>
              <Input
                id="edit-status-name"
                value={inputName}
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-status-key">System Identifier</Label>
              <Input
                id="edit-status-key"
                value={customKey}
                onChange={(e) => handleKeyChange(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Lowercase snake_case identifier used in database records and filters.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-status-order">Display Order</Label>
              <Input
                id="edit-status-order"
                type="number"
                min="1"
                value={inputOrder}
                onChange={(e) =>
                  setInputOrder(e.target.value === "" ? "" : parseInt(e.target.value, 10))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={isSubmitting || !inputName.trim()}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Status Alert Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Status: {selectedStatus && getMiniatureStatusDisplayLabel(selectedStatus.name)}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {activeInUseCount === 0 ? (
                <>
                  Are you sure you want to delete the status{" "}
                  <strong className="text-foreground font-semibold">
                    &quot;{selectedStatus && getMiniatureStatusDisplayLabel(selectedStatus.name)}
                    &quot;
                  </strong>
                  ? This action cannot be undone.
                </>
              ) : (
                <>
                  This status is currently assigned to{" "}
                  <strong className="text-foreground font-semibold">
                    {activeInUseCount} miniature(s)
                  </strong>
                  . To delete it safely, select another status to reassign those miniatures to:
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {activeInUseCount > 0 && (
            <div className="space-y-2 py-2">
              <Label htmlFor="replacement-status">Reassign Miniatures To *</Label>
              <Select value={replacementStatusName} onValueChange={setReplacementStatusName}>
                <SelectTrigger id="replacement-status" className="w-full">
                  <SelectValue placeholder="Choose replacement status..." />
                </SelectTrigger>
                <SelectContent>
                  {initialStatuses
                    .filter((s) => s.id !== selectedStatus?.id)
                    .map((s) => (
                      <SelectItem key={s.id} value={s.name}>
                        {getMiniatureStatusDisplayLabel(s.name)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isSubmitting || (activeInUseCount > 0 && !replacementStatusName)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {activeInUseCount > 0 ? "Reassign & Delete" : "Delete Status"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
