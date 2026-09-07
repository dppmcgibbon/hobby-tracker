"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { AdminBackupDashboardStats, importDatabaseBackupAction } from "@/app/actions/admin-backup";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Database,
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Search,
  CheckCircle2,
  ShieldCheck,
  FolderArchive,
  Layers,
  Sparkles,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface BackupManagementProps {
  initialStats: AdminBackupDashboardStats;
}

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function BackupManagement({ initialStats }: BackupManagementProps) {
  const router = useRouter();
  const [tableSearch, setTableSearch] = useState("");
  const [downloadingTarget, setDownloadingTarget] = useState<string | null>(null);

  // Import states
  const [isImporting, setIsImporting] = useState(false);
  const [showImportWarning, setShowImportWarning] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stats = initialStats;

  const filteredTables = stats.tables.filter((t) =>
    t.tableName.toLowerCase().includes(tableSearch.toLowerCase())
  );

  const triggerDownload = (url: string, label: string) => {
    setDownloadingTarget(label);
    toast.info(`Preparing ${label}...`, {
      description: "Download stream initiated. The browser will save the file shortly.",
    });

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Reset button loading state after a slight delay
    setTimeout(() => {
      setDownloadingTarget(null);
    }, 2500);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith(".zip")) {
        toast.error("Please select a valid table backup ZIP file.");
        return;
      }
      setPendingImportFile(file);
      setShowImportWarning(true);
    }
  };

  const handleImportCancel = () => {
    setShowImportWarning(false);
    setPendingImportFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImportConfirm = async () => {
    if (!pendingImportFile) return;

    setShowImportWarning(false);
    setIsImporting(true);

    try {
      const formData = new FormData();
      formData.append("file", pendingImportFile);

      toast.loading("Restoring database tables...", { id: "import-toast" });
      const result = await importDatabaseBackupAction(formData);

      if (!result.success) {
        throw new Error(result.error || "Failed to restore database tables.");
      }

      const tableCount = result.tableCounts ? Object.keys(result.tableCounts).length : 0;
      toast.success("Database tables restored successfully!", {
        id: "import-toast",
        description: `Restored ${result.totalRows?.toLocaleString() || 0} rows across ${tableCount} tables.`,
      });

      router.refresh();
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Database Import Failed", {
        id: "import-toast",
        description: (error as Error).message || "An unexpected error occurred during import.",
      });
    } finally {
      setIsImporting(false);
      setPendingImportFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Hidden file input for table backup ZIP upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".zip"
        className="hidden"
      />

      {/* Top Overview Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="warhammer-card border-primary/40 bg-card/60 backdrop-blur">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Database Tables
              </span>
              <Database className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-2xl font-black tracking-tight text-foreground">
              {stats.totalDatabaseRows.toLocaleString()}{" "}
              <span className="text-sm font-normal text-muted-foreground">rows</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>{stats.totalTablesCount} tables · No row caps applied</span>
          </CardContent>
        </Card>

        <Card className="warhammer-card border-primary/40 bg-card/60 backdrop-blur">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                R2 Miniature Photos
              </span>
              <ImageIcon className="h-4 w-4 text-emerald-500" />
            </div>
            <CardTitle className="text-2xl font-black tracking-tight text-foreground">
              {stats.miniatures.totalCount.toLocaleString()}{" "}
              <span className="text-sm font-normal text-muted-foreground">photos</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-emerald-500" />
            <span>
              {formatBytes(stats.miniatures.totalBytes)} · Split into{" "}
              {stats.miniatures.parts.length} parts
            </span>
          </CardContent>
        </Card>

        <Card className="warhammer-card border-primary/40 bg-card/60 backdrop-blur">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                R2 Game PDFs & Media
              </span>
              <FileText className="h-4 w-4 text-sky-500" />
            </div>
            <CardTitle className="text-2xl font-black tracking-tight text-foreground">
              {stats.games.totalCount}{" "}
              <span className="text-sm font-normal text-muted-foreground">assets</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground flex items-center gap-1.5">
            <FolderArchive className="h-3.5 w-3.5 text-sky-500" />
            <span>
              {formatBytes(stats.games.totalBytes)} across {stats.games.groups.length} game systems
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Area */}
      <Tabs defaultValue="tables" className="space-y-6">
        <TabsList className="bg-muted/80 p-1 border border-primary/30 h-auto gap-1">
          <TabsTrigger
            value="tables"
            className="data-[state=active]:bg-primary data-[state=active]:text-black font-bold uppercase text-xs tracking-wider gap-2 py-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Table Data (CSVs)
          </TabsTrigger>
          <TabsTrigger
            value="miniatures"
            className="data-[state=active]:bg-primary data-[state=active]:text-black font-bold uppercase text-xs tracking-wider gap-2 py-2"
          >
            <ImageIcon className="h-4 w-4" />
            Miniature Images (R2)
          </TabsTrigger>
          <TabsTrigger
            value="games"
            className="data-[state=active]:bg-primary data-[state=active]:text-black font-bold uppercase text-xs tracking-wider gap-2 py-2"
          >
            <FileText className="h-4 w-4" />
            Game PDFs & Images (R2)
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: TABLE DATA EXPORTS & IMPORTS */}
        <TabsContent value="tables" className="space-y-6 focus-visible:outline-none">
          <Card className="warhammer-card border-primary/30">
            <CardHeader className="pb-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    Supabase Database Tables (Export & Import)
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Export or restore every row of all 34 database tables as clean CSV files. No
                    pagination caps or limits applied.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                    variant="outline"
                    className="border-primary/40 text-foreground font-semibold hover:bg-primary/10 gap-2 shrink-0"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        Importing Tables...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 text-emerald-400" />
                        Import Tables (ZIP)
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() =>
                      triggerDownload("/api/admin/backup/tables", "All Database Tables ZIP")
                    }
                    disabled={downloadingTarget === "All Database Tables ZIP" || isImporting}
                    className="bg-primary text-black font-bold hover:bg-primary/90 gap-2 shrink-0 shadow-md shadow-primary/20"
                  >
                    <Download className="h-4 w-4" />
                    {downloadingTarget === "All Database Tables ZIP"
                      ? "Generating ZIP..."
                      : "Download All Tables (ZIP)"}
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Guarantee alert banner */}
              <div className="p-3.5 bg-emerald-950/30 border border-emerald-500/30 rounded flex items-start gap-3 text-xs text-emerald-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-emerald-300">Complete Data Protection:</span>{" "}
                  Exports and imports use Supabase Service Role credentials to bypass RLS barriers,
                  preserving relational integrity and ensuring 100% of rows are handled accurately.
                </div>
              </div>

              {/* Table search & list */}
              <div className="flex items-center justify-between gap-4 pt-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search tables..."
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    className="pl-9 h-9 text-xs border-primary/20 focus:border-primary"
                  />
                </div>
                <span className="text-xs text-muted-foreground font-mono">
                  Showing {filteredTables.length} of {stats.tables.length} tables
                </span>
              </div>

              <div className="border border-primary/20 rounded divide-y divide-primary/10 max-h-[480px] overflow-y-auto">
                {filteredTables.map((t) => (
                  <div
                    key={t.tableName}
                    className="p-3 flex items-center justify-between hover:bg-primary/5 transition-colors text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="font-mono font-semibold text-foreground">
                          {t.tableName}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2 font-mono">.csv</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge
                        variant="outline"
                        className="font-mono text-xs border-primary/30 bg-primary/5"
                      >
                        {t.rowCount.toLocaleString()} rows
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/10 font-mono"
                        onClick={() =>
                          triggerDownload(
                            `/api/admin/backup/tables?table=${t.tableName}`,
                            `${t.tableName}.csv`
                          )
                        }
                      >
                        <Download className="h-3 w-3 mr-1" />
                        CSV
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: MINIATURE IMAGES (R2) */}
        <TabsContent value="miniatures" className="space-y-6 focus-visible:outline-none">
          <Card className="warhammer-card border-primary/30">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-emerald-500" />
                    Cloudflare R2 Miniature Photos Backup
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {stats.miniatures.totalCount.toLocaleString()} miniature photos (
                    {formatBytes(stats.miniatures.totalBytes)} total). Split into{" "}
                    {stats.miniatures.parts.length} balanced volumes to guarantee swift,
                    fault-tolerant downloads.
                  </CardDescription>
                </div>
                <Button
                  onClick={() =>
                    triggerDownload(
                      "/api/admin/backup/r2?type=miniatures&part=all",
                      "All Miniature Photos Combined"
                    )
                  }
                  disabled={downloadingTarget === "All Miniature Photos Combined"}
                  variant="outline"
                  className="border-primary/40 text-foreground font-semibold hover:bg-primary/10 gap-2 shrink-0"
                >
                  <FolderArchive className="h-4 w-4" />
                  Download All (Single ZIP)
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.miniatures.parts.map((p) => (
                  <div
                    key={p.partNumber}
                    className="p-4 border border-primary/20 bg-muted/40 rounded-sm flex flex-col justify-between hover:border-primary/50 transition-all gap-4"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-base tracking-wide uppercase text-primary">
                          Part {p.partNumber} of {p.totalParts}
                        </span>
                        <Badge variant="secondary" className="font-mono text-xs">
                          {formatBytes(p.totalBytes)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Contains {p.itemCount.toLocaleString()} miniature photos preserving folder
                        structure ({`user_id/miniature_id/...`}).
                      </p>
                    </div>

                    <Button
                      onClick={() =>
                        triggerDownload(
                          `/api/admin/backup/r2?type=miniatures&part=${p.partNumber}`,
                          `Miniatures Part ${p.partNumber}`
                        )
                      }
                      disabled={downloadingTarget === `Miniatures Part ${p.partNumber}`}
                      className="w-full bg-primary/20 text-primary border border-primary/40 hover:bg-primary hover:text-black font-bold gap-2 text-xs h-9 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      {downloadingTarget === `Miniatures Part ${p.partNumber}`
                        ? "Streaming Part..."
                        : `Download Part ${p.partNumber} (${formatBytes(p.totalBytes)})`}
                    </Button>
                  </div>
                ))}
              </div>

              <div className="p-3.5 bg-muted/30 border border-primary/15 rounded text-xs text-muted-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <span>
                  Tip: If your internet connection drops during large downloads, multi-part archives
                  allow you to resume by downloading only the missing part.
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: GAME PDFS & MEDIA (R2) */}
        <TabsContent value="games" className="space-y-6 focus-visible:outline-none">
          <Card className="warhammer-card border-primary/30">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <FileText className="h-5 w-5 text-sky-500" />
                    Game Rulebooks, Reference Sheets & Images
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {stats.games.totalCount} game assets ({formatBytes(stats.games.totalBytes)}{" "}
                    total). Grouped by game system so rulebooks and reference sheets stay organized
                    together.
                  </CardDescription>
                </div>
                <Button
                  onClick={() =>
                    triggerDownload(
                      "/api/admin/backup/r2?type=games&game=all",
                      "All Game Assets Combined"
                    )
                  }
                  disabled={downloadingTarget === "All Game Assets Combined"}
                  variant="outline"
                  className="border-primary/40 text-foreground font-semibold hover:bg-primary/10 gap-2 shrink-0"
                >
                  <FolderArchive className="h-4 w-4" />
                  Download All Games ({formatBytes(stats.games.totalBytes)})
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.games.groups.map((grp) => (
                  <div
                    key={grp.gameKey}
                    className="p-4 border border-primary/20 bg-muted/40 rounded-sm flex flex-col justify-between hover:border-primary/50 transition-all gap-4"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-base tracking-wide text-foreground truncate pr-2">
                          {grp.gameName}
                        </span>
                        <Badge variant="secondary" className="font-mono text-xs shrink-0">
                          {formatBytes(grp.totalBytes)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3 text-sky-400" />
                          {grp.pdfCount} {grp.pdfCount === 1 ? "PDF" : "PDFs"}
                        </span>
                        {grp.imageCount > 0 && (
                          <span className="flex items-center gap-1">
                            <ImageIcon className="h-3 w-3 text-emerald-400" />
                            {grp.imageCount} {grp.imageCount === 1 ? "Image" : "Images"}
                          </span>
                        )}
                      </div>
                    </div>

                    <Button
                      onClick={() =>
                        triggerDownload(
                          `/api/admin/backup/r2?type=games&game=${grp.gameKey}`,
                          `${grp.gameName} Backup`
                        )
                      }
                      disabled={downloadingTarget === `${grp.gameName} Backup`}
                      className="w-full bg-primary/20 text-primary border border-primary/40 hover:bg-primary hover:text-black font-bold gap-2 text-xs h-9 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      {downloadingTarget === `${grp.gameName} Backup`
                        ? "Streaming..."
                        : `Download ${grp.gameName}`}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirmation Warning Dialog for Table Import */}
      <AlertDialog open={showImportWarning} onOpenChange={setShowImportWarning}>
        <AlertDialogContent className="bg-card border-destructive/50 text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm Database Table Import
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2 text-muted-foreground text-sm">
              <div>
                You are about to restore database tables from:{" "}
                <span className="font-semibold text-foreground font-mono">
                  {pendingImportFile?.name}
                </span>
              </div>
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded text-destructive text-xs font-semibold">
                Warning: This will permanently replace current records for all tables included in
                the backup ZIP file.
              </div>
              <div className="text-xs text-muted-foreground">
                We strongly recommend downloading a current table backup ZIP before importing. R2
                storage (miniature photos and game PDFs) will NOT be affected.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleImportCancel} disabled={isImporting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleImportConfirm}
              disabled={isImporting}
              className="bg-destructive hover:bg-destructive/90 text-white font-bold"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Importing Tables...
                </>
              ) : (
                "Yes, Replace & Restore Tables"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
