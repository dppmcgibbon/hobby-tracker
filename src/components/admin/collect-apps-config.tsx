"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";
import {
  createCollectApp,
  updateCollectApp,
  deleteCollectApp,
  createCollectConfig,
  updateCollectConfig,
  deleteCollectConfig,
} from "@/app/actions/collect";
import { toast } from "sonner";

interface CollectApp {
  id: number;
  app: string;
  table_name: string;
  initial_sort_key: string | null;
}

interface CollectConfigRow {
  id: number;
  table_name: string;
  sequence: number;
  column_name: string;
  column_type: string;
  display: number;
  initial_sort_key: number;
  filter: number;
}

const COLUMN_TYPES = [
  "text",
  "number",
  "sequence",
  "checkbox",
  "status",
  "faction",
  "series",
  "center",
  "image",
  "url",
  "paint",
];

interface CollectAppsConfigProps {
  apps: CollectApp[];
  config: CollectConfigRow[];
}

export function CollectAppsConfig({ apps, config }: CollectAppsConfigProps) {
  const router = useRouter();
  const [filterTable, setFilterTable] = useState<string>("all");

  const filteredConfig = filterTable === "all"
    ? config
    : config.filter((c) => c.table_name === filterTable);

  return (
    <div className="space-y-8">
      <CollectAppsSection apps={apps} onMutate={() => router.refresh()} />
      <CollectConfigSection
        config={filteredConfig}
        apps={apps}
        filterTable={filterTable}
        onFilterChange={setFilterTable}
        onMutate={() => router.refresh()}
      />
    </div>
  );
}

function CollectAppsSection({ apps, onMutate }: { apps: CollectApp[]; onMutate: () => void }) {
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<CollectApp | null>(null);
  const [deleting, setDeleting] = useState<CollectApp | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ app: "", table_name: "", initial_sort_key: "" });

  const openAdd = () => {
    setEditing(null);
    setForm({ app: "", table_name: "", initial_sort_key: "" });
    setShowDialog(true);
  };

  const openEdit = (row: CollectApp) => {
    setEditing(row);
    setForm({
      app: row.app,
      table_name: row.table_name,
      initial_sort_key: row.initial_sort_key || "",
    });
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editing) {
        await updateCollectApp(editing.id, {
          app: form.app,
          table_name: form.table_name,
          initial_sort_key: form.initial_sort_key || null,
        });
        toast.success("Collect app updated");
      } else {
        await createCollectApp({
          app: form.app,
          table_name: form.table_name,
          initial_sort_key: form.initial_sort_key || null,
        });
        toast.success("Collect app created");
      }
      setShowDialog(false);
      onMutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setIsSubmitting(true);
    try {
      await deleteCollectApp(deleting.id);
      toast.success("Collect app deleted");
      setDeleting(null);
      onMutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="warhammer-card border-primary/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="uppercase tracking-wide">Collect Apps</CardTitle>
            <CardDescription>Define collect apps and their table names</CardDescription>
          </div>
          <Button onClick={openAdd} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add App
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>App</TableHead>
                <TableHead>Table Name</TableHead>
                <TableHead>Initial Sort Key</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apps.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No collect apps configured.
                  </TableCell>
                </TableRow>
              ) : (
                apps.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-sm">{row.id}</TableCell>
                    <TableCell>{row.app}</TableCell>
                    <TableCell>{row.table_name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.initial_sort_key || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:text-destructive"
                          onClick={() => setDeleting(row)}
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
      </CardContent>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Collect App" : "Add Collect App"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update the collect app." : "Create a new collect app."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="app">App *</Label>
              <Input
                id="app"
                value={form.app}
                onChange={(e) => setForm({ ...form, app: e.target.value })}
                placeholder="e.g., magazines"
                required
              />
            </div>
            <div>
              <Label htmlFor="table_name">Table Name *</Label>
              <Input
                id="table_name"
                value={form.table_name}
                onChange={(e) => setForm({ ...form, table_name: e.target.value })}
                placeholder="e.g., magazines"
                required
              />
            </div>
            <div>
              <Label htmlFor="initial_sort_key">Initial Sort Key</Label>
              <Input
                id="initial_sort_key"
                value={form.initial_sort_key}
                onChange={(e) => setForm({ ...form, initial_sort_key: e.target.value })}
                placeholder="e.g., issue"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Collect App</AlertDialogTitle>
            <AlertDialogDescription>
              Delete &quot;{deleting?.app}&quot;? Related collect_config rows will remain but may
              break the collect UI.
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
    </Card>
  );
}

