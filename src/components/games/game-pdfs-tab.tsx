"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone, type FileRejection } from "react-dropzone";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FileText,
  Upload,
  ExternalLink,
  Eye,
  EyeOff,
  Trash2,
  Loader2,
  AlertCircle,
  FileCheck2,
} from "lucide-react";
import {
  getGamePdfUploadUrl,
  saveGamePdf,
  uploadGamePdfServerSide,
  deleteGameLink,
  type GameEntityType,
} from "@/app/actions/games";
import { type GameInfoLink, isGamePdfLink } from "@/lib/games/game-details";

interface GamePdfsTabProps {
  entityType: GameEntityType;
  entityId: string;
  links: GameInfoLink[];
  gameTitle?: string;
}

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function GamePdfsTab({ entityType, entityId, links, gameTitle = "Game" }: GamePdfsTabProps) {
  const router = useRouter();

  // Filter and sort links for PDFs alphabetically
  const pdfLinks = links
    .filter(isGamePdfLink)
    .sort((a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: "base", numeric: true })
    );

  // State for upload dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfTitle, setPdfTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // State for deletion & preview
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewPdfId, setPreviewPdfId] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      setError(null);

      // Auto-populate title from clean filename
      const cleanName = file.name
        .replace(/\.pdf$/i, "")
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      setPdfTitle(cleanName);
    }
  }, []);

  const onDropRejected = useCallback((fileRejections: FileRejection[]) => {
    if (fileRejections.length > 0) {
      const rej = fileRejections[0];
      if (rej.errors.some((e) => e.code === "file-too-large")) {
        setError("File is too large. Maximum size is 150MB.");
      } else {
        setError("Please select a valid PDF file.");
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: {
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    maxSize: 150 * 1024 * 1024, // 150MB
  });

  const handleOpenDialog = (open: boolean) => {
    if (open) {
      setSelectedFile(null);
      setPdfTitle("");
      setDescription("");
      setError(null);
      setUploadProgress(null);
    }
    setDialogOpen(open);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError("Please select a PDF file to upload.");
      return;
    }
    if (!pdfTitle.trim()) {
      setError("Please enter a title for this PDF document.");
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress("Preparing upload...");

    try {
      let uploadedToR2 = false;
      let r2Key = "";

      // 1. Attempt direct presigned upload to Cloudflare R2
      try {
        setUploadProgress("Preparing secure upload...");
        const presigned = await getGamePdfUploadUrl(
          entityType,
          entityId,
          selectedFile.name,
          selectedFile.type || "application/pdf"
        );

        setUploadProgress("Uploading PDF...");
        const putRes = await fetch(presigned.presignedUrl, {
          method: "PUT",
          headers: {
            "Content-Type": selectedFile.type || "application/pdf",
          },
          body: selectedFile,
        });

        if (putRes.ok) {
          r2Key = presigned.key;
          uploadedToR2 = true;
        } else {
          console.warn("Direct R2 upload responded with status:", putRes.status);
        }
      } catch (directErr) {
        console.warn("Direct R2 presigned upload failed, trying server fallback:", directErr);
      }

      // 2. Fallback to server-side action if direct PUT failed
      if (uploadedToR2 && r2Key) {
        setUploadProgress("Saving PDF record...");
        await saveGamePdf(entityType, entityId, {
          title: pdfTitle.trim(),
          r2Key,
          fileSize: selectedFile.size,
          description: description.trim() || null,
        });
      } else {
        setUploadProgress("Uploading PDF...");
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("title", pdfTitle.trim());
        if (description.trim()) {
          formData.append("description", description.trim());
        }
        await uploadGamePdfServerSide(entityType, entityId, formData);
      }

      toast.success("PDF uploaded successfully!");
      setDialogOpen(false);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload PDF";
      setError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, linkId: string, title: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }

    setDeletingId(linkId);
    try {
      await deleteGameLink(entityType, entityId, linkId);
      if (previewPdfId === linkId) {
        setPreviewPdfId(null);
      }
      toast.success("PDF removed successfully");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete PDF";
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const togglePreview = (id: string) => {
    setPreviewPdfId((curr) => (curr === id ? null : id));
  };

  const activePreviewPdf = pdfLinks.find((p) => p.id === previewPdfId);

  return (
    <Card className="warhammer-card border-primary/30">
      <CardHeader className="pb-4 border-b border-primary/15 flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg font-black uppercase tracking-wider text-primary flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            PDF Documents & Rules
          </CardTitle>
          <CardDescription className="text-xs uppercase tracking-wide mt-1">
            Rulebooks, reference guides, and supplements
          </CardDescription>
        </div>

        <Dialog open={dialogOpen} onOpenChange={handleOpenDialog}>
          <DialogTrigger asChild>
            <Button
              className="btn-warhammer-primary font-bold uppercase text-xs tracking-wider h-8 px-3.5"
              size="sm"
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Upload PDF
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg bg-card border-primary/30">
            <DialogHeader>
              <DialogTitle className="text-lg font-black uppercase tracking-wider text-primary flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                Upload PDF Document
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleUpload} className="space-y-4 pt-2">
              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? "border-primary bg-primary/10"
                    : selectedFile
                      ? "border-primary/50 bg-primary/5"
                      : "border-primary/30 hover:border-primary/60 hover:bg-muted/30"
                }`}
              >
                <input {...getInputProps()} />
                {selectedFile ? (
                  <div className="flex flex-col items-center gap-2 text-primary">
                    <FileCheck2 className="h-10 w-10 text-primary" />
                    <p className="text-sm font-bold text-foreground break-all">
                      {selectedFile.name}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {formatBytes(selectedFile.size)} • Click or drop to replace
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Upload className="h-10 w-10 text-primary/70" />
                    <p className="text-sm font-bold text-foreground">
                      Click to choose or drag & drop a PDF
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Official rulebooks, errata, battle packs (up to 150MB)
                    </p>
                  </div>
                )}
              </div>

              {/* Title Input */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="pdf-title"
                  className="text-xs font-bold uppercase tracking-wide text-foreground/90"
                >
                  Document Title <span className="text-primary">*</span>
                </Label>
                <Input
                  id="pdf-title"
                  placeholder="e.g. Core Rulebook, Battle Pack, Reference Sheet"
                  value={pdfTitle}
                  onChange={(e) => setPdfTitle(e.target.value)}
                  className="bg-background border-primary/30 text-sm focus-visible:border-primary"
                  required
                />
              </div>

              {/* Optional Description */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="pdf-desc"
                  className="text-xs font-bold uppercase tracking-wide text-foreground/90"
                >
                  Description{" "}
                  <span className="text-muted-foreground text-[10px] normal-case">(optional)</span>
                </Label>
                <Input
                  id="pdf-desc"
                  placeholder="e.g. Official 1989 edition core rulebook with intro mission"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-background border-primary/30 text-sm focus-visible:border-primary"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded p-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Upload Progress Status */}
              {uploadProgress && (
                <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 border border-primary/30 rounded p-2.5">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0 text-primary" />
                  <span>{uploadProgress}</span>
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={uploading}
                  className="text-xs font-bold uppercase tracking-wider"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={uploading || !selectedFile || !pdfTitle.trim()}
                  className="btn-warhammer-primary text-xs font-bold uppercase tracking-wider"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5 mr-1.5" />
                      Upload PDF
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent className="pt-5 space-y-5">
        {pdfLinks.length === 0 ? (
          <div className="text-center py-12 px-4 border border-dashed border-primary/20 rounded-sm bg-black/20">
            <div className="inline-flex p-3 rounded-full bg-primary/10 border border-primary/30 mb-3">
              <FileText className="h-8 w-8 text-primary/70" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
              No PDFs uploaded yet
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Upload rulebooks, scenarios, or reference PDFs for {gameTitle} for quick, direct
              access anytime.
            </p>
            <Button
              onClick={() => handleOpenDialog(true)}
              variant="outline"
              size="sm"
              className="mt-4 border-primary/40 hover:border-primary hover:bg-primary/10 text-xs font-bold uppercase tracking-wider text-primary"
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Upload First PDF
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-2.5">
              {pdfLinks.map((pdf) => {
                const isPreviewing = previewPdfId === pdf.id;
                const isDeleting = deletingId === pdf.id;

                return (
                  <div
                    key={pdf.id}
                    className={`flex items-center justify-between gap-3 p-3 rounded-sm border transition-all ${
                      isPreviewing
                        ? "border-primary bg-primary/10 shadow-gold"
                        : "border-primary/20 bg-black/30 hover:border-primary/50 hover:bg-black/40"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-9 w-9 rounded-sm bg-red-950/50 border border-red-500/30 flex items-center justify-center shrink-0 text-red-400">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-foreground truncate hover:text-primary transition-colors">
                            {pdf.title}
                          </p>
                          {pdf.file_size && (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-primary/10 shrink-0">
                              {formatBytes(pdf.file_size)}
                            </span>
                          )}
                        </div>
                        {pdf.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {pdf.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Preview toggle */}
                      <Button
                        variant={isPreviewing ? "default" : "outline"}
                        size="sm"
                        onClick={() => togglePreview(pdf.id)}
                        className={`h-8 px-2.5 text-xs font-bold uppercase tracking-wider ${
                          isPreviewing
                            ? "bg-primary text-black hover:bg-primary/90"
                            : "border-primary/30 hover:border-primary hover:bg-primary/10 text-muted-foreground hover:text-primary"
                        }`}
                        title={isPreviewing ? "Close Preview" : "Preview PDF"}
                      >
                        {isPreviewing ? (
                          <>
                            <EyeOff className="h-3.5 w-3.5 mr-1" />
                            Hide
                          </>
                        ) : (
                          <>
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Preview
                          </>
                        )}
                      </Button>

                      {/* Direct download/open in new tab */}
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 border-primary/30 hover:border-primary hover:bg-primary/10 text-muted-foreground hover:text-primary text-xs font-bold uppercase tracking-wider"
                      >
                        <a
                          href={pdf.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open in new window"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>

                      {/* Delete */}
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isDeleting}
                        onClick={(e) => handleDelete(e, pdf.id, pdf.title)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Delete PDF"
                      >
                        {isDeleting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Embedded PDF Viewer when Preview is active */}
            {activePreviewPdf && (
              <div className="mt-4 border-2 border-primary/40 rounded-sm overflow-hidden bg-black/60 shadow-2xl">
                <div className="flex items-center justify-between px-3.5 py-2.5 bg-card border-b border-primary/20">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-wider text-primary truncate">
                      {activePreviewPdf.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs font-bold uppercase tracking-wider hover:text-primary text-muted-foreground"
                    >
                      <a href={activePreviewPdf.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Full Screen
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewPdfId(null)}
                      className="h-7 text-xs font-bold uppercase tracking-wider hover:text-primary text-muted-foreground"
                    >
                      Close
                    </Button>
                  </div>
                </div>

                <div className="w-full h-[650px] bg-neutral-900">
                  <iframe
                    src={activePreviewPdf.url}
                    className="w-full h-full border-none"
                    title={activePreviewPdf.title}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
