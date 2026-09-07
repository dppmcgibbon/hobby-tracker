"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDropzone, type FileRejection } from "react-dropzone";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  GripVertical,
  ChevronUp,
  ChevronDown,
  ImagePlus,
} from "lucide-react";
import {
  getGamePdfUploadUrl,
  getGamePdfCoverUploadUrl,
  saveGamePdf,
  savePdfCoverImage,
  uploadGamePdfServerSide,
  deleteGameLink,
  reorderGamePdfs,
  type GameEntityType,
} from "@/app/actions/games";
import { type GameInfoLink, isGamePdfLink, sortGamePdfLinks } from "@/lib/games/game-details";
import { getR2PublicUrl } from "@/lib/r2";
import { renderPdfFirstPageToBlob } from "@/lib/utils/pdf-thumbnail";

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

  // Local state for sorted PDFs
  const [pdfItems, setPdfItems] = useState<GameInfoLink[]>(() =>
    sortGamePdfLinks(links.filter(isGamePdfLink))
  );

  // Sync with prop updates
  useEffect(() => {
    setPdfItems(sortGamePdfLinks(links.filter(isGamePdfLink)));
  }, [links]);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

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
  const [generatingCoverId, setGeneratingCoverId] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      setError(null);

      // Auto-populate title as the last word before .pdf (hyphen-separated)
      const nameWithoutExt = file.name.replace(/\.pdf$/i, "").trim();
      const segments = nameWithoutExt
        .split(/[-_]/)
        .map((s) => s.trim())
        .filter(Boolean);
      const lastWord = segments[segments.length - 1] || nameWithoutExt;
      const formattedTitle = lastWord ? lastWord.charAt(0).toUpperCase() + lastWord.slice(1) : "";
      setPdfTitle(formattedTitle);
    }
  }, []);

  const onDropRejected = useCallback((fileRejections: FileRejection[]) => {
    if (fileRejections.length > 0) {
      const rej = fileRejections[0];
      if (rej.errors.some((e) => e.code === "file-too-large")) {
        setError("File is too large. Maximum size is 250MB.");
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
    maxSize: 250 * 1024 * 1024, // 250MB
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
    setUploadProgress("Extracting cover image from PDF...");

    try {
      // 1. Generate cover image blob from page 1 locally in the browser
      let coverBlob: Blob | null = null;
      try {
        coverBlob = await renderPdfFirstPageToBlob(selectedFile, {
          scale: 1.5,
          format: "image/webp",
          quality: 0.9,
        });
      } catch (thumbErr) {
        console.warn("Failed to generate local PDF cover image:", thumbErr);
      }

      let uploadedToR2 = false;
      let r2Key = "";
      let coverImageKey: string | null = null;

      // 2. Direct upload to Cloudflare R2
      try {
        setUploadProgress("Preparing secure direct upload...");
        const [presignedPdf, presignedCover] = await Promise.all([
          getGamePdfUploadUrl(
            entityType,
            entityId,
            selectedFile.name,
            selectedFile.type || "application/pdf"
          ),
          coverBlob
            ? getGamePdfCoverUploadUrl(
                entityType,
                entityId,
                selectedFile.name,
                coverBlob.type || "image/webp"
              )
            : Promise.resolve(null),
        ]);

        // Upload cover thumbnail to R2 if generated
        if (presignedCover && coverBlob) {
          try {
            setUploadProgress("Uploading cover image...");
            const coverRes = await fetch(presignedCover.presignedUrl, {
              method: "PUT",
              body: coverBlob,
              headers: { "Content-Type": coverBlob.type || "image/webp" },
            });
            if (coverRes.ok) {
              coverImageKey = presignedCover.key;
            }
          } catch (coverUploadErr) {
            console.warn("Failed to upload direct cover image:", coverUploadErr);
          }
        }

        setUploadProgress("Uploading PDF (0%)...");
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", presignedPdf.presignedUrl);
          xhr.setRequestHeader("Content-Type", selectedFile.type || "application/pdf");
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const pct = Math.round((event.loaded / event.total) * 100);
              const loadedMb = (event.loaded / (1024 * 1024)).toFixed(1);
              const totalMb = (event.total / (1024 * 1024)).toFixed(1);
              setUploadProgress(`Uploading PDF: ${loadedMb} MB / ${totalMb} MB (${pct}%)...`);
            }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Direct upload failed (HTTP ${xhr.status})`));
            }
          };
          xhr.onerror = () => reject(new Error("Direct upload network error"));
          xhr.onabort = () => reject(new Error("Upload aborted"));
          xhr.send(selectedFile);
        });

        r2Key = presignedPdf.key;
        uploadedToR2 = true;
      } catch (directErr) {
        console.warn("Direct R2 presigned upload failed, trying server fallback:", directErr);
      }

      // 3. Fallback to server-side action if direct PUT failed
      if (uploadedToR2 && r2Key) {
        setUploadProgress("Saving PDF record...");
        await saveGamePdf(entityType, entityId, {
          title: pdfTitle.trim(),
          r2Key,
          fileSize: selectedFile.size,
          description: description.trim() || null,
          coverImageKey,
        });
      } else {
        setUploadProgress("Uploading via server fallback...");
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("title", pdfTitle.trim());
        if (description.trim()) {
          formData.append("description", description.trim());
        }
        if (coverBlob) {
          formData.append("coverFile", coverBlob, "cover.webp");
        }
        await uploadGamePdfServerSide(entityType, entityId, formData);
      }

      toast.success("PDF uploaded successfully with cover image!");
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

  // Generate cover on-demand for existing PDFs that don't have one
  const handleGenerateCover = async (e: React.MouseEvent, pdf: GameInfoLink) => {
    e.preventDefault();
    e.stopPropagation();

    setGeneratingCoverId(pdf.id);
    try {
      toast.info("Extracting cover image from PDF...");
      const blob = await renderPdfFirstPageToBlob(pdf.url, {
        scale: 1.5,
        format: "image/webp",
        quality: 0.9,
      });

      const presigned = await getGamePdfCoverUploadUrl(
        entityType,
        entityId,
        pdf.title || "document",
        blob.type || "image/webp"
      );

      const uploadRes = await fetch(presigned.presignedUrl, {
        method: "PUT",
        body: blob,
        headers: { "Content-Type": blob.type || "image/webp" },
      });

      if (!uploadRes.ok) {
        throw new Error(`Failed to upload cover to storage (HTTP ${uploadRes.status})`);
      }

      await savePdfCoverImage(entityType, entityId, pdf.id, presigned.key);
      toast.success("Cover image generated and saved!");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate cover image";
      toast.error(msg);
    } finally {
      setGeneratingCoverId(null);
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

  // Reorder persistence
  const persistOrder = async (orderedList: GameInfoLink[]) => {
    setIsSavingOrder(true);
    try {
      const orderedIds = orderedList.map((p) => p.id);
      await reorderGamePdfs(entityType, entityId, orderedIds);
      toast.success("Document order updated");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update order";
      toast.error(msg);
      // Revert to original
      setPdfItems(sortGamePdfLinks(links.filter(isGamePdfLink)));
    } finally {
      setIsSavingOrder(false);
    }
  };

  // Drag and drop event handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if ((e.target as HTMLElement).closest("button, a, input")) {
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

    const updated = [...pdfItems];
    const [moved] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, moved);

    const withNewPositions = updated.map((item, idx) => ({
      ...item,
      position: idx + 1,
    }));

    setPdfItems(withNewPositions);
    setDraggedIndex(null);
    setDragOverIndex(null);

    await persistOrder(withNewPositions);
  };

  // Move Up / Down button handlers
  const handleMove = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pdfItems.length) return;

    const updated = [...pdfItems];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);

    const withNewPositions = updated.map((item, idx) => ({
      ...item,
      position: idx + 1,
    }));

    setPdfItems(withNewPositions);
    await persistOrder(withNewPositions);
  };

  const activePreviewPdf = pdfItems.find((p) => p.id === previewPdfId);

  return (
    <Card className="warhammer-card border-primary/30">
      <CardHeader className="pb-4 border-b border-primary/15 flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg font-black uppercase tracking-wider text-primary flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            PDF Documents & Rules
            {isSavingOrder && (
              <span className="flex items-center gap-1 text-xs text-primary/80 normal-case font-normal ml-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                saving order...
              </span>
            )}
          </CardTitle>
          <CardDescription className="text-xs uppercase tracking-wide mt-1">
            Rulebooks, reference guides, and supplements • Drag rows or use arrows to reorder
          </CardDescription>
        </div>

        <Dialog open={dialogOpen} onOpenChange={handleOpenDialog}>
          <DialogTrigger asChild>
            <Button
              className="btn-warhammer-primary h-8 w-8 p-0"
              size="sm"
              title="Upload PDF"
              aria-label="Upload PDF"
            >
              <Upload className="h-4 w-4" />
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
                      Official rulebooks, errata, battle packs (up to 250MB)
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
        {pdfItems.length === 0 ? (
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
            <div className="border border-primary/25 rounded-md overflow-hidden bg-black/40 shadow-sm">
              <Table>
                <TableHeader className="bg-black/60 border-b border-primary/25">
                  <TableRow className="border-primary/20 hover:bg-transparent">
                    <TableHead className="w-28 text-center font-bold uppercase tracking-wider text-xs text-primary/90 py-3">
                      #
                    </TableHead>
                    <TableHead className="font-bold uppercase tracking-wider text-xs text-primary/90 py-3">
                      Document Title
                    </TableHead>
                    <TableHead className="w-52 text-right font-bold uppercase tracking-wider text-xs text-primary/90 py-3 pr-4">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pdfItems.map((pdf, index) => {
                    const isPreviewing = previewPdfId === pdf.id;
                    const isDeleting = deletingId === pdf.id;
                    const isDragging = draggedIndex === index;
                    const isDragOver = dragOverIndex === index && draggedIndex !== index;
                    const ordinal = index + 1;

                    return (
                      <TableRow
                        key={pdf.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        onDrop={(e) => handleDrop(e, index)}
                        className={`group transition-all duration-150 select-none ${
                          isDragging
                            ? "opacity-30 bg-primary/10 border-dashed border-primary"
                            : isDragOver
                              ? "bg-primary/20 border-t-2 border-t-primary shadow-gold"
                              : isPreviewing
                                ? "bg-primary/10 border-primary/40 shadow-gold"
                                : "border-primary/15 hover:bg-primary/5"
                        }`}
                      >
                        {/* Ordinal Column */}
                        <TableCell className="text-center font-mono py-3 pl-3 pr-2">
                          <div className="flex items-center justify-center gap-1.5">
                            <div
                              className="cursor-grab active:cursor-grabbing text-muted-foreground/70 group-hover:text-primary transition-colors p-1 rounded hover:bg-primary/10"
                              title="Drag to reorder"
                            >
                              <GripVertical className="h-4 w-4" />
                            </div>
                            <span className="inline-flex items-center justify-center min-w-[26px] h-6 px-1.5 rounded bg-primary/15 text-primary text-xs font-bold border border-primary/30">
                              {ordinal}
                            </span>
                            <div className="flex flex-col -my-1 ml-0.5 opacity-40 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                disabled={index === 0 || isSavingOrder}
                                onClick={(e) => {
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
                                disabled={index === pdfItems.length - 1 || isSavingOrder}
                                onClick={(e) => {
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

                        {/* Document Title Column */}
                        <TableCell className="py-3 px-3">
                          <div className="flex items-center gap-3.5 min-w-0">
                            {/* PDF Thumbnail */}
                            <div className="w-10 h-14 rounded-sm border border-primary/30 overflow-hidden bg-black/60 shrink-0 shadow-md flex items-center justify-center relative">
                              {pdf.cover_image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={getR2PublicUrl(pdf.cover_image)}
                                  alt={pdf.title}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <FileText className="h-5 w-5 text-primary/50" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <span className="font-bold text-sm text-foreground hover:text-primary transition-colors block truncate">
                                {pdf.title}
                              </span>
                              {pdf.description && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                  {pdf.description}
                                </p>
                              )}
                              {!pdf.cover_image && (
                                <button
                                  type="button"
                                  onClick={(e) => handleGenerateCover(e, pdf)}
                                  disabled={generatingCoverId === pdf.id}
                                  className="inline-flex items-center gap-1 text-[10px] text-primary/80 hover:text-primary mt-1 font-semibold uppercase tracking-wider transition-colors disabled:opacity-50"
                                >
                                  {generatingCoverId === pdf.id ? (
                                    <>
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      Generating Cover...
                                    </>
                                  ) : (
                                    <>
                                      <ImagePlus className="h-3 w-3" />
                                      Generate Cover
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Actions Column */}
                        <TableCell className="py-3 pr-4 text-right">
                          <div className="flex items-center justify-end gap-3">
                            {pdf.file_size && (
                              <span className="text-[10px] uppercase font-bold font-mono tracking-wider px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-primary/10 shrink-0">
                                {formatBytes(pdf.file_size)}
                              </span>
                            )}

                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button
                                variant={isPreviewing ? "default" : "outline"}
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePreview(pdf.id);
                                }}
                                className={`h-7 w-7 p-0 ${
                                  isPreviewing
                                    ? "bg-primary text-black hover:bg-primary/90"
                                    : "border-primary/30 hover:border-primary hover:bg-primary/10 text-muted-foreground hover:text-primary"
                                }`}
                                title={isPreviewing ? "Close Preview" : "Preview PDF"}
                                aria-label={isPreviewing ? "Close Preview" : "Preview PDF"}
                              >
                                {isPreviewing ? (
                                  <EyeOff className="h-3.5 w-3.5" />
                                ) : (
                                  <Eye className="h-3.5 w-3.5" />
                                )}
                              </Button>

                              <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="h-7 w-7 p-0 border-primary/30 hover:border-primary hover:bg-primary/10 text-muted-foreground hover:text-primary"
                                title="Open in new window"
                                aria-label="Open in new window"
                              >
                                <a
                                  href={pdf.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={isDeleting}
                                onClick={(e) => handleDelete(e, pdf.id, pdf.title)}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                title="Delete PDF"
                              >
                                {isDeleting ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
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
                    src={`/api/pdf-proxy?url=${encodeURIComponent(activePreviewPdf.url)}#view=FitH`}
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