function CollectConfigSection({
  config,
  apps,
  filterTable,
  onFilterChange,
  onMutate,
}: {
  config: CollectConfigRow[];
  apps: CollectApp[];
  filterTable: string;
  onFilterChange: (v: string) => void;
  onMutate: () => void;
}) {
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<CollectConfigRow | null>(null);
  const [deleting, setDeleting] = useState<CollectConfigRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    table_name: apps[0]?.table_name ?? "",
    sequence: 1,
    column_name: "",
    column_type: "text",
    display: 1,
    initial_sort_key: 0,
    filter: 0,
  });

  const tableNames = apps.map((a) => a.table_name);

  const openAdd = () => {
    setEditing(null);
    setForm({
      table_name: filterTable !== "all" ? filterTable : tableNames[0] ?? "",
      sequence: config.length > 0 ? Math.max(...config.map((c) => c.sequence)) + 1 : 1,
      column_name: "",
      column_type: "text",
      display: 1,
      initial_sort_key: 0,
      filter: 0,
    });
    setShowDialog(true);
  };

  const openEdit = (row: CollectConfigRow) => {
    setEditing(row);
    setForm({
      table_name: row.table_name,
      sequence: row.sequence,
      column_name: row.column_name,
      column_type: row.column_type,
      display: row.display,
      initial_sort_key: row.initial_sort_key,
      filter: row.filter,
    });
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editing) {
        await updateCollectConfig(editing.id, form);
        toast.success("Config row updated");
      } else {
        await createCollectConfig(form);
        toast.success("Config row created");
      }
      setShowDialog(false);
      onMutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setIsSubmitting(true);
    try {
      await deleteCollectConfig(deleting.id);
      toast.success("Config row deleted");
      setDeleting(null);
      onMutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="warhammer-card border-primary/30">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle className="uppercase tracking-wide">Collect Config</CardTitle>
            <CardDescription>Define columns for each collect app table</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filterTable} onValueChange={onFilterChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by table" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tables</SelectItem>
                {tableNames.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={openAdd} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Config
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Seq</TableHead>
                <TableHead>Column</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Display</TableHead>
                <TableHead>Sort</TableHead>
                <TableHead>Filter</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {config.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No config rows. Add one or select a different table filter.
                  </TableCell>
                </TableRow>
              ) : (
                config.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-sm">{row.id}</TableCell>
                    <TableCell>{row.table_name}</TableCell>
                    <TableCell>{row.sequence}</TableCell>
                    <TableCell>{row.column_name}</TableCell>
                    <TableCell>
                      <span className="text-xs px-2 py-0.5 bg-muted rounded">{row.column_type}</span>
                    </TableCell>
                    <TableCell>{row.display ? "Yes" : "No"}</TableCell>
                    <TableCell>{row.initial_sort_key ? "Yes" : "No"}</TableCell>
                    <TableCell>{row.filter ? "Yes" : "No"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:text-destructive"
                          onClick={() => setDeleting(row)}
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
      </CardContent>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Config Row" : "Add Config Row"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update the column config." : "Add a new column config."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="config_table_name">Table Name *</Label>
              <Select
                value={form.table_name}
                onValueChange={(v) => setForm({ ...form, table_name: v })}
                required
              >
                <SelectTrigger id="config_table_name">
                  <SelectValue placeholder="Select table" />
                </SelectTrigger>
                <SelectContent>
                  {tableNames.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="sequence">Sequence *</Label>
              <Input
                id="sequence"
                type="number"
                min={1}
                value={form.sequence}
                onChange={(e) => setForm({ ...form, sequence: parseInt(e.target.value) || 1 })}
                required
              />
            </div>
            <div>
              <Label htmlFor="column_name">Column Name *</Label>
              <Input
                id="column_name"
                value={form.column_name}
                onChange={(e) => setForm({ ...form, column_name: e.target.value })}
                placeholder="e.g., magazine"
                required
              />
            </div>
            <div>
              <Label htmlFor="column_type">Column Type</Label>
              <Select
                value={form.column_type}
                onValueChange={(v) => setForm({ ...form, column_type: v })}
              >
                <SelectTrigger id="column_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLUMN_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label htmlFor="display">Display</Label>
                <Input
                  id="display"
                  type="number"
                  min={0}
                  max={1}
                  value={form.display}
                  onChange={(e) => setForm({ ...form, display: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="initial_sort_key">Initial Sort</Label>
                <Input
                  id="initial_sort_key"
                  type="number"
                  min={0}
                  max={1}
                  value={form.initial_sort_key}
                  onChange={(e) =>
                    setForm({ ...form, initial_sort_key: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <Label htmlFor="filter">Filter</Label>
                <Input
                  id="filter"
                  type="number"
                  min={0}
                  max={1}
                  value={form.filter}
                  onChange={(e) => setForm({ ...form, filter: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Config Row</AlertDialogTitle>
            <AlertDialogDescription>
              Delete config for &quot;{deleting?.column_name}&quot; ({deleting?.table_name})?
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
    </Card>
  );
}
